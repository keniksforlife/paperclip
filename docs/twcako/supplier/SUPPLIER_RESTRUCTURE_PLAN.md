# Supplier Restructure Plan

## Overview

Restructure the supplier system to support a **parent-branch hierarchy** for multi-branch suppliers (starting with Sante), migrate Live4More's fulfillment features into shared branch capabilities, add a centralized Founders Hub for supplier/branch management with feature toggles and order routing overrides, and build a self-service branch onboarding flow for future expansion.

---

## 1. Final Supplier Structure

### Hierarchy

```
Sante (Parent Brand)
  |-- Sante Valenzuela    (ID:2)   Region: NCR        -- 118 products
  |-- Sante CDO           (ID:6)   Region: N. Mindanao -- backfill 118
  |-- Live4More           (ID:12)  Region: NCR         -- backfill 118

Chingu Trends (Standalone) (ID:1)  Region: National    -- bags, etc. (products added later)
Mood (Standalone)          (ID:8)  Region: National    -- 109 products
```

### Cleanup

| Supplier | Action |
|----------|--------|
| TWC Online Store (ID:11) | Deactivate, drop 4 freebie products |
| Mandaluyong Hub (ID:9) | Deactivate |
| MercatusPH (ID:7) | Deactivate |

### Customer-Facing Display
- Orders fulfilled by any Sante branch show as **"Sante"** to the customer
- Internal reporting / supplier dashboards show per-branch breakdown
- Standalone suppliers (Mood, Chingu) show their own name

---

## 2. Model Changes

### 2A. Supplier Model Additions

**File:** `accounts/models.py` - `Supplier` model

```
New fields:
  parent_supplier     FK(self, null=True, blank=True)     # NULL = standalone supplier
  branch_code         CharField(max_length=50, blank=True) # e.g. "valenzuela", "cdo"
  branch_features     JSONField(default=dict)              # Feature toggles per branch/supplier
  is_parent           BooleanField(default=False)          # True for parent brand records
  onboarding_status   CharField(max_length=20, default='active')  # active, onboarding, suspended
```

**`branch_features` structure (default: all enabled):**
```json
{
  "fulfillment_hub": true,
  "sns_redemption": true,
  "bp_encoding": true,
  "hub_delivery": true,
  "package_orders": true,
  "inventory_management": true,
  "order_management": true,
  "analytics": true,
  "settlements": true,
  "affiliate_commissions": true,
  "promotions": true
}
```

### 2B. Helper Methods on Supplier

```python
@property
def is_branch(self):
    return self.parent_supplier is not None

@property
def display_name(self):
    """Customer-facing name: parent brand name for branches, own name for standalone."""
    if self.parent_supplier:
        return self.parent_supplier.name
    return self.name

@property
def branches(self):
    """Get all branches (only valid on parent suppliers)."""
    return Supplier.objects.filter(parent_supplier=self, active=True)

@property
def sibling_branches(self):
    """Get other branches under the same parent."""
    if self.parent_supplier:
        return Supplier.objects.filter(
            parent_supplier=self.parent_supplier, active=True
        ).exclude(id=self.id)
    return Supplier.objects.none()

def has_feature(self, feature_key):
    return self.branch_features.get(feature_key, True)
```

### 2C. Order Routing Model

**New model:** `supplier/models.py` - `BranchRoutingRule`

```python
class BranchRoutingRule(models.Model):
    parent_supplier   FK(Supplier, limit_choices_to={'is_parent': True})
    region_code       CharField(max_length=10)          # matches REGION_CHOICES
    branch            FK(Supplier)                       # target branch
    priority          PositiveIntegerField(default=0)    # higher = preferred
    is_active         BooleanField(default=True)
    condition         CharField(max_length=50, blank=True)  # optional: "freebie", "vw", etc.
    notes             CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-priority']
        unique_together = ['parent_supplier', 'region_code', 'branch', 'condition']
```

### 2D. Promotions & Freebies (replaces TWC Online Store products)

**New model:** `supplier/models.py` - `BranchPromotion`

```python
class BranchPromotion(models.Model):
    supplier          FK(Supplier)                        # branch or standalone
    name              CharField(max_length=200)
    promo_type        CharField(choices=[('freebie','Freebie'), ('discount','Discount'), ('bundle','Bundle')])
    product           FK(Product, null=True, blank=True)  # freebie product if applicable
    discount_value    DecimalField(null=True, blank=True)
    min_order_amount  DecimalField(null=True, blank=True)
    is_active         BooleanField(default=True)
    start_date        DateTimeField(null=True, blank=True)
    end_date          DateTimeField(null=True, blank=True)
```

---

## 3. Live4More Feature Migration

### Current State
Dedicated Django app (`live4more/`) with:
- 4 views: Package Orders, SNS Redemption, Hub Delivery, BP Encoding
- 2 Celery tasks: `mark_sns_done_task`, `mark_bp_encoded_task`
- 6 templates
- `User.is_live4more` permission flag
- Fulfiller key mapping (`"mandaluyong_hub"`)

### Target State
Features become **shared branch capabilities** gated by `branch_features`:

| Feature | Gate Key | Description |
|---------|----------|-------------|
| Package Orders | `package_orders` | Manage package order fulfillment |
| SNS Redemption | `sns_redemption` | Process SNS code redemptions |
| Hub Delivery | `hub_delivery` | Confirm hub pickup/delivery |
| BP Encoding | `bp_encoding` | Encode business partner codes |
| Fulfillment Hub | `fulfillment_hub` | Central fulfillment operations |

### Migration Approach
1. Create `supplier/views/fulfillment.py` -- generalized views that accept any supplier
2. `@require_feature('sns_redemption')` decorator checks `supplier.has_feature(key)`
3. Templates become supplier-agnostic (use `{{ branch.name }}` not "Live4More")
4. Replace `User.is_live4more` with `user.supplier_user.has_feature('fulfillment_hub')`
5. Keep `live4more/` app as thin redirect during transition, remove in final cleanup

---

## 4. Order Routing Redesign

### Current (Hardcoded)
```
sante + no freebie  --> Sante Valenzuela (ID:2)
sante + freebie/VW  --> Live4More (ID:12)
mood                --> Mood (ID:8)
```

### New (Configurable via BranchRoutingRule)

**Default routing** -- region-based:
```
sante + NCR/Luzon           --> Sante Valenzuela
sante + Visayas/Mindanao    --> Sante CDO
mood (any region)           --> Mood
chingu (any region)         --> Chingu Trends
```

**Founder overrides** -- condition-based rules with higher priority:
```
sante + freebie + any region   --> Live4More  (priority: 10)
sante + vw + any region        --> Live4More  (priority: 10)
sante + NCR + default          --> Valenzuela (priority: 1)
sante + Region 10 + default    --> CDO        (priority: 1)
```

**Routing algorithm:**
```python
def get_order_supplier(category, region, conditions=[]):
    # 1. Find parent supplier for category
    # 2. Query BranchRoutingRule matching parent + region + conditions
    # 3. Return highest priority active rule's branch
    # 4. Fallback: parent's default branch (marked in parent record)
```

**Standalone suppliers** (Mood, Chingu) skip routing -- orders go directly to them.

---

## 5. Founders Hub: Centralized Supplier Management

### 5A. Supplier & Branch Management Page

**Supplier List:**
- All suppliers (parent brands + standalones)
- Expand parent to see branches
- Status indicators (active, onboarding, suspended)
- Quick actions: add branch, toggle active, edit details

**Branch Detail:**
- Edit branch info (name, region, address, pickup location)
- Feature toggle grid (checkboxes per feature)
- View branch KPIs
- Manage routing rules

### 5B. Feature Toggle Grid

```
Feature              | Valenzuela | CDO | Live4More
---------------------|-----------|-----|----------
Fulfillment Hub      |    ON     | OFF |    ON
SNS Redemption       |    OFF    | OFF |    ON
BP Encoding          |    OFF    | OFF |    ON
Hub Delivery         |    OFF    | OFF |    ON
Package Orders       |    ON     | ON  |    ON
Inventory Mgmt       |    ON     | ON  |    ON
Order Management     |    ON     | ON  |    ON
Analytics            |    ON     | ON  |    ON
Settlements          |    ON     | ON  |    ON
Promotions           |    ON     | ON  |    ON
```

### 5C. Order Routing Configuration

- Visual rule editor per parent supplier
- Table: Region --> Branch (with drag-to-reorder priority)
- Condition overrides (freebie, VW, etc.)
- "Test routing" tool: input region + conditions --> shows which branch

### 5D. Branch KPI Roll-up

- Combined view: total revenue, orders, inventory across all branches of a parent
- Per-branch breakdown cards
- Branch comparison chart (bar chart: revenue by branch)

### 5E. Branch Onboarding Flow

Self-service wizard for adding new branches:

```
Step 1: Basic Info
  - Branch name, region, business address, pickup location
  - Assign to parent supplier (or create standalone)

Step 2: User Account
  - Create Django user for the branch
  - Set username, password, contact info

Step 3: Product Catalog
  - Option A: Copy catalog from existing branch (with fresh inventory at 0)
  - Option B: Start empty (add products later)
  - Option C: Select specific products from parent's catalog

Step 4: Feature Setup
  - Toggle which features this branch gets
  - Pre-filled with recommended defaults based on parent

Step 5: Routing Rules
  - Assign regions this branch will serve
  - Set priority relative to other branches

Step 6: Review & Activate
  - Summary of all settings
  - Activate immediately or save as draft (onboarding_status='onboarding')
```

---

## 6. Supplier Dashboard Updates

### Branch Identity
- Dashboard header: **"Live4More"** (branch name) with subtitle **"Sante Branch"**
- Standalone suppliers just show their name

### Feature Gating
- Sidebar menu items hidden if `has_feature()` returns False
- API endpoints return 403 if branch doesn't have the feature enabled
- Graceful: disabled features show "Contact admin to enable" instead of nothing

### Promotions & Freebies
- New section in supplier dashboard (gated by `promotions` feature)
- Create/manage freebies: select product, set conditions (min order, date range)
- View active promotions
- Replaces the old TWC Online Store freebie system

---

## 7. Data Migration

### Step 1: Schema Migration
- Add `parent_supplier`, `branch_code`, `branch_features`, `is_parent`, `onboarding_status` to Supplier
- Create `BranchRoutingRule` model
- Create `BranchPromotion` model

### Step 2: Create Sante Parent
```python
sante_parent = Supplier.objects.create(
    user=<create system user "sante">,
    name="Sante",
    is_parent=True,
    supplier_category='brand',
    active=True,
)
```

### Step 3: Assign Branches
```python
Supplier(id=2).update(parent_supplier=sante_parent, branch_code="valenzuela")
Supplier(id=6).update(parent_supplier=sante_parent, branch_code="cdo")
Supplier(id=12).update(parent_supplier=sante_parent, branch_code="live4more")
```

### Step 4: Set Branch Features
```python
# Valenzuela + CDO: standard features
standard = {"inventory_management": True, "order_management": True, "analytics": True,
            "settlements": True, "promotions": True, ...all others False}

# Live4More: standard + fulfillment features
live4more_features = {**standard, "fulfillment_hub": True, "sns_redemption": True,
                      "bp_encoding": True, "hub_delivery": True, "package_orders": True}
```

### Step 5: Create Routing Rules
```python
# NCR/Luzon --> Valenzuela (default)
# Mindanao --> CDO
# Freebie/VW override --> Live4More
```

### Step 6: Backfill Products
```python
# CDO: Copy 118 sante SupplierProducts, create SupplierInventory(qty=0)
# Live4More: Copy 118 sante SupplierProducts, create SupplierInventory(qty=0)
```

### Step 7: Cleanup
```python
Supplier(id=11).update(active=False)  # TWC Online Store
Supplier(id=9).update(active=False)   # Mandaluyong Hub
Supplier(id=7).update(active=False)   # MercatusPH
# Delete SupplierProduct records for ID:11
# Keep the 4 Product records (twc category) but remove supplier linkage
```

---

## 8. Implementation Phases

### Phase A: Model + Data Foundation
1. Add new fields to Supplier model (migration)
2. Create BranchRoutingRule model
3. Create BranchPromotion model
4. Add helper methods on Supplier
5. Data migration: create Sante parent, assign branches, set features
6. Backfill CDO + Live4More with sante products
7. Deactivate TWC Online Store, Mandaluyong Hub, MercatusPH
8. Refactor `get_order_supplier()` to use BranchRoutingRule

### Phase B: Live4More Feature Migration
1. Create `supplier/views/fulfillment.py` (generalized views)
2. `@require_feature` decorator
3. Supplier-agnostic templates
4. Deprecate `User.is_live4more`
5. Keep `live4more/` as redirect shim

### Phase C: Founders Hub - Supplier Management (Backend + Frontend)
1. API endpoints: CRUD suppliers/branches, toggle features, routing rules, KPI roll-up
2. V4 page: Supplier & Branch Management
3. Feature toggle grid UI
4. Order routing rule editor
5. Branch KPI roll-up dashboard

### Phase D: Branch Onboarding Flow
1. API: create branch wizard (user creation, product copy, feature setup, routing)
2. V4 onboarding wizard (6-step flow)
3. Validation + activation logic

### Phase E: Supplier Dashboard Updates (Frontend)
1. Branch identity in header
2. Feature gating in sidebar + API
3. Promotions & Freebies section
4. Customer-facing order display (parent brand name)

---

## 9. API Endpoints (New)

### Founders Hub
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/founders/suppliers/` | List all suppliers (parents + standalones) |
| POST | `/api/founders/suppliers/` | Create new standalone supplier |
| GET | `/api/founders/suppliers/{id}/` | Supplier detail |
| PUT | `/api/founders/suppliers/{id}/` | Update supplier |
| GET | `/api/founders/suppliers/{id}/branches/` | List branches of a parent |
| POST | `/api/founders/suppliers/{id}/branches/` | Add branch (onboarding) |
| PUT | `/api/founders/suppliers/{id}/features/` | Update branch feature toggles |
| GET | `/api/founders/suppliers/{id}/kpi-rollup/` | Combined KPIs across branches |
| GET | `/api/founders/routing-rules/` | List all routing rules |
| POST | `/api/founders/routing-rules/` | Create routing rule |
| PUT | `/api/founders/routing-rules/{id}/` | Update routing rule |
| DELETE | `/api/founders/routing-rules/{id}/` | Delete routing rule |
| POST | `/api/founders/routing/test/` | Test routing (input: region + conditions) |
| POST | `/api/founders/branches/onboard/` | Full onboarding wizard endpoint |

### Supplier Dashboard (Additions)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/supplier/promotions/` | List branch promotions |
| POST | `/api/supplier/promotions/` | Create promotion/freebie |
| PUT | `/api/supplier/promotions/{id}/` | Update promotion |
| DELETE | `/api/supplier/promotions/{id}/` | Delete promotion |
| GET | `/api/supplier/features/` | Get enabled features for current branch |

---

## 10. Estimated Scope

| Phase | Backend | Frontend | Priority |
|-------|---------|----------|----------|
| A: Model + Data | 3-4 files, 2 migrations, 1 mgmt command | -- | P0 |
| B: Live4More Migration | 2-3 view files, templates, task refactor | -- | P0 |
| C: Founders Hub | 5 API views, 12 endpoints | 3-4 V4 pages | P1 |
| D: Branch Onboarding | 1 wizard API endpoint | 1 V4 wizard page | P1 |
| E: Dashboard Updates | Minor API changes | Sidebar gating, header, promotions page | P2 |

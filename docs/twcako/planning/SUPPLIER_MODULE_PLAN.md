# Merchant/Supplier Module Implementation Plan

> Created: 2026-03-02
> Status: Planning - All decisions made, ready for implementation

## Overview

A comprehensive Merchant/Supplier module for TWCako with modern V4 dashboard UI, inventory management, order processing, settlements, and affiliate integration.

---

## Current State

### Existing Backend Models
| Model | Location | Status |
|-------|----------|--------|
| `Supplier` | `accounts/models.py:694-743` | OneToOne with User, has shop profile fields |
| `Vendor` | `finance/models.py:1404-1488` | Standalone, NOT linked to Supplier |
| `Product` | `shops/models.py:237-407` | Central catalog, NO supplier link |
| `SupplierSettlement` | `finance/models.py:689-734` | Uses `supplier_id` (int), not FK |
| `ProductOrder` | `orders/models.py` | Has `supplier` FK |

### Key Gaps
1. **No Product-to-Supplier link** - Products don't belong to suppliers
2. **Vendor != Supplier** - Finance Vendor not connected to operational Supplier
3. **No inventory tracking** - No stock levels per supplier
4. **Legacy supplier dashboard** - Old templates, not V4 UI
5. **Settlement uses integer ID** - Not proper FK relationship

---

## Implementation Plan

### Phase 1: Foundation (Backend Models + V4 Dashboard Shell)

**Supplier Type System** - Add `supplier_category` to existing `Supplier` model (`accounts/models.py`):

```python
SUPPLIER_CATEGORY_CHOICES = [
    ('brand', 'Brand / Fixed Pricing'),       # e.g. Sante, Live4More - pricing locked by platform
    ('independent', 'Independent / Marketplace'), # Can set their own pricing
]
# Add to Supplier model:
supplier_category = CharField(max_length=20, choices=SUPPLIER_CATEGORY_CHOICES, default='brand')
```

- **Brand suppliers** (`brand`): Products have platform-set pricing. Supplier CANNOT override `retail_price`. They only manage inventory, orders, and fulfillment.
- **Independent suppliers** (`independent`): Full control over their product pricing via `retail_price` override on `SupplierProduct`.

**New Models** - Create in `/supplier/models.py`:

```python
# 1. SupplierProduct - Links suppliers to products (marketplace model)
class SupplierProduct(models.Model):
    supplier = FK(Supplier)
    product = FK(Product)
    supplier_price = Decimal  # Cost/COGS
    retail_price = Decimal    # Optional override (ONLY for independent suppliers, ignored for brand)
    commission_type = 'percentage' | 'fixed'
    commission_rate = Decimal
    is_active = Boolean
    is_featured = Boolean
    # unique_together: [supplier, product]
    # NOTE: retail_price is READ-ONLY for brand suppliers (enforced in API/frontend)
    # For independent suppliers: price changes require founder approval (see PriceChangeRequest)

# 1b. PriceChangeRequest - Founder approval for independent supplier pricing
class PriceChangeRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    supplier_product = FK(SupplierProduct)
    requested_by = FK(User)               # The supplier user
    current_price = Decimal               # Price at time of request
    requested_price = Decimal             # New price they want
    reason = TextField(blank=True)        # Supplier's justification
    status = CharField(default='pending')
    reviewed_by = FK(User, null=True)     # Founder who reviewed
    reviewed_at = DateTime(null=True)
    rejection_reason = TextField(blank=True)
    created_at = DateTime(auto_now_add)
    # On approval: supplier_product.retail_price is updated automatically

# 2. SupplierInventory - Stock tracking per supplier-product
class SupplierInventory(models.Model):
    supplier_product = OneToOne(SupplierProduct)
    quantity_on_hand = Int
    quantity_reserved = Int
    quantity_available = Int  # Computed: on_hand - reserved
    reorder_point = Int
    reorder_quantity = Int
    last_restock_date = DateTime
    days_of_stock = Int

# 3. InventoryMovement - Full audit trail
class InventoryMovement(models.Model):
    inventory = FK(SupplierInventory)
    movement_type = 'purchase' | 'sale' | 'return' | 'adjustment' | 'reserve'
    quantity = Int  # +/-
    quantity_before, quantity_after = Int
    reference_type, reference_id = String
    created_by = FK(User)

# 4. SupplierKPI - Daily performance snapshots
class SupplierKPI(models.Model):
    supplier = FK(Supplier)
    date = Date
    orders_received, orders_completed = Int
    gross_revenue, net_revenue = Decimal
    commission_paid, platform_fees = Decimal
    low_stock_sku_count = Int
    # unique_together: [supplier, date]

# 5. SupplierSettlementV2 - Enhanced settlements with proper FK
class SupplierSettlementV2(models.Model):
    supplier = FK(Supplier)  # PROPER FK (replaces integer supplier_id)
    vendor = FK(Vendor, null=True)
    settlement_number = String(unique)
    period_start, period_end = Date
    status = 'calculating' | 'pending_review' | 'disputed' | 'approved' | 'paid'
    gross_sales, returns_amount, commission_amount = Decimal
    platform_fee, shipping_fee_collected, shipping_fee_paid = Decimal
    adjustments, net_payable, paid_amount = Decimal
    # Full approval workflow fields (reviewed_by, approved_by, etc.)

# 6. SettlementLineItem - Per-order breakdown in settlement
class SettlementLineItem(models.Model):
    settlement = FK(SupplierSettlementV2)
    order = FK(ProductOrder)
    order_total, supplier_cost, commission = Decimal
    platform_fee, shipping_fee, net_amount = Decimal
    is_return = Boolean
```

**Model Modifications to Existing Tables**:
- Add `primary_supplier = FK(Supplier, null=True)` to `Product` model
- Add `supplier = OneToOne(Supplier, null=True)` to `Vendor` model

**V4 Frontend Shell**:
- Create `SupplierPageLayout.tsx` (clone FinancePageLayout pattern - accordion sidebar with gold accents)
- Create `/types/domain/supplier.ts` with all TypeScript types
- Create `/hooks/useSupplier.ts` with SWR hooks
- Create `/app/(dashboards)/supplier/page.tsx` dashboard with KPI cards
- Register in module switcher

**API Endpoints**:
```
GET  /api/supplier/dashboard/          # Dashboard data + KPIs
GET  /api/supplier/dashboard/kpis/     # KPI cards only
GET  /api/supplier/dashboard/revenue-chart/  # Revenue trend
GET  /api/supplier/dashboard/inventory-alerts/ # Low stock alerts
```

---

### Phase 2: Product Catalog & Inventory

**Backend APIs**:
```
GET    /api/supplier/products/              # List supplier's products
POST   /api/supplier/products/              # Add product to catalog
GET    /api/supplier/products/{id}/         # Product detail
PUT    /api/supplier/products/{id}/         # Update product pricing/status
DELETE /api/supplier/products/{id}/         # Remove from catalog
GET    /api/supplier/products/search/       # Search central catalog to add

POST   /api/supplier/products/{id}/request-price-change/  # Submit price change (independent only)
GET    /api/supplier/products/price-requests/             # List my pending price requests

# Founder-only endpoints:
GET    /api/supplier/admin/price-requests/                # All pending price change requests
POST   /api/supplier/admin/price-requests/{id}/approve/   # Approve → auto-updates retail_price
POST   /api/supplier/admin/price-requests/{id}/reject/    # Reject with reason

GET    /api/supplier/inventory/             # Full inventory list
GET    /api/supplier/inventory/{id}/        # Inventory detail with movements
POST   /api/supplier/inventory/{id}/adjust/ # Manual stock adjustment
POST   /api/supplier/inventory/{id}/restock/ # Record incoming stock
GET    /api/supplier/inventory/low-stock/   # Low stock alerts
GET    /api/supplier/inventory/movements/   # Movement history (all)
```

**V4 Pages**:
```
/supplier/products              # Product catalog table (DataGrid)
/supplier/products/add          # Add product to catalog form
/supplier/products/[id]         # Product detail/edit page
/supplier/products/price-requests  # Supplier view: my pending price change requests
/supplier/inventory                # Inventory management grid
/supplier/inventory/movements      # Stock movement history

# Founder admin pages (in admin or finance section):
/supplier/admin/price-requests     # Review queue for all pending price changes
```

**Key Features**:
- Search central product catalog and add to supplier's catalog
- Set supplier-specific pricing and commission rates
- Inventory grid with inline stock level editing
- Low stock badges and alerts
- Bulk import capability

---

### Phase 3: Order Management

**Backend APIs**:
```
GET  /api/supplier/orders/                  # List orders (filterable by status/date)
GET  /api/supplier/orders/{id}/             # Order detail with items
POST /api/supplier/orders/{id}/accept/      # Accept order → reserve inventory
POST /api/supplier/orders/{id}/ship/        # Mark shipped + add tracking number
POST /api/supplier/orders/{id}/complete/    # Mark as delivered → deduct inventory
POST /api/supplier/orders/{id}/return/      # Process return → restore inventory
GET  /api/supplier/orders/pending/          # Pending orders count + list
GET  /api/supplier/orders/by-status/        # Orders grouped by status (summary)
```

**V4 Pages**:
```
/supplier/orders            # All orders with status tabs (Pending/Processing/Shipping/Delivered/Returns)
/supplier/orders/[id]       # Order detail + action buttons
/supplier/orders/pending    # Pending orders queue (priority view)
/supplier/orders/returns    # Returns processing page
```

**Order Workflow**:
```
Customer Order → Pending → [Supplier Accepts] → Processing
                                                    ↓
                                            Reserve Inventory
                                                    ↓
                                        Ship (add tracking) → Delivered
                                                                  ↓
                                                          Deduct Inventory
                                                                  ↓
                                                      Add to Settlement Queue
```

**Returns Flow**:
```
Customer Requests Return → Supplier Reviews → Approve/Reject
                                                  ↓ (if approved)
                                          Restore Inventory
                                                  ↓
                                        Deduct from Settlement
```

---

### Phase 4: Settlements & Finance

**Backend**:
- Celery task: `calculate_supplier_settlement` (runs on configured frequency)
- Aggregates all completed orders for the period
- Calculates: gross sales - returns - commissions - platform fees = net payable
- Settlement approval workflow (integrates with Finance module's approval chains)

**APIs**:
```
GET  /api/supplier/settlements/             # List settlements
GET  /api/supplier/settlements/{id}/        # Detail with line items (per-order breakdown)
POST /api/supplier/settlements/{id}/dispute/ # Raise dispute with reason
GET  /api/supplier/settlements/pending/     # Pending settlement amount
GET  /api/supplier/settlements/history/     # Payment history
```

**V4 Pages**:
```
/supplier/settlements       # Settlements list with status badges
/supplier/settlements/[id]  # Detail page with order-by-order breakdown
/supplier/commissions       # Commission tracking (paid to affiliates)
/supplier/ecash            # eCash wallet integration (existing)
```

**Settlement Breakdown Card**:
```
Gross Sales:              PHP 150,000
(-) Returns:              PHP   5,000
(-) Commissions:          PHP  15,000
(-) Platform Fee (5%):    PHP   7,500
(-) Shipping Adjustment:  PHP   2,000
(+/-) Adjustments:        PHP       0
================================
Net Payable:              PHP 120,500
```

---

### Phase 5: Analytics & Reports

**Backend**:
- Celery task: `snapshot_supplier_kpis` (daily at midnight)
- Sales analytics aggregation queries
- Product performance calculations
- Inventory turnover rate computation

**APIs**:
```
GET /api/supplier/analytics/sales/              # Revenue + orders trend (daily/weekly/monthly)
GET /api/supplier/analytics/products/           # Top products, worst performers
GET /api/supplier/analytics/inventory-turnover/ # Inventory efficiency metrics
GET /api/supplier/analytics/commissions/        # Commission breakdown
GET /api/supplier/analytics/export/             # CSV/PDF report export
```

**V4 Pages**:
```
/supplier/analytics             # Analytics dashboard (overview charts)
/supplier/analytics/sales       # Sales reports with interactive charts
/supplier/analytics/products    # Product performance rankings
```

**Dashboard Charts**:
- Revenue trend (line chart - 7/30/90 days)
- Orders by status (donut chart)
- Top 10 products by revenue (bar chart)
- Inventory health (stacked bar - in stock / low / out)

---

### Phase 6: Affiliate Integration

**New Model**:
```python
class SupplierCommission(models.Model):
    supplier_product = FK(SupplierProduct)
    order = FK(ProductOrder)
    affiliate = FK(User)          # The affiliate who earned commission
    tier = Int                     # 1 = direct, 2 = sponsor, 3 = diamond
    commission_rate = Decimal
    commission_amount = Decimal
    status = 'pending' | 'approved' | 'paid' | 'cancelled'
    paid_at = DateTime(null=True)
    settlement = FK(SupplierSettlementV2, null=True)
```

**How Affiliates Earn from Supplier Products**:
1. Affiliate shares product link with referral code
2. Customer purchases through affiliate's link
3. Order is attributed to the affiliate
4. Commission calculated based on `SupplierProduct.commission_rate`
5. Commission split across tiers (if multi-tier enabled):
   - Tier 1 (direct referrer): e.g., 60% of commission
   - Tier 2 (sponsor): e.g., 30% of commission
   - Tier 3 (diamond coach): e.g., 10% of commission
6. Commissions credited to eCash wallet on settlement

**Integration Points**:
- Hook into `ECashEntryService` for commission payouts
- Track referrals via existing `ref_code` on orders
- Commission appears in affiliate's Member Dashboard
- Supplier sees "Commissions Paid" in their settlement breakdown

---

### Phase 7: Brand Supplier Storefronts (B2B SaaS Platform)

> This is a **major revenue opportunity** for TWC — turning the platform into a B2B SaaS that serves brand suppliers (Sante, Live4More, future branches) by hosting their own shop for their own members (external, non-TWC members).

**Business Model (ManyChat-style tiered plans)**:
```
┌─────────────────────────────────────────────────────┐
│  TWC Brand Storefront Plans (managed by Founders)   │
├──────────┬──────────┬──────────┬────────────────────┤
│ Starter  │ Growth   │ Business │ Enterprise         │
│ 2,500    │ 10,000   │ 50,000   │ Unlimited          │
│ members  │ members  │ members  │ members            │
│ PHP X/mo │ PHP X/mo │ PHP X/mo │ Custom pricing     │
│          │          │          │                    │
│ Basic    │ + Analytics│ + Custom│ + Dedicated        │
│ shop     │ + Reports │  domain │   support          │
│          │          │ + API    │ + SLA              │
└──────────┴──────────┴──────────┴────────────────────┘
```

**How it works**:
1. Brand supplier (e.g. Sante Manila branch) subscribes to a plan
2. Gets a branded storefront: `sante-manila.twcako.com`
3. Their own members (NOT TWC members) register on that storefront
4. External members browse & purchase products at fixed brand pricing
5. Orders flow through TWC's order/fulfillment system
6. TWC earns: subscription fee + platform transaction fee per order

**Revenue streams for TWC**:
- Monthly subscription per plan tier
- Transaction fee per order (e.g. 3-5%)
- Overage fees if member count exceeds plan limit
- Upgrade fees when moving to higher tier

#### New Models

```python
# 1. SupplierPlan - Tiered subscription plans (configured by Founders)
class SupplierPlan(models.Model):
    name = CharField(max_length=100)           # "Starter", "Growth", etc.
    slug = SlugField(unique=True)
    max_members = PositiveIntegerField         # 2500, 10000, 50000, 0=unlimited
    monthly_price = Decimal                    # Subscription fee
    transaction_fee_pct = Decimal              # e.g. 5.00 = 5%
    features = JSONField(default=dict)         # Feature flags per plan
    is_active = Boolean(default=True)
    sort_order = PositiveIntegerField(default=0)
    created_at, updated_at = DateTime

# 2. SupplierSubscription - Supplier's active plan
class SupplierSubscription(models.Model):
    supplier = FK(Supplier)
    plan = FK(SupplierPlan)
    status = 'active' | 'past_due' | 'cancelled' | 'suspended'
    current_member_count = PositiveIntegerField(default=0)
    started_at = DateTime
    expires_at = DateTime(null=True)
    billing_cycle_day = PositiveSmallIntegerField  # Day of month for billing
    last_billed_at = DateTime(null=True)
    next_billing_at = DateTime(null=True)

# 3. SupplierStorefront - Subdomain/branding config per supplier
class SupplierStorefront(models.Model):
    supplier = OneToOne(Supplier)
    subdomain = CharField(max_length=63, unique=True)  # "sante-manila" → sante-manila.twcako.com
    custom_domain = CharField(null=True, blank=True)    # Future: shop.santebarley.com
    store_name = CharField(max_length=200)
    logo = ImageField(null=True)
    banner_image = ImageField(null=True)
    primary_color = CharField(max_length=7, default='#e1c340')  # Hex
    accent_color = CharField(max_length=7, default='#1a1a2e')
    description = TextField(blank=True)
    contact_email = EmailField(blank=True)
    contact_phone = CharField(blank=True)
    is_active = Boolean(default=True)
    # SEO
    meta_title = CharField(max_length=200, blank=True)
    meta_description = TextField(blank=True)

# 4. ExternalMember - Members that belong to a supplier (NOT TWC users)
class ExternalMember(models.Model):
    storefront = FK(SupplierStorefront)
    email = EmailField
    first_name = CharField
    last_name = CharField
    phone = CharField(blank=True)
    password = hashed                          # Separate auth from TWC users
    is_active = Boolean(default=True)
    is_verified = Boolean(default=False)
    referred_by = FK('self', null=True)        # Simple referral tracking
    joined_at = DateTime(auto_now_add)
    last_login = DateTime(null=True)
    total_orders = PositiveIntegerField(default=0)
    total_spent = Decimal(default=0)
    # NOTE: These are NOT Django User model instances
    # They authenticate via a separate storefront login flow

# 5. ExternalOrder - Orders placed by external members
class ExternalOrder(models.Model):
    storefront = FK(SupplierStorefront)
    external_member = FK(ExternalMember)
    order_number = CharField(unique=True)
    items = JSONField                          # Snapshot of ordered products
    subtotal, shipping_fee, total = Decimal
    status = 'pending' | 'processing' | 'shipped' | 'delivered' | 'returned'
    shipping_address = TextField
    payment_method = CharField
    payment_reference = CharField(blank=True)
    # These feed into the same supplier order queue & settlement system
    supplier_order = FK(ProductOrder, null=True)  # Links to internal order system
```

#### Subdomain Routing (Next.js)

```
Middleware detects subdomain:
  sante-manila.twcako.com → render storefront for supplier "sante-manila"
  twcako.com              → render main TWC platform

Next.js middleware.ts:
  - Extract subdomain from host header
  - Look up SupplierStorefront by subdomain
  - If found → rewrite to /storefront/[subdomain]/... routes
  - If not → continue to main app
```

#### Storefront Pages (External Member Facing)

```
/                           # Storefront home (branded landing)
/products                   # Product catalog (brand's products only)
/products/[slug]            # Product detail
/cart                       # Shopping cart
/checkout                   # Checkout flow
/account                    # External member account
/account/orders             # Order history
/account/orders/[id]        # Order detail
/login                      # Storefront login (separate from TWC)
/register                   # External member registration
```

#### Supplier Dashboard Additions (Brand Supplier View)

```
My Storefront
  +-- Storefront Settings     # Branding, colors, logo
  +-- Members                 # External member list + count vs plan limit
  +-- Subscription            # Current plan, usage, upgrade option
```

#### Founders Dashboard Additions

```
Brand Storefronts
  +-- Plans Management        # Create/edit subscription tiers
  +-- Active Storefronts      # All brand storefronts, member counts, plan status
  +-- Subscription Billing    # Revenue tracking, past-due accounts
  +-- Member Limits           # Alerts when nearing plan limits
```

#### Data Flow

```
External Member registers on sante-manila.twcako.com
        ↓
ExternalMember created (linked to SupplierStorefront)
        ↓
Checks SupplierSubscription.current_member_count vs plan.max_members
        ↓ (if within limit)
Member browses products (brand's fixed pricing)
        ↓
Places order → ExternalOrder created
        ↓
Converted to internal ProductOrder (supplier = Sante Manila)
        ↓
Flows through normal order queue → inventory → settlement
        ↓
TWC earns: transaction_fee_pct on order total
```

#### Plan Limit Enforcement

```
When ExternalMember registers:
  1. Count current members for storefront
  2. Compare to subscription.plan.max_members
  3. If at limit → block registration, notify supplier to upgrade
  4. If at 80% → warn supplier in dashboard
  5. If at 100% → send upgrade prompt notification

Celery task: check_subscription_limits (daily)
  - Alert suppliers approaching limits
  - Suspend storefronts for past-due subscriptions
```

---

## V4 Sidebar Navigation Structure

```
Overview
  +-- Dashboard

Catalog
  +-- Products
  +-- Inventory
  +-- Stock History

Orders
  +-- All Orders
  +-- Pending
  +-- To Ship
  +-- Returns

Finance
  +-- Settlements
  +-- Commissions
  +-- eCash Wallet

Analytics
  +-- Sales Analytics
  +-- Product Performance

Settings
  +-- Shop Profile
  +-- Bank Details
```

---

## Critical Files to Modify/Create

### Backend (Django)
| File | Action |
|------|--------|
| `supplier/models.py` | Create all new models (currently empty stub) |
| `supplier/admin.py` | Register all models with admin |
| `supplier/serializers.py` | DRF serializers for all models |
| `shops/models.py` | Add `primary_supplier` FK to Product |
| `finance/models.py` | Add `supplier` FK to Vendor |
| `api/views/supplier/__init__.py` | New module |
| `api/views/supplier/dashboard.py` | Dashboard KPI views |
| `api/views/supplier/products.py` | Product catalog CRUD views |
| `api/views/supplier/inventory.py` | Inventory management views |
| `api/views/supplier/orders.py` | Order management views |
| `api/views/supplier/settlements.py` | Settlement views |
| `api/views/supplier/analytics.py` | Analytics/reports views |
| `api/urls.py` | Add all supplier API routes |
| `services/supplier_service.py` | Business logic (settlements, inventory) |
| `celery_app/tasks/supplier_tasks.py` | Celery tasks (KPI snapshots, settlement calc) |

### Frontend (Next.js V4)
| File | Action |
|------|--------|
| `types/domain/supplier.ts` | All TypeScript type definitions |
| `hooks/useSupplier.ts` | 15+ SWR hooks |
| `components/supplier/SupplierPageLayout.tsx` | Sidebar navigation layout |
| `components/supplier/SupplierKPICard.tsx` | KPI card component |
| `components/supplier/ProductCatalogTable.tsx` | Product listing DataGrid |
| `components/supplier/InventoryTable.tsx` | Inventory grid |
| `components/supplier/OrderCard.tsx` | Order card component |
| `components/supplier/SettlementCard.tsx` | Settlement summary card |
| `components/supplier/charts/` | Revenue, Orders, Inventory charts |
| `app/(dashboards)/supplier/` | 12+ dashboard pages |
| `app/api/supplier/` | 15+ API route folders (proxy to Django) |

---

## Estimated Timeline

| Phase | Description | Hours | Priority |
|-------|-------------|-------|----------|
| 1 | Foundation (models + dashboard shell) | ~45h | **High** |
| 2 | Product Catalog & Inventory | ~40h | **High** |
| 3 | Order Management | ~45h | **High** |
| 4 | Settlements & Finance | ~38h | Medium |
| 5 | Analytics & Reports | ~33h | Medium |
| 6 | Affiliate Integration | ~27h | Lower |
| 7 | Brand Storefronts (B2B SaaS) | ~60h | **Strategic** |
| **Total** | | **~288h** | |

**Phase 7 breakdown:**
- Subscription plans + billing models: ~8h
- Storefront model + branding config: ~6h
- External member auth (separate from TWC): ~10h
- Storefront shop pages (branded catalog, cart, checkout): ~15h
- Subdomain routing middleware: ~5h
- Plan limit enforcement + Celery tasks: ~6h
- Founders dashboard (plans, storefronts, billing): ~10h

---

## Verification Plan

1. **Unit Tests**: Model tests, API view tests, serializer tests
2. **Integration Tests**: Full order flow (Order -> Inventory -> Settlement)
3. **Manual Testing**:
   - Create supplier, add products, manage inventory
   - Place test order as customer, process as supplier
   - Generate settlement, verify financial calculations
4. **Frontend Testing**:
   - All pages render without errors
   - Forms submit correctly
   - SWR data refreshes properly
   - Mobile responsive layout works

---

## Decisions Made

| # | Question | Decision | Notes |
|---|----------|----------|-------|
| 1 | **Multi-supplier products** | **Yes - Marketplace model** | Multiple suppliers can list the same product with different pricing and inventory |
| 2 | **Settlement frequency** | **Weekly (existing)** | Already configured: Celery Beat runs every Sunday at 10 PM. Framework exists in `finance/tasks.py:771-853` but calculation logic is placeholder - needs wiring to actual order data |
| 3 | **Commission tiers** | **Multi-tier (sponsor chain)** | Commission splits between direct referrer + sponsor + diamond coach |
| 4 | **Data migration** | **Auto-migrate existing suppliers** | Link existing Vendors to Suppliers by TIN/name matching, preserve current data |
| 5 | **Brand vs Independent pricing** | **Two supplier categories** | Brand suppliers (Sante, Live4More, etc.) have **fixed platform pricing** - they CANNOT update retail price. Independent/marketplace suppliers CAN set their own pricing. Controlled via `supplier_category` field on Supplier model. |
| 6 | **Pricing change approval** | **Founder review required** | Independent supplier price changes go to a pending state and must be approved by a founder before going live. Prevents unauthorized price manipulation. |
| 7 | **Brand supplier storefronts** | **B2B SaaS with subdomains** | Brand suppliers (Sante branches, etc.) get their own storefront at `{name}.twcako.com`. Their external members (non-TWC) register and purchase there. ManyChat-style tiered plans with member limits managed by Founders. |
| 8 | **External member model** | **Purchase only, no MLM** | External members on brand storefronts can only browse and buy. No commissions, no referral structure. Simple customer accounts. |
| 9 | **Storefront routing** | **Subdomain-based** | Next.js middleware detects subdomain and renders branded storefront. Separate login/auth from main TWC platform. |

## Existing Settlement Infrastructure (Already Built)

The settlement framework already exists and does NOT need to be rebuilt from scratch:

| Component | Status | Location |
|-----------|--------|----------|
| `SupplierSettlement` model | Built (needs FK upgrade) | `finance/models.py:689-735` |
| Celery task (weekly Sunday 10PM) | Built (placeholder calc) | `finance/tasks.py:771-853` |
| Settlement List API | Built | `GET /api/finance/settlements/` |
| Settlement Detail API | Built | `GET /api/finance/settlements/<id>/` |
| Settlement Actions API | Built | `POST /api/finance/settlements/<id>/action/` |
| Manual Calculate API | Built | `POST /api/finance/settlements/calculate/` |
| Approval workflow integration | Built | Submits to ApprovalQueueItem |
| Audit logging | Built | `finance/audit.py:48-121` |
| Status flow | Built | calculating -> pending_review -> approved -> paid |

**What Phase 4 actually needs**: Wire calculation to real order data, upgrade `supplier_id` int to proper FK, add `SettlementLineItem` for per-order breakdown, and build V4 frontend pages.

---

## Future: Founders Control Module (Post-Finance)

> **NOTE**: A dedicated Founders Module will be built after Finance is complete. All supplier/merchant features should be designed with centralized founder oversight in mind.

**What this means for Supplier module design decisions NOW:**
- All approval endpoints (price changes, settlements, disputes) should use a generic `is_founder` permission check — not hardcoded logic — so they can later be moved into a unified Founders Control Panel
- Admin/review pages (`/supplier/admin/*`) should be built as standalone components that can be re-mounted inside the future Founders dashboard
- API responses for approval queues should include a `module` field (e.g. `"supplier"`, `"finance"`) so the Founders module can aggregate across all modules
- Notification/alert creation should tag the `target_role = "founder"` so the Founders module can pull all pending actions in one view

**Anticipated Founders Module scope** (to be planned separately):
- Unified approval queue (pricing, settlements, member actions, finance approvals)
- Platform-wide KPI dashboard
- Supplier/member/affiliate oversight
- System configuration & policy management
- Audit log viewer across all modules

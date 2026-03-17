# Supplier Module - Database Models Reference

**Version:** 1.0
**Date:** 2026-03-02
**Total Models:** 10 new + 3 modified

---

## Table of Contents

1. [Overview](#overview)
2. [New Models (supplier app)](#new-models-supplier-app)
3. [Modified Models (existing apps)](#modified-models-existing-apps)
4. [Relationships Diagram](#relationships-diagram)
5. [Indexes & Constraints](#indexes--constraints)

---

## Overview

### Model Count

| Category | Models | App |
|----------|--------|-----|
| Catalog & Inventory | 3 | `supplier` |
| Analytics | 1 | `supplier` |
| Price Approval | 1 | `supplier` |
| B2B SaaS / Storefront | 5 | `supplier` |
| Modified (existing) | 3 | `accounts`, `shops`, `finance` |
| **Total** | **13** | |

### Migration Files

| File | App | Changes |
|------|-----|---------|
| `supplier/0001_initial.py` | supplier | 10 new tables |
| `accounts/0331_*.py` | accounts | Added `supplier_category` to Supplier |
| `shops/0137_*.py` | shops | Added `primary_supplier` FK to Product |
| `finance/0007_*.py` | finance | Added `supplier` FK to Vendor |

---

## New Models (supplier app)

### 1. SupplierProduct

Links suppliers to products in the marketplace model. Multiple suppliers can list the same product with different pricing.

```python
class SupplierProduct(models.Model):
    supplier        = ForeignKey('accounts.Supplier', CASCADE, related_name='supplier_products')
    product         = ForeignKey('shops.Product', CASCADE, related_name='supplier_listings')
    supplier_price  = DecimalField(max_digits=14, decimal_places=2)  # Cost/COGS
    retail_price    = DecimalField(max_digits=14, decimal_places=2, null=True)  # Override (independent only)
    commission_type = CharField(max_length=20, choices=COMMISSION_TYPE_CHOICES, default='percentage')
    commission_rate = DecimalField(max_digits=5, decimal_places=2, default=0)
    is_active       = BooleanField(default=True)
    is_featured     = BooleanField(default=False)
    priority        = PositiveIntegerField(default=0)
    created_at      = DateTimeField(auto_now_add=True)
    updated_at      = DateTimeField(auto_now=True)
```

**Purpose:** Marketplace product listing per supplier with independent pricing and commission configuration.

**Constraints:** `unique_together = ['supplier', 'product']`

**Computed Properties:**
- `effective_retail_price` — Returns override price or product default
- `margin` — Retail price minus supplier cost
- `margin_pct` — Margin as percentage

---

### 2. SupplierInventory

Per-supplier stock tracking with automated available quantity calculation.

```python
class SupplierInventory(models.Model):
    supplier_product   = OneToOneField(SupplierProduct, CASCADE, related_name='inventory')
    quantity_on_hand   = PositiveIntegerField(default=0)
    quantity_reserved  = PositiveIntegerField(default=0)  # Reserved for pending orders
    quantity_available = PositiveIntegerField(default=0)  # Computed: on_hand - reserved
    reorder_point      = PositiveIntegerField(default=10)
    reorder_quantity   = PositiveIntegerField(default=50)
    max_stock          = PositiveIntegerField(null=True, blank=True)
    last_restock_date  = DateTimeField(null=True, blank=True)
    last_sold_date     = DateTimeField(null=True, blank=True)
    turnover_rate      = DecimalField(max_digits=8, decimal_places=2, default=0)
    days_of_stock      = PositiveIntegerField(default=0)
    updated_at         = DateTimeField(auto_now=True)
```

**Purpose:** Track real-time stock levels per supplier-product pair.

**Computed Properties:**
- `is_low_stock` — `quantity_available <= reorder_point`
- `is_out_of_stock` — `quantity_available == 0`

**Built-in Methods:**
- `reserve(qty)` — Reserve stock for pending order (raises ValueError if insufficient)
- `unreserve(qty)` — Release reserved stock (cancelled order)
- `deduct(qty)` — Deduct after delivery (from both on_hand and reserved)
- `restock(qty)` — Add incoming stock

**Auto-compute:** `quantity_available` is recalculated on every `save()`.

---

### 3. InventoryMovement

Full audit trail for every inventory change.

```python
class InventoryMovement(models.Model):
    inventory       = ForeignKey(SupplierInventory, CASCADE, related_name='movements')
    movement_type   = CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES)
    quantity         = IntegerField()  # Positive = increase, negative = decrease
    quantity_before  = PositiveIntegerField()
    quantity_after   = PositiveIntegerField()
    reference_type   = CharField(max_length=50, blank=True)  # e.g. 'order', 'restock'
    reference_id     = CharField(max_length=100, blank=True)
    notes            = TextField(blank=True)
    created_by       = ForeignKey(User, SET_NULL, null=True)
    created_at       = DateTimeField(auto_now_add=True)
```

**Purpose:** Immutable audit log for all stock changes.

**Movement Types:** `purchase`, `sale`, `return`, `adjustment`, `transfer`, `damage`, `reserve`, `unreserve`

---

### 4. SupplierKPI

Daily snapshot of supplier performance metrics. Populated by Celery task.

```python
class SupplierKPI(models.Model):
    supplier             = ForeignKey('accounts.Supplier', CASCADE, related_name='kpi_snapshots')
    date                 = DateField()
    orders_received      = PositiveIntegerField(default=0)
    orders_completed     = PositiveIntegerField(default=0)
    orders_cancelled     = PositiveIntegerField(default=0)
    orders_returned      = PositiveIntegerField(default=0)
    gross_revenue        = DecimalField(max_digits=14, decimal_places=2, default=0)
    net_revenue          = DecimalField(max_digits=14, decimal_places=2, default=0)
    commission_paid      = DecimalField(max_digits=14, decimal_places=2, default=0)
    platform_fees        = DecimalField(max_digits=14, decimal_places=2, default=0)
    avg_fulfillment_hours = DecimalField(max_digits=8, decimal_places=2, null=True)
    on_time_rate         = DecimalField(max_digits=5, decimal_places=2, default=0)
    total_sku_count      = PositiveIntegerField(default=0)
    low_stock_sku_count  = PositiveIntegerField(default=0)
    out_of_stock_count   = PositiveIntegerField(default=0)
    created_at           = DateTimeField(auto_now_add=True)
```

**Purpose:** Historical performance data for analytics dashboards and trend charts.

**Constraints:** `unique_together = ['supplier', 'date']`

---

### 5. PriceChangeRequest

Founder-approved pricing changes for independent suppliers.

```python
class PriceChangeRequest(models.Model):
    supplier_product = ForeignKey(SupplierProduct, CASCADE, related_name='price_change_requests')
    requested_by     = ForeignKey(User, CASCADE, related_name='price_change_requests')
    current_price    = DecimalField(max_digits=14, decimal_places=2)
    requested_price  = DecimalField(max_digits=14, decimal_places=2)
    reason           = TextField(blank=True)
    status           = CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by      = ForeignKey(User, SET_NULL, null=True, related_name='reviewed_price_changes')
    reviewed_at      = DateTimeField(null=True)
    rejection_reason = TextField(blank=True)
    created_at       = DateTimeField(auto_now_add=True)
    updated_at       = DateTimeField(auto_now=True)
```

**Purpose:** Ensure all pricing changes are reviewed by founders before going live.

**Status Flow:** `pending` -> `approved` / `rejected`

**Built-in Methods:**
- `approve(reviewer)` — Sets status, auto-updates `supplier_product.retail_price`
- `reject(reviewer, reason)` — Sets status and rejection reason

**Rules:**
- Only independent suppliers (`supplier_category='independent'`) can create these
- Brand suppliers cannot request price changes (enforced in API)
- Only one pending request per product at a time

---

### 6. SupplierPlan

Tiered subscription plans for brand supplier storefronts (ManyChat-style).

```python
class SupplierPlan(models.Model):
    name                = CharField(max_length=100)
    slug                = SlugField(unique=True)
    description         = TextField(blank=True)
    max_members         = PositiveIntegerField()  # 0 = unlimited
    monthly_price       = DecimalField(max_digits=14, decimal_places=2)
    transaction_fee_pct = DecimalField(max_digits=5, decimal_places=2, default=5.00)
    features            = JSONField(default=dict)  # Feature flags per plan
    is_active           = BooleanField(default=True)
    sort_order          = PositiveIntegerField(default=0)
    created_at          = DateTimeField(auto_now_add=True)
    updated_at          = DateTimeField(auto_now=True)
```

**Purpose:** Define pricing tiers for the B2B SaaS storefront feature. Managed by founders.

---

### 7. SupplierSubscription

A supplier's active subscription to a storefront plan.

```python
class SupplierSubscription(models.Model):
    supplier             = OneToOneField('accounts.Supplier', CASCADE, related_name='subscription')
    plan                 = ForeignKey(SupplierPlan, PROTECT, related_name='subscriptions')
    status               = CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    current_member_count = PositiveIntegerField(default=0)
    started_at           = DateTimeField(default=timezone.now)
    expires_at           = DateTimeField(null=True)
    billing_cycle_day    = PositiveSmallIntegerField(default=1)  # 1-28
    last_billed_at       = DateTimeField(null=True)
    next_billing_at      = DateTimeField(null=True)
    created_at           = DateTimeField(auto_now_add=True)
    updated_at           = DateTimeField(auto_now=True)
```

**Purpose:** Track which plan a supplier is on, their usage, and billing cycle.

**Status Values:** `active`, `past_due`, `cancelled`, `suspended`

**Computed Properties:**
- `is_at_limit` — Member count has reached plan max
- `usage_pct` — Percentage of plan capacity used
- `is_near_limit` — Usage >= 80%

---

### 8. SupplierStorefront

Branded storefront configuration for brand suppliers.

```python
class SupplierStorefront(models.Model):
    supplier         = OneToOneField('accounts.Supplier', CASCADE, related_name='storefront')
    subdomain        = CharField(max_length=63, unique=True)  # e.g. "sante-manila"
    custom_domain    = CharField(max_length=255, null=True)   # Future: shop.santebarley.com
    store_name       = CharField(max_length=200)
    tagline          = CharField(max_length=255, blank=True)
    logo             = ImageField(upload_to='storefronts/logos/', null=True)
    banner_image     = ImageField(upload_to='storefronts/banners/', null=True)
    primary_color    = CharField(max_length=7, default='#e1c340')
    accent_color     = CharField(max_length=7, default='#1a1a2e')
    description      = TextField(blank=True)
    contact_email    = EmailField(blank=True)
    contact_phone    = CharField(max_length=50, blank=True)
    meta_title       = CharField(max_length=200, blank=True)
    meta_description = TextField(blank=True)
    is_active        = BooleanField(default=True)
    created_at       = DateTimeField(auto_now_add=True)
    updated_at       = DateTimeField(auto_now=True)
```

**Purpose:** Configure branded storefronts at `{subdomain}.twcako.com`.

**Computed Properties:**
- `url` — Returns full storefront URL (custom domain or subdomain)

---

### 9. ExternalMember

Non-TWC members who belong to a brand supplier's network.

```python
class ExternalMember(models.Model):
    storefront   = ForeignKey(SupplierStorefront, CASCADE, related_name='members')
    email        = EmailField()
    first_name   = CharField(max_length=150)
    last_name    = CharField(max_length=150)
    phone        = CharField(max_length=50, blank=True)
    password     = CharField(max_length=128)  # Hashed, separate from TWC auth
    is_active    = BooleanField(default=True)
    is_verified  = BooleanField(default=False)
    referred_by  = ForeignKey('self', SET_NULL, null=True)  # Simple referral, not MLM
    total_orders = PositiveIntegerField(default=0)
    total_spent  = DecimalField(max_digits=14, decimal_places=2, default=0)
    joined_at    = DateTimeField(auto_now_add=True)
    last_login   = DateTimeField(null=True)
```

**Purpose:** Purchase-only accounts on brand storefronts. No commissions, no MLM.

**Constraints:** `unique_together = ['storefront', 'email']`

---

### 10. ExternalOrder

Orders placed by external members on brand storefronts.

```python
class ExternalOrder(models.Model):
    storefront        = ForeignKey(SupplierStorefront, CASCADE, related_name='orders')
    external_member   = ForeignKey(ExternalMember, CASCADE, related_name='orders')
    order_number      = CharField(max_length=50, unique=True)
    items             = JSONField()  # [{sku, name, qty, price, total}]
    subtotal          = DecimalField(max_digits=14, decimal_places=2)
    shipping_fee      = DecimalField(max_digits=14, decimal_places=2, default=0)
    transaction_fee   = DecimalField(max_digits=14, decimal_places=2, default=0)
    total             = DecimalField(max_digits=14, decimal_places=2)
    status            = CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    shipping_address  = TextField()
    payment_method    = CharField(max_length=50)
    payment_reference = CharField(max_length=255, blank=True)
    internal_order    = ForeignKey('orders.ProductOrder', SET_NULL, null=True)
    created_at        = DateTimeField(auto_now_add=True)
    updated_at        = DateTimeField(auto_now=True)
```

**Purpose:** Link external storefront orders to the internal fulfillment pipeline.

**Status Values:** `pending`, `processing`, `shipped`, `delivered`, `returned`, `cancelled`

---

## Modified Models (existing apps)

### Supplier (accounts/models.py)

**Added field:**
```python
supplier_category = CharField(
    max_length=20,
    choices=[('brand', 'Brand / Fixed Pricing'), ('independent', 'Independent / Marketplace')],
    default='brand',
)
```

**Impact:** Determines whether a supplier can set their own pricing or uses platform-fixed pricing.

---

### Product (shops/models.py)

**Added field:**
```python
primary_supplier = ForeignKey(
    'accounts.Supplier', SET_NULL, null=True, blank=True,
    related_name='primary_products',
)
```

**Impact:** Links products to their primary supplier. The `SupplierProduct` model handles the full marketplace relationship; this field is for quick lookups.

---

### Vendor (finance/models.py)

**Added field:**
```python
supplier = OneToOneField(
    'accounts.Supplier', SET_NULL, null=True, blank=True,
    related_name='vendor_profile',
)
```

**Impact:** Connects the Finance module's Vendor entity to the operational Supplier, enabling settlement integration.

---

## Relationships Diagram

```
accounts.Supplier (existing)
    |
    +-- supplier_category ('brand' | 'independent')
    |
    +--< SupplierProduct >-- shops.Product (existing)
    |       |
    |       +-- SupplierInventory (1:1)
    |       |       |
    |       |       +--< InventoryMovement
    |       |
    |       +--< PriceChangeRequest
    |
    +--< SupplierKPI (daily snapshots)
    |
    +-- SupplierSubscription (1:1) --> SupplierPlan
    |
    +-- SupplierStorefront (1:1)
    |       |
    |       +--< ExternalMember
    |       |
    |       +--< ExternalOrder --> orders.ProductOrder (existing)
    |
    +-- finance.Vendor (1:1, via vendor_profile)
    |
    +--< shops.Product (via primary_products)
```

**Legend:** `--<` = one-to-many, `-->` = foreign key, `(1:1)` = one-to-one

---

## Indexes & Constraints

| Model | Index/Constraint | Type |
|-------|-----------------|------|
| SupplierProduct | `(supplier, product)` | Unique together |
| SupplierProduct | `is_active` | DB index |
| SupplierInventory | `supplier_product` | OneToOne (unique) |
| InventoryMovement | `movement_type` | DB index |
| InventoryMovement | `created_at` | DB index |
| SupplierKPI | `(supplier, date)` | Unique together |
| SupplierKPI | `date` | DB index |
| PriceChangeRequest | `status` | DB index |
| SupplierPlan | `slug` | Unique |
| SupplierPlan | `is_active` | DB index |
| SupplierSubscription | `supplier` | OneToOne (unique) |
| SupplierSubscription | `status` | DB index |
| SupplierStorefront | `subdomain` | Unique + DB index |
| SupplierStorefront | `is_active` | DB index |
| ExternalMember | `(storefront, email)` | Unique together |
| ExternalMember | `email` | DB index |
| ExternalMember | `is_active` | DB index |
| ExternalOrder | `order_number` | Unique + DB index |
| ExternalOrder | `status` | DB index |

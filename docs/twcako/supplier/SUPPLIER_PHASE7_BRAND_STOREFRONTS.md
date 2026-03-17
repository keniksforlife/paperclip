# Phase 7: Brand Storefronts (B2B SaaS) — Implementation Plan

> Last updated: 2026-03-03
> Status: IN PROGRESS
> Estimated effort: ~60 hours across 4 milestones

## Context

Supplier Phases 1-6 are complete. Phase 7 is the final supplier phase — turning TWCako into a B2B SaaS platform where brand suppliers get their own subdomain-based storefronts (`sante.twcako.com`) with external member registration, product catalog, and checkout.

All 5 Django models already exist in `supplier/models.py` (SupplierPlan, SupplierSubscription, SupplierStorefront, ExternalMember, ExternalOrder). Django admin is registered. Migration 0001_initial covers them.

**User decisions:** Incremental milestones, COD + GCash/Xendit payments, localStorage cart.

---

## Architecture

### Two Separate Auth Systems
1. **Django User JWT** (existing NextAuth) — for supplier dashboard management pages
2. **Custom ExternalMember JWT** (new, via `supplier/auth.py`) — for storefront customer pages

### Subdomain Routing
Next.js middleware: `sante.twcako.com/products` → internally rewrites to `/store/sante/products`.

### Data Flow
```
1. Brand supplier subscribes to plan (SupplierPlan)
2. Gets storefront: sante.twcako.com (SupplierStorefront)
3. External members register (ExternalMember)
4. Browse products (SupplierProduct → Product)
5. Checkout → ExternalOrder + internal ProductOrder
6. Supplier fulfills via existing order pipeline
7. TWC earns: subscription fee + transaction_fee_pct per order
```

---

## Milestone A: Backend APIs + Supplier Dashboard (Start Here)

### A1. ExternalMember Auth Utility

**File: `supplier/auth.py`** (NEW)

| Function | Description |
|----------|-------------|
| `generate_external_member_token(member)` | Returns `{access, refresh}` using PyJWT with `ext_member_id` + `storefront_id` claims |
| `verify_external_member_token(token)` | Decodes token, returns ExternalMember or None |
| `ExternalMemberAuthentication` | DRF BaseAuthentication class for storefront views |

- Access token: 24h expiry, Refresh: 30d
- Uses `settings.SECRET_KEY` with distinct `token_type: "storefront_access"` to prevent cross-auth

### A2. Storefront Management APIs (Supplier-authenticated)

**File: `api/views/storefront_management.py`** (NEW)

| Method | URL | Description |
|--------|-----|-------------|
| GET/PUT | `/api/supplier/storefront/` | Get/update storefront config |
| POST | `/api/supplier/storefront/logo/` | Upload logo |
| POST | `/api/supplier/storefront/banner/` | Upload banner |
| GET | `/api/supplier/storefront/members/` | List external members (paginated) |
| GET/PATCH | `/api/supplier/storefront/members/<id>/` | Member detail, toggle active |
| GET | `/api/supplier/subscription/` | Current subscription details |
| POST | `/api/supplier/subscription/change-plan/` | Request plan change |
| GET | `/api/supplier/subscription/plans/` | List available plans |

### A3. Public Storefront APIs

**File: `api/views/storefront_public.py`** (NEW)

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| GET | `/api/store/<subdomain>/config/` | AllowAny | Storefront branding |
| GET | `/api/store/<subdomain>/products/` | AllowAny | Product catalog |
| GET | `/api/store/<subdomain>/products/<id>/` | AllowAny | Product detail |
| POST | `/api/store/<subdomain>/auth/register/` | AllowAny | Register ExternalMember |
| POST | `/api/store/<subdomain>/auth/login/` | AllowAny | Login → custom JWT |
| POST | `/api/store/<subdomain>/auth/refresh/` | AllowAny | Refresh token |
| GET/PUT | `/api/store/<subdomain>/auth/me/` | ExtMember JWT | Profile |
| POST | `/api/store/<subdomain>/checkout/` | ExtMember JWT | Place order |
| GET | `/api/store/<subdomain>/orders/` | ExtMember JWT | Order history |
| GET | `/api/store/<subdomain>/orders/<order_number>/` | ExtMember JWT | Order detail |

### A4. Founder Admin APIs

**File: `api/views/storefront_admin.py`** (NEW)

| Method | URL | Description |
|--------|-----|-------------|
| GET/POST | `/api/supplier/admin/plans/` | List/create plans |
| PUT | `/api/supplier/admin/plans/<slug>/` | Update plan |
| GET | `/api/supplier/admin/storefronts/` | All storefronts with stats |
| GET | `/api/supplier/admin/storefronts/<id>/` | Storefront detail |

### A5. URL Registration

**File: `api/urls.py`** (MODIFY) — Add ~26 new URL patterns after line ~533.

### A6. V4 Supplier Dashboard Pages

| File | Description |
|------|-------------|
| `types/domain/storefront.ts` (NEW) | ~120 lines: StorefrontConfig, StorefrontMember, SubscriptionInfo, SupplierPlanInfo, ExternalOrder |
| `hooks/useStorefront.ts` (NEW) | 5 SWR hooks |
| `app/api/supplier/storefront/*` (NEW) | 8 API route proxies |
| `supplier/storefront/page.tsx` (REPLACE) | StorefrontSettingsClient |
| `supplier/storefront/members/page.tsx` (REPLACE) | StorefrontMembersClient |
| `supplier/storefront/subscription/page.tsx` (REPLACE) | SubscriptionClient |

---

## Milestone B: Subdomain Routing + Storefront Layout + Browsing

### B1. Next.js Middleware

**File: `TWCAKOV4/src/middleware.ts`** (NEW)
- Parse `Host` header for subdomain
- Skip main domains (twcako.com, localhost, Railway patterns)
- Rewrite `sante.twcako.com/products` → `/store/sante/products`
- Merge existing `proxy.ts` logic for non-storefront routes

### B2. Storefront Route Group

**Directory: `app/store/[subdomain]/`** — separate from `(dashboards)`, no sidebar, no NextAuth

```
app/store/[subdomain]/
  layout.tsx           → Fetches config, creates MUI theme, branded header/footer
  page.tsx             → Landing page (hero banner, featured products)
  products/
    page.tsx           → Product catalog grid with search/filter
    [productId]/
      page.tsx         → Product detail with images, Add to Cart
```

### B3. React Contexts

| File | Description |
|------|-------------|
| `context/StorefrontContext.tsx` (NEW) | subdomain, config, theme |
| `context/CartContext.tsx` (NEW) | localStorage cart: items, addItem, removeItem, updateQuantity, clearCart, subtotal |

### B4. Storefront Components

**Directory: `components/storefront/`**

| Component | Description |
|-----------|-------------|
| StorefrontHeader.tsx | Logo, store name, nav: Products / Cart / Login |
| StorefrontFooter.tsx | Contact info, branding |
| ProductCard.tsx | Image, name, price, Add to Cart button |
| ProductGrid.tsx | Responsive grid with pagination |
| ProductDetailView.tsx | Full product page |

### B5. Public V4 API Routes

3 routes under `app/api/store/[subdomain]/` — do NOT use NextAuth, pass-through to Django.

---

## Milestone C: Auth, Cart, Checkout, Orders

### C1. External Member Auth Pages

| Page | Description |
|------|-------------|
| `store/[subdomain]/login/page.tsx` | Email + password form |
| `store/[subdomain]/register/page.tsx` | Name, email, phone, password |
| `context/StorefrontAuthContext.tsx` | ExternalMember JWT in localStorage |

### C2. Cart + Checkout Pages

| Page | Description |
|------|-------------|
| `store/[subdomain]/cart/page.tsx` | Cart items, qty adjustment, Proceed to Checkout |
| `store/[subdomain]/checkout/page.tsx` | Shipping address, payment method (COD/GCash/Xendit), Place Order |

### C3. Checkout Flow (Django)

1. Validate ExternalMember JWT + storefront ownership
2. Validate cart items against SupplierProduct (active, in stock, prices)
3. Calculate `transaction_fee = subtotal * plan.transaction_fee_pct / 100`
4. Create CustomerProfile (uses `name`, `postal_code` — NOT `first_name`/`zip_code`)
5. Create ProductOrder (internal, for supplier fulfillment pipeline)
6. Create OrderItems per line item
7. Create ExternalOrder (customer-facing, with items JSONField snapshot)
8. Reserve inventory via `SupplierInventory.reserve(qty)`
9. For Xendit: create invoice and return `payment_url`

### C4. Account Pages

| Page | Description |
|------|-------------|
| `store/[subdomain]/account/page.tsx` | Profile + order list |
| `store/[subdomain]/account/orders/[orderNumber]/page.tsx` | Order detail with status timeline |

### C5. Celery Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| `sync_external_order_status` | Every 15 min | Sync ExternalOrder.status from ProductOrder.status |
| `update_external_member_metrics` | On delivery | Update total_orders, total_spent |

---

## Milestone D: Plan Enforcement + Billing + Polish

### D1. Celery Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| `check_subscription_limits` | Daily | Warn at 80%, suspend past-due/cancelled |
| `process_subscription_billing` | Monthly | Billing cycle, update dates, flag past-due |

### D2. Registration Enforcement
Check `subscription.is_at_limit` before creating member, return 403.

### D3. Founder Billing Dashboard
`supplier/storefront/billing/page.tsx` — MRR, transaction revenue, subscribers by plan.

### D4. Email Notifications (SendGrid)
Welcome, order confirmation, shipped, delivered.

### D5. Mobile Responsiveness
Mobile: 1-col, Tablet: 2-col, Desktop: 3-4 col.

---

## Key Gotchas

1. **ExternalMember unique_together**: `['storefront', 'email']` — JWT must include `storefront_id`
2. **CustomerProfile fields**: Uses `name`/`postal_code`, NOT `first_name`/`zip_code`
3. **ExternalOrder.items**: JSONField snapshot at checkout time
4. **transaction_fee**: From `SupplierSubscription.plan.transaction_fee_pct`, not hardcoded
5. **Next.js 16 params**: `params` is Promise, must `await params`
6. **Middleware matcher**: Must NOT match `/api/` or `/_next/`
7. **Product images**: `image_1` through `image_5`, stored in S3
8. **ProductOrder.purchase_date**: Use this for order date (no `date_ordered` field)

---

## API Endpoint Summary (26 new endpoints)

### Supplier Dashboard (8 endpoints, IsAuthenticated+IsSupplierUser)
```
GET/PUT  /api/supplier/storefront/
POST     /api/supplier/storefront/logo/
POST     /api/supplier/storefront/banner/
GET      /api/supplier/storefront/members/
GET/PATCH /api/supplier/storefront/members/<id>/
GET      /api/supplier/subscription/
POST     /api/supplier/subscription/change-plan/
GET      /api/supplier/subscription/plans/
```

### Public Storefront (10 endpoints, AllowAny or ExternalMember JWT)
```
GET      /api/store/<subdomain>/config/
GET      /api/store/<subdomain>/products/
GET      /api/store/<subdomain>/products/<id>/
POST     /api/store/<subdomain>/auth/register/
POST     /api/store/<subdomain>/auth/login/
POST     /api/store/<subdomain>/auth/refresh/
GET/PUT  /api/store/<subdomain>/auth/me/
POST     /api/store/<subdomain>/checkout/
GET      /api/store/<subdomain>/orders/
GET      /api/store/<subdomain>/orders/<order_number>/
```

### Founder Admin (4 endpoints, IsFounder)
```
GET/POST /api/supplier/admin/plans/
PUT      /api/supplier/admin/plans/<slug>/
GET      /api/supplier/admin/storefronts/
GET      /api/supplier/admin/storefronts/<id>/
```

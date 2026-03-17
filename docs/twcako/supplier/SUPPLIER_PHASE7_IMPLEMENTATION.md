# Phase 7: Brand Storefronts — Implementation Guide

> Last updated: 2026-03-03
> Status: COMPLETE (All 4 Milestones)
> Files created: 40+ across Django + Next.js

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Django Backend](#django-backend)
   - [ExternalMember Auth System](#externalmember-auth-system)
   - [API Endpoints Reference](#api-endpoints-reference)
   - [Celery Tasks](#celery-tasks)
3. [V4 Frontend](#v4-frontend)
   - [Middleware & Subdomain Routing](#middleware--subdomain-routing)
   - [Storefront Pages](#storefront-pages)
   - [Supplier Dashboard Pages](#supplier-dashboard-pages)
   - [API Route Proxies](#api-route-proxies)
   - [React Contexts](#react-contexts)
   - [SWR Hooks](#swr-hooks)
   - [TypeScript Types](#typescript-types)
4. [Data Flow](#data-flow)
   - [Registration Flow](#registration-flow)
   - [Checkout Flow](#checkout-flow)
   - [Order Status Sync](#order-status-sync)
   - [Subscription Enforcement](#subscription-enforcement)
5. [File Index](#file-index)
6. [Key Gotchas](#key-gotchas)

---

## Architecture Overview

Phase 7 introduces a **B2B SaaS layer** on top of TWCako. Brand suppliers get their own subdomain-based storefronts (`sante.twcako.com`) where external customers can browse products, register, and place orders — completely separate from the main TWC member platform.

### Two Auth Systems

| System | Users | Token | Storage | Pages |
|--------|-------|-------|---------|-------|
| **Django User JWT** (NextAuth) | TWC members, suppliers, founders | NextAuth session | HttpOnly cookies | `/dashboard/*`, `/supplier/*` |
| **ExternalMember JWT** (custom) | Storefront customers | PyJWT `storefront_access` | localStorage | `/store/[subdomain]/*` |

These systems are fully isolated — a storefront JWT cannot access supplier endpoints and vice versa.

### Two Cart Systems

| System | Persistence | Scope |
|--------|------------|-------|
| **Main CartContext** | Cookie + SWR + Django API | TWC eshop |
| **StorefrontCartContext** | localStorage (`storefront_cart_{subdomain}`) | Per-storefront |

### Order Integration

Storefront orders create **both** an `ExternalOrder` (customer-facing) **and** a `ProductOrder` (internal). The internal order enters the existing supplier fulfillment pipeline. A Celery task syncs status changes back to the external order every 15 minutes.

```
ExternalMember → ExternalOrder ←→ ProductOrder → Supplier Dashboard
                 (customer)         (internal)     (fulfillment)
```

---

## Django Backend

### ExternalMember Auth System

**File:** `supplier/auth.py`

| Function/Class | Purpose |
|----------------|---------|
| `generate_external_member_token(member)` | Returns `{access, refresh}` JWT pair |
| `verify_external_member_token(token, type)` | Validates JWT, returns `ExternalMember` or `None` |
| `ExternalMemberAuthentication` | DRF auth class — reads Bearer token, sets `request.user` to ExternalMember |

**Token Claims:**
- `token_type`: `"storefront_access"` or `"storefront_refresh"` (prevents cross-auth)
- `ext_member_id`: ExternalMember PK
- `storefront_id`: SupplierStorefront PK
- `exp`: Expiry (24h access, 30d refresh)

**Security:**
- Uses `settings.SECRET_KEY` with HS256
- `unique_together = ['storefront', 'email']` — same email can exist on different storefronts
- JWT must include matching `storefront_id` to prevent cross-storefront access

---

### API Endpoints Reference

#### Supplier Storefront Management (8 endpoints)

All require `IsAuthenticated + IsSupplierUser`. Admin mode supported.

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/supplier/storefront/` | Get storefront config |
| `PUT` | `/api/supplier/storefront/` | Update storefront config (auto-creates if none) |
| `POST` | `/api/supplier/storefront/logo/` | Upload logo (multipart) |
| `POST` | `/api/supplier/storefront/banner/` | Upload banner (multipart) |
| `GET` | `/api/supplier/storefront/members/` | List external members (paginated, searchable) |
| `GET/PATCH` | `/api/supplier/storefront/members/<id>/` | Member detail / toggle active |
| `GET` | `/api/supplier/subscription/` | Current subscription details |
| `POST` | `/api/supplier/subscription/change-plan/` | Change plan (body: `{plan_slug}`) |
| `GET` | `/api/supplier/subscription/plans/` | List available plans |

**View file:** `api/views/storefront_management.py`

#### Public Storefront (10 endpoints)

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `GET` | `/api/store/<subdomain>/config/` | AllowAny | Storefront branding |
| `GET` | `/api/store/<subdomain>/products/` | AllowAny | Product catalog (24/page) |
| `GET` | `/api/store/<subdomain>/products/<id>/` | AllowAny | Product detail + images |
| `POST` | `/api/store/<subdomain>/auth/register/` | AllowAny | Register → JWT |
| `POST` | `/api/store/<subdomain>/auth/login/` | AllowAny | Login → JWT |
| `POST` | `/api/store/<subdomain>/auth/refresh/` | AllowAny | Refresh token |
| `GET/PUT` | `/api/store/<subdomain>/auth/me/` | ExtMember JWT | Profile |
| `POST` | `/api/store/<subdomain>/checkout/` | ExtMember JWT | Place order |
| `GET` | `/api/store/<subdomain>/orders/` | ExtMember JWT | Order history |
| `GET` | `/api/store/<subdomain>/orders/<order_number>/` | ExtMember JWT | Order detail |

**View file:** `api/views/storefront_public.py`

#### Founder Admin (4 endpoints)

All require `IsAuthenticated + IsFounder`.

| Method | URL | Description |
|--------|-----|-------------|
| `GET/POST` | `/api/supplier/admin/plans/` | List/create plans |
| `PUT` | `/api/supplier/admin/plans/<slug>/` | Update plan |
| `GET` | `/api/supplier/admin/storefronts/` | All storefronts with stats |
| `GET` | `/api/supplier/admin/storefronts/<id>/` | Storefront detail |

**View file:** `api/views/storefront_admin.py`

---

### Celery Tasks

**File:** `supplier/tasks.py` (appended at end)

| Task Name | Schedule | Description |
|-----------|----------|-------------|
| `sync_external_order_status` | Every 15 min | Syncs `ExternalOrder.status` from linked `ProductOrder.status` |
| `update_external_member_metrics` | Daily | Updates `total_orders` + `total_spent` on delivered orders |
| `check_subscription_limits` | Daily | Warns at 80% usage, suspends past-due (>7 days) subscriptions |
| `process_subscription_billing` | On billing day | Updates `last_billed_at` + `next_billing_at` |

**Status Mapping (internal → external):**

| ProductOrder Status | ExternalOrder Status |
|--------------------|---------------------|
| `pending` | `pending` |
| `afs`, `processing` | `processing` |
| `shipping` | `shipped` |
| `delivered` | `delivered` |
| `returned` | `returned` |
| `rejected`, `rts` | `cancelled` |

---

## V4 Frontend

### Middleware & Subdomain Routing

**File:** `TWCAKOV4/src/middleware.ts`

The middleware detects brand subdomains and rewrites URLs:

```
sante.twcako.com/products → /store/sante/products (internal)
sante.localhost:3000/cart  → /store/sante/cart     (local dev)
```

**Main domains (no rewrite):** `twcako.com`, `www.twcako.com`, `*.up.railway.app`, `*.trycloudflare.com`, `localhost`

**Also handles:** sponsor cookie logic from the original `proxy.ts`.

**Matcher:** `/((?!_next|favicon.ico|images|api|monitoring|sw\\.js|workbox-).*)` — skips static assets and API routes.

---

### Storefront Pages

**Route group:** `TWCAKOV4/src/app/store/[subdomain]/`

| Page | Path | Description |
|------|------|-------------|
| Landing | `/store/[subdomain]/` | Hero banner, featured products, about section |
| Products | `/store/[subdomain]/products` | Product grid with search, pagination |
| Product Detail | `/store/[subdomain]/products/[productId]` | Images, description, quantity selector, add to cart |
| Login | `/store/[subdomain]/login` | Email + password form |
| Register | `/store/[subdomain]/register` | Name, email, phone, password form |
| Cart | `/store/[subdomain]/cart` | Cart items, quantity adjust, order summary |
| Checkout | `/store/[subdomain]/checkout` | Shipping address, payment method (COD/GCash/Xendit), place order |
| Account | `/store/[subdomain]/account` | Profile + order history table |
| Order Detail | `/store/[subdomain]/account/orders/[orderNumber]` | Status timeline, items, totals |

**Layout:** `StorefrontLayoutClient.tsx` wraps all pages with:
- `StorefrontProvider` (config + branding)
- `StorefrontAuthProvider` (JWT auth)
- `StorefrontCartProvider` (localStorage cart)
- Dynamic MUI theme (primary/accent colors from config)
- Branded header + footer

---

### Supplier Dashboard Pages

These replace the Phase 7 placeholder pages.

| Page | Path | Client Component | Description |
|------|------|-----------------|-------------|
| Storefront Settings | `/supplier/storefront` | `StorefrontSettingsClient.tsx` | Name, subdomain, colors, SEO, logo/banner upload, live preview |
| External Members | `/supplier/storefront/members` | `StorefrontMembersClient.tsx` | KPI cards, searchable table, detail dialog, toggle active |
| Subscription | `/supplier/storefront/subscription` | `SubscriptionClient.tsx` | Plan card, usage bar, billing info, plan comparison dialog |

---

### API Route Proxies

#### Supplier-authenticated (via NextAuth)

| Route | Methods | Django Endpoint |
|-------|---------|----------------|
| `/api/supplier/storefront` | GET, PUT | `/api/supplier/storefront/` |
| `/api/supplier/storefront/logo` | POST | `/api/supplier/storefront/logo/` |
| `/api/supplier/storefront/banner` | POST | `/api/supplier/storefront/banner/` |
| `/api/supplier/storefront/members` | GET | `/api/supplier/storefront/members/` |
| `/api/supplier/storefront/members/[memberId]` | GET, PATCH | `/api/supplier/storefront/members/<id>/` |
| `/api/supplier/subscription` | GET | `/api/supplier/subscription/` |
| `/api/supplier/subscription/change-plan` | POST | `/api/supplier/subscription/change-plan/` |
| `/api/supplier/subscription/plans` | GET | `/api/supplier/subscription/plans/` |

#### Public storefront (no NextAuth — pass-through)

| Route | Methods | Django Endpoint |
|-------|---------|----------------|
| `/api/store/[subdomain]/config` | GET | `/api/store/<subdomain>/config/` |
| `/api/store/[subdomain]/products` | GET | `/api/store/<subdomain>/products/` |
| `/api/store/[subdomain]/products/[id]` | GET | `/api/store/<subdomain>/products/<id>/` |
| `/api/store/[subdomain]/auth/register` | POST | `/api/store/<subdomain>/auth/register/` |
| `/api/store/[subdomain]/auth/login` | POST | `/api/store/<subdomain>/auth/login/` |
| `/api/store/[subdomain]/auth/refresh` | POST | `/api/store/<subdomain>/auth/refresh/` |
| `/api/store/[subdomain]/auth/me` | GET, PUT | `/api/store/<subdomain>/auth/me/` |
| `/api/store/[subdomain]/checkout` | POST | `/api/store/<subdomain>/checkout/` |
| `/api/store/[subdomain]/orders` | GET | `/api/store/<subdomain>/orders/` |
| `/api/store/[subdomain]/orders/[orderNumber]` | GET | `/api/store/<subdomain>/orders/<order_number>/` |

---

### React Contexts

| Context | File | Hook | Persistence |
|---------|------|------|-------------|
| `StorefrontContext` | `context/StorefrontContext.tsx` | `useStorefront()` | Fetched from API |
| `StorefrontCartContext` | `context/StorefrontCartContext.tsx` | `useStorefrontCart()` | `localStorage: storefront_cart_{subdomain}` |
| `StorefrontAuthContext` | `context/StorefrontAuthContext.tsx` | `useStorefrontAuth()` | `localStorage: sf_access_{subdomain}`, `sf_refresh_{subdomain}`, `sf_member_{subdomain}` |

**StorefrontCart methods:** `addItem()`, `removeItem()`, `updateQuantity()`, `clearCart()`, computed: `itemCount`, `subtotal`

**StorefrontAuth methods:** `login(email, password)`, `register(data)`, `logout()`, `getAuthHeaders()`

---

### SWR Hooks

**File:** `hooks/useStorefront.ts`

| Hook | Type | Key | Dedup |
|------|------|-----|-------|
| `useStorefrontConfig()` | `StorefrontConfig` | `/api/supplier/storefront` | 30s |
| `useStorefrontMembers(params?)` | `StorefrontMembersResponse` | `/api/supplier/storefront/members?...` | 15s |
| `useStorefrontMember(id)` | `StorefrontMemberDetail` | `/api/supplier/storefront/members/{id}` | — |
| `useSubscription()` | `SubscriptionInfo` | `/api/supplier/subscription` | 30s |
| `useAvailablePlans()` | `SupplierPlanInfo[]` | `/api/supplier/subscription/plans` | 60s |

---

### TypeScript Types

**File:** `types/domain/storefront.ts` (~250 lines)

| Category | Interfaces |
|----------|-----------|
| Config | `StorefrontConfig`, `StorefrontConfigUpdate`, `PublicStorefrontConfig` |
| Members | `StorefrontMember`, `StorefrontMemberDetail`, `StorefrontMemberOrder`, `StorefrontMembersResponse` |
| Plans | `SupplierPlanInfo`, `AdminPlanInfo`, `SubscriptionInfo` |
| Orders | `ExternalOrderItem`, `ExternalOrderSummary`, `ExternalOrderDetail` |
| Admin | `AdminStorefrontSummary`, `AdminStorefrontDetail` |
| Products | `StorefrontProduct`, `StorefrontProductDetail`, `StorefrontProductsResponse` |

---

## Data Flow

### Registration Flow

```
1. Customer visits sante.twcako.com/register
2. Middleware rewrites to /store/sante/register
3. Form submits POST /api/store/sante/auth/register
4. Django checks subscription member limit
5. Creates ExternalMember with hashed password
6. Increments subscription.current_member_count
7. Returns JWT tokens + member profile
8. StorefrontAuthContext stores in localStorage
```

### Checkout Flow

```
1. Customer adds items → StorefrontCartContext (localStorage)
2. POST /api/store/sante/checkout with items + shipping_address + payment_method
3. Django validates:
   a. ExternalMember JWT + storefront ownership
   b. Each item: active, in stock, price correct
   c. Calculate transaction_fee from plan.transaction_fee_pct
4. Atomic transaction:
   a. Create CustomerProfile (uses name/postal_code fields)
   b. Create ProductOrder (internal, status=pending)
   c. Create OrderItems per line item
   d. Create ExternalOrder (customer-facing, items JSONField snapshot)
   e. Reserve inventory via SupplierInventory.reserve(qty)
5. Return order confirmation
6. Frontend clears cart, redirects to order detail page
```

### Order Status Sync

```
Celery task: sync_external_order_status (every 15 min)

1. Find ExternalOrders with status in [pending, processing, shipped]
2. For each, check linked ProductOrder.status
3. Map internal status → external status
4. Update ExternalOrder if changed

Supplier manages fulfillment via their dashboard (same ProductOrder pipeline)
```

### Subscription Enforcement

```
Registration:
- Checks SupplierSubscription.is_at_limit before creating member
- Returns 403 if at limit

Daily task (check_subscription_limits):
- Logs warning at 80% usage
- Suspends subscriptions that are past_due for >7 days

Plan change:
- Validates new plan can hold current member count
- Blocks downgrade if current_member_count > new_plan.max_members
```

---

## File Index

### Django Backend

| File | Purpose |
|------|---------|
| `supplier/auth.py` | ExternalMember JWT auth (generate, verify, DRF class) |
| `supplier/models.py` | Models: SupplierPlan, SupplierSubscription, SupplierStorefront, ExternalMember, ExternalOrder (lines 415-671) |
| `supplier/admin.py` | Django admin for all B2B models |
| `supplier/tasks.py` | 4 Celery tasks for status sync, metrics, billing |
| `api/views/storefront_management.py` | 8 supplier-facing API views |
| `api/views/storefront_public.py` | 10 public/customer-facing API views |
| `api/views/storefront_admin.py` | 4 founder admin API views |
| `api/urls.py` | 22 URL patterns (lines 587-619) |

### V4 Frontend

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Subdomain detection + rewrite |
| `src/types/domain/storefront.ts` | 20+ TypeScript interfaces |
| `src/hooks/useStorefront.ts` | 5 SWR hooks |
| `src/context/StorefrontContext.tsx` | Store config context |
| `src/context/StorefrontCartContext.tsx` | localStorage cart |
| `src/context/StorefrontAuthContext.tsx` | ExternalMember JWT auth |
| `src/components/storefront/StorefrontHeader.tsx` | Branded header with nav |
| `src/components/storefront/StorefrontFooter.tsx` | Branded footer |
| `src/components/storefront/ProductCard.tsx` | Product card for grid |
| `src/app/store/[subdomain]/layout.tsx` | Server layout |
| `src/app/store/[subdomain]/StorefrontLayoutClient.tsx` | Client layout + providers |
| `src/app/store/[subdomain]/page.tsx` | Landing page |
| `src/app/store/[subdomain]/products/page.tsx` | Product catalog |
| `src/app/store/[subdomain]/products/[productId]/page.tsx` | Product detail |
| `src/app/store/[subdomain]/login/page.tsx` | Login form |
| `src/app/store/[subdomain]/register/page.tsx` | Registration form |
| `src/app/store/[subdomain]/cart/page.tsx` | Shopping cart |
| `src/app/store/[subdomain]/checkout/page.tsx` | Checkout + order placement |
| `src/app/store/[subdomain]/account/page.tsx` | Account + order history |
| `src/app/store/[subdomain]/account/orders/[orderNumber]/page.tsx` | Order detail |
| `src/app/(dashboards)/supplier/storefront/StorefrontSettingsClient.tsx` | Dashboard: storefront settings |
| `src/app/(dashboards)/supplier/storefront/members/StorefrontMembersClient.tsx` | Dashboard: member management |
| `src/app/(dashboards)/supplier/storefront/subscription/SubscriptionClient.tsx` | Dashboard: subscription management |
| `src/app/api/supplier/storefront/route.ts` | Proxy: config |
| `src/app/api/supplier/storefront/logo/route.ts` | Proxy: logo upload |
| `src/app/api/supplier/storefront/banner/route.ts` | Proxy: banner upload |
| `src/app/api/supplier/storefront/members/route.ts` | Proxy: members list |
| `src/app/api/supplier/storefront/members/[memberId]/route.ts` | Proxy: member detail |
| `src/app/api/supplier/subscription/route.ts` | Proxy: subscription |
| `src/app/api/supplier/subscription/change-plan/route.ts` | Proxy: change plan |
| `src/app/api/supplier/subscription/plans/route.ts` | Proxy: available plans |
| `src/app/api/store/[subdomain]/config/route.ts` | Public: storefront config |
| `src/app/api/store/[subdomain]/products/route.ts` | Public: product catalog |
| `src/app/api/store/[subdomain]/products/[id]/route.ts` | Public: product detail |
| `src/app/api/store/[subdomain]/auth/register/route.ts` | Public: registration |
| `src/app/api/store/[subdomain]/auth/login/route.ts` | Public: login |
| `src/app/api/store/[subdomain]/auth/refresh/route.ts` | Public: token refresh |
| `src/app/api/store/[subdomain]/auth/me/route.ts` | Public: profile |
| `src/app/api/store/[subdomain]/checkout/route.ts` | Public: checkout |
| `src/app/api/store/[subdomain]/orders/route.ts` | Public: order list |
| `src/app/api/store/[subdomain]/orders/[orderNumber]/route.ts` | Public: order detail |

---

## Key Gotchas

1. **ExternalMember unique_together**: `['storefront', 'email']` — same email can register on multiple storefronts. JWT must include `storefront_id` to prevent cross-storefront access.

2. **CustomerProfile fields**: Uses `name`/`postal_code`, NOT `first_name`/`zip_code`.

3. **ExternalOrder.items**: JSONField snapshot — captures all product details at checkout time (name, price, qty, image). Prices are frozen at order time.

4. **transaction_fee**: Derived from `SupplierSubscription.plan.transaction_fee_pct`, not hardcoded. Calculated as `subtotal * fee_pct / 100`.

5. **Next.js 16 params**: `params` is a Promise, must be awaited: `const { subdomain } = await params;`

6. **Middleware matcher**: Must NOT match `/api/` or `/_next/` paths — storefront pages get rewritten, API routes do not.

7. **Product images**: `image_1` through `image_5` on Product model, stored in S3. Collected into an `images[]` array in the product detail endpoint.

8. **ProductOrder.purchase_date**: Use this for order date, NOT `date_ordered` (doesn't exist on the model).

9. **Two Cart systems**: `CartContext` (TWC platform, cookies + SWR) and `StorefrontCartContext` (brand storefronts, localStorage). Never mix them.

10. **Inventory flow**: Reserve on checkout → Deduct on deliver → Restore on return/reject. The `SupplierInventory.reserve()` method raises `ValueError` if insufficient stock.

---

## Counts Summary

| Component | Count |
|-----------|-------|
| Django API Views | 22 (8 management + 10 public + 4 admin) |
| Django URL Patterns | 22 |
| Celery Tasks | 4 |
| TypeScript Interfaces | 20+ |
| SWR Hooks | 5 |
| Next.js Pages | 11 (9 storefront + 3 dashboard) |
| API Route Proxies | 18 (8 supplier + 10 public) |
| React Contexts | 3 |
| UI Components | 3 |
| Django Models Used | 9 (5 B2B + ProductOrder + OrderItems + CustomerProfile + Product) |

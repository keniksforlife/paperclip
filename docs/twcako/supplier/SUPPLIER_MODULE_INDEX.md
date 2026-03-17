# Supplier Module - Documentation Index

**Version:** 2.0
**Date:** 2026-03-02
**Status:** Phase 1 Complete, Phase 2 Complete (Catalog & Inventory)

---

## Quick Links

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [Database Models](./SUPPLIER_DATABASE_MODELS.md) | All 10 database models + 3 modifications | Backend development |
| [API Reference](./SUPPLIER_API_REFERENCE.md) | All 17 API endpoints | Frontend integration |
| [V4 Frontend](./SUPPLIER_V4_FRONTEND.md) | V4 pages, components, hooks | Frontend development |
| [Business Plan](../planning/SUPPLIER_MODULE_BUSINESS_PLAN.md) | Non-technical overview | Stakeholder review |
| [Technical Plan](../planning/SUPPLIER_MODULE_PLAN.md) | Full implementation plan | Planning & architecture |

---

## Module Overview

```
+----------------------------------------------------------------------+
|                     SUPPLIER MODULE (7 Phases)                        |
+----------------------------------------------------------------------+
|                                                                      |
|  +----------------+  +----------------+  +----------------+          |
|  |  PHASE 1       |  |  PHASE 2       |  |  PHASE 3       |          |
|  |  Foundation     |  |  Catalog &     |  |  Order         |          |
|  |  [DONE]         |  |  Inventory     |  |  Management    |          |
|  |                 |  |  [DONE]        |  |                |          |
|  +----------------+  +----------------+  +----------------+          |
|  | - Models (10)   |  | - Product list |  | - Order list   |          |
|  | - Admin         |  | - Product edit |  | - Status flow  |          |
|  | - Dashboard API |  | - Inventory UI |  | - Shipping     |          |
|  | - V4 Dashboard  |  | - Stock adjust |  | - Returns      |          |
|  | - Main menu nav |  | - Restock      |  |                |          |
|  | - Module switch |  | - Movement log |  |                |          |
|  +----------------+  +----------------+  +----------------+          |
|                                                                      |
|  +----------------+  +----------------+  +----------------+          |
|  |  PHASE 4       |  |  PHASE 5       |  |  PHASE 6       |          |
|  |  Settlements    |  |  Analytics     |  |  Affiliate     |          |
|  |  & Finance      |  |  & Reports     |  |  Integration   |          |
|  +----------------+  +----------------+  +----------------+          |
|  | - Settlement V2 |  | - KPI snapshot |  | - Multi-tier   |          |
|  | - Line items    |  | - Sales trends |  |   commissions  |          |
|  | - Approval flow |  | - Product perf |  | - eCash payout |          |
|  | - Dispute       |  | - CSV/PDF      |  | - Referral     |          |
|  +----------------+  +----------------+  +----------------+          |
|                                                                      |
|  +----------------------------------------------+                    |
|  |  PHASE 7: Brand Storefronts (B2B SaaS)       |                    |
|  +----------------------------------------------+                    |
|  | - Subdomain shops (sante-manila.twcako.com)   |                    |
|  | - External members (non-TWC)                  |                    |
|  | - ManyChat-style subscription plans            |                    |
|  | - Founder-managed billing & limits             |                    |
|  +----------------------------------------------+                    |
|                                                                      |
|  Backend: 12 API views | 10 models | 17 URL routes                   |
|  Frontend: 23 pages | 9 hooks | 26 types | 8 API routes              |
|                                                                      |
+----------------------------------------------------------------------+
```

---

## Two Supplier Types

| Category | Examples | Pricing | Can Edit Price? |
|----------|----------|---------|-----------------|
| **Brand** (`brand`) | Sante, Live4More | Fixed by platform | No |
| **Independent** (`independent`) | Marketplace sellers | Set their own | Yes (with founder approval) |

Controlled by `Supplier.supplier_category` field.

---

## Documentation by Phase

### Phase 1: Foundation [COMPLETE]

| Document | Description |
|----------|-------------|
| [SUPPLIER_DATABASE_MODELS.md](./SUPPLIER_DATABASE_MODELS.md) | All models with field definitions |
| [SUPPLIER_API_REFERENCE.md](./SUPPLIER_API_REFERENCE.md) | API endpoints with request/response |
| [SUPPLIER_V4_FRONTEND.md](./SUPPLIER_V4_FRONTEND.md) | Dashboard, layout, hooks, types |

**What was built:**
- 10 new Django models (supplier app)
- 3 existing model modifications (Supplier, Product, Vendor)
- 12 API views with 17 URL routes
- V4 Dashboard with KPI cards, recent orders, inventory alerts
- Module Switcher integration (founders, admins, staff can access)
- 9 SWR hooks
- 26 TypeScript type definitions
- Django admin registration for all models

**API Endpoints:** 17
**Models:** 10 new + 3 modified
**V4 Pages:** 1 (dashboard)

---

### Phase 2: Product Catalog & Inventory [COMPLETE]

**What was built:**

**V4 Frontend Pages (4 functional + 11 placeholder):**
- Product Catalog (`/supplier/products`) — DataGrid with search, filters, pagination, KPI cards
- Product Detail (`/supplier/products/[id]`) — View/edit product pricing, inventory display
- Inventory Management (`/supplier/inventory`) — Stock table with restock/adjust dialogs
- Stock Movement History (`/supplier/inventory/movements`) — Audit trail with type filter
- 11 placeholder pages for future phases (orders, analytics, storefront, settings)

**API Route Proxies (7 new):**
- `GET/POST /api/supplier/products` — List + add products
- `GET/PUT/DELETE /api/supplier/products/[id]` — Product detail, update, soft-delete
- `GET /api/supplier/inventory` — Inventory list
- `GET /api/supplier/inventory/low-stock` — Low stock alerts
- `GET /api/supplier/inventory/movements` — Movement history
- `POST /api/supplier/inventory/[id]/adjust` — Manual stock adjustment
- `POST /api/supplier/inventory/[id]/restock` — Record incoming stock

**Navigation:**
- Removed sidebar layout in favor of main menu navigation
- Added supplier section to `menuItems.ts` (Dashboard, Catalog, Orders, Finance, Analytics, Storefront, Settings)
- Added "Supplier Hub" to Module Switcher with Storefront icon and orange gradient
- Access: `is_supplier || is_founder || is_admin || is_staff`

**Shared layout:** `supplier/layout.tsx` pass-through (main navbar handles navigation)

**Pages:** 16 total (4 functional + 12 placeholder)
**API Routes:** 8 (1 dashboard + 7 catalog/inventory)

**Data Backfill:** ✅ Complete. Management command `backfill_supplier_products` populated all tables:
- 231 `SupplierProduct` entries (mapped by `category_1`: sante→Sante Valenzuela, mood→Mood, twc→TWC Online Store)
- 231 `SupplierInventory` entries (stock from `Product.quantity`, reorder_point=10, reorder_qty=50)
- 102 `InventoryMovement` entries (initial stock audit trail for products with qty > 0)
- 231 `Product.primary_supplier` FK set

**Admin Access Fix:** All API views support `admin_mode` — founders/admins without a Supplier record see ALL supplier data. Uses `is_admin_user()` helper.

**Backfill API:** `POST /api/supplier/backfill/` (founder-only) — can trigger backfill from frontend.

---

### Phase 3: Order Management [PLANNED]

**Key Features:**
- Order list with status tabs (Pending/Processing/Shipping/Delivered/Returns)
- Order detail page with action buttons
- Accept/Ship/Complete/Return workflow
- Inventory auto-reserve on accept, auto-deduct on deliver
- Returns processing

**Planned Endpoints:** 8
**Planned Pages:** 4

---

### Phase 4: Settlements & Finance [PLANNED]

**Key Features:**
- Weekly settlement calculation (existing Celery task — needs wiring)
- Settlement detail with per-order line items
- Dispute workflow
- Integration with Finance module approval chains
- Commission tracking page

**Note:** Settlement framework already exists in `finance/models.py` and `finance/tasks.py`. Phase 4 upgrades it with proper FK and real order data.

---

### Phase 5: Analytics & Reports [PLANNED]

**Key Features:**
- Daily KPI snapshot Celery task
- Sales analytics with interactive charts
- Product performance rankings
- Inventory turnover metrics
- CSV/PDF export

---

### Phase 6: Affiliate Integration [PLANNED]

**Key Features:**
- Multi-tier commission calculation (referrer + sponsor + diamond coach)
- eCash wallet payout integration
- Referral tracking via existing `ref_code`

---

### Phase 7: Brand Storefronts (B2B SaaS) [PLANNED]

**Key Features:**
- Branded subdomain shops (`{name}.twcako.com`)
- External member registration and auth
- ManyChat-style tiered subscription plans
- Plan limit enforcement (80% warning, 100% block)
- Founder-managed billing dashboard

---

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Marketplace model (multi-supplier per product) | Enables competition and availability |
| 2 | Weekly settlements (Sunday 10 PM) | Matches existing Celery schedule |
| 3 | Multi-tier commissions | Matches MLM sponsor chain structure |
| 4 | Brand suppliers have fixed pricing | Sante/Live4More products — platform controls prices |
| 5 | Independent supplier price changes need founder approval | Prevents unauthorized price manipulation |
| 6 | Auto-migrate existing supplier data | Preserve current Vendor-Supplier relationships |
| 7 | B2B SaaS with subdomains | Revenue opportunity for TWC |
| 8 | External members are purchase-only | No MLM/commissions for non-TWC members |
| 9 | Founders Control Module (future) | All approvals will centralize in a Founders dashboard |
| 10 | Main menu navigation (no sidebar) | Consistent with other modules (Finance, Logistics, etc.) |

---

## File Locations

### Backend (Django)

```
TWCako/
+-- supplier/
|   +-- models.py          # 10 models (SupplierProduct, Inventory, etc.)
|   +-- admin.py           # Admin registration for all models
|   +-- apps.py            # SupplierConfig
|   +-- migrations/
|       +-- 0001_initial.py
+-- accounts/
|   +-- models.py          # Supplier model (added supplier_category)
+-- shops/
|   +-- models.py          # Product model (added primary_supplier FK)
+-- finance/
|   +-- models.py          # Vendor model (added supplier FK)
+-- api/
    +-- views/
    |   +-- supplier_dashboard.py  # 12 API views
    +-- urls.py            # 17 supplier URL routes
    +-- permissions.py     # IsSupplierUser, IsFounder
```

### Frontend (Next.js V4)

```
TWCAKOV4/src/
+-- types/domain/
|   +-- supplier.ts                             # 26 TypeScript interfaces
|
+-- hooks/
|   +-- useSupplier.ts                          # 9 SWR hooks
|
+-- components/supplier/
|   +-- SupplierPageLayout.tsx                  # Sidebar layout (kept for reference)
|
+-- config/
|   +-- moduleRegistry.ts                       # "Supplier Hub" module entry
|   +-- menuItems.ts                            # Supplier main menu (7 sections)
|
+-- app/(dashboards)/supplier/
|   +-- layout.tsx                              # Pass-through (main navbar used)
|   +-- page.tsx                                # Dashboard
|   +-- SupplierDashboardClient.tsx             # Dashboard UI (302 lines)
|   +-- products/
|   |   +-- page.tsx                            # Product catalog
|   |   +-- ProductCatalogClient.tsx            # Catalog UI (418 lines)
|   |   +-- [id]/
|   |       +-- page.tsx                        # Product detail
|   |       +-- ProductDetailClient.tsx         # Detail UI (459 lines)
|   +-- inventory/
|   |   +-- page.tsx                            # Inventory management
|   |   +-- InventoryClient.tsx                 # Inventory UI (457 lines)
|   |   +-- movements/
|   |       +-- page.tsx                        # Stock history
|   |       +-- MovementsClient.tsx             # Movements UI (244 lines)
|   +-- orders/                                 # Placeholder (Phase 3)
|   +-- settlements/                            # Placeholder (Phase 4)
|   +-- commissions/                            # Placeholder (Phase 4)
|   +-- analytics/                              # Placeholder (Phase 5)
|   +-- storefront/                             # Placeholder (Phase 7)
|   +-- settings/                               # Placeholder (Phase 1/future)
|
+-- app/api/supplier/
    +-- dashboard/route.ts                      # GET dashboard data
    +-- products/route.ts                       # GET/POST products
    +-- products/[id]/route.ts                  # GET/PUT/DELETE product
    +-- inventory/route.ts                      # GET inventory
    +-- inventory/low-stock/route.ts            # GET low stock alerts
    +-- inventory/movements/route.ts            # GET movements
    +-- inventory/[id]/adjust/route.ts          # POST adjust stock
    +-- inventory/[id]/restock/route.ts         # POST restock
```

---

## Permissions

| Permission | Who | Used For |
|------------|-----|----------|
| `IsSupplierUser` | Suppliers, Staff, Admin, Founders | All supplier endpoints |
| `IsFounder` | Founders, Admin | Price change approval, admin endpoints |
| `IsAuthenticated` | All logged-in users | Base requirement |

**Module Switcher Access:** `is_supplier || is_founder || is_admin || is_staff`

---

## Statistics

| Metric | Phase 1 | Phase 2 | Total |
|--------|---------|---------|-------|
| Backend Models | 10 + 3 modified | — | 13 |
| Django API Views | 12 | — | 12 |
| Django URL Routes | 17 | — | 17 |
| V4 Pages | 1 | 15 | 16 |
| V4 Functional Pages | 1 | 4 | 5 |
| V4 API Route Files | 1 | 7 | 8 |
| SWR Hooks | 9 | — | 9 |
| TypeScript Interfaces | 26 | — | 26 |
| Total Frontend Lines | ~820 | ~1,900 | ~2,720 |

---

## All Supplier Documents

| Document | Description |
|----------|-------------|
| `SUPPLIER_MODULE_INDEX.md` | This file — start here |
| `SUPPLIER_DATABASE_MODELS.md` | All 10 models with fields |
| `SUPPLIER_API_REFERENCE.md` | All 17 endpoints with examples |
| `SUPPLIER_V4_FRONTEND.md` | V4 pages, components, hooks, navigation |
| `../planning/SUPPLIER_MODULE_PLAN.md` | Full technical plan (all 7 phases) |
| `../planning/SUPPLIER_MODULE_BUSINESS_PLAN.md` | Non-technical business overview |

# Supplier Module - V4 Frontend Reference

**Version:** 2.0
**Date:** 2026-03-02
**Framework:** Next.js 16 + MUI 7 + SWR

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Navigation](#navigation)
3. [Pages](#pages)
4. [SWR Hooks](#swr-hooks)
5. [TypeScript Types](#typescript-types)
6. [API Routes](#api-routes)
7. [File Structure](#file-structure)

---

## Architecture Overview

The Supplier module follows the exact same patterns as the Finance module:

```
Server Component (page.tsx)
  +-- Client Component (data fetching + UI)
      +-- SWR Hook (useSupplier.ts)
          +-- API Route (/api/supplier/*)
              +-- Django Backend (/api/supplier/*)
```

**Pattern Stack:**
- **Navigation:** Main menu navbar (same as Finance, Logistics, etc.)
- **Data Fetching:** SWR hooks with `authGetFetcher`
- **Types:** Shared from `types/domain/supplier.ts`
- **Styling:** MUI v7 sx props + shared `FinanceKPICard` component
- **Animations:** Framer Motion staggered entrance

---

## Navigation

### Module Switcher

The supplier module is registered in `config/moduleRegistry.ts`:

| Field | Value |
|-------|-------|
| ID | `supplier` |
| Name | Supplier Hub |
| Icon | StorefrontOutlined (orange) |
| Gradient | `#e65100 → #ff9800` |
| Route | `/supplier` |
| Access | `is_supplier \|\| is_founder \|\| is_admin \|\| is_staff` |
| Order | 6 (between Finance and Founder Suite) |

### Main Menu Items

When on any `/supplier` route, the top navbar displays:

| Menu | Children |
|------|----------|
| Dashboard | `/supplier` |
| Catalog | Products, Inventory, Stock History |
| Orders | All Orders, Pending, Returns |
| Finance | Settlements, Commissions |
| Analytics | Sales Analytics, Product Performance |
| Storefront | Settings, Members, Subscription |
| Settings | Shop Profile, Bank Details |

Configured in `config/menuItems.ts` under the `// Supplier` section.

### Layout

`app/(dashboards)/supplier/layout.tsx` is a pass-through — no sidebar. All supplier pages render under the standard `(dashboards)` layout which provides the top navbar, module switcher, and responsive behavior automatically.

---

## Pages

### Phase 1: Dashboard

#### Supplier Dashboard (`/supplier`)

| File | Type | Lines | Description |
|------|------|-------|-------------|
| `supplier/page.tsx` | Server | 15 | Metadata + renders client |
| `supplier/SupplierDashboardClient.tsx` | Client | 302 | Dashboard UI |

**Features:**
- Hero banner (dark gradient, matches Finance style)
- 5 KPI cards (Today's Revenue, Monthly Revenue, Pending Orders, Active Products, Low Stock)
- Recent Orders table (last 5 orders with status chips)
- Inventory Alerts table (low stock + out-of-stock items)
- Framer Motion staggered animations
- Skeleton loading states

**Data Source:** `useSupplierDashboard()` hook

---

### Phase 2: Product Catalog & Inventory

#### Product Catalog (`/supplier/products`)

| File | Type | Lines | Description |
|------|------|-------|-------------|
| `supplier/products/page.tsx` | Server | 9 | Metadata + renders client |
| `supplier/products/ProductCatalogClient.tsx` | Client | 418 | Catalog UI |

**Features:**
- 4 KPI cards (Total Products, Active, Featured, Low Stock)
- Search by name or SKU
- Status filter (All / Active / Inactive)
- Category filter (Nutraceutical, Personal Care, Beverage, Supplement)
- Table columns: Product (image + name + SKU), Category, Supplier Price, Retail Price, Commission, Stock, Status
- Clickable rows navigate to product detail
- Pagination (20 per page)
- Empty state with icon and contextual message
- Low stock / out-of-stock color indicators

**Data Source:** `useSupplierProducts(filters)` hook

#### Product Detail (`/supplier/products/[id]`)

| File | Type | Lines | Description |
|------|------|-------|-------------|
| `supplier/products/[id]/page.tsx` | Server | 13 | Extracts ID from params |
| `supplier/products/[id]/ProductDetailClient.tsx` | Client | 459 | Detail/edit UI |

**Features:**
- Product header: image, name, SKU, categories, status chips
- 4 KPI cards: Supplier Price, Retail Price, Margin (amount + %), Commission
- **Edit mode:** Inline form for supplier price, commission type/rate, active/featured toggles
- Inventory card: on-hand, reserved, available, reorder point, reorder qty, days of stock, turnover rate, last restock/sold dates
- Save with PUT API call + SWR revalidation
- Back to Products navigation

**Data Source:** `useSupplierProductDetail(id)` hook

#### Inventory Management (`/supplier/inventory`)

| File | Type | Lines | Description |
|------|------|-------|-------------|
| `supplier/inventory/page.tsx` | Server | 8 | Metadata + renders client |
| `supplier/inventory/InventoryClient.tsx` | Client | 457 | Inventory UI |

**Features:**
- 4 KPI cards: Total Items, Healthy Stock, Low Stock, Out of Stock
- Stock status filter (All / Low Stock / Out of Stock)
- Table columns: Product, On Hand, Reserved, Available, Reorder Pt, Status, Days of Stock, Actions
- Color-coded status chips (OK / Low Stock / Out of Stock)
- **Restock dialog:** Quantity, PO reference, notes → POST `/api/supplier/inventory/{id}/restock`
- **Adjust dialog:** Quantity (+/-), reason (Adjustment/Damage/Return/Correction), notes → POST `/api/supplier/inventory/{id}/adjust`
- Current stock display in dialog footer
- SWR revalidation after mutations

**Data Source:** `useSupplierInventory(filters)` hook

#### Stock Movement History (`/supplier/inventory/movements`)

| File | Type | Lines | Description |
|------|------|-------|-------------|
| `supplier/inventory/movements/page.tsx` | Server | 8 | Metadata + renders client |
| `supplier/inventory/movements/MovementsClient.tsx` | Client | 244 | Movements UI |

**Features:**
- Movement type filter (All / Purchase / Sale / Return / Adjustment / Reserve)
- Table columns: Date + Time, Product, Type (chip), Quantity (green + / red -), Before, After, Reference, Notes
- Color-coded type chips (purchase=success, sale=info, return=warning, damage=error)
- Pagination (20 per page)

**Data Source:** `useSupplierMovements(filters)` hook

---

### Placeholder Pages (Phases 3-7)

| Route | Phase | Description |
|-------|-------|-------------|
| `/supplier/orders` | 3 | All orders with status tabs |
| `/supplier/orders/pending` | 3 | Pending order queue |
| `/supplier/orders/returns` | 3 | Returns processing |
| `/supplier/settlements` | 4 | Settlement history |
| `/supplier/commissions` | 4 | Commission tracking |
| `/supplier/analytics` | 5 | Sales analytics |
| `/supplier/analytics/products` | 5 | Product performance |
| `/supplier/storefront` | 7 | Storefront settings |
| `/supplier/storefront/members` | 7 | External members |
| `/supplier/storefront/subscription` | 7 | Plan & billing |
| `/supplier/settings` | 1 | Shop profile |
| `/supplier/settings/banking` | 1 | Bank details |

Each placeholder shows a "Coming soon" message with a relevant MUI icon.

---

## SWR Hooks

**Location:** `hooks/useSupplier.ts` (159 lines)

All hooks follow the established pattern:
```typescript
const { data, isLoading, isError, mutate } = useHookName();
```

### Dashboard Hooks

| Hook | API Key | Refresh | Returns |
|------|---------|---------|---------
| `useSupplierDashboard()` | `/api/supplier/dashboard` | 60s | `SupplierDashboardData` |
| `useSupplierKPIs()` | `/api/supplier/dashboard/kpis` | 60s | `SupplierKPIs` |

### Product Hooks

| Hook | Params | Returns |
|------|--------|---------
| `useSupplierProducts(filters?)` | `{status, category, search, page}` | `SupplierProductsResponse` |
| `useSupplierProductDetail(id)` | `number \| null` | `SupplierProductDetail` |

### Inventory Hooks

| Hook | Params | Returns |
|------|--------|---------
| `useSupplierInventory(filters?)` | `{stock_status, page}` | `InventoryListResponse` |
| `useSupplierLowStock()` | — | `LowStockResponse` |
| `useSupplierMovements(filters?)` | `{type, page}` | `InventoryMovementsResponse` |

### Price Change Hooks

| Hook | Params | Returns |
|------|--------|---------
| `useSupplierPriceRequests(status?)` | `string` | `PriceChangeRequestsResponse` |
| `useFounderPriceRequests(status?)` | `string` (default: `"pending"`) | `PriceChangeRequestsResponse` |

**SWR Configuration:**
- `revalidateOnFocus: false` — Prevents flicker on tab focus
- `dedupingInterval: 30000` — Prevents duplicate requests within 30s
- `refreshInterval: 60000` — Auto-refresh every 60s for dashboard
- `keepPreviousData: true` — Smooth pagination transitions

---

## TypeScript Types

**Location:** `types/domain/supplier.ts` (220 lines, 26 interfaces)

### Type Summary

| Interface | Used By | Description |
|-----------|---------|-------------|
| `SupplierDashboardData` | Dashboard | Full dashboard response |
| `SupplierKPIs` | Dashboard, KPI cards | Revenue, orders, inventory counts |
| `RevenueTrendPoint` | Dashboard chart | Date + revenue + order count |
| `InventoryAlert` | Dashboard, Low stock | Product name, stock level, status |
| `RecentOrder` | Dashboard | Order number, status, amount |
| `SupplierProduct` | Product list | Product with inventory summary |
| `SupplierProductDetail` | Product detail | Full product with margins and inventory |
| `SupplierProductsResponse` | Product list | Paginated product list |
| `SupplierInventorySummary` | Product cards | Available, reserved, reorder point |
| `SupplierInventoryDetail` | Product detail | Full inventory with metrics |
| `InventoryItem` | Inventory list | Stock levels per product |
| `InventoryListResponse` | Inventory list | Paginated inventory |
| `InventoryMovement` | Stock history | Movement with before/after quantities |
| `InventoryMovementsResponse` | Stock history | Paginated movements |
| `LowStockResponse` | Alerts | Array of inventory alerts |
| `PriceChangeRequest` | Price requests | Request with status and review info |
| `PriceChangeRequestsResponse` | Price request list | Array with count |

**Legacy types** (`SupplierPendingRowBase`, etc.) remain for backward compatibility with the old `(SupplierDashboard)` routes.

---

## API Routes

**Location:** `app/api/supplier/`

### Implemented

| Route File | Method | Proxies To |
|------------|--------|------------|
| `dashboard/route.ts` | GET | `/api/supplier/dashboard/` |
| `products/route.ts` | GET, POST | `/api/supplier/products/` |
| `products/[id]/route.ts` | GET, PUT, DELETE | `/api/supplier/products/{id}/` |
| `inventory/route.ts` | GET | `/api/supplier/inventory/` |
| `inventory/low-stock/route.ts` | GET | `/api/supplier/inventory/low-stock/` |
| `inventory/movements/route.ts` | GET | `/api/supplier/inventory/movements/` |
| `inventory/[id]/adjust/route.ts` | POST | `/api/supplier/inventory/{id}/adjust/` |
| `inventory/[id]/restock/route.ts` | POST | `/api/supplier/inventory/{id}/restock/` |
| `backfill/route.ts` | POST | `/api/supplier/backfill/` |

### Planned (to be added per phase)

| Route File | Method | Proxies To |
|------------|--------|------------|
| `dashboard/kpis/route.ts` | GET | `/api/supplier/dashboard/kpis/` |
| `products/price-requests/route.ts` | GET | `/api/supplier/products/price-requests/` |
| `admin/price-requests/route.ts` | GET, POST | `/api/supplier/admin/price-requests/` |

---

## File Structure

```
TWCAKOV4/src/
+-- types/domain/
|   +-- supplier.ts                             # 26 interfaces
|
+-- hooks/
|   +-- useSupplier.ts                          # 9 SWR hooks
|
+-- config/
|   +-- moduleRegistry.ts                       # "Supplier Hub" module entry
|   +-- menuItems.ts                            # Supplier main menu (7 sections)
|
+-- components/supplier/
|   +-- SupplierPageLayout.tsx                  # Sidebar layout (kept, not used)
|
+-- app/(dashboards)/supplier/
|   +-- layout.tsx                              # Pass-through layout
|   +-- page.tsx                                # Dashboard (server)
|   +-- SupplierDashboardClient.tsx             # Dashboard UI
|   +-- products/
|   |   +-- page.tsx                            # Product catalog (server)
|   |   +-- ProductCatalogClient.tsx            # Catalog UI
|   |   +-- [id]/
|   |       +-- page.tsx                        # Product detail (server)
|   |       +-- ProductDetailClient.tsx         # Detail/edit UI
|   +-- inventory/
|   |   +-- page.tsx                            # Inventory management (server)
|   |   +-- InventoryClient.tsx                 # Inventory UI
|   |   +-- movements/
|   |       +-- page.tsx                        # Stock history (server)
|   |       +-- MovementsClient.tsx             # Movements UI
|   +-- orders/                                 # Placeholder pages
|   +-- settlements/                            # Placeholder page
|   +-- commissions/                            # Placeholder page
|   +-- analytics/                              # Placeholder pages
|   +-- storefront/                             # Placeholder pages
|   +-- settings/                               # Placeholder pages
|
+-- app/api/supplier/
    +-- dashboard/route.ts                      # GET dashboard
    +-- products/route.ts                       # GET/POST products
    +-- products/[id]/route.ts                  # GET/PUT/DELETE product
    +-- inventory/route.ts                      # GET inventory
    +-- inventory/low-stock/route.ts            # GET alerts
    +-- inventory/movements/route.ts            # GET movements
    +-- inventory/[id]/adjust/route.ts          # POST adjust
    +-- inventory/[id]/restock/route.ts         # POST restock
```

---

## Shared Components Used

The supplier module reuses components from the Finance module:

| Component | From | Used For |
|-----------|------|----------|
| `FinanceKPICard` | `components/finance/` | KPI cards on all pages |
| `tableHeadCellSx` | `components/finance/FinanceKPICard.tsx` | Table header styling |
| `elevatedCardSx` | `components/finance/FinanceKPICard.tsx` | Card shadow/border styling |

This ensures visual consistency across modules.

---

## Data Population Status ✅ COMPLETE

**Management command:** `supplier/management/commands/backfill_supplier_products.py`

```bash
python manage.py backfill_supplier_products --dry-run   # Preview
python manage.py backfill_supplier_products              # Execute
python manage.py backfill_supplier_products --category sante --active-only
```

**Category → Supplier mapping:**
| category_1 | Supplier | Supplier ID | Products |
|------------|----------|-------------|----------|
| `sante` | Sante Valenzuela Branch | 2 | 118 |
| `mood` | Mood | 8 | 109 |
| `twc` | TWC Online Store | 11 | 4 |

**Results (2026-03-03):**
- 231 `SupplierProduct` created (with supplier_price at 60% of retail, 10% commission)
- 231 `SupplierInventory` created (stock from `Product.quantity`, reorder_point=10)
- 102 `InventoryMovement` created (initial stock audit trail, `reference_type='backfill'`)
- 231 `Product.primary_supplier` FK set

**API endpoint:** `POST /api/supplier/backfill/` (founder-only, same logic via REST)

**Admin access:** All supplier API views support `admin_mode` — founders/admins without a Supplier record see ALL supplier data across all suppliers. The `is_admin_user()` helper checks `is_founder` or `is_admin`.

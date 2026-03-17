# V3 vs V4 Supplier Module — Gap Analysis

> Last updated: 2026-03-07
> Purpose: Track feature parity between V3 (Django templates) and V4 (Next.js/MUI)

---

## Executive Summary

The V4 supplier module covers ~70% of V3 features and adds significant enhancements (analytics, settlements UI, affiliate commissions, founder hub, branch hierarchy). The remaining gaps fall into two categories:

1. **Wiring gaps** — V4 pages/APIs exist but use placeholder UI or mock data (4 items)
2. **Missing features** — Sante-specific fulfillment workflows not yet built in V4 (7 items)

---

## Category A: Already Covered in V4

| V3 Feature | V4 Equivalent | Notes |
|-----------|---------------|-------|
| Dashboard Home | `/supplier` (Spike redesign) | V4 far richer (8 KPI cards, charts, top products) |
| Product Inventory List | `/supplier/products` | MUI table with search/filter/pagination |
| Product Edit | `/supplier/products/[id]` | Inline edit with pricing, commission |
| Order History (ProductOrder) | `/supplier/orders` | Full lifecycle with action dialogs |
| Order History (OrderTransaction V3) | `/supplier/orders` | V4 uses ProductOrder model; OrderTransaction data accessible via same orders |
| Pending for Pickup | `/supplier/orders/pending` | Pre-filtered orders view |
| Pending for Return | `/supplier/orders/returns` | Mark Returned action included |
| Inline Product Toggle | Restock/Adjust dialogs | Different UX, functionally superior |
| Settlements | `/supplier/settlements` | V3 had Celery task only; V4 has full UI + dispute |
| Analytics | `/supplier/analytics` | V3 had model only; V4 has full dashboard + CSV export |
| Affiliate Commissions | `/supplier/commissions` | V3 had model only; V4 has full dashboard |

## Category B: V4 Enhancements (Not in V3)

| Feature | V4 Location | Description |
|---------|-------------|-------------|
| Stock Movement History | `/supplier/inventory/movements` | Full audit trail (purchase, sale, return, adjust) |
| Order Accept/Ship/Deliver/Reject | `/supplier/orders` | Inventory-integrated workflow |
| Settlement Dispute | `/supplier/settlements` | Supplier can dispute with reason |
| Revenue Trend Charts | `/supplier/analytics` | Recharts line/pie/bar charts |
| CSV Export | `/supplier/analytics` | 4 report types exportable |
| Founders Hub | `/founder/suppliers` | 10 pages for multi-supplier management |
| Branch Hierarchy | Parent-branch model | Feature gating, routing rules, KPI rollup |
| Onboarding Wizard | `/founder/suppliers/onboard` | 6-step supplier creation |
| Storefront Config | `/supplier/storefront` | Brand storefront settings (Phase 7 prep) |

---

## Category C: Needs Wiring (Page/API Exists, Not Connected)

### C1: Supplier eCash Page

| Aspect | Status |
|--------|--------|
| **V3 Feature** | `supplier:ecash-list` — eCash transaction history with type filters (TWC Credits, Sante Profit, Branch Price, Withdrawals) |
| **V4 Page** | `/supplier/[supplier]/ecash` in `(SupplierDashboard)` layout — exists with mock data (57 sample transactions) |
| **V4 UI** | Available balance, summary cards, transaction table, Top Up dialog, Withdraw dialog, CSV export |
| **Django API** | `GET /api/ecash/dashboard/` + `GET /api/ecash/history/` — supplier-aware (returns accumulated_twc_profit, sante_profit, branch_price, withdrawal) |
| **Gap** | V4 page uses hardcoded mock data in useEffect. Needs to wire SWR hooks to real Django eCash API endpoints |
| **Effort** | Small — replace mock data with API calls |
| **Priority** | P0 |

### C2: Supplier Profile / Shop Settings

| Aspect | Status |
|--------|--------|
| **V3 Feature** | `supplier:shop-information-menu` — Edit name, image, description, business_name, business_address, pickup_location, TIN, VAT status, BIR certificate, seller_type. Fields lock after `submitted=True` |
| **V4 Page** | `/supplier/settings` — placeholder ("Coming soon") |
| **V4 Banking** | `/supplier/settings/banking` — placeholder ("Coming soon") |
| **Django Model** | All fields exist on `Supplier` model (accounts/models.py). `save()` monitors regulated fields and sets `submitted=True` |
| **Django API** | Founder can update via `PUT /api/founders/suppliers/{id}/`. No supplier-facing profile API yet |
| **Gap** | Need: 1) `PUT /api/supplier/profile/` endpoint for supplier self-edit, 2) Build form UI in settings page |
| **Template** | Use `StorefrontSettingsClient.tsx` as UI pattern reference |
| **Effort** | Small |
| **Priority** | P0 |

### C3: Add Product to Catalog

| Aspect | Status |
|--------|--------|
| **V3 Feature** | `supplier:supplier-add-product` — Full form: SKU, name, category, price, commission %, quantity, descriptions, features, specs, 5 image uploads |
| **V4 Backend** | `POST /api/supplier/products/` exists in `supplier_dashboard.py` — accepts product_id, supplier_price, commission_type, commission_rate, reorder_point, reorder_quantity |
| **V4 Frontend** | `ProductCatalogClient.tsx` has no "Add" button or dialog |
| **V4 API Route** | `/api/supplier/products/` POST proxy exists and works |
| **Gap** | Need "Add Product" dialog in ProductCatalogClient + mutation hook in useSupplier.ts |
| **Note** | V4 backend adds existing products to supplier catalog (different from V3 which creates brand new Product records). This is the correct V4 approach — founders manage the product catalog, suppliers link products to their inventory |
| **Effort** | Tiny |
| **Priority** | P1 |

### C4: Disbursement / Banking Settings

| Aspect | Status |
|--------|--------|
| **V3 Feature** | Part of eCash — withdrawal method management via PaymentMethod model |
| **V4 Page** | `/supplier/[supplier]/settings/disbursement` — form exists (bank name, account name, account number) but `handleSave` only logs to console |
| **V4 Banking** | `/supplier/settings/banking` — separate placeholder |
| **Django API** | `POST /api/ecash/disbursement-account/` exists |
| **Gap** | Wire disbursement page to real API |
| **Effort** | Tiny |
| **Priority** | P1 |

---

## Category D: Missing Features (Need to Build)

### D1: E-Code Management (Sante)

| Aspect | Detail |
|--------|--------|
| **V3 Feature** | `supplier:pending-add-ecode` + `supplier:pending-for-ecode-placement-payment-confirm` |
| **What it does** | Suppliers add e-codes (retailer_id, password, business_id, business_password, card image). On VW order payment confirmation, e-codes are assigned and deactivated. Shows available Starter/Builder e-code counts |
| **Django Model** | `TWCECode` in `shops/models.py` — supplier FK, package_type (starter/global-upgrade), retailer_id, retailer_password, business_id, business_password, image, active, is_used, is_encoded, placement fields, dates |
| **Backend needed** | CRUD API for TWCECode: list (active/encoded/all), create, deactivate. Payment confirmation endpoint |
| **Frontend needed** | E-Code list page with tabs (Active/Encoded), Add E-Code dialog, available counts display |
| **Who uses it** | Sante suppliers (Valenzuela, CDO, Live4More) |
| **Effort** | Medium |
| **Priority** | P0 — used daily |

### D2: BP Encoding (Barley Point)

| Aspect | Detail |
|--------|--------|
| **V3 Feature** | `supplier:pending-for-bp-encoding` (v1 via ProductOrder) + `live4more:pending-for-bp-encoding` (v1 via OrderTransaction) + `live4more:pending-for-bp-encoding-v2` |
| **What it does** | Shows orders with status='paid' that have sante_id and barley_point > 0. Groups by Sante ID, consolidates products. Supplier uploads Excel with order numbers to validate, then marks as BP encoded. Live4More routes to hub_delivery; other branches mark completed |
| **Key logic** | Consolidation by sante_id, product summary across all orders, Excel upload/validate, `mark_bp_encoded_task` Celery task |
| **Backend needed** | API endpoints: list pending BP orders (grouped by sante_id), upload/validate Excel, mark BP encoded |
| **Frontend needed** | BP Encoding page with DataTable (grouped by Sante ID), Excel upload dialog, product summary sidebar, "Mark BP Encoded" bulk action |
| **Who uses it** | All Sante branches |
| **Effort** | Medium |
| **Priority** | P0 — core Sante workflow |

### D3: SNS Redemption

| Aspect | Detail |
|--------|--------|
| **V3 Feature** | `live4more:pending-for-sns-redemption` |
| **What it does** | Shows OrderTransactions with logistics_status='for_sns_redemption'. Upload Excel with SO numbers to validate. Shows product summary and SO receipts. Bulk mark as SNS done via `mark_sns_done_task` |
| **Key logic** | Excel upload/validate SO numbers, product summary calculation, SO receipt display, bulk status update |
| **Backend needed** | API endpoints: list SNS pending orders, upload/validate Excel, mark SNS done |
| **Frontend needed** | SNS Redemption page with table, Excel upload, product summary, bulk action |
| **Who uses it** | Live4More hub (feature-gated: `sns_redemption`) |
| **Effort** | Medium |
| **Priority** | P1 |

### D4: Package Orders (Virtual Warehouse)

| Aspect | Detail |
|--------|--------|
| **V3 Feature** | `live4more:pending-for-package-order` + `live4more:pending-for-package-order-purchase` |
| **What it does** | Shows VWOrders with admin_status='for_package_order'. Supplier processes by entering SO number + uploading receipt. Shows available Starter/Builder e-code counts. Uses `live4more_package_order_purchase` to confirm payment |
| **Key model** | `VWOrder` in `virtual_warehouse/models.py` |
| **Backend needed** | API endpoints: list pending package orders, process order (SO number + receipt) |
| **Frontend needed** | Package Orders page with table, Process Order dialog (SO number input + receipt upload) |
| **Who uses it** | Live4More hub (feature-gated: `package_orders`) |
| **Effort** | Medium |
| **Priority** | P1 |

### D5: Hub Delivery

| Aspect | Detail |
|--------|--------|
| **V3 Feature** | `live4more:pending-for-hub-delivery` |
| **What it does** | Shows OrderTransactions with logistics_status='for_hub_delivery'. Displays packing list with product quantities. "Confirm Hub Delivery" sets all to 'for_receiving' + sends SMS notification |
| **Key logic** | `get_supplier_packing_list()` and `get_supplier_order_summary()` utilities, SMS via `send_sms_task` |
| **Backend needed** | API endpoints: list hub delivery orders, get packing list/summary, confirm hub delivery |
| **Frontend needed** | Hub Delivery page with orders table, packing list summary card, "Confirm All" bulk action |
| **Who uses it** | Live4More hub (feature-gated: `hub_delivery`) |
| **Effort** | Small |
| **Priority** | P1 |

### D6: Pending for Booking

| Aspect | Detail |
|--------|--------|
| **V3 Feature** | `supplier:supplier-pending-for-booking` |
| **What it does** | Shows orders in 'for-booking' status (pre-pickup stage). Uses logistics booking template. First step in fulfillment pipeline before for-pickup |
| **Gap in V4** | V4 order pipeline starts at 'for-pickup'. The 'for-booking' stage is skipped |
| **Backend needed** | Filter orders by 'for-booking' status in existing orders API |
| **Frontend needed** | Add 'for-booking' to status filter options in AllOrdersClient, or create dedicated tab |
| **Effort** | Tiny |
| **Priority** | P1 |

### D7: Rebook Action

| Aspect | Detail |
|--------|--------|
| **V3 Feature** | GET action in `SupplierPendingForPickup` — sets order back to 'for-booking' with rebooking_notes |
| **Gap in V4** | V4 has accept/ship/deliver/reject/return but no rebook |
| **Backend needed** | Add rebook endpoint to supplier_orders.py |
| **Frontend needed** | Add "Rebook" button to pending orders with notes dialog |
| **Effort** | Tiny |
| **Priority** | P2 |

---

## Implementation Roadmap

### Sprint 1: Quick Wins (Wire Existing Pages)

| Task | Files to Modify | Effort |
|------|----------------|--------|
| C2: Supplier Profile API + form | `api/views/supplier_dashboard.py` (new endpoint), `TWCAKOV4/.../settings/page.tsx` | Small |
| C3: Add Product dialog | `TWCAKOV4/.../products/ProductCatalogClient.tsx`, `hooks/useSupplier.ts` | Tiny |
| C1: eCash page wiring | `TWCAKOV4/.../ecash/page.tsx` (replace mock data with SWR) | Small |
| C4: Disbursement wiring | `TWCAKOV4/.../disbursement/page.tsx` (wire handleSave) | Tiny |

### Sprint 2: E-Code + BP Encoding (Sante Core)

| Task | New Files | Effort |
|------|-----------|--------|
| D1: E-Code Management | Backend: `api/views/supplier_ecodes.py`, Frontend: new page + dialog | Medium |
| D2: BP Encoding | Backend: `api/views/supplier_bp_encoding.py`, Frontend: new page with Excel upload | Medium |
| D6: Pending for Booking | Update existing orders filter | Tiny |
| D7: Rebook Action | Update existing orders API + UI | Tiny |

### Sprint 3: Live4More Fulfillment Hub

| Task | New Files | Effort |
|------|-----------|--------|
| D3: SNS Redemption | Backend: `api/views/supplier_sns.py`, Frontend: new page | Medium |
| D4: Package Orders | Backend: `api/views/supplier_packages.py`, Frontend: new page | Medium |
| D5: Hub Delivery | Backend: `api/views/supplier_hub_delivery.py`, Frontend: new page | Small |

---

## File References

### V3 Source Files (Django)
- `supplier/views/index.py` — Home, Profile, eCash, Products, Orders
- `supplier/views/pending.py` — Booking, Pickup, BP Encoding, Returns, E-Codes
- `supplier/forms.py` — ProductForm, SupplierForm
- `supplier/urls.py` — 17 URL patterns
- `live4more/views.py` — Home, Package Orders, SNS, Hub Delivery, BP Encoding (v1+v2)
- `live4more/urls.py` — 8 URL patterns
- `shops/models.py` — TWCECode model (lines 156-208)
- `logistic/models.py` — OrderTransaction with STATUS_CHOICES

### V4 Existing Files (Next.js)
- `TWCAKOV4/src/app/(SupplierDashboard)/supplier/[supplier]/ecash/page.tsx` — eCash (mock data)
- `TWCAKOV4/src/app/(dashboards)/supplier/settings/page.tsx` — Profile placeholder
- `TWCAKOV4/src/app/(dashboards)/supplier/settings/banking/page.tsx` — Banking placeholder
- `TWCAKOV4/src/app/(dashboards)/supplier/products/ProductCatalogClient.tsx` — No add button
- `TWCAKOV4/src/app/(dashboards)/supplier/storefront/StorefrontSettingsClient.tsx` — UI pattern reference

### Django API Endpoints (Existing)
- `POST /api/supplier/products/` — Add product to catalog (exists)
- `GET /api/ecash/dashboard/` — eCash summary (supplier-aware)
- `GET /api/ecash/history/` — eCash transactions
- `POST /api/ecash/disbursement-account/` — Add payout method
- `PUT /api/founders/suppliers/{id}/` — Update supplier (founder-only)

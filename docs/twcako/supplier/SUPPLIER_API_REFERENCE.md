# Supplier Module - API Reference

**Version:** 2.0
**Date:** 2026-03-03
**Total Endpoints:** 18
**Base Path:** `/api/supplier/`

---

## Table of Contents

1. [Authentication & Permissions](#authentication--permissions)
2. [Dashboard](#dashboard-endpoints)
3. [Product Catalog](#product-catalog-endpoints)
4. [Inventory Management](#inventory-management-endpoints)
5. [Price Change Requests](#price-change-request-endpoints)
6. [Founder Admin](#founder-admin-endpoints)
7. [Error Responses](#error-responses)

---

## Authentication & Permissions

All endpoints require JWT Bearer token authentication.

| Permission | Description | Who Has Access |
|------------|-------------|----------------|
| `IsAuthenticated` | Must be logged in | All users |
| `IsSupplierUser` | Supplier module access | Suppliers, Staff, Admin, Founders |
| `IsFounder` | Founder-level access | Founders, Admin |

**Admin Mode:** Founders/admins without a Supplier record automatically enter `admin_mode` — they see ALL supplier data across all suppliers. The `is_admin_user()` helper in `supplier_dashboard.py` checks `is_founder` or `is_admin`.

**Header:** `Authorization: Bearer <access_token>`

---

## Dashboard Endpoints

### GET /api/supplier/dashboard/

Full dashboard data with KPIs, order summary, revenue trend, and inventory alerts.

**Permission:** `IsAuthenticated`, `IsSupplierUser`

**Response:**
```json
{
  "kpis": {
    "total_revenue_today": "15000.00",
    "total_revenue_month": "450000.00",
    "pending_orders": 12,
    "products_active": 45,
    "low_stock_items": 3
  },
  "orders_summary": {
    "pending": 5,
    "afs": 3,
    "shipping": 8,
    "delivered": 120
  },
  "revenue_trend": [
    { "date": "2026-02-24", "revenue": 12000, "orders": 8 },
    { "date": "2026-02-25", "revenue": 18500, "orders": 12 }
  ],
  "inventory_alerts": [
    {
      "id": 1,
      "product_name": "Sante Barley Capsule",
      "sku": "SBC-001",
      "quantity_available": 3,
      "reorder_point": 10,
      "status": "low"
    }
  ],
  "recent_orders": [
    {
      "id": 100,
      "order_number": "ORD-20260302-001",
      "status": "pending",
      "total_amount": "1500.00",
      "date_ordered": "2026-03-02T10:30:00Z"
    }
  ]
}
```

---

### GET /api/supplier/dashboard/kpis/

Lightweight KPI-only endpoint (faster than full dashboard).

**Permission:** `IsAuthenticated`, `IsSupplierUser`

**Response:**
```json
{
  "total_revenue_today": "15000.00",
  "total_revenue_month": "450000.00",
  "pending_orders": 12,
  "products_active": 45,
  "low_stock_items": 3
}
```

---

## Product Catalog Endpoints

### GET /api/supplier/products/

List supplier's products with pagination and filters.

**Permission:** `IsAuthenticated`, `IsSupplierUser`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `active` or `inactive` |
| `category` | string | Filter by `category_2` |
| `search` | string | Search product name or SKU |
| `page` | int | Page number |
| `page_size` | int | Items per page (default 20, max 100) |

**Response:**
```json
{
  "count": 45,
  "next": "/api/supplier/products/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "product_id": 100,
      "product_name": "Sante Barley Capsule",
      "product_sku": "SBC-001",
      "product_image": "/media/products/sbc.jpg",
      "category_1": "sante",
      "category_2": "nutraceutical",
      "supplier_price": "350.00",
      "retail_price": "500.00",
      "has_price_override": false,
      "commission_type": "percentage",
      "commission_rate": "20.00",
      "is_active": true,
      "is_featured": false,
      "can_edit_price": false,
      "inventory": {
        "quantity_available": 150,
        "quantity_reserved": 10,
        "reorder_point": 20,
        "is_low_stock": false
      }
    }
  ]
}
```

---

### POST /api/supplier/products/

Add a product from the central catalog to the supplier's catalog.

**Permission:** `IsAuthenticated`, `IsSupplierUser`

**Request Body:**
```json
{
  "product_id": 100,
  "supplier_price": "350.00",
  "commission_type": "percentage",
  "commission_rate": "20.00",
  "reorder_point": 20,
  "reorder_quantity": 100
}
```

**Response (201):**
```json
{
  "id": 1,
  "detail": "Sante Barley Capsule added to your catalog"
}
```

**Errors:**
- `400` — `product_id is required` or `Product already in your catalog`
- `404` — `Product not found`

---

### GET /api/supplier/products/{id}/

Product detail with full inventory and margin data.

**Permission:** `IsAuthenticated`, `IsSupplierUser`

**Response:**
```json
{
  "id": 1,
  "product_id": 100,
  "product_name": "Sante Barley Capsule",
  "product_sku": "SBC-001",
  "product_image": "/media/products/sbc.jpg",
  "category_1": "sante",
  "category_2": "nutraceutical",
  "description": "Premium barley capsule supplement",
  "supplier_price": "350.00",
  "retail_price": "500.00",
  "has_price_override": false,
  "margin": "150.00",
  "margin_pct": "30.00",
  "commission_type": "percentage",
  "commission_rate": "20.00",
  "is_active": true,
  "is_featured": false,
  "can_edit_price": false,
  "inventory": {
    "quantity_on_hand": 160,
    "quantity_reserved": 10,
    "quantity_available": 150,
    "reorder_point": 20,
    "reorder_quantity": 100,
    "max_stock": null,
    "last_restock_date": "2026-02-28T14:00:00Z",
    "last_sold_date": "2026-03-01T09:30:00Z",
    "turnover_rate": "2.50",
    "days_of_stock": 45,
    "is_low_stock": false
  },
  "created_at": "2026-02-20T10:00:00Z",
  "updated_at": "2026-03-01T09:30:00Z"
}
```

---

### PUT /api/supplier/products/{id}/

Update product details (supplier price, commission, status).

**Permission:** `IsAuthenticated`, `IsSupplierUser`

**Request Body (partial update):**
```json
{
  "supplier_price": "360.00",
  "commission_rate": "22.00",
  "is_active": true,
  "is_featured": true
}
```

**Note:** `retail_price` is NOT updatable via this endpoint. Independent suppliers must use the price change request flow.

**Response:** `{"detail": "Product updated"}`

---

### DELETE /api/supplier/products/{id}/

Soft-delete: sets `is_active = false` (product remains in database).

**Permission:** `IsAuthenticated`, `IsSupplierUser`

**Response:** `{"detail": "Product removed from catalog"}`

---

## Inventory Management Endpoints

### GET /api/supplier/inventory/

List all inventory for supplier's active products.

**Permission:** `IsAuthenticated`, `IsSupplierUser`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `stock_status` | string | `low` or `out` |
| `page` | int | Page number |

**Response:**
```json
{
  "count": 45,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "supplier_product_id": 1,
      "product_name": "Sante Barley Capsule",
      "product_sku": "SBC-001",
      "quantity_on_hand": 160,
      "quantity_reserved": 10,
      "quantity_available": 150,
      "reorder_point": 20,
      "reorder_quantity": 100,
      "max_stock": null,
      "is_low_stock": false,
      "is_out_of_stock": false,
      "last_restock_date": "2026-02-28T14:00:00Z",
      "days_of_stock": 45,
      "updated_at": "2026-03-01T09:30:00Z"
    }
  ]
}
```

---

### POST /api/supplier/inventory/{id}/adjust/

Manual stock adjustment (increase or decrease).

**Permission:** `IsAuthenticated`, `IsSupplierUser`

**Request Body:**
```json
{
  "quantity": -5,
  "movement_type": "damage",
  "notes": "5 units damaged during shipping"
}
```

**Response:**
```json
{
  "detail": "Stock adjusted by -5",
  "quantity_on_hand": 155,
  "quantity_available": 145
}
```

---

### POST /api/supplier/inventory/{id}/restock/

Record incoming stock (purchase/restock).

**Permission:** `IsAuthenticated`, `IsSupplierUser`

**Request Body:**
```json
{
  "quantity": 200,
  "reference": "PO-2026-0302",
  "notes": "Monthly restock from warehouse"
}
```

**Response:**
```json
{
  "detail": "200 units restocked",
  "quantity_on_hand": 360,
  "quantity_available": 350
}
```

**Errors:** `400` — `Positive quantity is required`

---

### GET /api/supplier/inventory/low-stock/

List all low stock and out-of-stock items.

**Permission:** `IsAuthenticated`, `IsSupplierUser`

**Response:**
```json
{
  "alerts": [
    {
      "id": 3,
      "product_name": "Sante Fusion Coffee",
      "sku": "SFC-001",
      "quantity_available": 5,
      "reorder_point": 20,
      "reorder_quantity": 100,
      "status": "low"
    },
    {
      "id": 7,
      "product_name": "Live4More Capsule",
      "sku": "L4M-001",
      "quantity_available": 0,
      "reorder_point": 10,
      "reorder_quantity": 50,
      "status": "out_of_stock"
    }
  ],
  "count": 2
}
```

---

### GET /api/supplier/inventory/movements/

Stock movement history across all supplier's inventory.

**Permission:** `IsAuthenticated`, `IsSupplierUser`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `type` | string | Filter by movement type (e.g. `purchase`, `sale`, `adjustment`) |
| `page` | int | Page number |

**Response:**
```json
{
  "count": 120,
  "next": "/api/supplier/inventory/movements/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "product_name": "Sante Barley Capsule",
      "product_sku": "SBC-001",
      "movement_type": "purchase",
      "movement_type_display": "Purchase / Restock",
      "quantity": 200,
      "quantity_before": 160,
      "quantity_after": 360,
      "reference_type": "restock",
      "reference_id": "PO-2026-0302",
      "notes": "Monthly restock",
      "created_by": "supplier_user",
      "created_at": "2026-03-02T14:00:00Z"
    }
  ]
}
```

---

## Price Change Request Endpoints

### GET /api/supplier/products/price-requests/

List supplier's own price change requests.

**Permission:** `IsAuthenticated`, `IsSupplierUser`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `pending`, `approved`, or `rejected` |

**Response:**
```json
{
  "price_requests": [
    {
      "id": 1,
      "product_name": "Custom Widget",
      "product_sku": "CW-001",
      "current_price": "500.00",
      "requested_price": "550.00",
      "reason": "Raw material costs increased",
      "status": "pending",
      "reviewed_by": null,
      "reviewed_at": null,
      "rejection_reason": "",
      "created_at": "2026-03-02T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

### POST /api/supplier/products/{id}/request-price-change/

Submit a price change request (independent suppliers only).

**Permission:** `IsAuthenticated`, `IsSupplierUser`

**Request Body:**
```json
{
  "requested_price": "550.00",
  "reason": "Raw material costs increased by 10%"
}
```

**Response (201):**
```json
{
  "id": 1,
  "detail": "Price change request submitted for founder review"
}
```

**Errors:**
- `403` — `Price changes are not available for brand suppliers`
- `409` — `A pending price request already exists for this product`

---

## Founder Admin Endpoints

### GET /api/supplier/admin/price-requests/

List all pending price change requests across all suppliers.

**Permission:** `IsAuthenticated`, `IsFounder`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Default: `pending` |

**Response:**
```json
{
  "price_requests": [
    {
      "id": 1,
      "module": "supplier",
      "supplier_name": "CustomGoods PH",
      "product_name": "Custom Widget",
      "product_sku": "CW-001",
      "current_price": "500.00",
      "requested_price": "550.00",
      "price_change_pct": "10.00",
      "reason": "Raw material costs increased",
      "requested_by": "supplier_user",
      "status": "pending",
      "created_at": "2026-03-02T10:00:00Z"
    }
  ],
  "count": 1,
  "target_role": "founder"
}
```

**Note:** `module` and `target_role` fields are included for future Founders Control Module aggregation.

---

### POST /api/supplier/admin/price-requests/{id}/approve/

Approve a price change request. Auto-updates the product's retail price.

**Permission:** `IsAuthenticated`, `IsFounder`

**Response:** `{"detail": "Price change approved and applied"}`

---

### POST /api/supplier/admin/price-requests/{id}/reject/

Reject a price change request with a reason.

**Permission:** `IsAuthenticated`, `IsFounder`

**Request Body:**
```json
{
  "reason": "Price increase too high, suggest 5% max"
}
```

**Response:** `{"detail": "Price change rejected"}`

---

### `POST /api/supplier/backfill/`

Backfill `SupplierProduct` + `SupplierInventory` from existing `Product` data. Maps products to suppliers by `category_1` field. **Founder-only.**

**Permission:** `IsFounder`

**Request Body:**
```json
{
  "dry_run": true,
  "active_only": false,
  "supplier_id": null,
  "limit": 0,
  "commission_rate": 10.0
}
```

**Response (dry run):**
```json
{
  "dry_run": true,
  "total_eligible": 231,
  "preview": [
    {"id": 1, "name": "Product Name", "sku": "SA0179", "quantity": 100, "customer_price": "4988.00", "supplier": "Sante Valenzuela Branch"}
  ]
}
```

**Response (execute):**
```json
{
  "detail": "Backfill complete",
  "created": {"supplier_products": 231, "supplier_inventory": 231, "inventory_movements": 102},
  "errors": [],
  "totals": {"supplier_products": 231, "supplier_inventory": 231}
}
```

---

## Error Responses

All endpoints use consistent error response format:

```json
{
  "detail": "Error description"
}
```

| Status Code | Meaning |
|-------------|---------|
| `400` | Bad request (missing/invalid fields) |
| `401` | Not authenticated |
| `403` | Permission denied |
| `404` | Resource not found |
| `409` | Conflict (duplicate resource) |

---

## URL Route Summary

| Method | Path | View | Name |
|--------|------|------|------|
| GET | `/api/supplier/dashboard/` | `SupplierDashboardAPIView` | `supplier-dashboard` |
| GET | `/api/supplier/dashboard/kpis/` | `SupplierKPIsAPIView` | `supplier-kpis` |
| GET, POST | `/api/supplier/products/` | `SupplierProductListAPIView` | `supplier-product-list` |
| GET | `/api/supplier/products/price-requests/` | `PriceChangeRequestListAPIView` | `supplier-price-requests` |
| GET, PUT, DELETE | `/api/supplier/products/{id}/` | `SupplierProductDetailAPIView` | `supplier-product-detail` |
| POST | `/api/supplier/products/{id}/request-price-change/` | `PriceChangeRequestCreateAPIView` | `supplier-price-change-create` |
| GET | `/api/supplier/inventory/` | `SupplierInventoryListAPIView` | `supplier-inventory-list` |
| GET | `/api/supplier/inventory/low-stock/` | `SupplierInventoryLowStockAPIView` | `supplier-inventory-low-stock` |
| GET | `/api/supplier/inventory/movements/` | `SupplierInventoryMovementsAPIView` | `supplier-inventory-movements` |
| POST | `/api/supplier/inventory/{id}/adjust/` | `SupplierInventoryAdjustAPIView` | `supplier-inventory-adjust` |
| POST | `/api/supplier/inventory/{id}/restock/` | `SupplierInventoryRestockAPIView` | `supplier-inventory-restock` |
| GET | `/api/supplier/admin/price-requests/` | `FounderPriceChangeListAPIView` | `founder-price-requests` |
| POST | `/api/supplier/admin/price-requests/{id}/{action}/` | `FounderPriceChangeActionAPIView` | `founder-price-change-action` |

# V4 Frontend: Founders Supplier Management

## Backend API Endpoints (READY)

All endpoints require `IsFounder` permission. Base URL: `/api/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `founders/suppliers/` | List all suppliers (parents + standalones + branches) |
| POST | `founders/suppliers/` | Create new standalone supplier |
| GET | `founders/suppliers/{id}/` | Supplier detail (includes branches for parents) |
| PUT | `founders/suppliers/{id}/` | Update supplier fields |
| GET | `founders/suppliers/{id}/branches/` | List branches of a parent supplier |
| POST | `founders/suppliers/{id}/branches/` | Add new branch to parent |
| PUT | `founders/suppliers/{id}/features/` | Update branch feature toggles |
| GET | `founders/suppliers/{id}/kpi-rollup/` | Combined KPIs across all branches |
| GET | `founders/routing-rules/` | List routing rules (filter: `?parent_supplier_id=`) |
| POST | `founders/routing-rules/` | Create routing rule |
| PUT | `founders/routing-rules/{id}/` | Update routing rule |
| DELETE | `founders/routing-rules/{id}/` | Delete routing rule |
| POST | `founders/routing/test/` | Test routing: `{category, region, conditions}` |
| POST | `founders/branches/onboard/` | Full onboarding wizard |
| GET | `supplier/features/` | Get features for current supplier (supplier auth) |

## V4 API Route Proxies Needed

Create under `src/app/api/founders/`:

```
founders/suppliers/route.ts          -> GET/POST
founders/suppliers/[id]/route.ts     -> GET/PUT
founders/suppliers/[id]/branches/route.ts -> GET/POST
founders/suppliers/[id]/features/route.ts -> PUT
founders/suppliers/[id]/kpi-rollup/route.ts -> GET
founders/routing-rules/route.ts      -> GET/POST
founders/routing-rules/[id]/route.ts -> PUT/DELETE
founders/routing/test/route.ts       -> POST
founders/branches/onboard/route.ts   -> POST
```

And under `src/app/api/supplier/`:
```
supplier/features/route.ts           -> GET
```

## TypeScript Types

Create `src/types/domain/foundersSuppliers.ts`:

```typescript
export interface SupplierUser {
  id: number;
  username: string;
  email: string;
}

export interface SupplierDetail {
  id: number;
  name: string;
  display_name: string;
  is_parent: boolean;
  is_branch: boolean;
  parent_supplier_id: number | null;
  parent_supplier_name: string | null;
  branch_code: string;
  branch_features: BranchFeatures;
  supplier_category: 'brand' | 'independent';
  region: string;
  active: boolean;
  onboarding_status: 'active' | 'onboarding' | 'suspended';
  business_address: string | null;
  pickup_location: string | null;
  business_name: string | null;
  tin_number: string | null;
  vat_status: boolean;
  user: SupplierUser;
  product_count: number;
  timestamp: string | null;
  branches?: SupplierDetail[];  // only for parent suppliers
}

export interface BranchFeatures {
  fulfillment_hub: boolean;
  sns_redemption: boolean;
  bp_encoding: boolean;
  hub_delivery: boolean;
  package_orders: boolean;
  inventory_management: boolean;
  order_management: boolean;
  analytics: boolean;
  settlements: boolean;
  affiliate_commissions: boolean;
  promotions: boolean;
  [key: string]: boolean;
}

export interface RoutingRule {
  id: number;
  parent_supplier_id: number;
  parent_supplier_name: string;
  region_code: string;
  branch_id: number;
  branch_name: string;
  priority: number;
  condition: string;
  is_active: boolean;
  notes: string;
}

export interface RoutingTestResult {
  result: {
    supplier_id: number;
    supplier_name: string;
    branch_code: string;
    display_name: string;
  };
  input: {
    category: string;
    region: string;
    conditions: string[];
  };
}

export interface BranchKPIRollup {
  supplier: { id: number; name: string; is_parent: boolean };
  date: string;
  rollup: {
    total_orders: number;
    total_completed: number;
    total_cancelled: number;
    total_returned: number;
    total_gross_revenue: number;
    total_net_revenue: number;
    total_commission: number;
    total_skus: number;
    total_low_stock: number;
    total_out_of_stock: number;
  };
  branches: BranchKPI[];
}

export interface BranchKPI {
  id: number;
  name: string;
  branch_code: string;
  product_count: number;
  orders_received: number;
  orders_completed: number;
  gross_revenue: string;
  net_revenue: string;
  low_stock_count: number;
  out_of_stock_count: number;
}

export interface OnboardRequest {
  name: string;
  username: string;
  email?: string;
  password?: string;
  region: string;
  parent_supplier_id?: number;
  branch_code?: string;
  supplier_category?: string;
  business_address?: string;
  pickup_location?: string;
  business_name?: string;
  branch_features?: Partial<BranchFeatures>;
  copy_products_from?: number;
  activate?: boolean;
  routing_rules?: {
    region_code: string;
    priority: number;
    condition?: string;
    notes?: string;
  }[];
}
```

## SWR Hooks

Create `src/hooks/useFoundersSuppliers.ts`:

```typescript
// useSupplierList(show?: 'all' | 'parents' | 'standalones' | 'branches' | 'active')
// useSupplierDetail(id: number)
// useBranchList(parentId: number)
// useRoutingRules(parentSupplierId?: number)
// useKPIRollup(supplierId: number)
// useSupplierFeatures()  -- for supplier dashboard
```

## V4 Pages

### 1. Supplier Management (`/founders/suppliers`)
- Table: all suppliers with parent/standalone/branch indicators
- Expand parent rows to show branches
- Quick actions: toggle active, edit, add branch
- "Add Supplier" button -> create standalone
- "Add Branch" button (on parent row) -> onboarding wizard

### 2. Supplier Detail (`/founders/suppliers/[id]`)
- Supplier info card (name, region, address, etc.)
- If parent: branch list with status indicators
- Feature toggle grid (checkboxes)
- Product count, KPI summary

### 3. Feature Toggle Grid (`/founders/suppliers/[id]/features`)
- Matrix: features x branches
- Toggle switches per cell
- Save all changes at once
- Feature descriptions on hover

### 4. Routing Rules (`/founders/suppliers/[id]/routing`)
- Table: region -> branch with priority
- Add/edit/delete rules
- "Test Routing" panel: input category + region + conditions -> see result
- Drag to reorder priority

### 5. Branch KPI Dashboard (`/founders/suppliers/[id]/kpis`)
- Roll-up KPI cards (combined across branches)
- Per-branch breakdown table
- Revenue comparison bar chart (Recharts)

### 6. Onboarding Wizard (`/founders/suppliers/onboard`)
- Step 1: Basic Info (name, region, address)
- Step 2: User Account (username, password, email)
- Step 3: Product Catalog (copy from branch / empty / select products)
- Step 4: Features (toggle grid, pre-filled defaults)
- Step 5: Routing Rules (assign regions, set priority)
- Step 6: Review & Activate

## Region Choices (for dropdowns)

```typescript
export const REGION_CHOICES = [
  { code: '13', name: 'NCR' },
  { code: '04', name: 'CALABARZON' },
  { code: '01', name: 'ILOCOS' },
  { code: '02', name: 'CAGAYAN VALLEY' },
  { code: '03', name: 'CENTRAL LUZON' },
  { code: '17', name: 'MIMAROPA' },
  { code: '05', name: 'BICOL' },
  { code: '06', name: 'WESTERN VISAYAS' },
  { code: '07', name: 'CENTRAL VISAYAS' },
  { code: '08', name: 'EASTERN VISAYAS' },
  { code: '09', name: 'ZAMBOANGA' },
  { code: '10', name: 'NORTHERN MINDANAO' },
  { code: '11', name: 'DAVAO' },
  { code: '12', name: 'SOCCSKSARGEN' },
  { code: '14', name: 'CAR' },
  { code: '15', name: 'ARMM' },
  { code: '16', name: 'CARAGA' },
];
```

# Finance CRUD Implementation Guide

**Version:** 1.0
**Created:** 2026-02-22
**Last Updated:** 2026-02-22
**Author:** CTO Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Implementation Summary](#2-implementation-summary)
3. [Backend (Django) Implementation](#3-backend-django-implementation)
4. [Frontend (Next.js V4) Implementation](#4-frontend-nextjs-v4-implementation)
5. [Step-by-Step Implementation Guide](#5-step-by-step-implementation-guide)
6. [Testing](#6-testing)
7. [Files Created/Modified](#7-files-createdmodified)
8. [API Reference](#8-api-reference)

---

## 1. Overview

### Purpose

This document provides a detailed implementation guide for adding CRUD (Create, Read, Update, Delete) operations to the Finance module. It covers:

- **Operational Expenses** - Add, edit, delete, approve expenses
- **Company Assets** - Register, update, dispose assets
- **Loans** - Create loans, record payments
- **Petty Cash** - Disburse, replenish, reconcile funds

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    V4 Frontend (Next.js)                    │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │ Form Pages  │ → │ API Routes  │ → │ SWR Hooks   │       │
│  └─────────────┘   └─────────────┘   └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Django API (REST Framework)                │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │ CRUD Views  │ → │ Models      │ → │ Audit Log   │       │
│  └─────────────┘   └─────────────┘   └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Implementation Summary

### Components Implemented

| Component | Backend | Frontend | Status |
|-----------|---------|----------|--------|
| Expense CRUD | ✅ | ✅ | Complete |
| Asset CRUD | ✅ | ✅ | Complete |
| Loan CRUD | ✅ | ✅ | Complete |
| Petty Cash CRUD | ✅ | ✅ | Complete |
| Finance Choices API | ✅ | ✅ | Complete |
| Audit Trail | ✅ | N/A | Complete |

### Key Features

1. **Full CRUD Operations** - Create, Read, Update, Delete for all entities
2. **File Upload Support** - Receipt/document uploads with validation
3. **Audit Trail** - All actions logged to `TransactionAuditLog`
4. **Role-Based Access** - Uses `IsFinanceUser` and `IsFinanceManager` permissions
5. **Validation** - Server-side validation with meaningful error messages

---

## 3. Backend (Django) Implementation

### 3.1 New File: `api/views/finance_crud.py`

This file contains all CRUD API views for finance operations.

#### Structure

```python
# api/views/finance_crud.py

# Audit logging helper
def log_audit(user, transaction_type, ref, action, prev_vals, new_vals, request, reason=''):
    """Create audit log entry for all CRUD operations."""

# EXPENSE CRUD
class ExpenseDetailAPIView(APIView):      # GET /api/finance/expenses/<id>/
class ExpenseCreateAPIView(APIView):      # POST /api/finance/expenses/create/
class ExpenseUpdateAPIView(APIView):      # PUT /api/finance/expenses/<id>/update/
class ExpenseDeleteAPIView(APIView):      # DELETE /api/finance/expenses/<id>/delete/
class ExpenseApproveAPIView(APIView):     # POST /api/finance/expenses/<id>/approve/

# ASSET CRUD
class AssetDetailAPIView(APIView):        # GET /api/finance/assets/<id>/
class AssetCreateAPIView(APIView):        # POST /api/finance/assets/create/
class AssetUpdateAPIView(APIView):        # PUT /api/finance/assets/<id>/update/
class AssetDisposeAPIView(APIView):       # POST /api/finance/assets/<id>/dispose/

# LOAN CRUD
class LoanDetailAPIView(APIView):         # GET /api/finance/loans/<id>/
class LoanCreateAPIView(APIView):         # POST /api/finance/loans/create/
class LoanUpdateAPIView(APIView):         # PUT /api/finance/loans/<id>/update/
class LoanPaymentCreateAPIView(APIView):  # POST /api/finance/loans/<id>/payment/

# PETTY CASH CRUD
class PettyCashFundListAPIView(APIView):  # GET /api/finance/petty-cash/funds/
class PettyCashDisburseAPIView(APIView):  # POST /api/finance/petty-cash/<id>/disburse/
class PettyCashReplenishAPIView(APIView): # POST /api/finance/petty-cash/<id>/replenish/
class PettyCashReconcileAPIView(APIView): # POST /api/finance/petty-cash/<id>/reconcile/

# CHOICES API
class FinanceChoicesAPIView(APIView):     # GET /api/finance/choices/
```

### 3.2 URL Configuration Updates

Added to `api/urls.py`:

```python
# Finance CRUD imports
from api.views.finance_crud import (
    # Expenses
    ExpenseDetailAPIView,
    ExpenseCreateAPIView,
    ExpenseUpdateAPIView,
    ExpenseDeleteAPIView,
    ExpenseApproveAPIView,
    # Assets
    AssetDetailAPIView,
    AssetCreateAPIView,
    AssetUpdateAPIView,
    AssetDisposeAPIView,
    # Loans
    LoanDetailAPIView,
    LoanCreateAPIView,
    LoanUpdateAPIView,
    LoanPaymentCreateAPIView,
    # Petty Cash
    PettyCashFundListAPIView,
    PettyCashDisburseAPIView,
    PettyCashReplenishAPIView,
    PettyCashReconcileAPIView,
    # Choices
    FinanceChoicesAPIView,
)

# URL patterns
urlpatterns += [
    # Expenses
    path('finance/expenses/create/', ExpenseCreateAPIView.as_view()),
    path('finance/expenses/<int:expense_id>/', ExpenseDetailAPIView.as_view()),
    path('finance/expenses/<int:expense_id>/update/', ExpenseUpdateAPIView.as_view()),
    path('finance/expenses/<int:expense_id>/delete/', ExpenseDeleteAPIView.as_view()),
    path('finance/expenses/<int:expense_id>/approve/', ExpenseApproveAPIView.as_view()),

    # Assets
    path('finance/assets/create/', AssetCreateAPIView.as_view()),
    path('finance/assets/<int:asset_id>/', AssetDetailAPIView.as_view()),
    path('finance/assets/<int:asset_id>/update/', AssetUpdateAPIView.as_view()),
    path('finance/assets/<int:asset_id>/dispose/', AssetDisposeAPIView.as_view()),

    # Loans
    path('finance/loans/create/', LoanCreateAPIView.as_view()),
    path('finance/loans/<int:loan_id>/', LoanDetailAPIView.as_view()),
    path('finance/loans/<int:loan_id>/update/', LoanUpdateAPIView.as_view()),
    path('finance/loans/<int:loan_id>/payment/', LoanPaymentCreateAPIView.as_view()),

    # Petty Cash
    path('finance/petty-cash/funds/', PettyCashFundListAPIView.as_view()),
    path('finance/petty-cash/<int:fund_id>/disburse/', PettyCashDisburseAPIView.as_view()),
    path('finance/petty-cash/<int:fund_id>/replenish/', PettyCashReplenishAPIView.as_view()),
    path('finance/petty-cash/<int:fund_id>/reconcile/', PettyCashReconcileAPIView.as_view()),

    # Choices
    path('finance/choices/', FinanceChoicesAPIView.as_view()),
]
```

### 3.3 Permission Classes Used

```python
from api.permissions import IsFinanceUser, IsFinanceManager

# Read/Create/Update operations
permission_classes = [IsAuthenticated, IsFinanceUser]

# Approval/Manager operations
permission_classes = [IsAuthenticated, IsFinanceManager]
```

### 3.4 Audit Logging

Every CRUD operation logs to `TransactionAuditLog`:

```python
from finance.models import TransactionAuditLog
from twcako.app_utils.user import get_client_ip

def log_audit(user, transaction_type, ref, action, prev_vals, new_vals, request, reason=''):
    return TransactionAuditLog.objects.create(
        action_by=user,
        transaction_type=transaction_type,
        transaction_ref=ref,
        action=action,
        previous_values=prev_vals,
        new_values=new_vals,
        reason=reason,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
    )
```

---

## 4. Frontend (Next.js V4) Implementation

### 4.1 Type Definitions

Added to `src/types/domain/finance.ts`:

```typescript
// Expense Detail
export interface ExpenseDetail {
  id: number;
  expense_date: string;
  category: ExpenseCategory;
  // ... full type definition
}

export interface ExpenseCreatePayload {
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  // ... optional fields
}

// Asset Detail
export interface AssetDetail { ... }
export interface AssetCreatePayload { ... }

// Loan Detail
export interface LoanDetail { ... }
export interface LoanCreatePayload { ... }
export interface LoanPaymentPayload { ... }

// Petty Cash
export interface PettyCashFundDetail { ... }
export interface PettyCashDisbursePayload { ... }
export interface PettyCashReplenishPayload { ... }
export interface PettyCashReconcilePayload { ... }

// Choices API
export interface FinanceChoices {
  expense_categories: ChoiceOption[];
  expense_subcategories: ChoiceOption[];
  expense_payment_methods: ChoiceOption[];
  // ... all choice options
}
```

### 4.2 API Routes Created

| Route | Method | Proxies To |
|-------|--------|------------|
| `/api/finance/expenses/create` | POST | `/finance/expenses/create/` |
| `/api/finance/expenses/[id]` | GET/PUT/DELETE | `/finance/expenses/<id>/` |
| `/api/finance/expenses/[id]/approve` | POST | `/finance/expenses/<id>/approve/` |
| `/api/finance/assets/create` | POST | `/finance/assets/create/` |
| `/api/finance/assets/[id]` | GET/PUT | `/finance/assets/<id>/` |
| `/api/finance/assets/[id]/dispose` | POST | `/finance/assets/<id>/dispose/` |
| `/api/finance/loans/create` | POST | `/finance/loans/create/` |
| `/api/finance/loans/[id]` | GET/PUT | `/finance/loans/<id>/` |
| `/api/finance/loans/[id]/payment` | POST | `/finance/loans/<id>/payment/` |
| `/api/finance/petty-cash/funds` | GET | `/finance/petty-cash/funds/` |
| `/api/finance/petty-cash/[fundId]/disburse` | POST | `/finance/petty-cash/<id>/disburse/` |
| `/api/finance/petty-cash/[fundId]/replenish` | POST | `/finance/petty-cash/<id>/replenish/` |
| `/api/finance/petty-cash/[fundId]/reconcile` | POST | `/finance/petty-cash/<id>/reconcile/` |
| `/api/finance/choices` | GET | `/finance/choices/` |

### 4.3 SWR Hooks Added

Added to `src/hooks/useFinance.ts`:

```typescript
// Expense Detail
export function useExpenseDetail(expenseId: number | null) { ... }

// Asset Detail
export function useAssetDetail(assetId: number | null) { ... }

// Loan Detail
export function useLoanDetail(loanId: number | null) { ... }

// Petty Cash Funds
export function usePettyCashFunds() { ... }

// Finance Choices (for forms)
export function useFinanceChoices() { ... }
```

### 4.4 Form Pages Created

| Page | Route | Component |
|------|-------|-----------|
| Add Expense | `/expenses/new` | `ExpenseFormClient` |
| Edit Expense | `/expenses/[id]/edit` | `ExpenseFormClient` |

---

## 5. Step-by-Step Implementation Guide

### Step 1: Create Backend CRUD Views

1. Create `api/views/finance_crud.py`
2. Add audit logging helper function
3. Implement CRUD views for each entity:
   - Use `APIView` base class
   - Add proper permission classes
   - Validate input data
   - Log all actions to audit trail
   - Return consistent JSON responses

### Step 2: Register URLs

1. Import views in `api/urls.py`
2. Add URL patterns following REST conventions
3. Use consistent naming (e.g., `expense-create`, `expense-detail`)

### Step 3: Create Frontend Types

1. Define TypeScript interfaces for:
   - Detail responses (e.g., `ExpenseDetail`)
   - Create payloads (e.g., `ExpenseCreatePayload`)
   - API responses (e.g., `ExpenseCreateResponse`)
2. Add to `src/types/domain/finance.ts`

### Step 4: Create API Routes

1. Create Next.js API routes in `src/app/api/finance/`
2. Each route proxies to Django API:
   - Authenticate with `auth()`
   - Forward request to Django
   - Return response

### Step 5: Add SWR Hooks

1. Add detail hooks for each entity
2. Add choices hook for form dropdowns
3. Use appropriate caching settings

### Step 6: Create Form Components

1. Create form client component (e.g., `ExpenseFormClient`)
2. Support both create and edit modes
3. Use MUI components for UI
4. Handle file uploads with `FormData`
5. Show loading/error/success states

### Step 7: Create Page Components

1. Create page.tsx files
2. Pass appropriate props to form client
3. Add proper metadata for SEO

---

## 6. Testing

### Backend Testing

```bash
# Test expense creation
curl -X POST http://localhost:8000/api/finance/expenses/create/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "expense_date=2026-02-22" \
  -F "category=software_subscriptions" \
  -F "description=AWS hosting" \
  -F "amount=5000"

# Test expense detail
curl http://localhost:8000/api/finance/expenses/1/ \
  -H "Authorization: Bearer $TOKEN"

# Test choices API
curl http://localhost:8000/api/finance/choices/ \
  -H "Authorization: Bearer $TOKEN"
```

### Frontend Testing

1. Navigate to `/expenses/new`
2. Fill out form fields
3. Submit and verify redirect to `/expenses`
4. Check Django admin for created record
5. Check audit trail in `TransactionAuditLog`

---

## 7. Files Created/Modified

### Backend (Django)

| File | Action | Description |
|------|--------|-------------|
| `api/views/finance_crud.py` | **NEW** | All CRUD API views |
| `api/urls.py` | Modified | Added CRUD URL patterns |

### Frontend (Next.js V4)

| File | Action | Description |
|------|--------|-------------|
| `src/types/domain/finance.ts` | Modified | Added CRUD types |
| `src/hooks/useFinance.ts` | Modified | Added detail hooks |
| `src/app/api/finance/expenses/create/route.ts` | **NEW** | Create expense proxy |
| `src/app/api/finance/expenses/[id]/route.ts` | **NEW** | Detail/Update/Delete proxy |
| `src/app/api/finance/expenses/[id]/approve/route.ts` | **NEW** | Approve proxy |
| `src/app/api/finance/assets/create/route.ts` | **NEW** | Create asset proxy |
| `src/app/api/finance/assets/[id]/route.ts` | **NEW** | Detail/Update proxy |
| `src/app/api/finance/assets/[id]/dispose/route.ts` | **NEW** | Dispose proxy |
| `src/app/api/finance/loans/create/route.ts` | **NEW** | Create loan proxy |
| `src/app/api/finance/loans/[id]/route.ts` | **NEW** | Detail/Update proxy |
| `src/app/api/finance/loans/[id]/payment/route.ts` | **NEW** | Payment proxy |
| `src/app/api/finance/petty-cash/funds/route.ts` | **NEW** | Funds list proxy |
| `src/app/api/finance/petty-cash/[fundId]/disburse/route.ts` | **NEW** | Disburse proxy |
| `src/app/api/finance/petty-cash/[fundId]/replenish/route.ts` | **NEW** | Replenish proxy |
| `src/app/api/finance/petty-cash/[fundId]/reconcile/route.ts` | **NEW** | Reconcile proxy |
| `src/app/api/finance/choices/route.ts` | **NEW** | Choices proxy |
| `src/app/(dashboards)/expenses/new/page.tsx` | **NEW** | Add expense page |
| `src/app/(dashboards)/expenses/new/_components/ExpenseFormClient.tsx` | **NEW** | Form component |
| `src/app/(dashboards)/expenses/[id]/edit/page.tsx` | **NEW** | Edit expense page |

---

## 8. API Reference

### Expense Endpoints

#### Create Expense
```
POST /api/finance/expenses/create/
Content-Type: multipart/form-data

Body:
- expense_date: string (YYYY-MM-DD) [required]
- category: string [required]
- description: string [required]
- amount: decimal [required]
- subcategory: string [optional]
- payment_method: string [default: bank_transfer]
- vendor: string [optional]
- payment_reference: string [optional]
- notes: string [optional]
- receipt: file [optional, max 10MB]

Response:
{
  "status": "success",
  "message": "Expense created successfully",
  "expense_id": 123
}
```

#### Get Expense Detail
```
GET /api/finance/expenses/{id}/

Response:
{
  "id": 123,
  "expense_date": "2026-02-22",
  "category": "software_subscriptions",
  "category_display": "Software & Subscriptions",
  ...
}
```

#### Update Expense
```
PUT /api/finance/expenses/{id}/update/
Content-Type: multipart/form-data

(Same fields as create, all optional)
```

#### Delete Expense
```
DELETE /api/finance/expenses/{id}/delete/

Response:
{
  "status": "success",
  "message": "Expense cancelled successfully"
}
```

#### Approve/Reject Expense
```
POST /api/finance/expenses/{id}/approve/
Content-Type: application/json

Body:
{
  "action": "approve" | "reject",
  "reason": "string" (required for reject)
}
```

### Asset Endpoints

Similar pattern to expenses. See code for full details.

### Loan Endpoints

Similar pattern with additional payment endpoint:

```
POST /api/finance/loans/{id}/payment/

Body:
- amount_paid: decimal [required]
- payment_date: string [optional, default: today]
- payment_method: string [optional]
- reference: string [optional]
- late_fee: decimal [optional, default: 0]
- notes: string [optional]
- receipt: file [optional]
```

### Petty Cash Endpoints

```
GET /api/finance/petty-cash/funds/

POST /api/finance/petty-cash/{fund_id}/disburse/
Body:
- amount: decimal [required]
- description: string [required]
- expense_category: string [optional]
- recipient: string [optional]
- receipt: file [optional]

POST /api/finance/petty-cash/{fund_id}/replenish/
Body:
- amount: decimal [required]
- description: string [optional]
- source: string [optional]

POST /api/finance/petty-cash/{fund_id}/reconcile/
Body:
- physical_count: decimal [required]
- explanation: string [optional]
- adjust_balance: boolean [optional]
```

### Choices Endpoint

```
GET /api/finance/choices/

Response:
{
  "expense_categories": [{"value": "...", "label": "..."}],
  "expense_subcategories": [...],
  "expense_payment_methods": [...],
  "expense_statuses": [...],
  "asset_types": [...],
  "asset_statuses": [...],
  "loan_types": [...],
  "loan_statuses": [...]
}
```

---

## Related Documentation

- [Finance Module Roadmap](./FINANCE_MODULE_ROADMAP.md)
- [Finance Monitoring Implementation](./FINANCE_MONITORING_IMPLEMENTATION.md)
- [Finance Pages Implementation](./FINANCE_PAGES_IMPLEMENTATION.md)
- [V4 Frontend Integration](./V4_FRONTEND_INTEGRATION.md)

---

---

## 9. Phase 1 Complete Summary

### All Phase 1 Components Delivered

| Component | Backend | Frontend | Tested |
|-----------|---------|----------|--------|
| Expense Create/Edit | ✅ | ✅ | Ready |
| Expense Delete | ✅ | ✅ | Ready |
| Expense Approve/Reject | ✅ | ✅ | Ready |
| Asset Create/Edit | ✅ | ✅ | Ready |
| Asset Dispose | ✅ | ✅ | Ready |
| Loan Create | ✅ | ✅ | Ready |
| Loan Payment Recording | ✅ | ✅ | Ready |
| Petty Cash Disburse | ✅ | ✅ | Ready |
| Petty Cash Replenish | ✅ | ✅ | Ready |
| Petty Cash Reconcile | ✅ | ✅ | Ready |
| Finance Choices API | ✅ | ✅ | Ready |
| Audit Trail Logging | ✅ | N/A | Ready |

### Total Files Created/Modified

**Backend (Django):**
- 1 new file (`api/views/finance_crud.py`) with 17 API views
- 1 modified file (`api/urls.py`) with 21 new URL patterns

**Frontend (Next.js V4):**
- 15 new API route files
- 11 new page/component files
- 2 modified files (types, hooks)

### V4 Routes Added

| Route | Description |
|-------|-------------|
| `/expenses/new` | Add new expense form |
| `/expenses/[id]/edit` | Edit expense form |
| `/assets/new` | Register new asset form |
| `/assets/[id]/edit` | Edit asset form |
| `/loans` | Loans list page |
| `/loans/new` | Add new loan form |
| `/loans/[id]` | Loan detail with payment form |
| `/petty-cash` | Petty cash dashboard with dialogs |

### Menu Integration Required

Add these items to `src/config/menuItems.ts`:

```typescript
// Under Finance Dashboard children
{
  id: 'loans',
  title: 'Loans',
  path: '/loans',
  icon: 'AccountBalance',
},
{
  id: 'petty-cash',
  title: 'Petty Cash',
  path: '/petty-cash',
  icon: 'AccountBalanceWallet',
},
```

---

## 10. Deployment Checklist

### Backend Deployment

```bash
# 1. Pull latest changes
git pull origin main

# 2. Run migrations (if any)
python manage.py migrate

# 3. Collect static files
python manage.py collectstatic --noinput

# 4. Restart server
# Railway: automatic on push
# Manual: systemctl restart gunicorn
```

### Frontend Deployment

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Deploy
# Vercel: automatic on push
```

### Post-Deployment Verification

1. **Test Choices API**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" https://api.twcako.com/api/finance/choices/
   ```

2. **Test Expense Create**
   - Navigate to `/expenses/new`
   - Fill form and submit
   - Verify in Django admin

3. **Test Loan Payment**
   - Navigate to `/loans`
   - Click on a loan
   - Record a test payment

4. **Check Audit Trail**
   - Django admin → Transaction Audit Logs
   - Verify all CRUD actions are logged

---

*Document Version: 1.1*
*Created: 2026-02-22*
*Updated: 2026-02-22*
*Author: CTO Team*

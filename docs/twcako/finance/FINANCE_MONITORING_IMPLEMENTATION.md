# Finance Monitoring System - Implementation Guide

**Version:** 1.3
**Date:** 2026-02-15
**Last Updated:** 2026-02-22
**Status:** Implemented (Phase 3 Complete)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Backend Implementation (Django)](#2-backend-implementation-django)
3. [Frontend Implementation (V4)](#3-frontend-implementation-v4)
4. [API Endpoints](#4-api-endpoints)
5. [Celery Tasks](#5-celery-tasks)
6. [Database Models](#6-database-models)
7. [Testing & Seed Data](#7-testing--seed-data)
8. [Replication Guide](#8-replication-guide)
9. [Code Review & Audit Log](#9-code-review--audit-log)
10. [Change Log](#10-change-log)
11. [Phase 3: BIR Compliance Components](#11-phase-3-bir-compliance-components)

---

## 1. Overview

The Finance Monitoring System provides comprehensive financial visibility and management for TWCako:

### Key Features

| Feature | Description |
|---------|-------------|
| **Cash Position Dashboard** | Real-time view of eCash balances, daily cash flow |
| **Pending Approvals** | Track payments, withdrawals, top-ups with SLA |
| **Finance Alerts** | Automated detection of anomalies, large transactions |
| **Member Financial Health** | Scoring system for member financial behavior |
| **Operational Expenses** | Track business expenses, events, software |
| **Company Assets** | Manage real estate, equipment, investments |
| **Loans & Liabilities** | Track mortgages, credit lines, payments |
| **Petty Cash** | Fund management, disbursements, reconciliation |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     V4 Frontend (Next.js)                        │
│                    http://localhost:3000                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  /finance-monitoring                                     │    │
│  │  - FinanceMonitoringClient.tsx                          │    │
│  │  - useFinance.ts hooks                                  │    │
│  │  - /api/finance/* routes                                │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Django Backend                               │
│               http://api.localhost:8000                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  finance/models.py (15 models)                          │    │
│  │  finance/audit.py (audit trail helpers)                 │    │
│  │  finance/reports.py (PDF & Excel generation)            │    │
│  │  api/views/finance_monitoring.py (26 API views)         │    │
│  │  finance/tasks.py (9 Celery tasks)                      │    │
│  │  finance/admin.py (registered models)                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Backend Implementation (Django)

### 2.1 Models Created

All models are in `finance/models.py`:

#### Core Finance Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `FinanceDailySnapshot` | End-of-day financial summary | date, total_ecash_balance, cash_in/out, commissions, revenue |
| `FinanceAlert` | Finance-related alerts | alert_type, severity, status, related_user, amount |
| `ApprovalQueueItem` | Pending approvals with SLA | item_type, priority, sla_deadline, sla_breached |
| `MemberFinancialHealth` | Member financial scoring | health_score, rating, risk_flags, balance stats |
| `TransactionAuditLog` | Complete audit trail | action, previous_values, new_values |
| `ReconciliationLog` | Daily reconciliation status | recon_type, expected vs actual, variance |
| `SupplierSettlement` | Supplier payment tracking | period, orders, deductions, net_payable |

#### Operational Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `OperationalExpense` | Business expenses | category, subcategory, amount, status |
| `CompanyAsset` | Company-owned assets | asset_type, purchase_price, current_value |
| `Loan` | Loan tracking | loan_type, principal, balance, monthly_payment |
| `LoanPayment` | Individual payments | principal_portion, interest_portion |
| `AssetIncome` | Income from assets | income_type, gross_amount, net_income |

#### Petty Cash Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `PettyCashFund` | Petty cash funds | float_amount, current_balance, custodian |
| `PettyCashTransaction` | Disbursements/replenishments | transaction_type, amount, balance_after |
| `PettyCashReconciliation` | Monthly reconciliation | physical_count, variance |

### 2.2 Key Model Features

**ApprovalQueueItem - Auto SLA Calculation:**
```python
def save(self, *args, **kwargs):
    # Auto-set priority based on amount
    if not self.pk and self.priority == 'normal':
        if self.amount >= 100000:
            self.priority = 'urgent'
            self.sla_hours = 4
        elif self.amount >= 30000:
            self.priority = 'high'
            self.sla_hours = 12
```

**MemberFinancialHealth - Risk Flags:**
```python
RISK_FLAGS = [
    ('high_withdrawal_risk', 'High Withdrawal Risk'),
    ('dormant_high_balance', 'Dormant High Balance'),
    ('frequent_rejections', 'Frequent Rejections'),
    ('velocity_anomaly', 'Velocity Anomaly'),
    ('balance_plunge', 'Balance Plunge'),
]
```

**FinanceAlert - Severity Levels:**
- `critical` - Immediate attention (SLA breach, large withdrawal > 100k)
- `high` - Urgent (large withdrawal > 30k, rapid withdrawals)
- `medium` - Warning (SLA warning, petty cash low)
- `low` - Informational

---

## 3. Frontend Implementation (V4)

### 3.1 Files Created

```
TWCAKOV4/src/
├── types/domain/finance.ts           # TypeScript interfaces
├── hooks/useFinance.ts               # SWR data fetching hooks
├── app/
│   ├── api/finance/
│   │   ├── dashboard/route.ts        # Dashboard metrics proxy
│   │   ├── alerts/route.ts           # Alerts list proxy
│   │   └── approval-queue/route.ts   # Approval queue proxy
│   └── (dashboards)/finance-monitoring/
│       ├── page.tsx                  # Server component
│       └── FinanceMonitoringClient.tsx  # Main client component
└── config/menuItems.ts               # Navigation (updated)
```

### 3.2 Key Hooks

```typescript
// Main dashboard hook
export function useFinanceDashboard() {
  return useSWR<FinanceDashboardData>(
    "/api/finance/dashboard",
    authGetFetcher,
    { refreshInterval: 60000 } // Auto-refresh every minute
  );
}

// Approval queue with auto-refresh
export function useApprovalQueue() {
  return useSWR<ApprovalQueueResponse>(
    "/api/finance/approval-queue",
    authGetFetcher,
    { refreshInterval: 30000 } // Auto-refresh every 30 seconds
  );
}

// Combined hook for page
export function useFinancePage() {
  const dashboard = useFinanceDashboard();
  const approvalQueue = useApprovalQueue();
  const alerts = useFinanceAlerts({ status: "open" });
  return { dashboard, approvalQueue, alerts };
}
```

### 3.3 Dashboard Components (Revamped 2026-02-16)

The main dashboard (`FinanceMonitoringClient.tsx`) was revamped with a modern, professional design inspired by leading financial dashboards. Key features:

#### Design System
- **Color-coded KPI cards** with trend indicators and animated hover effects
- **Time-aware greeting** ("Good morning/afternoon/evening, Finance Team!")
- **Smooth animations** using framer-motion (staggered entrance, hover scaling)
- **Theme-aware** styling with proper dark mode support
- **Responsive layout** optimized for desktop and mobile

#### Components

| Component | Description |
|-----------|-------------|
| **KPICard** | Reusable card with icon, value, trend indicator, subtitle. Color variants: primary, success, warning, error, info |
| **CashFlowChart** | Interactive bar chart showing 7-day cash in/out with tooltips, animated bars |
| **ActionItemsCard** | Dark-themed to-do list showing urgent finance tasks (SLA breaches, alerts, pending approvals) |
| **TransactionSummaryCard** | Circular progress visualization of today's transactions (approved/pending/rejected) |
| **AlertsWidget** | Grid of alert counts by severity + recent alerts list |
| **ApprovalQueueTable** | Enhanced table with avatars, priority chips, SLA status indicators |

#### Layout Structure
```
┌────────────────────────────────────────────────────────────────┐
│  Greeting Header + Date + Refresh Button                        │
├────────────────────────────────────────────────────────────────┤
│  KPI Cards (4 columns): Balance | Cash In | Cash Out | Pending │
├───────────────────────────────────────┬────────────────────────┤
│                                       │                        │
│  Cash Flow Chart (7-day bar graph)    │  To-Do List (dark)     │
│                                       │                        │
├───────────────────┬───────────────────┤  Pending by Type       │
│ Transaction Donut │ Alerts Grid       │  (progress bars)       │
├───────────────────┴───────────────────┤                        │
│ Approval Queue Table                  │  Net Cash Flow Card    │
│                                       │                        │
└───────────────────────────────────────┴────────────────────────┘
```

#### Key UI Improvements
- **Bold KPI numbers** with abbreviated formats (₱1.5M, ₱25K)
- **Trend indicators** showing percentage change vs yesterday
- **SLA visualization** with color-coded status (green → yellow → red)
- **Empty state** for approval queue ("All caught up!")
- **Animated chart bars** that grow on page load
- **Hover tooltips** with detailed breakdowns

---

## 4. API Endpoints

All endpoints require authentication (JWT Bearer token).

### 4.1 Dashboard Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/finance/dashboard/` | GET | Main dashboard metrics |
| `/api/finance/snapshots/` | GET | Historical daily snapshots |

**Dashboard Response:**
```json
{
  "cash_position": {
    "total_ecash_balance": 5000000.00,
    "cash_in_today": 150000.00,
    "cash_out_today": 75000.00,
    "net_today": 75000.00
  },
  "pending_approvals": {
    "payments": {"count": 5, "amount": 25000.00},
    "withdrawals": {"count": 8, "amount": 120000.00},
    "topups": {"count": 3, "amount": 15000.00},
    "total_count": 16,
    "oldest_pending_hours": 12.5,
    "sla_breached_count": 2
  },
  "alerts": {
    "critical": 1,
    "high": 3,
    "medium": 5,
    "low": 2,
    "total_active": 11,
    "recent": [...]
  },
  "today_transactions": {
    "approved": 45,
    "pending": 16,
    "rejected": 3,
    "total": 64
  },
  "weekly_trend": [
    {"date": "2026-02-09", "cash_in": 120000, "cash_out": 80000, "net": 40000},
    ...
  ]
}
```

### 4.2 Alerts Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/finance/alerts/` | GET | List alerts (filterable) |
| `/api/finance/alerts/<id>/` | GET | Alert detail |
| `/api/finance/alerts/<id>/` | POST | Update alert (resolve/dismiss) |

**Filter Parameters:**
- `status` - open, assigned, investigating, resolved, dismissed
- `severity` - low, medium, high, critical
- `type` - alert type code
- `page`, `page_size` - pagination

### 4.3 Approval Queue Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/finance/approval-queue/` | GET | Pending approvals list |

**Filter Parameters:**
- `type` - payment, withdrawal, topup
- `priority` - normal, high, urgent
- `sla_breached` - true/false

### 4.4 Other Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/finance/member-health/<username>/` | GET | Member financial health |
| `/api/finance/expenses/` | GET | Operational expenses |
| `/api/finance/expenses/summary/` | GET | Expense summary by category |
| `/api/finance/assets/` | GET | Company assets |
| `/api/finance/loans/` | GET | Active loans |
| `/api/finance/loans/due/` | GET | Loans due in 30 days |
| `/api/finance/petty-cash/` | GET | Petty cash dashboard |
| `/api/finance/petty-cash/<id>/transactions/` | GET | Fund transactions |

---

## 5. Celery Tasks

Registered in `twcako/celery.py`:

| Task | Schedule | Purpose |
|------|----------|---------|
| `finance.calculate_daily_snapshot` | 11:59 PM | End-of-day financial summary |
| `finance.calculate_member_financial_health` | 2:30 AM | Update health scores |
| `finance.check_pending_sla` | Every 30 min | Detect SLA breaches |
| `finance.detect_anomalies` | Every 15 min | Fraud detection |
| `finance.escalate_pending_approvals` | Every hour | Auto-escalate breached items |
| `finance.check_loan_payments_due` | 8:00 AM | Alert for upcoming payments |
| `finance.check_petty_cash_balances` | 9:00 AM | Low balance alerts |

### Task Implementation Examples

**SLA Breach Detection:**
```python
@shared_task
def check_pending_sla():
    pending_items = ApprovalQueueItem.objects.filter(
        status__in=['pending', 'assigned', 'in_review']
    )
    for item in pending_items:
        if not item.sla_breached and timezone.now() > item.sla_deadline:
            item.sla_breached = True
            item.save()
            # Create critical alert
            FinanceAlert.objects.create(
                alert_type='sla_breach',
                severity='critical',
                title=f'SLA Breach - {item.reference_id}',
                ...
            )
```

**Anomaly Detection:**
```python
@shared_task
def detect_anomalies():
    # Large withdrawals
    large_withdrawals = CashTransaction.objects.filter(
        category='withdrawal',
        status='pending',
        timestamp__gte=one_hour_ago,
        amount__gte=30000
    )
    # Create alerts for each
    ...

    # Rapid withdrawals (3+ in 1 hour)
    rapid = CashTransaction.objects.filter(
        category='withdrawal',
        timestamp__gte=one_hour_ago
    ).values('user').annotate(count=Count('id')).filter(count__gte=3)
    ...
```

---

## 6. Database Models

### 6.1 Migration

Run migrations:
```bash
python manage.py makemigrations finance
python manage.py migrate
```

### 6.2 Admin Registration

All models are registered in `finance/admin.py` with:
- Custom list displays with formatted badges
- Filters for common queries
- Search fields
- Date hierarchy where applicable
- Raw ID fields for ForeignKey performance

---

## 7. Testing & Seed Data

### 7.1 Seed Test Data

```bash
# Create test data
python manage.py seed_finance_data

# Clean and recreate
python manage.py seed_finance_data --clean
```

**Creates:**
- 6 finance alerts (various severities)
- 8 approval queue items (with SLA tracking)
- 5 operational expenses
- 3 company assets (with income records)
- 2 loans (with payment history)
- 2 petty cash funds (with transactions)
- 7 daily snapshots
- Member financial health records
- **20+ ECash records** (member balances with category='credit')
- **150+ CashTransaction records**:
  - Approved transactions (last 7 days) for weekly trend chart
  - Pending payments/withdrawals/topups for approval queue
  - Today's transactions for daily summary

### 7.2 Manual Testing

1. **Django Admin:**
   ```
   http://api.localhost:8000/admin/finance/
   ```

2. **API Direct:**
   ```bash
   # Get token
   curl -X POST http://api.localhost:8000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"YOUR_USER","password":"YOUR_PASS"}'

   # Test dashboard
   curl http://api.localhost:8000/finance/dashboard/ \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **V4 Frontend:**
   ```
   http://localhost:3000/finance-monitoring
   ```

---

## 8. Replication Guide

### Step 1: Create Models

Copy `finance/models.py` with all 15 models:
- FinanceDailySnapshot
- FinanceAlert
- ApprovalQueueItem
- MemberFinancialHealth
- TransactionAuditLog
- ReconciliationLog
- SupplierSettlement
- OperationalExpense
- CompanyAsset
- Loan
- LoanPayment
- AssetIncome
- PettyCashFund
- PettyCashTransaction
- PettyCashReconciliation

### Step 2: Register Admin

Copy `finance/admin.py` with all model admin classes.

### Step 3: Create API Views

Copy `api/views/finance_monitoring.py` with all 12 API views.

### Step 4: Register URLs

Add to `api/urls.py`:
```python
from api.views.finance_monitoring import (
    FinanceDashboardAPIView,
    FinanceSnapshotHistoryAPIView,
    FinanceAlertsListAPIView,
    # ... all other views
)

urlpatterns = [
    # ... existing paths
    path('finance/dashboard/', FinanceDashboardAPIView.as_view()),
    path('finance/snapshots/', FinanceSnapshotHistoryAPIView.as_view()),
    path('finance/alerts/', FinanceAlertsListAPIView.as_view()),
    # ... all other paths
]
```

### Step 5: Create Celery Tasks

Copy `finance/tasks.py` with all 7 tasks.

Register in `twcako/celery.py`:
```python
app.conf.beat_schedule = {
    'daily-finance-snapshot': {
        'task': 'finance.calculate_daily_snapshot',
        'schedule': crontab(hour=23, minute=59),
    },
    # ... other tasks
}
```

### Step 6: Create V4 Frontend

1. Copy `types/domain/finance.ts`
2. Copy `hooks/useFinance.ts`
3. Copy `app/api/finance/*/route.ts` files
4. Copy `app/(dashboards)/finance-monitoring/` folder
5. Update `config/menuItems.ts` to add navigation

### Step 7: Run Migrations

```bash
python manage.py makemigrations finance
python manage.py migrate
```

### Step 8: Seed Test Data

```bash
python manage.py seed_finance_data
```

### Step 9: Test

1. Start Django: `python manage.py runserver 8000`
2. Start Next.js: `npm run dev`
3. Navigate to `http://localhost:3000/finance-monitoring`

---

## 9. Code Review & Audit Log

### Review: 2026-02-22 (Saturday, 10:30 AM PHT)

**Reviewer:** CTO Team
**Files Reviewed:**
- `finance/models.py` (1,137 lines)
- `api/views/finance_monitoring.py` (1,317 lines)
- `finance/tasks.py` (768 lines)
- `finance/admin.py` (468 lines)

#### Verification Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Models (15) | ✅ Complete | All documented models implemented |
| API Endpoints (18) | ✅ Complete | All endpoints functional |
| Celery Tasks (7+1) | ✅ Complete | 8 tasks (1 bonus: V2/V3 reconciliation) |
| Admin Registration | ✅ Complete | All 15 models with custom displays |
| V3 ECashEntry Usage | ✅ Verified | Single source of truth confirmed |

#### Issues Identified

| # | Issue | Severity | Location | Status |
|---|-------|----------|----------|--------|
| 1 | Hardcoded usernames in authorization | Medium | `finance_monitoring.py` (lines 72, 945, 1146, 1248) | 🔴 Open |
| 2 | No TransactionAuditLog on approval actions | Medium | `ApprovalQueueActionAPIView` | 🔴 Open |
| 3 | N+1 query in SLA check loop | Low | `ApprovalQueueListAPIView:422` | 🔴 Open |
| 4 | `check_ecash_reconciliation` task undocumented | Low | `finance/tasks.py` | 🟢 Fixed (this update) |

#### Recommendations

1. **Create `FinancePermission` class** - Extract hardcoded auth logic into reusable permission
2. **Add audit trail** - Create `TransactionAuditLog` entries in `ApprovalQueueActionAPIView`
3. **Bulk SLA update** - Replace loop with `queryset.filter().update()` for performance
4. **Add unit tests** - No test coverage documentation exists

#### Bonus Task Discovered

The codebase includes an **8th Celery task** not in original documentation:

```python
@shared_task(name='finance.check_ecash_reconciliation')
def check_ecash_reconciliation():
    """
    Compare V2 (ECash) and V3 (ECashEntry) ledger totals.
    Runs daily to detect discrepancies.
    Creates alert if variance > 100 PHP.
    """
```

This task is valuable for monitoring V2/V3 ledger drift during migration.

---

## 10. Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-15 | 1.0 | Initial implementation | CTO Planning Session |
| 2026-02-17 | 1.1 | Added Phase 2 reference | CTO Planning Session |
| 2026-02-22 | 1.2 | Code review audit, added Section 9 & 10 | CTO Team |
| 2026-02-22 | 1.3 | Phase 3: BIR Components (Audit Trail, Settlements, Reports) | CTO Team |

---

## 11. Phase 3: BIR Compliance Components

**Implemented:** 2026-02-22
**Status:** Complete

Phase 3 adds three critical components for BIR (Bureau of Internal Revenue) compliance:

### 11.1 Audit Trail Integration

**New File:** `finance/audit.py`

Provides comprehensive audit logging for all financial actions.

#### Helper Functions

| Function | Purpose |
|----------|---------|
| `log_approval_action()` | Log approval queue actions to `TransactionAuditLog` |
| `log_settlement_action()` | Log settlement actions to `TransactionAuditLog` |
| `capture_approval_item_state()` | Capture item state before changes |
| `capture_settlement_state()` | Capture settlement state before changes |

#### Audit Data Captured

```python
TransactionAuditLog.objects.create(
    action_by=user,
    transaction_type='approval_queue',
    transaction_ref=item.reference_id,
    action='approve',  # approve, reject, escalate, etc.
    previous_values={'status': 'pending', ...},
    new_values={'status': 'approved', ...},
    reason=notes,
    ip_address=get_client_ip(request),
    user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
)
```

#### Actions Now Logged

| Action | View | Audit Action |
|--------|------|--------------|
| Approve | `ApprovalQueueActionAPIView` | `approve` |
| Reject | `ApprovalQueueActionAPIView` | `reject` |
| Assign | `ApprovalQueueActionAPIView` | `approve` |
| Escalate | `ApprovalQueueActionAPIView` | `escalate` |
| Take | `ApprovalQueueActionAPIView` | `approve` |
| Settlement Create | `SupplierSettlementListAPIView` | `create` |
| Settlement Action | `SupplierSettlementActionAPIView` | `update`/`approve` |

---

### 11.2 Supplier Settlement System

**New API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/finance/settlements/` | GET | List all settlements |
| `/api/finance/settlements/` | POST | Create new settlement |
| `/api/finance/settlements/<id>/` | GET | Get settlement details |
| `/api/finance/settlements/<id>/action/` | POST | Perform workflow action |
| `/api/finance/settlements/calculate/` | POST | Calculate settlement for supplier |

#### Settlement Workflow

```
1. CALCULATE → Creates settlement (status: 'calculating')
   - Query orders for supplier in period
   - Calculate returns, fees, penalties
   - Status → 'pending_review'

2. SUBMIT → Creates ApprovalQueueItem
   - Type: 'supplier_settlement'
   - Status remains 'pending_review'

3. DISPUTE → Supplier disputes amounts
   - Status → 'disputed'
   - Creates FinanceAlert

4. APPROVE → Finance approves
   - Status → 'approved'
   - Resolves ApprovalQueueItem

5. PROCESS_PAYMENT → Initiate payment
   - Status → 'payment_processing'

6. MARK_PAID → Confirm payment
   - Status → 'paid'
   - Sets paid_amount, paid_at, payment_reference
```

#### Celery Task

```python
@shared_task(name='finance.calculate_supplier_settlements')
def calculate_supplier_settlements():
    """
    Calculate settlements for all active suppliers.
    Runs weekly (Sunday at 10:00 PM).
    """
```

Registered in `twcako/celery.py`:
```python
'finance-supplier-settlements': {
    'task': 'finance.calculate_supplier_settlements',
    'schedule': crontab(hour=22, minute=0, day_of_week='0'),
},
```

---

### 11.3 Automated Financial Reports

**New File:** `finance/reports.py`

Generates downloadable reports for BIR compliance in PDF and Excel formats.

#### Report Service Class

```python
class FinanceReportService:
    def generate_income_statement(self, month: str, format: str) -> bytes
    def generate_expense_report(self, month: str, format: str) -> bytes
    def generate_asset_register(self, format: str) -> bytes
    def generate_loan_schedule(self, loan_id: int, format: str) -> bytes
```

#### Report Endpoints

| Endpoint | Method | Query Params | Description |
|----------|--------|--------------|-------------|
| `/api/finance/reports/income-statement/` | GET | `?format=pdf&month=2026-02` | Monthly income statement |
| `/api/finance/reports/expenses/` | GET | `?format=xlsx&month=2026-02` | Expense report by category |
| `/api/finance/reports/assets/` | GET | `?format=pdf` | Company asset register |
| `/api/finance/reports/loan/<id>/` | GET | `?format=xlsx` | Loan amortization schedule |

#### Report Templates

HTML templates for PDF rendering:
```
finance/templates/finance/reports/
├── income_statement.html
├── expense_report.html
├── asset_register.html
└── loan_schedule.html
```

#### Dependencies

Added to `requirements.txt`:
```
weasyprint==61.2  # PDF generation
openpyxl==3.0.10  # Excel generation (already present)
```

#### Example Usage

```bash
# Download PDF income statement
curl -O "http://api.localhost:8000/finance/reports/income-statement/?format=pdf&month=2026-02" \
  -H "Authorization: Bearer $TOKEN"

# Download Excel expense report
curl -O "http://api.localhost:8000/finance/reports/expenses/?format=xlsx&month=2026-02" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 11.4 Phase 3 File Summary

| File | Action | Description |
|------|--------|-------------|
| `finance/audit.py` | NEW | Audit trail helper functions |
| `finance/reports.py` | NEW | Report generation service |
| `finance/templates/finance/reports/*.html` | NEW | 4 PDF templates |
| `api/views/finance_monitoring.py` | Modified | +8 new views, audit logging |
| `api/urls.py` | Modified | +8 new routes |
| `finance/tasks.py` | Modified | +1 new task |
| `twcako/celery.py` | Modified | +1 new schedule |
| `requirements.txt` | Modified | +weasyprint |

---

## Related Documentation

- [Finance Pages Implementation (Phase 2)](./FINANCE_PAGES_IMPLEMENTATION.md) - **All additional finance pages**
- [Finance Review Issues](./FINANCE_REVIEW_ISSUES.md) - **Open issues from code review**
- [V4 Frontend Integration Guide](./V4_FRONTEND_INTEGRATION.md)
- [Finance Monitoring Spec](./V4_FINANCE_MONITORING_SPEC.md)
- [Member Monitoring Implementation](./MEMBER_MONITORING_IMPLEMENTATION.md)

---

*Document Version: 1.3*
*Created: 2026-02-15*
*Last Updated: 2026-02-22 12:00 PM PHT*
*Author: CTO Team*

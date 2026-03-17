# Finance Module - Production Deployment Guide

**Version:** 1.0
**Date:** 2026-02-22
**Status:** Ready for Production
**Author:** CTO Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Pre-Deployment Checklist](#2-pre-deployment-checklist)
3. [Backend Deployment](#3-backend-deployment)
4. [Frontend Deployment](#4-frontend-deployment)
5. [Database Migrations](#5-database-migrations)
6. [Environment Configuration](#6-environment-configuration)
7. [Post-Deployment Verification](#7-post-deployment-verification)
8. [Rollback Procedures](#8-rollback-procedures)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Overview

### Module Summary

| Phase | Feature | Status | Backend | Frontend |
|-------|---------|--------|---------|----------|
| **Phase 1** | Finance Monitoring | Production Ready | 17 API views | 7 pages |
| **Phase 1** | CRUD Operations | Production Ready | 17 API views | 8 pages |
| **Phase 2** | Enhanced Workflows | Production Ready | 16 API views | 4 pages |
| **Phase 3** | Advanced Accounting | Production Ready | 23 API views | 5 pages |

### Total Scope

- **Backend:** 73 API views, 28 models, 11 Celery tasks
- **Frontend:** 24 pages, 40+ SWR hooks, 1600+ lines of TypeScript types
- **Database:** 3 migration files

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TWCAKOV4 (Next.js 16)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  Finance    │  │  SWR Hooks  │  │  API Routes     │  │
│  │  Pages      │  │  (40+)      │  │  (33 folders)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    TWCako (Django 3.2)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  API Views  │  │  Models     │  │  Celery Tasks   │  │
│  │  (73)       │  │  (28)       │  │  (11)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL + Redis + S3                     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Pre-Deployment Checklist

### Code Quality (Completed)

- [x] Python syntax validation - All files pass
- [x] Next.js build - Successful
- [x] TypeScript errors - 5 fixed
- [x] ESLint errors - 4 fixed
- [x] Interface type definitions - 3 fixed with `Omit<>`

### Files Modified (Require Deployment)

#### Backend (TWCako)

| File | Description |
|------|-------------|
| `api/urls.py` | New URL patterns for finance endpoints |
| `api/views/finance_crud.py` | CRUD operations (17 views) |
| `api/views/finance_monitoring.py` | Monitoring dashboard (18 views) |
| `api/views/finance_phase2.py` | Enhanced workflows (16 views) |
| `api/views/finance_phase3.py` | Advanced accounting (23 views) |
| `api/permissions.py` | Finance permission classes |
| `finance/models.py` | All finance models |
| `finance/admin.py` | Django admin configuration |
| `finance/tasks.py` | Celery background tasks |
| `finance/audit.py` | Audit logging utilities |
| `finance/reports.py` | Report generation helpers |
| `finance/migrations/0001_initial.py` | Phase 1 models |
| `finance/migrations/0002_phase2_enhanced_workflows.py` | Phase 2 models |
| `finance/migrations/0003_phase3_advanced_accounting.py` | Phase 3 models |

#### Frontend (TWCAKOV4)

| Directory | Files | Description |
|-----------|-------|-------------|
| `src/app/(dashboards)/` | 24 page directories | Finance dashboard pages |
| `src/app/api/finance/` | 33 route folders | API proxy routes |
| `src/hooks/useFinance.ts` | 1 file | 40+ SWR data hooks |
| `src/types/domain/finance.ts` | 1 file | 1600+ lines of types |
| `src/lib/fetcher.ts` | 1 file | Auth fetcher (updated) |

---

## 3. Backend Deployment

### Step 1: Update Dependencies

```bash
cd TWCako
pip install -r requirements.txt
```

**New/Updated Dependencies:**
- `openpyxl>=3.1.0` - Excel export for reports
- `reportlab>=4.0.0` - PDF generation
- `python-dateutil>=2.8.0` - Date handling

### Step 2: Deploy Backend Files

Copy these files to production:

```bash
# API Views
scp api/views/finance_crud.py production:/app/api/views/
scp api/views/finance_monitoring.py production:/app/api/views/
scp api/views/finance_phase2.py production:/app/api/views/
scp api/views/finance_phase3.py production:/app/api/views/
scp api/permissions.py production:/app/api/

# Finance App
scp -r finance/ production:/app/finance/

# URL Configuration
scp api/urls.py production:/app/api/
```

### Step 3: Update URL Configuration

Ensure `api/urls.py` includes:

```python
# Finance Monitoring (Phase 1)
from api.views.finance_monitoring import (
    FinanceDashboardView,
    FinanceSnapshotsView,
    # ... all monitoring views
)

# Finance CRUD (Phase 1)
from api.views.finance_crud import (
    ExpenseDetailView,
    ExpenseCreateView,
    # ... all CRUD views
)

# Finance Phase 2
from api.views.finance_phase2 import (
    ApprovalChainListView,
    BudgetListView,
    # ... all Phase 2 views
)

# Finance Phase 3
from api.views.finance_phase3 import (
    AccountListView,
    JournalEntryListView,
    # ... all Phase 3 views
)
```

### Step 4: Configure Celery Tasks

Add to `twcako/celery.py`:

```python
app.conf.beat_schedule = {
    # Finance Phase 1
    'generate-daily-snapshots': {
        'task': 'finance.tasks.generate_daily_snapshots',
        'schedule': crontab(hour=1, minute=0),
    },
    'check-approval-sla': {
        'task': 'finance.tasks.check_approval_sla',
        'schedule': crontab(minute='*/30'),
    },
    'check-loan-due-dates': {
        'task': 'finance.tasks.check_loan_due_dates',
        'schedule': crontab(hour=8, minute=0),
    },
    'check-petty-cash-balance': {
        'task': 'finance.tasks.check_petty_cash_balance',
        'schedule': crontab(hour=9, minute=0),
    },

    # Finance Phase 2
    'generate-recurring-expenses': {
        'task': 'finance.tasks.generate_recurring_expenses',
        'schedule': crontab(hour=0, minute=30),
    },
    'check-budget-utilization': {
        'task': 'finance.tasks.check_budget_utilization',
        'schedule': crontab(hour=8, minute=30),
    },
    'check-approval-chain-sla': {
        'task': 'finance.tasks.check_approval_chain_sla',
        'schedule': crontab(minute='*/15'),
    },
}
```

---

## 4. Frontend Deployment

### Step 1: Update Dependencies

```bash
cd TWCAKOV4
npm install
```

### Step 2: Build for Production

```bash
npm run build
```

**Expected Output:**
- Build time: ~6 seconds
- All routes compiled successfully
- No TypeScript errors

### Step 3: Deploy Frontend Files

Key files to deploy:

```bash
# Hooks
src/hooks/useFinance.ts

# Types
src/types/domain/finance.ts

# Fetcher (updated)
src/lib/fetcher.ts

# Pages (24 directories)
src/app/(dashboards)/approval-chains/
src/app/(dashboards)/approval-queue/
src/app/(dashboards)/assets/
src/app/(dashboards)/bank-reconciliation/
src/app/(dashboards)/budgets/
src/app/(dashboards)/chart-of-accounts/
src/app/(dashboards)/commissions/
src/app/(dashboards)/expenses/
src/app/(dashboards)/finance-monitoring/
src/app/(dashboards)/finance-reports/
src/app/(dashboards)/fiscal-periods/
src/app/(dashboards)/journal-entries/
src/app/(dashboards)/loans/
src/app/(dashboards)/petty-cash/
src/app/(dashboards)/recurring-expenses/
src/app/(dashboards)/revenue/
src/app/(dashboards)/trial-balance/
src/app/(dashboards)/vendors/

# API Routes (33 directories)
src/app/api/finance/
```

### Step 4: Environment Variables

Add to `.env.production`:

```env
# Django Backend URL
NEXT_PUBLIC_API_URL=https://api.twcako.com

# Finance-specific
NEXT_PUBLIC_FINANCE_UPLOAD_MAX_SIZE=10485760
```

---

## 5. Database Migrations

### Migration Files

| File | Phase | Models Created |
|------|-------|----------------|
| `0001_initial.py` | 1 | FinanceDailySnapshot, FinanceAlert, ApprovalQueueItem, MemberFinancialHealth, TransactionAuditLog, ReconciliationLog, SupplierSettlement, OperationalExpense, CompanyAsset, AssetIncome, Loan, LoanPayment, PettyCashFund, PettyCashTransaction, PettyCashReconciliation |
| `0002_phase2_enhanced_workflows.py` | 2 | ApprovalChain, ApprovalChainInstance, Budget, Vendor, RecurringExpense |
| `0003_phase3_advanced_accounting.py` | 3 | Account, JournalEntry, JournalLine, BankAccount, BankStatement, BankStatementLine, FiscalYear, FiscalPeriod |

### Apply Migrations

```bash
# Check current status
python manage.py showmigrations finance

# Apply all finance migrations
python manage.py migrate finance

# Verify
python manage.py showmigrations finance
```

**Expected Output:**
```
finance
 [X] 0001_initial
 [X] 0002_phase2_enhanced_workflows
 [X] 0003_phase3_advanced_accounting
```

### Seed Default Data (Phase 3)

After migrations, seed the default Chart of Accounts:

```bash
# Via Django management command
python manage.py seed_chart_of_accounts

# Or via API (requires authentication)
curl -X POST https://api.twcako.com/api/finance/accounts/seed/ \
  -H "Authorization: Bearer $TOKEN"
```

This creates 68 default accounts for PH BIR compliance.

---

## 6. Environment Configuration

### Django Settings (`settings/production.py`)

```python
# Finance Module Settings
FINANCE_UPLOAD_MAX_SIZE = 10 * 1024 * 1024  # 10MB
FINANCE_ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png']
FINANCE_RECEIPT_PATH = 'finance/receipts/'
FINANCE_STATEMENTS_PATH = 'finance/statements/'

# SLA Configuration (hours)
FINANCE_APPROVAL_SLA = {
    'low': 72,      # 3 days
    'medium': 48,   # 2 days
    'high': 24,     # 1 day
    'urgent': 4,    # 4 hours
}

# Budget Warning Thresholds
FINANCE_BUDGET_THRESHOLDS = {
    'warning': 0.80,   # 80% utilized
    'critical': 0.95,  # 95% utilized
}

# Petty Cash Settings
FINANCE_PETTY_CASH_MIN_BALANCE = 500.00  # PHP

# Approval Chain Settings
FINANCE_APPROVAL_CHAIN_SLA_HOURS = 24
```

### Required Permissions

Add to admin/staff users:

```python
# Finance permissions (add via Django admin or migration)
permissions = [
    'finance.view_financedashboard',
    'finance.manage_expenses',
    'finance.manage_assets',
    'finance.manage_loans',
    'finance.manage_pettycash',
    'finance.approve_items',
    'finance.manage_approvalchains',
    'finance.manage_budgets',
    'finance.manage_vendors',
    'finance.manage_recurring',
    'finance.manage_accounts',
    'finance.post_journalentries',
    'finance.close_fiscalperiods',
    'finance.reconcile_bank',
]
```

---

## 7. Post-Deployment Verification

### Backend Health Checks

```bash
# 1. Check migrations applied
python manage.py showmigrations finance

# 2. Check Celery tasks registered
celery -A twcako inspect registered | grep finance

# 3. Test API endpoints
curl -X GET https://api.twcako.com/api/finance/dashboard/ \
  -H "Authorization: Bearer $TOKEN"

# 4. Check default accounts seeded
curl -X GET https://api.twcako.com/api/finance/accounts/tree/ \
  -H "Authorization: Bearer $TOKEN"
```

### Frontend Health Checks

| Page | URL | Expected |
|------|-----|----------|
| Finance Dashboard | `/finance-monitoring` | KPIs, charts loaded |
| Expenses | `/expenses` | List with filters |
| Assets | `/assets` | Asset grid |
| Loans | `/loans` | Loan list |
| Petty Cash | `/petty-cash` | Fund cards |
| Approval Queue | `/approval-queue` | Pending items |
| Approval Chains | `/approval-chains` | Chain list |
| Budgets | `/budgets` | Budget cards |
| Vendors | `/vendors` | Vendor list |
| Recurring | `/recurring-expenses` | Schedule list |
| Chart of Accounts | `/chart-of-accounts` | Tree view |
| Journal Entries | `/journal-entries` | Entry list |
| Fiscal Periods | `/fiscal-periods` | Period table |
| Bank Recon | `/bank-reconciliation` | Account list |
| Trial Balance | `/trial-balance` | Balance report |

### Verification Script

```bash
#!/bin/bash
# finance_verification.sh

API_URL="https://api.twcako.com/api/finance"
TOKEN="your_token_here"

endpoints=(
    "dashboard"
    "expenses"
    "assets"
    "loans"
    "petty-cash"
    "approval-queue"
    "approval-chains"
    "budgets"
    "vendors"
    "recurring-expenses"
    "accounts"
    "accounts/tree"
    "journal-entries"
    "fiscal-years"
    "fiscal-periods"
    "bank-accounts"
    "trial-balance"
)

for endpoint in "${endpoints[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        "$API_URL/$endpoint/")

    if [ "$status" == "200" ]; then
        echo "✅ $endpoint - OK"
    else
        echo "❌ $endpoint - HTTP $status"
    fi
done
```

---

## 8. Rollback Procedures

### Backend Rollback

```bash
# 1. Rollback migrations (in reverse order)
python manage.py migrate finance 0002_phase2_enhanced_workflows  # Rollback Phase 3
python manage.py migrate finance 0001_initial                     # Rollback Phase 2
python manage.py migrate finance zero                             # Rollback Phase 1

# 2. Restore previous API views
git checkout HEAD~1 -- api/views/finance_*.py

# 3. Restart services
sudo systemctl restart gunicorn
sudo systemctl restart celery
```

### Frontend Rollback

```bash
# 1. Restore previous build
git checkout HEAD~1 -- src/app/(dashboards)/
git checkout HEAD~1 -- src/hooks/useFinance.ts
git checkout HEAD~1 -- src/types/domain/finance.ts

# 2. Rebuild
npm run build

# 3. Redeploy
pm2 restart twcakov4
```

### Database Rollback (Emergency)

```sql
-- WARNING: Only use in emergencies
-- This will delete all finance data

DROP TABLE IF EXISTS finance_fiscalperiod CASCADE;
DROP TABLE IF EXISTS finance_fiscalyear CASCADE;
DROP TABLE IF EXISTS finance_bankstatementline CASCADE;
DROP TABLE IF EXISTS finance_bankstatement CASCADE;
DROP TABLE IF EXISTS finance_bankaccount CASCADE;
DROP TABLE IF EXISTS finance_journalline CASCADE;
DROP TABLE IF EXISTS finance_journalentry CASCADE;
DROP TABLE IF EXISTS finance_account CASCADE;
DROP TABLE IF EXISTS finance_recurringexpense CASCADE;
DROP TABLE IF EXISTS finance_vendor CASCADE;
DROP TABLE IF EXISTS finance_budget CASCADE;
DROP TABLE IF EXISTS finance_approvalchaininstance CASCADE;
DROP TABLE IF EXISTS finance_approvalchain CASCADE;
-- ... (continue for all finance tables)
```

---

## 9. Troubleshooting

### Common Issues

#### 1. "authGetFetcher returns null" Error

**Cause:** Old fetcher code returning null for 404s
**Fix:** Ensure `src/lib/fetcher.ts` has updated `authGetFetcher`:

```typescript
export const authGetFetcher = async <T = unknown>(url: string): Promise<T> => {
    // Should NOT have: if (res.status === 404) return null;
    // Now throws FetchError for all non-OK responses
}
```

#### 2. Interface Type Errors

**Cause:** Detail interfaces extending base with incompatible types
**Fix:** Use `Omit<>` for overridden properties:

```typescript
// Correct
export interface FinanceAlertDetail extends Omit<FinanceAlert, 'related_user'> {
  related_user: { id: number; username: string; full_name: string; } | null;
}

// Incorrect
export interface FinanceAlertDetail extends FinanceAlert {
  related_user: { ... }; // Type conflict!
}
```

#### 3. Celery Tasks Not Running

**Cause:** Tasks not registered in beat schedule
**Fix:** Verify `twcako/celery.py` has all finance tasks in `beat_schedule`

```bash
# Check registered tasks
celery -A twcako inspect registered | grep finance
```

#### 4. Migrations Fail

**Cause:** Database constraints or foreign keys
**Fix:** Check for data inconsistencies:

```sql
-- Check for orphaned records
SELECT * FROM finance_journalline
WHERE entry_id NOT IN (SELECT id FROM finance_journalentry);
```

#### 5. Chart of Accounts Not Showing

**Cause:** Default accounts not seeded
**Fix:** Run seed command:

```bash
python manage.py seed_chart_of_accounts
# Or via API
POST /api/finance/accounts/seed/
```

#### 6. Trial Balance Not Balancing

**Cause:** Posted journal entries with unequal debits/credits
**Fix:** The system validates on save, but check historical data:

```sql
SELECT je.id, je.reference,
       SUM(jl.debit) as total_debit,
       SUM(jl.credit) as total_credit
FROM finance_journalentry je
JOIN finance_journalline jl ON jl.entry_id = je.id
WHERE je.status = 'posted'
GROUP BY je.id, je.reference
HAVING SUM(jl.debit) != SUM(jl.credit);
```

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [FINANCE_MONITORING_IMPLEMENTATION.md](./FINANCE_MONITORING_IMPLEMENTATION.md) | Phase 1 monitoring details |
| [FINANCE_CRUD_IMPLEMENTATION.md](./FINANCE_CRUD_IMPLEMENTATION.md) | Phase 1 CRUD operations |
| [FINANCE_PHASE2_IMPLEMENTATION.md](./FINANCE_PHASE2_IMPLEMENTATION.md) | Phase 2 workflows |
| [FINANCE_PHASE3_ADVANCED_ACCOUNTING.md](./FINANCE_PHASE3_ADVANCED_ACCOUNTING.md) | Phase 3 backend |
| [FINANCE_PHASE3_V4_FRONTEND.md](./FINANCE_PHASE3_V4_FRONTEND.md) | Phase 3 frontend |
| [FINANCE_CODE_QUALITY_REPORT.md](./FINANCE_CODE_QUALITY_REPORT.md) | Code quality audit |
| [FINANCE_MODULE_ROADMAP.md](./FINANCE_MODULE_ROADMAP.md) | Future phases |

---

## Support Contacts

- **Manager:** Ed Geronilla (evgeronilla@twcako.com)
- **Technical Issues:** Create ticket in project management system

---

*Document Version: 1.0*
*Last Updated: 2026-02-22*
*Author: CTO Team*

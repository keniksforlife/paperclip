# Finance Module - Latest Features Documentation

**Version:** 2.0
**Date:** 2026-03-02
**Status:** Production
**Covers:** All features added after Phase 3 (2026-02-22 through 2026-03-02)

---

## Table of Contents

1. [What's New](#1-whats-new)
2. [Cash Transactions Page](#2-cash-transactions-page)
3. [Auto Journal Generation](#3-auto-journal-generation)
4. [Journal Account Mappings](#4-journal-account-mappings)
5. [Post to GL Workflow](#5-post-to-gl-workflow)
6. [Financial Reports (PDF/XLSX)](#6-financial-reports-pdfxlsx)
7. [Journal Entry Vendor Support](#7-journal-entry-vendor-support)
8. [Updated Chart of Accounts Seed](#8-updated-chart-of-accounts-seed)
9. [Backfill Operations](#9-backfill-operations)
10. [API Endpoints Reference](#10-api-endpoints-reference)
11. [Frontend Pages & Navigation](#11-frontend-pages--navigation)
12. [Architecture Diagrams](#12-architecture-diagrams)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. What's New

| Feature | Description | Date |
|---------|-------------|------|
| Cash Transactions Page | V4 UI for viewing/filtering CashTransactions with expandable journal entries | 2026-03-01 |
| Auto Journal Generation | Signal + Celery pipeline auto-creates JournalEntry from approved CashTransactions | 2026-03-02 |
| Journal Account Mappings | Configurable UI for mapping transaction categories to COA debit/credit accounts | 2026-03-02 |
| Enhanced Financial Reports | Balance Sheet, Cash Flow, Trial Balance, Cash Position + enhanced Income Statement/Expense with date ranges | 2026-03-02 |
| Report Downloads (PDF/XLSX) | 7 downloadable report types with date range selection and quick presets | 2026-02-22 |
| Journal Entry Vendor Support | Vendor field on JournalEntry with filtering and display | 2026-03-02 |
| COA Seed Updates | Wallet accounts (GCash, E-wallet Gateway) and Tax Expense accounts | 2026-03-02 |
| Journal Backfill | Management command + API endpoint to backfill JEs for historical approved transactions | 2026-03-02 |

---

## 2. Cash Transactions Page

### Overview

The Cash Transactions page provides a comprehensive view of all `CashTransaction` records (payments, top-ups, withdrawals) with real-time summaries, filtering, search, and expandable journal entry details.

**URL:** `/transactions`

### Features

- **5 Category Tabs:** All, Payments, Topups, Member Withdrawals, Supplier Withdrawals
- **Search:** Debounced (400ms) across reference_id, description, username, first/last name
- **Filters:** Status (8 options), date range (from/to)
- **Pagination:** 25 per page (configurable up to 100)
- **4 KPI Summary Cards:** Count + total amount per category
- **Expandable Rows:** Click to view related ECashEntry journal entries inline

### Table Columns

| Column | Description | Responsive |
|--------|-------------|------------|
| Expand | Toggle journal entries sub-table | Always |
| Date | Transaction timestamp | Always |
| Reference ID | Unique transaction reference | Always |
| Type | Category badge (color-coded) | Always |
| Member/Supplier | User info with supplier badge | Always |
| Description | Transaction description or order info | Hidden on mobile |
| Amount | PHP currency (green/red) | Always |
| Status | Status badge (8 colors) | Always |
| Method | Mode of payment | Hidden on mobile |
| JE | Journal entry count chip | Always |

### Transaction Statuses

| Status | Color | Description |
|--------|-------|-------------|
| approved | Green | Transaction approved and processed |
| pending | Orange | Awaiting approval |
| in_progress | Blue | Being processed |
| rejected | Red | Denied by approver |
| refunded | Purple | Money returned |
| duplicate | Slate | Flagged as duplicate |
| pay_later | Brown | Deferred payment |
| parked | Slate | Temporarily held |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/finance/transactions/` | List transactions with filters and summary |
| GET | `/finance/transactions/<id>/journal-entries/` | Get ECashEntry records for a transaction |

### Files

| File | Description |
|------|-------------|
| `api/views/cash_transactions.py` | Django API views |
| `TWCAKOV4/src/app/(dashboards)/transactions/CashTransactionsClient.tsx` | Frontend page (670 lines) |
| `TWCAKOV4/src/app/api/finance/transactions/route.ts` | Next.js proxy (list) |
| `TWCAKOV4/src/app/api/finance/transactions/[id]/journal-entries/route.ts` | Next.js proxy (JE detail) |

---

## 3. Auto Journal Generation

### Overview

When a `CashTransaction` is approved, the system automatically creates a `JournalEntry` with proper debit/credit lines mapped to the Chart of Accounts. The account mapping is configurable by the finance team via the Journal Mappings UI page.

### Architecture

```
CashTransaction.save() — status becomes "approved"
        |
        v
Django post_save signal fires (accounting/apps.py)
        |
        v
Celery task: generate_journal_entry_task(tx_id)
  - bind=True, max_retries=3, default_retry_delay=10s
        |
        v
Looks up JournalAccountMapping for tx.category
  - Withdrawals split: is_supplier → withdrawal_supplier, else withdrawal_member
        |
        v
Creates JournalEntry (entry_type='auto', status='draft') + 2 JournalLines
  - Debit line: mapping.debit_account, amount=tx.amount
  - Credit line: mapping.credit_account, amount=tx.amount
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Idempotent** | Checks `JournalEntry.objects.filter(cash_transaction=tx).exists()` before creating |
| **Graceful degradation** | If no mapping or no open fiscal period exists, logs a warning but does not crash |
| **Atomic** | JournalEntry + JournalLines created in a single database transaction |
| **Async** | Uses Celery to avoid slowing down the approval flow |
| **Configurable** | Finance team can change account mappings via UI without code changes |

### Default Account Mappings

| Category | Debit Account | Credit Account | Logic |
|----------|---------------|----------------|-------|
| Payment | 1-10-300-0002 (E-wallet Gateway) | 4-10-100 (Sales Revenue) | Cash received → revenue |
| Top-Up | 1-10-300-0002 (E-wallet Gateway) | 2-10-600 (eCash Liability) | Cash in → owe member eCash |
| Withdrawal (Member) | 2-10-600 (eCash Liability) | 1-10-300-0002 (E-wallet Gateway) | Reduce liability → cash out |
| Withdrawal (Supplier) | 2-10-100 (AP Trade) | 1-10-300-0002 (E-wallet Gateway) | Reduce payable → cash out |
| Transfer | 2-10-600 (eCash Liability) | 2-10-600 (eCash Liability) | Internal transfer (net zero) |

### Files

| File | Description |
|------|-------------|
| `finance/journal_auto.py` | Core `generate_journal_entry()` function |
| `accounting/apps.py` | `ready()` with `post_save` signal |
| `accounting/tasks.py` | `generate_journal_entry_task` Celery task |
| `finance/models.py` | `JournalAccountMapping` model + `JournalEntry.cash_transaction` FK |
| `finance/migrations/0005_*` | Schema migration |
| `finance/migrations/0006_*` | Data migration seeding 5 default mappings |

---

## 4. Journal Account Mappings

### Overview

The Journal Account Mappings page allows finance managers to configure which COA accounts are debited and credited when a CashTransaction of a given category is approved.

**URL:** `/journal-mappings`
**Permission:** `IsFinanceUser` (read), `IsFinanceManager` (write)

### UI Features

- Table showing all configured mappings with category, debit/credit accounts, active status
- **Create:** Dialog with category dropdown (only unused categories), account dropdowns, description, active toggle
- **Edit:** Dialog with same fields (category read-only)
- **Delete:** Confirmation dialog with warning about future transactions

### API Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/finance/journal-mappings/` | List all mappings | IsFinanceUser |
| POST | `/finance/journal-mappings/` | Create a mapping | IsFinanceManager |
| GET | `/finance/journal-mappings/<id>/` | Get mapping detail | IsFinanceManager |
| PUT | `/finance/journal-mappings/<id>/` | Update a mapping | IsFinanceManager |
| DELETE | `/finance/journal-mappings/<id>/` | Delete a mapping | IsFinanceManager |

### Category Choices

| Value | Display |
|-------|---------|
| `payment` | Payment |
| `topup` | Top-Up |
| `withdrawal_member` | Withdrawal - Member |
| `withdrawal_supplier` | Withdrawal - Supplier |
| `transfer` | Transfer |

### Files

| File | Description |
|------|-------------|
| `api/views/journal_mapping.py` | CRUD API views + backfill endpoint |
| `TWCAKOV4/src/app/(dashboards)/journal-mappings/JournalMappingsClient.tsx` | Config UI |
| `TWCAKOV4/src/app/(dashboards)/journal-mappings/page.tsx` | Server page |
| `TWCAKOV4/src/app/api/finance/journal-mappings/route.ts` | Next.js proxy (list/create) |
| `TWCAKOV4/src/app/api/finance/journal-mappings/[id]/route.ts` | Next.js proxy (detail/update/delete) |

---

## 5. Post to GL Workflow

### Overview

"Post to GL" (Post to General Ledger) is the standard double-entry accounting workflow that finalizes journal entries, making them part of the official books.

### Status Lifecycle

```
                    ┌─────────────┐
                    │    Draft    │  ← Created (manual or auto)
                    └──────┬──────┘
                           │ "Post to GL" (Finance Manager)
                           v
                    ┌─────────────┐
                    │   Posted    │  ← Official, account balances updated
                    └──────┬──────┘
                           │ "Reverse Entry" (Finance Manager)
                           v
                    ┌─────────────┐
                    │  Reversed   │  ← Equal-opposite entry created
                    └─────────────┘
```

### What Happens When You Post

1. **Status Change:** `draft` → `posted`
2. **Audit Fields:** `posted_by` = current user, `posted_at` = now
3. **Balance Update:** For each journal line, `line.account.update_balance()` is called
4. **Immutability:** Posted entries cannot be edited or deleted — only reversed

### What Happens When You Reverse

1. A new `JournalEntry` (type=`reversing`) is created with flipped debits/credits
2. Original entry status → `reversed`, with `reversed_at` timestamp
3. `reversed_entry` FK links original → reversing entry
4. The reversing entry is auto-posted, updating account balances

### Validation Rules

| Rule | Error if violated |
|------|-------------------|
| Debits must equal credits | "Total debits must equal total credits" |
| At least one journal line | "Entry must have at least one line" |
| Fiscal period must be open | "Cannot post to period with status: {status}" |
| Only draft entries can be posted | "Cannot post entry with status: {status}" |
| Only posted entries can be reversed | "Can only reverse posted entries" |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/finance/journal-entries/<id>/post/` | Post entry to GL |
| POST | `/finance/journal-entries/<id>/reverse/` | Create reversing entry |

### Frontend

In the Journal Entries page (`/journal-entries`), draft entries show a **"Post to GL"** button in the detail view. Auto-generated entries from CashTransactions are created as `draft` and require manual posting.

---

## 6. Financial Reports (PDF/XLSX)

### Overview

The Finance Reports page provides downloadable reports for BIR compliance and financial analysis. Reports are generated server-side using WeasyPrint (PDF) and openpyxl (XLSX).

**URL:** `/finance-reports`

### Available Reports

| # | Report | Description | Date Params | Formats |
|---|--------|-------------|-------------|---------|
| 1 | **Income Statement** | Profit & Loss — revenue, commissions, expenses, net income | Month, date range, or annual (12-month columnar) | PDF, XLSX |
| 2 | **Balance Sheet** | Assets, liabilities, equity snapshot | As-of date, optional comparison date | PDF, XLSX |
| 3 | **Cash Flow Statement** | Operating, investing, financing cash movements | Start/end date range | PDF, XLSX |
| 4 | **Expense Report** | Expense breakdown by category with vendor details | Month or date range | PDF, XLSX |
| 5 | **Asset Register** | Complete inventory of company assets | None (current snapshot) | PDF, XLSX |
| 6 | **Trial Balance** | All account balances with balance verification | As-of date | PDF, XLSX |
| 7 | **Loan Schedule** | Amortization table with payment history | Per-loan (by ID) | PDF, XLSX |

### Date Range Quick Presets

| Preset | Range |
|--------|-------|
| This Month | 1st of current month → today |
| Last Month | 1st of last month → last day of last month |
| This Quarter | 1st of current quarter → today |
| This Year | Jan 1 → today |
| Last Year | Jan 1 last year → Dec 31 last year |

### Data Sources

Reports use **ECashEntry** records as the primary data source (legacy data helpers), providing accurate financial data even when the newer finance module tables (FinanceDailySnapshot, OperationalExpense) are empty.

Key data extraction methods:
- `_get_legacy_income_data()` — Revenue (platform fees, subscriptions, processing fees), commissions (tap, diamond, retail, sponsor, founder), expenses
- `_get_legacy_expense_data()` — Expense breakdown by category
- `_get_legacy_balance_sheet_data()` — Assets, liabilities, equity
- `_get_legacy_cash_flow_data()` — Operating, investing, financing activities
- `_get_legacy_trial_balance()` — All GL accounts with debit/credit totals
- `_get_legacy_cash_position_data()` — Daily cash position by account

### API Endpoints

| Method | Endpoint | Query Params | Description |
|--------|----------|-------------|-------------|
| GET | `/finance/reports/income-statement/` | `export=pdf\|xlsx`, `month=YYYY-MM`, `start_date`, `end_date`, `year=YYYY` | Income statement |
| GET | `/finance/reports/balance-sheet/` | `export=pdf\|xlsx`, `as_of_date`, `comparison_date` | Balance sheet |
| GET | `/finance/reports/cash-flow/` | `export=pdf\|xlsx`, `start_date`, `end_date` | Cash flow |
| GET | `/finance/reports/expenses/` | `export=pdf\|xlsx`, `month`, `start_date`, `end_date` | Expense report |
| GET | `/finance/reports/assets/` | `export=pdf\|xlsx` | Asset register |
| GET | `/finance/reports/trial-balance/` | `export=pdf\|xlsx`, `as_of_date` | Trial balance |
| GET | `/finance/reports/loan/<loan_id>/` | `export=pdf\|xlsx` | Loan schedule |

**Note:** Use `export` (not `format`) to avoid DRF format negotiation conflict.

### HTML Templates (for PDF generation)

| Template | Report |
|----------|--------|
| `finance/reports/income_statement.html` | Monthly income statement |
| `finance/reports/income_statement_annual.html` | 12-month columnar annual |
| `finance/reports/balance_sheet.html` | Balance sheet |
| `finance/reports/cash_flow.html` | Cash flow statement |
| `finance/reports/trial_balance.html` | Trial balance |
| `finance/reports/cash_position.html` | Cash position |

### Files

| File | Description |
|------|-------------|
| `finance/reports.py` | `FinanceReportService` class (2046 lines, 8 report methods) |
| `api/views/finance_monitoring.py` | 7 report API views (lines 1866-2274) |
| `finance/templates/finance/reports/` | 6 HTML templates for PDF rendering |
| `TWCAKOV4/src/app/(dashboards)/finance-reports/FinanceReportsClient.tsx` | Reports download page |
| `TWCAKOV4/src/app/api/finance/reports/*/route.ts` | 7 Next.js proxy routes |

---

## 7. Journal Entry Vendor Support

### Overview

Journal entries can now be associated with a vendor for better tracking and filtering.

### Model Change

```python
# JournalEntry model
vendor = models.ForeignKey(
    Vendor, on_delete=models.SET_NULL,
    null=True, blank=True,
    help_text='Vendor/Merchant associated with this entry'
)
```

### Features

- **Create JE:** Optional `vendor_id` field in POST request
- **List JEs:** Filter by `?vendor_id=<id>`, response includes `vendor_id` and `vendor_name`
- **Detail View:** Shows vendor name when set

### API Changes

| Endpoint | Change |
|----------|--------|
| GET `/finance/journal-entries/` | New `?vendor_id` filter param; response includes `vendor_id`, `vendor_name` |
| POST `/finance/journal-entries/` | New optional `vendor_id` field in request body |

---

## 8. Updated Chart of Accounts Seed

### New Accounts Added

The COA seed endpoint (`POST /finance/accounts/seed/`) now includes:

**Wallet Accounts (under 1-10-000 Cash & Cash Equivalents):**

| Code | Name | Type | Parent |
|------|------|------|--------|
| 1-10-300 | Cash in Wallet | asset (header) | 1-10-000 |
| 1-10-300-0001 | GCash | asset | 1-10-300 |
| 1-10-300-0002 | E-wallet Payment Gateway | asset | 1-10-300 |

**Tax Expense Accounts (under 5-00-000 Expenses):**

| Code | Name | Type | Parent |
|------|------|------|--------|
| 5-50-000 | Tax Expenses | expense (header) | 5-00-000 |
| 5-50-100 | Income Tax Expense | expense | 5-50-000 |
| 5-50-200 | VAT Expense | expense | 5-50-000 |

These accounts are required by the auto-journal generation mappings (E-wallet Gateway is the primary debit account for payments and top-ups).

---

## 9. Backfill Operations

### Overview

For existing approved CashTransactions that were approved before the auto-journal generation was deployed, a backfill mechanism creates the missing JournalEntry records.

### Option 1: API Endpoint (Production)

**Endpoint:** `POST /finance/journal-backfill/`
**Permission:** Founder only

```javascript
// 1. Get auth token from session
const session = await fetch('/api/auth/session').then(r => r.json());
const token = session.accessToken;

// 2. Dry run — check how many eligible transactions
fetch('https://api.twctechwarriors.com/finance/journal-backfill/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ dry_run: true })
}).then(r => r.json()).then(console.log)

// 3. Actual backfill
fetch('https://api.twctechwarriors.com/finance/journal-backfill/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ dry_run: false })
}).then(r => r.json()).then(console.log)

// Optional filters: { dry_run: false, category: 'payment', limit: 500 }
```

### Option 2: Management Command (Local/SSH)

```bash
python manage.py backfill_journal_entries                          # Full backfill
python manage.py backfill_journal_entries --dry-run                # Preview only
python manage.py backfill_journal_entries --category payment       # Filter by category
python manage.py backfill_journal_entries --date-from 2026-01-01 --date-to 2026-02-28
python manage.py backfill_journal_entries --limit 500              # Limit count
```

### Prerequisites

- At least one **open fiscal period** must exist covering the transaction dates
- Transactions outside any open fiscal period will be skipped
- Both methods are **idempotent** — running multiple times will not create duplicates

### Backfill History

| Date | Environment | Eligible | Created | Skipped | Notes |
|------|-------------|----------|---------|---------|-------|
| 2026-03-02 | Local | 11,276 | 1,931 | 9,345 | Fiscal periods cover Jan-Mar 2026 only |
| 2026-03-02 | Production | — | — | — | Run via API endpoint |

---

## 10. API Endpoints Reference

### New Endpoints (Post Phase 3)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| **Cash Transactions** | | | |
| GET | `/finance/transactions/` | List with filters, pagination, summary | IsFinanceUser |
| GET | `/finance/transactions/<id>/journal-entries/` | ECashEntry records for a transaction | IsFinanceUser |
| **Journal Mappings** | | | |
| GET | `/finance/journal-mappings/` | List all mappings | IsFinanceUser |
| POST | `/finance/journal-mappings/` | Create a mapping | IsFinanceManager |
| GET | `/finance/journal-mappings/<id>/` | Get mapping detail | IsFinanceManager |
| PUT | `/finance/journal-mappings/<id>/` | Update a mapping | IsFinanceManager |
| DELETE | `/finance/journal-mappings/<id>/` | Delete a mapping | IsFinanceManager |
| **Backfill** | | | |
| POST | `/finance/journal-backfill/` | Trigger backfill | IsFounder |
| **Reports** | | | |
| GET | `/finance/reports/income-statement/` | Download income statement | IsFinanceUser |
| GET | `/finance/reports/balance-sheet/` | Download balance sheet | IsFinanceUser |
| GET | `/finance/reports/cash-flow/` | Download cash flow statement | IsFinanceUser |
| GET | `/finance/reports/expenses/` | Download expense report | IsFinanceUser |
| GET | `/finance/reports/assets/` | Download asset register | IsFinanceUser |
| GET | `/finance/reports/trial-balance/` | Download trial balance | IsFinanceUser |
| GET | `/finance/reports/loan/<loan_id>/` | Download loan schedule | IsFinanceUser |

### Updated Endpoints

| Method | Endpoint | Change |
|--------|----------|--------|
| GET | `/finance/journal-entries/` | Added `?vendor_id` filter; response includes `vendor_id`, `vendor_name` |
| POST | `/finance/journal-entries/` | Added optional `vendor_id` field |
| GET | `/me` | Added `is_cyra`, `is_live4more` flags |

---

## 11. Frontend Pages & Navigation

### Sidebar Structure

```
Finance Module
├── Overview
│   └── Dashboard                    /finance-monitoring
├── Accounting
│   ├── Chart of Accounts            /chart-of-accounts
│   ├── Journal Entries              /journal-entries
│   ├── Fiscal Periods               /fiscal-periods
│   ├── Bank Reconciliation          /bank-reconciliation
│   ├── Trial Balance                /trial-balance
│   └── Journal Mappings ★ NEW      /journal-mappings
├── Transactions
│   ├── Cash Transactions ★ NEW     /transactions
│   ├── Approval Queue               /approval-queue
│   ├── Commissions                  /commissions
│   └── Revenue                      /revenue
├── Core Finance
│   ├── Expenses                     /expenses
│   ├── Assets                       /assets
│   ├── Loans                        /loans
│   └── Petty Cash                   /petty-cash
├── Workflows
│   ├── Approval Chains              /approval-chains
│   ├── Budgets                      /budgets
│   ├── Vendors                      /vendors
│   └── Recurring Expenses           /recurring-expenses
└── Reports
    └── Financial Reports ★ ENHANCED /finance-reports
```

### SWR Hooks (New)

| Hook | API | Purpose |
|------|-----|---------|
| `useCashTransactions(filters)` | `/api/finance/transactions` | Cash transactions list |
| `useCashTransactionJournalEntries(txId)` | `/api/finance/transactions/{id}/journal-entries` | Expandable JE detail |
| `useJournalMappings()` | `/api/finance/journal-mappings` | Mapping config list |

### TypeScript Types (New)

| Type | Description |
|------|-------------|
| `CashTransactionItem` | Full transaction record with user, order, status |
| `CashTransactionsResponse` | Paginated list with summary aggregations |
| `CashTransactionJournalEntry` | ECashEntry record for a transaction |
| `CashTransactionJournalEntriesResponse` | Journal entries for a transaction |
| `JournalAccountMapping` | Mapping config with nested account objects |
| `JournalMappingsResponse` | List of mappings with category choices |

---

## 12. Architecture Diagrams

### Auto Journal Generation Flow

```
┌──────────────────────┐
│   CashTransaction    │
│   status → approved  │
└──────────┬───────────┘
           │ post_save signal
           v
┌──────────────────────┐
│    Celery Worker      │
│  generate_journal_    │
│  entry_task(tx_id)    │
│  max_retries=3        │
└──────────┬───────────┘
           │
           v
┌──────────────────────┐     ┌─────────────────────┐
│  journal_auto.py      │────>│ JournalAccountMapping │
│  generate_journal_    │     │ category → accounts   │
│  entry(tx_id)         │     └─────────────────────┘
└──────────┬───────────┘
           │                  ┌─────────────────────┐
           │─────────────────>│    FiscalPeriod      │
           │                  │ date range + open    │
           │                  └─────────────────────┘
           v
┌──────────────────────┐
│    JournalEntry       │
│  entry_type='auto'    │
│  status='draft'       │
│  + 2 JournalLines     │
│  (debit + credit)     │
└──────────────────────┘
```

### Report Download Flow

```
┌──────────────────────┐
│  FinanceReportsClient │  User clicks "PDF" or "XLSX"
└──────────┬───────────┘
           │ fetch(/api/finance/reports/{type}?format=pdf)
           v
┌──────────────────────┐
│  Next.js API Route    │  Authenticates, passes token
│  route.ts proxy       │  Converts format → export param
└──────────┬───────────┘
           │ fetch(DJANGO_BASE/finance/reports/{type}/?export=pdf)
           v
┌──────────────────────┐
│  Django API View      │  IncomeStatementReportAPIView, etc.
│  finance_monitoring.py│
└──────────┬───────────┘
           │
           v
┌──────────────────────┐
│ FinanceReportService  │  Queries ECashEntry data
│ finance/reports.py    │  Renders HTML template → WeasyPrint (PDF)
│                       │  Or builds openpyxl workbook (XLSX)
└──────────┬───────────┘
           │ HttpResponse (binary file)
           v
┌──────────────────────┐
│  Browser Download     │  Content-Disposition: attachment
└──────────────────────┘
```

### Post to GL Flow

```
┌──────────────┐    POST /journal-entries/{id}/post/    ┌──────────────┐
│    Draft      │ ─────────────────────────────────────> │    Posted     │
│               │    Validates:                          │               │
│ - Editable    │    - debits == credits                 │ - Immutable   │
│ - Deletable   │    - has ≥1 line                       │ - Reversible  │
│               │    - fiscal period open                │               │
└──────────────┘    Then:                               └───────┬───────┘
                    - status = 'posted'                         │
                    - posted_by, posted_at set                  │ POST .../reverse/
                    - account.update_balance() for all lines    │
                                                                v
                                                        ┌──────────────┐
                                                        │   Reversed    │
                                                        │               │
                                                        │ + new entry   │
                                                        │   type=       │
                                                        │   'reversing' │
                                                        └──────────────┘
```

---

## 13. Troubleshooting

### Auto Journal Generation

| Issue | Cause | Fix |
|-------|-------|-----|
| No JE created after approval | No mapping for that category | Add mapping via Journal Mappings page |
| No JE created after approval | No open fiscal period for the date | Create/open a fiscal period covering that date |
| Duplicate JE concern | N/A — idempotency check prevents | Safe to re-trigger |
| Celery task failing | Check Celery worker logs | Task has 3 retries with 10s delay |

### Report Downloads

| Issue | Cause | Fix |
|-------|-------|-----|
| 404 Page Not Found | `finance/reports.py` not deployed | Commit and push, then redeploy |
| 500 Internal Server Error | WeasyPrint not available | Falls back to XLSX; install WeasyPrint for PDF |
| Empty report data | No ECashEntry data for date range | Check date range matches existing data |
| HTML returned instead of file | DRF format negotiation conflict | Use `?export=pdf` not `?format=pdf` |

### Post to GL

| Issue | Cause | Fix |
|-------|-------|-----|
| "Cannot post entry with status: posted" | Entry already posted | No action needed |
| "Total debits must equal total credits" | Unbalanced entry | Edit entry to balance debits/credits |
| "Cannot post to period with status: closed" | Fiscal period closed | Open a new period or reopen |

---

## Appendix: Complete File List

### Backend (TWCako)

| File | Lines | Description |
|------|-------|-------------|
| `finance/models.py` | ~2400 | JournalAccountMapping, JournalEntry.cash_transaction FK, vendor FK |
| `finance/journal_auto.py` | ~100 | Core auto-generation logic |
| `finance/reports.py` | 2046 | 8 report generation methods with ECashEntry data |
| `finance/management/commands/backfill_journal_entries.py` | 119 | Backfill management command |
| `finance/migrations/0005_*` | — | Schema: JournalAccountMapping + JournalEntry.cash_transaction FK |
| `finance/migrations/0006_*` | — | Data: Seed 5 default mappings |
| `finance/templates/finance/reports/*.html` | 6 files | HTML templates for PDF generation |
| `api/views/cash_transactions.py` | ~230 | Cash transaction list + JE detail views |
| `api/views/journal_mapping.py` | ~230 | Mapping CRUD + backfill API views |
| `api/views/finance_monitoring.py` | ~2274 | 7 report download views (lines 1866+) |
| `api/views/finance_phase3.py` | ~1200 | Vendor support, COA seed updates |
| `accounting/apps.py` | ~20 | post_save signal for auto-journal |
| `accounting/tasks.py` | ~50 | Celery task for journal generation |

### Frontend (TWCAKOV4)

| File | Lines | Description |
|------|-------|-------------|
| `src/app/(dashboards)/transactions/CashTransactionsClient.tsx` | 670 | Cash Transactions page |
| `src/app/(dashboards)/journal-mappings/JournalMappingsClient.tsx` | ~400 | Journal Mappings config page |
| `src/app/(dashboards)/finance-reports/FinanceReportsClient.tsx` | 511 | Finance Reports download page |
| `src/app/api/finance/transactions/route.ts` | ~40 | Proxy: transactions list |
| `src/app/api/finance/transactions/[id]/journal-entries/route.ts` | ~40 | Proxy: transaction JE detail |
| `src/app/api/finance/journal-mappings/route.ts` | ~80 | Proxy: mappings list/create |
| `src/app/api/finance/journal-mappings/[id]/route.ts` | ~90 | Proxy: mapping detail/update/delete |
| `src/app/api/finance/reports/*/route.ts` | 7 files | Proxy: 7 report download routes |
| `src/hooks/useFinance.ts` | ~1500 | 50+ SWR hooks (3 new) |
| `src/types/domain/finance.ts` | ~1750 | All TypeScript types (8 new interfaces) |
| `src/components/finance/FinancePageLayout.tsx` | ~300 | Sidebar with updated navigation |

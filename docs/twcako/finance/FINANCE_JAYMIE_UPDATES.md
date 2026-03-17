# Finance Module Updates — Jaymie Meeting Requirements

**Date:** 2026-03-01
**Requested by:** Coach Jaymie (Finance Controller)
**Status:** Implemented

---

## Summary

6 updates to align the finance system with standard accounting workflows and Jaymie's daily operational needs. These updates were identified during a training session.

---

## 1. COA Seed Updates — 6 New Accounts

### Files Changed
- `finance/data/chart_of_accounts_seed.csv`
- `api/views/finance_phase3.py` (AccountSeedAPIView)

### New Accounts Added

| Code | Name | Type | Parent |
|------|------|------|--------|
| `1-10-300` | Cash in Wallet | Asset (Header) | `1-10-000` |
| `1-10-300-0001` | GCash | Asset | `1-10-300` |
| `1-10-300-0002` | E-wallet Payment Gateway | Asset | `1-10-300` |
| `5-50-000` | Tax Expenses | Expense (Header) | `5-00-000` |
| `5-50-100` | Income Tax Expense | Expense | `5-50-000` |
| `5-50-200` | VAT Expense | Expense | `5-50-000` |

**Total accounts:** 76 (was 70)

### Impact
- GCash and e-wallet accounts enable proper cash tracking for digital payments
- Tax expense accounts enable proper income tax and VAT recording via journal entries
- Both CSV seed file and hardcoded `AccountSeedAPIView.post()` list updated

---

## 2. JournalEntry Vendor Field

### Files Changed
- `finance/models.py` — Added `vendor` ForeignKey field
- `finance/migrations/0004_journalentry_vendor_field.py` — New migration
- `api/views/finance_phase3.py` — Updated JournalEntry API views

### Model Change
```python
vendor = models.ForeignKey(
    'finance.Vendor', on_delete=models.SET_NULL,
    null=True, blank=True, related_name='journal_entries',
    help_text='Vendor/Merchant associated with this entry'
)
```

### API Changes

| Endpoint | Method | Change |
|----------|--------|--------|
| `/api/finance/journal-entries/` | GET | Added `select_related('vendor')`, returns `vendor_id`/`vendor_name`, accepts `?vendor_id` filter |
| `/api/finance/journal-entries/` | POST | Accepts optional `vendor_id` field, looks up Vendor |
| `/api/finance/journal-entries/<id>/` | GET | Returns full `vendor` object `{id, name, contact_person}` |
| `/api/finance/journal-entries/<id>/` | PUT | Accepts `vendor_id` updates (set to `null` to clear) |

### Migration
```bash
python manage.py migrate finance 0004
```

---

## 3. Income Statement — 12-Month Columns + Tax Line

### Files Changed
- `finance/reports.py` — Refactored with `_get_income_data()` helper, annual generator
- `api/views/finance_monitoring.py` — Added `year` parameter
- `finance/templates/finance/reports/income_statement.html` — Added Tax section
- `finance/templates/finance/reports/income_statement_annual.html` — **NEW** 12-month template

### Report Structure (Single Period)
```
Revenue
  - Platform Fees
  - Subscription Revenue
  - Processing Fees
  Total Revenue
Cost of Sales (Commissions)
  - TAP / Diamond / Retail / Sponsor / Founder
  Total Cost of Sales
GROSS PROFIT
Operating Expenses
  - [by category]
  Total Operating Expenses
Tax Expenses                    ← NEW
  - Income Tax Expense          ← from 5-50-100 journal entries
  - VAT Expense                 ← from 5-50-200 journal entries
  Total Tax Expenses
NET INCOME
```

### Annual View (12-Month Columns)
- 14 columns: Label | Jan | Feb | ... | Dec | Total
- Each row shows monthly values across all 12 months
- PDF uses landscape layout
- Excel uses wide format with column headers

### API Usage
```
# Single period (existing)
GET /api/finance/reports/income-statement/?export=xlsx&start_date=2026-01-01&end_date=2026-01-31

# Annual 12-month view (NEW)
GET /api/finance/reports/income-statement/?export=xlsx&year=2026
```

---

## 4. Balance Sheet — Comparison Periods

### Files Changed
- `finance/reports.py` — Extracted `_get_balance_sheet_data()` helper
- `api/views/finance_monitoring.py` — Added `comparison_date` parameter
- `finance/templates/finance/reports/balance_sheet.html` — Updated with comparison layout

### How It Works
- When `comparison_date` is provided, the report runs the balance sheet query twice
- Variance is computed per account: `current - prior`
- Excel/PDF shows 3 columns: **Current | Prior | Variance**
- Without `comparison_date`, behavior is unchanged (single column)

### API Usage
```
# Standard balance sheet
GET /api/finance/reports/balance-sheet/?export=xlsx&as_of_date=2026-03-01

# With comparison period (NEW)
GET /api/finance/reports/balance-sheet/?export=xlsx&as_of_date=2026-03-01&comparison_date=2026-02-01
```

---

## 5. Cash Flow — Budget vs Actual Side-by-Side

### Files Changed
- `finance/reports.py` — Added budget query logic in `generate_cash_flow_statement()`
- `finance/templates/finance/reports/cash_flow.html` — Updated with budget columns

### How It Works
- After computing actual cash flow, queries `Budget` model for overlapping active budgets
- Maps budget categories to Operating Activity labels via `budget_category_map`
- Budget data applies to **Operating Activities only** (no budget for Investing/Financing)
- Budget **NEVER** overrides actual — shown side-by-side for comparison only
- When budget exists: 3 columns in Operating section: **Actual | Budget | Variance**
- When no budget: standard single-column layout (unchanged)

### Budget Category Mapping
```python
'revenue'          → 'Revenue Received'
'commissions'      → 'Commission Payments'
'salaries'         → 'Operating Expenses Paid'
'rent'             → 'Operating Expenses Paid'
'utilities'        → 'Operating Expenses Paid'
'marketing'        → 'Operating Expenses Paid'
# ... etc
```

### API Usage
No API change needed — budget comparison is automatic when active budgets exist for the period.

```
GET /api/finance/reports/cash-flow/?export=xlsx&start_date=2026-01-01&end_date=2026-03-01
```

---

## 6. Cash Position Daily View

### Files Changed
- `finance/reports.py` — New `generate_cash_position_report()` method
- `api/views/finance_monitoring.py` — New `CashPositionAPIView`
- `api/urls.py` — Added URL route
- `finance/templates/finance/reports/cash_position.html` — **NEW** template

### New Endpoint
```
GET /api/finance/cash-position/
```

### Query Parameters
| Param | Default | Description |
|-------|---------|-------------|
| `start_date` | 30 days ago | Start date (YYYY-MM-DD) |
| `end_date` | Today | End date (YYYY-MM-DD) |
| `export` | json | Output format: `json`, `pdf`, `xlsx` |

### JSON Response Structure
```json
{
  "total_cash_position": 150000.00,
  "accounts": [
    {"id": 1, "code": "1-10-100-0001", "name": "Petty Cash - Main", "balance": 25000.00},
    {"id": 2, "code": "1-10-200-0001", "name": "BDO Savings", "balance": 100000.00},
    {"id": 3, "code": "1-10-200-0002", "name": "BPI Checking", "balance": 25000.00}
  ],
  "daily_totals": [
    {
      "date": "2026-02-01",
      "balances": {"1-10-100-0001": 25000.00, "1-10-200-0001": 98000.00, ...},
      "total": 148000.00
    },
    ...
  ]
}
```

### How It Works
- Queries all `Account` objects with `code__startswith='1-10'` (Cash & Cash Equivalents), non-header
- Uses `Account.get_balance(as_of_date)` for each day in the date range
- Builds daily matrix: Date x Account → Balance
- Includes GCash and E-wallet accounts (from update #1)

### V4 Frontend Route
- `TWCAKOV4/src/app/api/finance/cash-position/route.ts` — New proxy route

---

## Critical Bug Fix: DRF `?format=` Conflict

### Problem
DRF's content negotiation intercepts the `?format=` query parameter. When `?format=xlsx` is passed, DRF tries to find an `xlsx` renderer, fails, and returns **404 "Not found."** — causing all report downloads to fail.

### Root Cause
DRF configuration in `twcako/restconf/main.py` includes `BrowsableAPIRenderer` and `DatatablesRenderer`. The `?format=` parameter triggers DRF's built-in format suffix routing, which only recognizes `json`, `api`, and `datatables` as valid formats.

### Fix
- **Django views** now check `export` parameter first, falling back to `format`:
  ```python
  format_type = request.query_params.get('export', request.query_params.get('format', 'pdf')).lower()
  ```
- **Next.js proxy routes** now send `?export=xlsx` instead of `?format=xlsx`
- Backward compatible: `?format=json` still works for JSON responses (DRF recognizes `json`)

### Files Changed
- `api/views/finance_monitoring.py` — All 8 report views updated
- `TWCAKOV4/src/app/api/finance/reports/*/route.ts` — All 7 route files updated

---

## Files Summary

### Django Backend (TWCako)

| File | Action | Description |
|------|--------|-------------|
| `finance/data/chart_of_accounts_seed.csv` | Modified | +6 accounts |
| `finance/models.py` | Modified | JournalEntry vendor field |
| `finance/migrations/0004_journalentry_vendor_field.py` | **New** | Migration |
| `finance/reports.py` | Modified | 4 report enhancements + 1 new report |
| `api/views/finance_phase3.py` | Modified | COA seed + JournalEntry vendor API |
| `api/views/finance_monitoring.py` | Modified | Report params + CashPosition view |
| `api/urls.py` | Modified | +cash-position URL + import |
| `finance/templates/finance/reports/income_statement.html` | Modified | +Tax section |
| `finance/templates/finance/reports/income_statement_annual.html` | **New** | 12-month template |
| `finance/templates/finance/reports/balance_sheet.html` | Modified | +Comparison layout |
| `finance/templates/finance/reports/cash_flow.html` | Modified | +Budget layout |
| `finance/templates/finance/reports/cash_position.html` | **New** | Daily position template |

### V4 Frontend (TWCAKOV4)

| File | Action | Description |
|------|--------|-------------|
| `src/app/api/finance/reports/income-statement/route.ts` | Modified | `export` param + `year` param |
| `src/app/api/finance/reports/balance-sheet/route.ts` | Modified | `export` param + `comparison_date` |
| `src/app/api/finance/reports/cash-flow/route.ts` | Modified | `export` param |
| `src/app/api/finance/reports/expenses/route.ts` | Modified | `export` param |
| `src/app/api/finance/reports/assets/route.ts` | Modified | `export` param |
| `src/app/api/finance/reports/trial-balance/route.ts` | Modified | `export` param |
| `src/app/api/finance/reports/loan/[id]/route.ts` | Modified | `export` param |
| `src/app/api/finance/cash-position/route.ts` | **New** | Cash position proxy route |

---

## Testing

```bash
# 1. Apply migration
python manage.py migrate finance 0004

# 2. Test endpoints (replace TOKEN with valid JWT)
# Income Statement - Annual
curl -H "Authorization: Bearer TOKEN" \
  'http://api.localhost:8000/finance/reports/income-statement/?export=xlsx&year=2026'

# Balance Sheet - With Comparison
curl -H "Authorization: Bearer TOKEN" \
  'http://api.localhost:8000/finance/reports/balance-sheet/?export=xlsx&as_of_date=2026-03-01&comparison_date=2026-02-01'

# Cash Flow (budget comparison is automatic)
curl -H "Authorization: Bearer TOKEN" \
  'http://api.localhost:8000/finance/reports/cash-flow/?export=xlsx&start_date=2026-01-01&end_date=2026-03-01'

# Cash Position - JSON
curl -H "Authorization: Bearer TOKEN" \
  'http://api.localhost:8000/finance/cash-position/?start_date=2026-02-01&end_date=2026-03-01'

# Cash Position - Excel
curl -H "Authorization: Bearer TOKEN" \
  'http://api.localhost:8000/finance/cash-position/?export=xlsx&start_date=2026-02-01&end_date=2026-03-01'

# Journal Entry with Vendor
curl -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  'http://api.localhost:8000/finance/journal-entries/' \
  -d '{"date":"2026-03-01","description":"Test","vendor_id":1,"lines":[...]}'
```

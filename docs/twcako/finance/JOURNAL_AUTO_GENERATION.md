# Auto-Generate Journal Entries from CashTransactions

## Overview

When a `CashTransaction` is approved, the system automatically creates a `JournalEntry` with proper debit/credit lines mapped to the Chart of Accounts. The account mapping is **configurable** by the finance team via the Journal Mappings UI page.

## Architecture

```
CashTransaction.save() — status becomes "approved"
        ↓
Django post_save signal fires (accounting/apps.py)
        ↓
Celery task: generate_journal_entry_task(tx_id)
        ↓
Looks up JournalAccountMapping for tx.category
        ↓
Creates JournalEntry (entry_type='auto') + JournalLine pairs
```

## Key Design Decisions

- **Idempotent**: Checks if a JournalEntry already exists for the transaction before creating
- **Graceful degradation**: If no mapping or no open fiscal period exists, logs a warning but does not crash
- **Atomic**: JournalEntry + JournalLines are created in a single database transaction
- **Async**: Uses Celery to avoid slowing down the approval flow
- **Configurable**: Finance team can change account mappings via UI without code changes

## Default Account Mappings

| Category | Debit Account | Credit Account | Logic |
|---|---|---|---|
| Payment | 1-10-300-0002 (E-wallet Gateway) | 4-10-100 (Sales Revenue) | Cash received → revenue |
| Top-Up | 1-10-300-0002 (E-wallet Gateway) | 2-10-600 (eCash Liability) | Cash in → owe member eCash |
| Withdrawal (Member) | 2-10-600 (eCash Liability) | 1-10-300-0002 (E-wallet Gateway) | Reduce liability → cash out |
| Withdrawal (Supplier) | 2-10-100 (AP Trade) | 1-10-300-0002 (E-wallet Gateway) | Reduce payable → cash out |
| Transfer | 2-10-600 (eCash Liability) | 2-10-600 (eCash Liability) | Internal transfer (net zero) |

Withdrawals are automatically split by user type: `is_supplier=True` uses the supplier mapping, otherwise uses the member mapping.

## Files

### Created

| File | Description |
|---|---|
| `finance/journal_auto.py` | Core `generate_journal_entry()` function |
| `finance/management/commands/backfill_journal_entries.py` | Management command for historical backfill |
| `finance/migrations/0005_journal_account_mapping_and_je_cash_transaction_fk.py` | Schema migration |
| `finance/migrations/0006_seed_journal_account_mappings.py` | Data migration seeding 5 default mappings |
| `api/views/journal_mapping.py` | CRUD API views for mapping configuration |
| `TWCAKOV4/src/app/api/finance/journal-mappings/route.ts` | Next.js proxy (GET/POST) |
| `TWCAKOV4/src/app/api/finance/journal-mappings/[id]/route.ts` | Next.js proxy (GET/PUT/DELETE) |
| `TWCAKOV4/src/app/(dashboards)/journal-mappings/page.tsx` | Server page |
| `TWCAKOV4/src/app/(dashboards)/journal-mappings/JournalMappingsClient.tsx` | Config UI |

### Modified

| File | Change |
|---|---|
| `finance/models.py` | Added `JournalAccountMapping` model + `cash_transaction` FK on `JournalEntry` |
| `accounting/apps.py` | Added `ready()` with `post_save` signal |
| `accounting/tasks.py` | Added `generate_journal_entry_task` Celery task |
| `api/urls.py` | Registered mapping CRUD endpoints |
| `TWCAKOV4/src/types/domain/finance.ts` | Added mapping types |
| `TWCAKOV4/src/hooks/useFinance.ts` | Added `useJournalMappings()` hook |
| `TWCAKOV4/src/components/finance/FinancePageLayout.tsx` | Added sidebar nav item |

## API Endpoints

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| GET | `/finance/journal-mappings/` | List all mappings | IsFinanceUser |
| POST | `/finance/journal-mappings/` | Create a mapping | IsFinanceManager |
| GET | `/finance/journal-mappings/<id>/` | Get mapping detail | IsFinanceManager |
| PUT | `/finance/journal-mappings/<id>/` | Update a mapping | IsFinanceManager |
| DELETE | `/finance/journal-mappings/<id>/` | Delete a mapping | IsFinanceManager |
| POST | `/finance/journal-backfill/` | Trigger backfill | IsFounder |

## Backfill

### Option 1: API Endpoint (Production)

For production where you can't run management commands directly, use the backfill API endpoint.
Requires founder-level access. Call from the browser console while logged in as founder:

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

// Optional: filter by category or limit
// body: JSON.stringify({ dry_run: false, category: 'payment', limit: 500 })
```

### Option 2: Management Command (Local/SSH)

For environments where you have shell access:

```bash
# Preview what would be created
python manage.py backfill_journal_entries --dry-run

# Run full backfill
python manage.py backfill_journal_entries

# Filter by category
python manage.py backfill_journal_entries --category payment

# Filter by date range
python manage.py backfill_journal_entries --date-from 2026-01-01 --date-to 2026-02-28

# Limit number processed
python manage.py backfill_journal_entries --limit 500
```

### Prerequisites

- At least one **open fiscal period** must exist covering the transaction dates
- Transactions outside any open fiscal period will be skipped
- Both methods are **idempotent** — running multiple times will not create duplicates

### Backfill History

| Date | Environment | Transactions | Created | Skipped | Notes |
|---|---|---|---|---|---|
| 2026-03-02 | Local | 11,276 | 1,931 | 9,345 | Fiscal periods cover Jan-Mar 2026 only |
| 2026-03-02 | Production | Run via API | -- | -- | Via browser console on dashboard.twctechwarriors.com |

## UI Access

Navigate to **Finance > Accounting > Journal Mappings** in the sidebar.

The page shows a table of all configured mappings with:
- Category name
- Debit and credit account codes/names
- Active status
- Edit and delete actions

Auto-generated journal entries appear in the **Journal Entries** page with `entry_type = 'auto'`.

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| No JE created after approval | No mapping for that category | Add mapping via Journal Mappings page |
| No JE created after approval | No open fiscal period for the date | Create/open a fiscal period covering that date |
| Duplicate JE concern | N/A — idempotency check prevents duplicates | Safe to re-trigger |
| Celery task failing | Check Celery worker logs | Task has 3 retries with 10s delay |

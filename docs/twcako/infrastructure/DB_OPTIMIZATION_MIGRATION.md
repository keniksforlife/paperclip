# Database Optimization Migration Guide

**Created:** 2026-02-19
**Migration File:** `accounts/migrations/0329_db_optimization_indexes.py`
**Status:** ✅ Applied to local, pending Railway production

---

## Overview

This document describes the database optimization changes made to improve TWCako's query performance. The changes were identified through analysis of the production database replica.

---

## Summary of Changes

### Removed (Duplicate Indexes)
| Index Name | Table | Reason |
|------------|-------|--------|
| `accounts_me_lifecyc_45af92_idx` | accounts_memberactivity | Duplicate of `accounts_memberactivity_lifecycle_stage_18a1f843` |
| `accounts_me_timesta_fec538_idx` | accounts_memberactivitylog | Duplicate of `accounts_memberactivitylog_timestamp_2fdf5758` |

### Added (9 New Indexes)
| Index Name | Table | Column | Purpose |
|------------|-------|--------|---------|
| `idx_user_is_active` | accounts_user | is_active | Faster auth queries |
| `idx_user_timestamp` | accounts_user | timestamp | Date range filtering |
| `idx_productorder_status` | orders_productorder | status | Order listing by status |
| `idx_vworder_status` | virtual_warehouse_vworder | status | VW order filtering |
| `idx_payment_status` | ecash_payment | status | Payment queries |
| `idx_withdrawal_status` | ecash_withdrawal | status | Withdrawal filtering |
| `idx_notification_status` | notifications_notification | status | Notification queries |
| `idx_cashtxn_approved_by` | accounting_cashtransaction | approved_by_id | FK JOIN optimization |
| `idx_cashtxn_rejected_by` | accounting_cashtransaction | rejected_by_id | FK JOIN optimization |

---

## Index Sizes (After Creation)

| Index | Size |
|-------|------|
| idx_user_timestamp | 1.3 MB |
| idx_user_is_active | 424 KB |
| idx_payment_status | 320 KB |
| idx_vworder_status | 208 KB |
| idx_productorder_status | 144 KB |
| idx_cashtxn_approved_by | 96 KB |
| idx_cashtxn_rejected_by | 96 KB |
| idx_withdrawal_status | 72 KB |
| idx_notification_status | 8 KB |
| **Total** | **~2.7 MB** |

---

## Migration File Details

**File:** `accounts/migrations/0329_db_optimization_indexes.py`

### Dependencies
- accounts.0328_member_activity_models
- orders.0001_initial
- virtual_warehouse.0001_initial
- ecash.0001_initial
- notifications.0001_initial
- accounting.0021_alter_ecashentry_ecash_type

### Key Features
- Uses `CREATE INDEX CONCURRENTLY` to avoid table locks
- Uses `IF NOT EXISTS` for idempotency
- Includes `reverse_sql` for rollback capability
- All operations are reversible

---

## Deployment Instructions

### Step 1: Verify Local Testing ✅ DONE
```bash
# Already applied to twcako_local on 2026-02-19
# Verified indexes exist and are functional
```

### Step 2: Apply to Railway Production

**Option A: Via Django Migrate (Recommended)**
```bash
# 1. Switch to Railway DB temporarily
# Edit .env: USE_RAILWAY_DB=1

# 2. Run migration
python3 manage.py migrate accounts 0329_db_optimization_indexes

# 3. Switch back to local DB
# Edit .env: USE_RAILWAY_DB=0
```

**Option B: Direct SQL (If Django migrate fails)**
```sql
-- Connect to Railway and run:

-- Remove duplicates
DROP INDEX IF EXISTS accounts_me_lifecyc_45af92_idx;
DROP INDEX IF EXISTS accounts_me_timesta_fec538_idx;

-- Add new indexes (run each separately)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_is_active ON accounts_user(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_timestamp ON accounts_user(timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_productorder_status ON orders_productorder(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vworder_status ON virtual_warehouse_vworder(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_status ON ecash_payment(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawal_status ON ecash_withdrawal(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_status ON notifications_notification(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cashtxn_approved_by ON accounting_cashtransaction(approved_by_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cashtxn_rejected_by ON accounting_cashtransaction(rejected_by_id);

-- Mark migration as applied
INSERT INTO django_migrations (app, name, applied)
VALUES ('accounts', '0329_db_optimization_indexes', NOW());
```

### Step 3: Verify Production
```sql
-- Check indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY tablename;
```

---

## Rollback Instructions

If needed, the migration can be reversed:

```bash
python3 manage.py migrate accounts 0328_member_activity_models
```

Or manually:
```sql
-- Remove new indexes
DROP INDEX IF EXISTS idx_user_is_active;
DROP INDEX IF EXISTS idx_user_timestamp;
DROP INDEX IF EXISTS idx_productorder_status;
DROP INDEX IF EXISTS idx_vworder_status;
DROP INDEX IF EXISTS idx_payment_status;
DROP INDEX IF EXISTS idx_withdrawal_status;
DROP INDEX IF EXISTS idx_notification_status;
DROP INDEX IF EXISTS idx_cashtxn_approved_by;
DROP INDEX IF EXISTS idx_cashtxn_rejected_by;

-- Restore duplicate indexes (if needed)
CREATE INDEX accounts_me_lifecyc_45af92_idx ON accounts_memberactivity(lifecycle_stage);
CREATE INDEX accounts_me_timesta_fec538_idx ON accounts_memberactivitylog(timestamp);
```

---

## Performance Impact

### Expected Improvements
| Query Type | Before | After (Expected) |
|------------|--------|------------------|
| User login (is_active check) | Sequential scan | Index scan |
| Order list by status | Sequential scan | Index scan |
| Payment status filtering | Sequential scan | Index scan |
| Notification unread count | Sequential scan | Index scan |

### Monitoring After Deployment
```sql
-- Check index usage after a few days
SELECT
    relname as table_name,
    indexrelname as index_name,
    idx_scan as times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE indexrelname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

---

## Future Optimization (Phase 2)

Not included in this migration but recommended for future:

1. **Large Table Indexes** (run during low traffic)
   ```sql
   CREATE INDEX CONCURRENTLY idx_prospectprofile_timestamp ON accounts_prospectprofile(timestamp);
   CREATE INDEX CONCURRENTLY idx_ecash_timestamp ON ecash_ecash(timestamp);
   ```

2. **Data Archival** (reduces table size)
   - Archive `accounts_prospectprofile` records older than 12 months
   - Current size: 4.66M rows, 616 MB
   - Potential reduction: 50-70%

See `docs/DB_OPTIMIZATION_REPORT.md` for full recommendations.

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| `docs/DB_OPTIMIZATION_REPORT.md` | Full analysis and recommendations |
| `docs/LOCAL_DATABASE_SETUP.md` | Local DB setup for testing |
| `accounts/migrations/0329_db_optimization_indexes.py` | The migration file |

---

## Changelog

| Date | Change | By |
|------|--------|-----|
| 2026-02-19 | Initial optimization analysis | CTO Team |
| 2026-02-19 | Applied to local database | CTO Team |
| 2026-02-19 | Created migration file | CTO Team |
| TBD | Apply to Railway production | - |

---

*Last updated: 2026-02-19*

# TWCako Database Optimization Report

**Generated:** 2026-02-19
**Database:** twcako_local (replica of Railway production)
**Total Tables:** 95
**Total Users:** 59,518

---

## Executive Summary

The database analysis reveals several optimization opportunities:
- **1 massive table** with 4.66M rows consuming 616 MB
- **2 duplicate index pairs** wasting storage
- **93 commonly-queried columns** missing indexes
- **Multiple tables** with 0% index utilization

---

## 1. Table Size Analysis (Top 10)

| Table | Rows | Total Size | Table Size | Index Size |
|-------|------|------------|------------|------------|
| accounts_prospectprofile | 4,660,974 | 616 MB | 485 MB | 131 MB |
| funnels_userfunnelintegration | 747,791 | 221 MB | 194 MB | 27 MB |
| ecash_ecash | 864,420 | 204 MB | 120 MB | 85 MB |
| accounts_prospecttap | 151,259 | 62 MB | 32 MB | 30 MB |
| funnels_prospect | 255,949 | 43 MB | 36 MB | 7.4 MB |
| accounts_user | 59,518 | 28 MB | 18 MB | 10 MB |
| ecash_payment | 43,427 | 19 MB | 11 MB | 8.3 MB |
| virtual_warehouse_vworder | 27,139 | 17 MB | 7.3 MB | 9.7 MB |
| accounting_ecashentry | 72,533 | 15 MB | 11 MB | 4.7 MB |
| accounts_customuser | 59,518 | 13 MB | 10 MB | 2.6 MB |

### Critical Finding: `accounts_prospectprofile`
- **4.66 million rows** - This is the largest table by far
- Only 2 indexes (id, user_id)
- Missing indexes on: `timestamp`, `fb_user_id`, `mobile`, `is_checkout`, `is_paid`
- **Recommendation:** Review if all data is needed; consider archiving old records

---

## 2. Duplicate Indexes (Should Remove)

| Size | Index 1 | Index 2 |
|------|---------|---------|
| 16 KB | accounts_me_lifecyc_45af92_idx | accounts_memberactivity_lifecycle_stage_18a1f843 |
| 16 KB | accounts_me_timesta_fec538_idx | accounts_memberactivitylog_timestamp_2fdf5758 |

**Action:** Drop the shorter-named indexes (they're duplicates from migrations)

```sql
-- Remove duplicate indexes
DROP INDEX IF EXISTS accounts_me_lifecyc_45af92_idx;
DROP INDEX IF EXISTS accounts_me_timesta_fec538_idx;
```

---

## 3. Tables with Poor Index Usage (0% or Low)

These tables have indexes but queries aren't using them:

| Table | Rows | Sequential Scans | Index Scans | Index Usage % |
|-------|------|------------------|-------------|---------------|
| funnels_userfunnelintegration | 747,791 | 8 | 0 | 0% |
| accounts_prospecttap | 151,259 | 26 | 0 | 0% |
| funnels_prospect | 255,949 | 5 | 0 | 0% |
| orders_productorder | 18,007 | 25 | 0 | 0% |
| billing_billingprofile | 77,546 | 5 | 0 | 0% |
| logistic_ordertransaction | 12,640 | 18 | 0 | 0% |

**Note:** Statistics were reset after restore. Monitor after production usage.

---

## 4. Critical Missing Indexes

### High Priority (Large Tables)

```sql
-- accounts_prospectprofile (4.66M rows)
CREATE INDEX CONCURRENTLY idx_prospectprofile_timestamp
ON accounts_prospectprofile(timestamp);

CREATE INDEX CONCURRENTLY idx_prospectprofile_is_checkout
ON accounts_prospectprofile(is_checkout) WHERE is_checkout = true;

-- ecash_ecash (864K rows)
CREATE INDEX CONCURRENTLY idx_ecash_timestamp
ON ecash_ecash(timestamp);

-- accounts_user (59K rows)
CREATE INDEX CONCURRENTLY idx_user_is_active
ON accounts_user(is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_user_timestamp
ON accounts_user(timestamp);
```

### Medium Priority (Status Columns)

```sql
-- Orders & Payments - frequently filtered by status
CREATE INDEX CONCURRENTLY idx_productorder_status
ON orders_productorder(status);

CREATE INDEX CONCURRENTLY idx_vworder_status
ON virtual_warehouse_vworder(status);

CREATE INDEX CONCURRENTLY idx_payment_status
ON ecash_payment(status);

CREATE INDEX CONCURRENTLY idx_withdrawal_status
ON ecash_withdrawal(status);
```

### Lower Priority (Timestamp columns for reporting)

```sql
-- For date range queries in reports
CREATE INDEX CONCURRENTLY idx_cashtransaction_timestamp
ON accounting_cashtransaction(timestamp);

CREATE INDEX CONCURRENTLY idx_ecashentry_timestamp
ON accounting_ecashentry(timestamp);

CREATE INDEX CONCURRENTLY idx_orderitems_timestamp
ON orders_orderitems(timestamp);
```

---

## 5. Foreign Keys Missing Indexes

| Table | Column | Foreign Table |
|-------|--------|---------------|
| accounting_cashtransaction | approved_by_id | accounts_user |
| accounting_cashtransaction | rejected_by_id | accounts_user |

```sql
CREATE INDEX CONCURRENTLY idx_cashtxn_approved_by
ON accounting_cashtransaction(approved_by_id);

CREATE INDEX CONCURRENTLY idx_cashtxn_rejected_by
ON accounting_cashtransaction(rejected_by_id);
```

---

## 6. Data Archival Recommendations

### `accounts_prospectprofile` - 4.66M rows
- Consider archiving records older than 6-12 months
- Create an archive table: `accounts_prospectprofile_archive`
- Move old records with `is_checkout = false AND is_paid = false`

### `funnels_userfunnelintegration` - 747K rows
- Review if historical integrations are needed
- Consider soft-delete with `is_archived` flag

### `ecash_ecash` - 864K rows
- This is a ledger table - don't archive
- Ensure proper indexing for balance calculations

---

## 7. Recommended Migration Plan

### Phase 1: Quick Wins (No Downtime)
```sql
-- 1. Remove duplicate indexes
DROP INDEX IF EXISTS accounts_me_lifecyc_45af92_idx;
DROP INDEX IF EXISTS accounts_me_timesta_fec538_idx;

-- 2. Add critical indexes (CONCURRENTLY = no lock)
CREATE INDEX CONCURRENTLY idx_user_is_active ON accounts_user(is_active);
CREATE INDEX CONCURRENTLY idx_productorder_status ON orders_productorder(status);
CREATE INDEX CONCURRENTLY idx_vworder_status ON virtual_warehouse_vworder(status);
```

### Phase 2: Large Table Indexes (Monitor Impact)
```sql
-- Run during low-traffic periods
CREATE INDEX CONCURRENTLY idx_prospectprofile_timestamp ON accounts_prospectprofile(timestamp);
CREATE INDEX CONCURRENTLY idx_ecash_timestamp ON ecash_ecash(timestamp);
```

### Phase 3: Archive Old Data
```sql
-- Create archive table
CREATE TABLE accounts_prospectprofile_archive (LIKE accounts_prospectprofile INCLUDING ALL);

-- Move old inactive records (adjust date as needed)
INSERT INTO accounts_prospectprofile_archive
SELECT * FROM accounts_prospectprofile
WHERE timestamp < NOW() - INTERVAL '12 months'
  AND is_checkout = false
  AND is_paid = false;

-- Delete from main table
DELETE FROM accounts_prospectprofile
WHERE timestamp < NOW() - INTERVAL '12 months'
  AND is_checkout = false
  AND is_paid = false;

-- Run VACUUM to reclaim space
VACUUM ANALYZE accounts_prospectprofile;
```

---

## 8. Monitoring Queries

### Check Index Usage After Changes
```sql
SELECT
    relname as table_name,
    seq_scan,
    idx_scan,
    ROUND(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 2) as idx_pct
FROM pg_stat_user_tables
WHERE n_live_tup > 1000
ORDER BY seq_scan DESC
LIMIT 20;
```

### Check Table Bloat
```sql
SELECT
    schemaname, tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 2) as dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

---

## Summary of Actions

| Priority | Action | Impact | Status |
|----------|--------|--------|--------|
| HIGH | Remove 2 duplicate indexes | Free 32 KB, reduce write overhead | ✅ DONE |
| HIGH | Add status indexes | Faster order/payment queries | ✅ DONE |
| HIGH | Add user.is_active index | Faster auth queries | ✅ DONE |
| MEDIUM | Add timestamp indexes on large tables | Faster date range queries | Pending |
| MEDIUM | Add FK indexes on cashtransaction | Faster JOINs | ✅ DONE |
| LOW | Archive old prospectprofile data | Reduce table size by ~50-70% | Pending |

---

## Migration Status

### Phase 1: Quick Wins ✅ COMPLETE
- **Migration File:** `accounts/migrations/0329_db_optimization_indexes.py`
- **Applied to Local:** 2026-02-19
- **Applied to Railway:** Pending
- **Documentation:** `docs/DB_OPTIMIZATION_MIGRATION.md`

### Phase 2: Large Table Indexes (Pending)
- Add timestamp indexes to `accounts_prospectprofile` and `ecash_ecash`
- Run during low-traffic period

### Phase 3: Data Archival (Pending)
- Archive old `accounts_prospectprofile` records
- Requires business decision on retention period

---

*Report generated for TWCako V1 migration planning*
*Last updated: 2026-02-19*

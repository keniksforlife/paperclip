# Finance Module - Code Review Issues

**Created:** 2026-02-22 10:45 AM PHT
**Review Date:** 2026-02-22 10:30 AM PHT
**Reviewer:** CTO Team
**Status:** Active

---

## Summary

| Total Issues | Critical | Medium | Low | Resolved |
|--------------|----------|--------|-----|----------|
| 4            | 0        | 0      | 2   | 2        |

---

## Issue #1: Hardcoded Usernames in Authorization

**Severity:** Medium
**Status:** ✅ RESOLVED (2026-02-22)
**Affects:** `api/views/finance_monitoring.py`

### Description

Authorization checks use hardcoded usernames instead of a proper permission system. This appeared in 13 different API views.

### Resolution (2026-02-22)

**Implemented by:** CTO Team

Created `api/permissions.py` with role-based permission classes:
- `IsFounder` - Full access for founders (is_founder=True or is_admin=True)
- `IsFinanceUser` - Finance module access (founders, admins, staff, is_finance=True)
- `IsFinanceManager` - Higher-level access for amounts >= PHP 50,000
- `IsSupplierUser` - Supplier module access
- `IsLogisticsUser` - Logistics module access

Updated all 13 finance API views to use `permission_classes = [IsAuthenticated, IsFinanceUser]` instead of inline authorization checks.

### New Permission Hierarchy

```
is_founder=True OR is_admin=True
    ↓ (full access)
is_staff=True OR is_finance=True
    ↓ (finance access)
is_finance=True AND is_staff=True
    ↓ (finance manager - >= PHP 50,000)
```

### Management Command

Created `accounts/management/commands/setup_roles.py` for role management:

```bash
# Grant founder access
python manage.py setup_roles --founder kentlucky

# Grant finance access
python manage.py setup_roles --finance username

# List all founders
python manage.py setup_roles --list-founders

# List all finance users
python manage.py setup_roles --list-finance
```

### Files Changed

| File | Change |
|------|--------|
| `api/permissions.py` | NEW - Permission classes |
| `api/views/finance_monitoring.py` | Updated 13 views to use permission classes |
| `accounts/management/commands/setup_roles.py` | NEW - Role management command |

### Verification

```bash
# Check kentlucky has founder access
python manage.py setup_roles --list-founders

# Verify permissions module loads
python -c "from api.permissions import IsFinanceUser, IsFinanceManager, IsFounder; print('OK')"
```

---

## Issue #2: Missing Audit Trail on Approval Actions

**Severity:** Medium
**Status:** ✅ RESOLVED (2026-02-22)
**Affects:** `api/views/finance_monitoring.py` - `ApprovalQueueActionAPIView`

### Description

The `TransactionAuditLog` model exists and is designed for tracking all financial transaction changes, but the `ApprovalQueueActionAPIView` doesn't create audit entries when approving, rejecting, or escalating items.

### Resolution (2026-02-22)

**Implemented by:** CTO Team

Created `finance/audit.py` with helper functions:
- `log_approval_action()` - Logs to TransactionAuditLog
- `log_settlement_action()` - Logs settlement actions
- `capture_approval_item_state()` - Captures state before changes
- `capture_settlement_state()` - Captures settlement state

Updated `ApprovalQueueActionAPIView` in `api/views/finance_monitoring.py`:
- All 5 actions now create audit log entries
- Captures IP address via `get_client_ip()` from `twcako/app_utils/user.py`
- Captures user agent
- Records previous and new values

### Actions Now Logged

| Action | Audit `action` Value | Status |
|--------|---------------------|--------|
| Approve | `approve` | ✅ Done |
| Reject | `reject` | ✅ Done |
| Assign | `approve` | ✅ Done |
| Escalate | `escalate` | ✅ Done |
| Take | `approve` | ✅ Done |

### Verification

```bash
# After performing an approval action, check TransactionAuditLog:
python manage.py shell
>>> from finance.models import TransactionAuditLog
>>> TransactionAuditLog.objects.filter(transaction_type='approval_queue').last()
```

Or view in Django Admin: `/admin/finance/transactionauditlog/`

---

## Issue #3: N+1 Query in SLA Check Loop

**Severity:** Low
**Status:** Open
**Affects:** `api/views/finance_monitoring.py` - `ApprovalQueueListAPIView`

### Description

The approval queue list view loops through all pending items and calls `check_sla_breach()` on each, which triggers individual `save()` calls.

### Current Code (lines 405-424)

```python
class ApprovalQueueListAPIView(APIView):
    def get(self, request):
        queryset = ApprovalQueueItem.objects.filter(
            status__in=['pending', 'assigned', 'in_review']
        ).select_related('user', 'assigned_to')

        # ... filters ...

        # N+1 problem: Individual save() for each breached item
        for item in queryset:
            item.check_sla_breach()  # Calls save() if breached

        items = queryset[:50]
        # ...
```

### Impact

- Each `check_sla_breach()` that finds a breach does a `save()`
- With 50 pending items where 10 are breached = 10 extra DB queries
- Not critical but inefficient

### Recommended Fix

Use bulk update:

```python
class ApprovalQueueListAPIView(APIView):
    def get(self, request):
        queryset = ApprovalQueueItem.objects.filter(
            status__in=['pending', 'assigned', 'in_review']
        ).select_related('user', 'assigned_to')

        # ... filters ...

        # Bulk update SLA breaches in ONE query
        now = timezone.now()
        queryset.filter(
            sla_breached=False,
            sla_deadline__lt=now
        ).update(sla_breached=True)

        # Re-fetch with updated values
        items = queryset[:50]
        # ...
```

### Migration Steps

1. [ ] Replace loop with bulk `update()` query
2. [ ] Remove `check_sla_breach()` call from loop
3. [ ] Test that SLA status still updates correctly
4. [ ] Verify response includes correct `sla_breached` values

### Priority

Low - Performance optimization, not a bug. Current implementation works correctly.

---

## Issue #4: Undocumented Celery Task

**Severity:** Low
**Status:** Resolved (2026-02-22)
**Affects:** Documentation only

### Description

The `check_ecash_reconciliation` task exists in `finance/tasks.py` but was not documented in the implementation guides.

### Task Details

```python
@shared_task(name='finance.check_ecash_reconciliation')
def check_ecash_reconciliation():
    """
    Compare V2 (ECash) and V3 (ECashEntry) ledger totals.
    Runs daily to detect discrepancies.
    Creates alert if variance > 100 PHP.
    """
```

### Resolution

Added to `docs/FINANCE_MONITORING_IMPLEMENTATION.md` Section 9 during 2026-02-22 code review.

This task is valuable for monitoring V2/V3 ledger drift during the migration period.

---

## Backlog / Future Improvements

These are not issues but potential enhancements identified during review:

| Item | Description | Priority |
|------|-------------|----------|
| Rate limiting | Add rate limits to finance endpoints | Low |
| Unit tests | No test coverage for finance module | Medium |
| Caching | Cache `FinanceDashboardAPIView` response (60s TTL) | Low |
| Rollback docs | Add rollback procedures to migration checklist | Low |
| Commission API perf | May hit same eCash N+1 issues at scale | Medium |

---

## Related Documentation

- [Finance Monitoring Implementation (Phase 1)](./FINANCE_MONITORING_IMPLEMENTATION.md)
- [Finance Pages Implementation (Phase 2)](./FINANCE_PAGES_IMPLEMENTATION.md)
- [eCash Optimization Plan](./ECASH_OPTIMIZATION_PLAN.md)

---

*Document Version: 1.2*
*Created: 2026-02-22 10:45 AM PHT*
*Last Updated: 2026-02-22 02:30 PM PHT*
*Author: CTO Team*

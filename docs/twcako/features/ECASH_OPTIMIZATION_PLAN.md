# eCash System Optimization Plan

**Created:** 2026-02-19
**Status:** Planning
**Priority:** HIGH - Required before V1 Migration

---

## Executive Summary

The TWCako eCash system has critical performance and consistency issues that must be addressed before V1 migration. This document outlines a phased approach to optimize the system for scalability, fix security vulnerabilities, and ensure Finance Monitoring integration works correctly.

### Key Problems

| Issue | Severity | Impact |
|-------|----------|--------|
| Balance calculated via full table scan every request | CRITICAL | Performance degrades as data grows |
| Race condition on withdrawals (double-spend possible) | CRITICAL | Financial loss risk |
| Dual ledger inconsistency (V2 vs V3) | HIGH | Finance reports don't match member balances |
| Missing composite indexes | HIGH | Slow queries on common operations |
| N+1 query patterns | MEDIUM | 75+ queries per page load |
| No archival strategy | MEDIUM | Tables grow unbounded |

### Current Data Volume

| Table | Rows | Unique Users | Avg Entries/User |
|-------|------|--------------|------------------|
| `ecash_ecash` (V2 Legacy) | 864,420 | 10,714 | 80.68 |
| `accounting_ecashentry` (V3 New) | 72,533 | 10,852 | 6.68 |

---

## System Architecture Overview

### Two Parallel eCash Ledgers

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐         ┌─────────────────┐               │
│   │   ECash (V2)    │         │ ECashEntry (V3) │               │
│   │   ecash/models  │         │ accounting/models│               │
│   ├─────────────────┤         ├─────────────────┤               │
│   │ 864K rows       │         │ 72K rows        │               │
│   │ 80 entries/user │         │ 6 entries/user  │               │
│   └────────┬────────┘         └────────┬────────┘               │
│            │                           │                         │
│            ▼                           ▼                         │
│   ┌─────────────────┐         ┌─────────────────┐               │
│   │ Used By:        │         │ Used By:        │               │
│   │ • TWC Rewards   │         │ • TAP/VCP/TDP   │               │
│   │ • Sponsor Bonus │         │ • Commissions   │               │
│   │ • Finance Tasks │ ◄─┐     │ • TopUp/Withdraw│               │
│   │ • MemberHealth  │   │     │ • Member Balance│ ◄── CORRECT   │
│   └─────────────────┘   │     └─────────────────┘               │
│                         │                                        │
│                    INCONSISTENT!                                 │
│            Finance reports ≠ Member balances                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Target Architecture (Post-Optimization)

```
┌─────────────────────────────────────────────────────────────────┐
│                    TARGET ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐                                           │
│   │ ECashEntry (V3) │  ◄── Single Source of Truth               │
│   │ accounting/models│                                           │
│   ├─────────────────┤                                           │
│   │ + balance_after │  ◄── Populated on every entry             │
│   │ + proper indexes│                                           │
│   └────────┬────────┘                                           │
│            │                                                     │
│            ▼                                                     │
│   ┌─────────────────┐         ┌─────────────────┐               │
│   │ UserECashBalance│         │ Redis Cache     │               │
│   │ (denormalized)  │         │ (5-min TTL)     │               │
│   ├─────────────────┤         ├─────────────────┤               │
│   │ current_balance │         │ balance:{user}  │               │
│   │ last_updated    │         │ summary:{user}  │               │
│   │ version (lock)  │         └─────────────────┘               │
│   └────────┬────────┘                                           │
│            │                                                     │
│            ▼                                                     │
│   ┌─────────────────────────────────────────────┐               │
│   │              ALL CONSUMERS                   │               │
│   │ • Member Dashboard    • Finance Monitoring   │               │
│   │ • Withdrawal Checks   • Health Calculations  │               │
│   │ • API Endpoints       • Daily Snapshots      │               │
│   └─────────────────────────────────────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Critical Indexes (Week 1)

**Goal:** Improve query performance without schema changes.

### 1.1 Add Missing Composite Indexes

Create migration: `accounting/migrations/0022_ecash_optimization_indexes.py`

```python
from django.db import migrations

class Migration(migrations.Migration):
    atomic = False  # Required for CONCURRENTLY

    dependencies = [
        ('accounting', '0021_alter_ecashentry_ecash_type'),
    ]

    operations = [
        # ECashEntry composite indexes
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
            idx_ecashentry_user_category
            ON accounting_ecashentry(user_id, ecash_category);
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_ecashentry_user_category;"
        ),
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
            idx_ecashentry_user_type
            ON accounting_ecashentry(user_id, ecash_type);
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_ecashentry_user_type;"
        ),
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
            idx_ecashentry_user_timestamp
            ON accounting_ecashentry(user_id, timestamp DESC);
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_ecashentry_user_timestamp;"
        ),

        # ECash (V2) composite indexes
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
            idx_ecash_user_category
            ON ecash_ecash(user_id, ecash_category);
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_ecash_user_category;"
        ),
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
            idx_ecash_user_type
            ON ecash_ecash(user_id, ecash_type);
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_ecash_user_type;"
        ),

        # CashTransaction indexes for finance queries
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
            idx_cashtxn_approved_at
            ON accounting_cashtransaction(approved_at);
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_cashtxn_approved_at;"
        ),
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
            idx_cashtxn_user_status_category
            ON accounting_cashtransaction(user_id, status, category);
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_cashtxn_user_status_category;"
        ),
    ]
```

### 1.2 Expected Impact

| Query Pattern | Before | After |
|--------------|--------|-------|
| `ECashEntry.filter(user, ecash_category)` | Seq Scan | Index Scan |
| `ECashEntry.filter(user).order_by('-timestamp')` | Sort + Scan | Index Only |
| `CashTransaction.filter(user, status, category)` | Seq Scan | Index Scan |

**Estimated improvement:** 5-10x faster for common queries.

---

## Phase 2: Fix Race Condition (Week 1)

**Goal:** Prevent double-spend on withdrawals and transfers.

### 2.1 Current Vulnerable Code

```python
# ecash/views.py - VULNERABLE
available_balance = normalize_display(get_available_v3_ecash(user))  # READ
if gross_amount > available_balance:                                  # CHECK
    return JsonResponse({"success": False, ...})
cash_service.withdraw_request(...)                                    # CREATE
# Two concurrent requests can both pass the check!
```

### 2.2 Fix: Atomic Balance Check with Row Lock

Create new utility: `accounting/utils.py`

```python
from django.db import transaction
from django.db.models import Sum
from decimal import Decimal

def check_and_deduct_balance(user, amount, operation_callback):
    """
    Atomically check balance and perform operation.
    Uses SELECT FOR UPDATE to prevent race conditions.

    Args:
        user: User instance
        amount: Decimal amount to deduct
        operation_callback: Function to call if balance sufficient

    Returns:
        (success: bool, result_or_error: any)
    """
    with transaction.atomic():
        # Lock the user row to prevent concurrent modifications
        from accounts.models import User
        locked_user = User.objects.select_for_update().get(pk=user.pk)

        # Calculate current balance
        from accounting.models import ECashEntry
        current_balance = ECashEntry.objects.filter(
            user=locked_user
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Normalize (credits are negative in DB)
        available = abs(current_balance) if current_balance < 0 else -current_balance

        if amount > available:
            return False, {
                'error': 'Insufficient balance',
                'available': float(available),
                'requested': float(amount)
            }

        # Execute the operation while holding the lock
        result = operation_callback(locked_user)
        return True, result
```

### 2.3 Update Withdrawal View

```python
# api/views/ecash.py - FIXED
from accounting.utils import check_and_deduct_balance

class ProcessWithdrawalAPIView(APIView):
    def post(self, request):
        gross_amount = Decimal(request.data.get('amount'))

        def create_withdrawal(locked_user):
            return cash_service.withdraw_request(
                user=locked_user,
                amount=gross_amount,
                ...
            )

        success, result = check_and_deduct_balance(
            user=request.user,
            amount=gross_amount,
            operation_callback=create_withdrawal
        )

        if not success:
            return Response(result, status=400)

        return Response({'success': True, 'data': result})
```

### 2.4 Files to Update

| File | Function/Class | Change |
|------|---------------|--------|
| `api/views/ecash.py` | `ProcessWithdrawalAPIView` | Use atomic check |
| `api/views/ecash.py` | `ECashTransferAPIView` | Use atomic check |
| `ecash/views.py` | `ecash_withdraw` | Use atomic check |
| `virtual_warehouse/views.py` | VW purchase | Use atomic check |

---

## Phase 3: Balance Caching (Week 2)

**Goal:** Reduce database load by caching balances.

### 3.1 Redis Cache Layer

Create: `ecash/cache.py`

```python
from django.core.cache import cache
from django.db.models import Sum
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

BALANCE_CACHE_TTL = 300  # 5 minutes
SUMMARY_CACHE_TTL = 300  # 5 minutes


def get_cached_balance(user_id):
    """
    Get user's eCash balance with caching.
    Falls back to DB query if cache miss.
    """
    cache_key = f"ecash:balance:{user_id}"

    # Try cache first
    cached = cache.get(cache_key)
    if cached is not None:
        return Decimal(str(cached))

    # Cache miss - query DB
    from accounting.models import ECashEntry
    balance = ECashEntry.objects.filter(
        user_id=user_id
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    # Normalize and cache
    normalized = abs(balance) if balance < 0 else -balance
    cache.set(cache_key, str(normalized), BALANCE_CACHE_TTL)

    return normalized


def invalidate_balance_cache(user_id):
    """Invalidate cache when balance changes."""
    cache_key = f"ecash:balance:{user_id}"
    cache.delete(cache_key)
    logger.debug(f"Invalidated balance cache for user {user_id}")


def get_cached_summary(user_id):
    """
    Get user's eCash summary (credits, topups, withdrawals, payments) with caching.
    """
    cache_key = f"ecash:summary:{user_id}"

    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    from accounting.models import ECashEntry

    # Single query with conditional aggregation
    from django.db.models import Case, When, Value, DecimalField

    summary = ECashEntry.objects.filter(user_id=user_id).aggregate(
        credits=Sum(
            Case(
                When(ecash_category='credit', then='amount'),
                default=Value(0),
                output_field=DecimalField()
            )
        ),
        topups=Sum(
            Case(
                When(ecash_category='topup', then='amount'),
                default=Value(0),
                output_field=DecimalField()
            )
        ),
        withdrawals=Sum(
            Case(
                When(ecash_category='withdrawal', then='amount'),
                default=Value(0),
                output_field=DecimalField()
            )
        ),
        payments=Sum(
            Case(
                When(ecash_category='payment', then='amount'),
                default=Value(0),
                output_field=DecimalField()
            )
        ),
    )

    # Normalize values
    result = {
        'credits': abs(summary['credits'] or 0),
        'topups': abs(summary['topups'] or 0),
        'withdrawals': abs(summary['withdrawals'] or 0),
        'payments': abs(summary['payments'] or 0),
    }

    cache.set(cache_key, result, SUMMARY_CACHE_TTL)
    return result


def invalidate_summary_cache(user_id):
    """Invalidate summary cache when entries change."""
    cache_key = f"ecash:summary:{user_id}"
    cache.delete(cache_key)
```

### 3.2 Hook into Entry Creation

Update: `accounting/utils.py`

```python
def create_ecash_entry(user, cash_transaction, ecash_type, ecash_category, ecash_grouping, amount, description=""):
    with transaction.atomic():
        entry = ECashEntry.objects.create(
            user=user,
            cash_transaction=cash_transaction,
            ecash_type=ecash_type,
            ecash_category=ecash_category,
            ecash_grouping=ecash_grouping,
            amount=amount,
            description=description
        )

        # Invalidate cache
        from ecash.cache import invalidate_balance_cache, invalidate_summary_cache
        invalidate_balance_cache(user.id)
        invalidate_summary_cache(user.id)

        return entry
```

### 3.3 Update Consumers to Use Cache

| File | Current | Updated |
|------|---------|---------|
| `ecash/utils.py` | `get_available_v3_ecash()` | `get_cached_balance()` |
| `ecash/views.py` | 5 separate aggregate queries | `get_cached_summary()` |
| `api/views/ecash.py` | Direct DB queries | Cache functions |

**Expected impact:** 80-90% reduction in balance queries.

---

## Phase 4: Fix N+1 Queries (Week 2)

**Goal:** Reduce queries per page from 75+ to under 10.

### 4.1 ECashEntryService - Batch System Account Loading

Current (22 queries):
```python
def __init__(self, cash_transaction):
    self.cash_in_bank = User.objects.get(username="cash_in_bank")
    self.cash_in_xendit = User.objects.get(username="cash_in_xendit")
    # ... 20 more
```

Fixed (1 query):
```python
# services/ecash_entry_service.py

SYSTEM_ACCOUNTS = [
    "cash_in_bank", "cash_in_xendit", "cash_in_ecash", "cash_in_cod",
    "cash_in_greenium", "ecash_transfer_fee", "ecash_withdrawal_fee",
    "tap_subscription_income", "vcp_sales_income", "tdp_sales_income",
    "live4more", "jntpayable", "lbcpayable", "cashbusinessexpansion",
    "cash_out_bank", "discount", "refund", "rts_fee",
    "shipping_fee_income", "processing_fee_income", "vw_sales_income",
    "actual_shipping_fee"
]

_system_accounts_cache = None

def get_system_accounts():
    global _system_accounts_cache
    if _system_accounts_cache is None:
        accounts = User.objects.filter(
            username__in=SYSTEM_ACCOUNTS
        ).in_bulk(field_name='username')
        _system_accounts_cache = accounts
    return _system_accounts_cache

class ECashEntryService:
    def __init__(self, cash_transaction):
        self.cash_transaction = cash_transaction
        accounts = get_system_accounts()

        self.cash_in_bank = accounts.get("cash_in_bank")
        self.cash_in_xendit = accounts.get("cash_in_xendit")
        # ... etc
```

### 4.2 DataTable Views - Add select_related/prefetch_related

Current (N+1):
```python
ecash_entry_qs = ECashEntry.objects.filter(user=user)
for entry in ecash_entry_qs[start:end]:
    ref = entry.cash_transaction.reference_id  # Query per row!
```

Fixed:
```python
ecash_entry_qs = ECashEntry.objects.filter(
    user=user
).select_related(
    'cash_transaction',
    'cash_transaction__user',
    'cash_transaction__sponsor'
).prefetch_related(
    'cash_transaction__order_transaction'
).order_by('-timestamp')
```

### 4.3 Files to Update

| File | Change |
|------|--------|
| `services/ecash_entry_service.py` | Batch system account loading |
| `ecash/views.py` (DataTable) | Add `select_related` |
| `api/views/ecash.py` (History API) | Add `select_related` |
| `finance/views/ecash.py` | Add `select_related` |

---

## Phase 5: Populate balance_after Field (Week 3)

**Goal:** Enable O(1) balance lookups instead of O(N) aggregation.

### 5.1 Update create_ecash_entry

```python
def create_ecash_entry(user, cash_transaction, ecash_type, ecash_category, ecash_grouping, amount, description=""):
    with transaction.atomic():
        # Lock and get last entry for this user
        last_entry = ECashEntry.objects.filter(
            user=user
        ).select_for_update().order_by('-id').first()

        # Calculate new balance
        if last_entry and last_entry.balance_after is not None:
            new_balance = last_entry.balance_after + Decimal(str(amount))
        else:
            # Fallback: calculate from scratch (only needed for first entry or migration)
            current_total = ECashEntry.objects.filter(
                user=user
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            new_balance = current_total + Decimal(str(amount))

        entry = ECashEntry.objects.create(
            user=user,
            cash_transaction=cash_transaction,
            ecash_type=ecash_type,
            ecash_category=ecash_category,
            ecash_grouping=ecash_grouping,
            amount=amount,
            balance_after=new_balance,  # Now populated!
            description=description
        )

        # Invalidate cache
        from ecash.cache import invalidate_balance_cache, invalidate_summary_cache
        invalidate_balance_cache(user.id)
        invalidate_summary_cache(user.id)

        return entry
```

### 5.2 Backfill Existing Data

Create management command: `accounting/management/commands/backfill_balance_after.py`

```python
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Sum
from accounting.models import ECashEntry
from decimal import Decimal

class Command(BaseCommand):
    help = 'Backfill balance_after field for existing ECashEntry records'

    def add_arguments(self, parser):
        parser.add_argument('--batch-size', type=int, default=1000)
        parser.add_argument('--user-id', type=int, help='Process single user')

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        single_user = options.get('user_id')

        if single_user:
            users = [single_user]
        else:
            users = ECashEntry.objects.values_list(
                'user_id', flat=True
            ).distinct()

        total_users = len(list(users))
        self.stdout.write(f"Processing {total_users} users...")

        for i, user_id in enumerate(users):
            self.process_user(user_id)

            if (i + 1) % 100 == 0:
                self.stdout.write(f"Processed {i + 1}/{total_users} users")

        self.stdout.write(self.style.SUCCESS('Backfill complete!'))

    def process_user(self, user_id):
        entries = ECashEntry.objects.filter(
            user_id=user_id
        ).order_by('id')

        running_balance = Decimal('0')
        updates = []

        for entry in entries:
            running_balance += entry.amount
            entry.balance_after = running_balance
            updates.append(entry)

        # Bulk update
        with transaction.atomic():
            ECashEntry.objects.bulk_update(
                updates,
                ['balance_after'],
                batch_size=500
            )
```

### 5.3 New Balance Lookup (O(1))

```python
def get_balance_fast(user_id):
    """
    O(1) balance lookup using balance_after field.
    Falls back to aggregation if no entries exist.
    """
    last_entry = ECashEntry.objects.filter(
        user_id=user_id
    ).order_by('-id').values('balance_after').first()

    if last_entry and last_entry['balance_after'] is not None:
        balance = last_entry['balance_after']
        # Normalize (credits are negative)
        return abs(balance) if balance < 0 else -balance

    return Decimal('0')
```

---

## Phase 6: Fix Finance Monitoring Integration (Week 3-4)

**Goal:** Make Finance tasks use ECashEntry (V3) instead of ECash (V2).

### 6.1 Current Problem

```python
# finance/tasks.py - Uses V2 (WRONG)
total_ecash = ECash.objects.filter(ecash_category='credit').aggregate(...)

# But members see V3 balance
available = get_available_v3_ecash(user)  # Uses ECashEntry
```

### 6.2 Update FinanceDailySnapshot Task

```python
# finance/tasks.py

@shared_task
def create_daily_finance_snapshot():
    from accounting.models import ECashEntry, CashTransaction

    today = timezone.now().date()

    # Use ECashEntry (V3) for all eCash metrics
    ecash_stats = ECashEntry.objects.aggregate(
        total_balance=Sum('amount'),
        total_credits=Sum(Case(
            When(ecash_category='credit', then='amount'),
            default=Value(0)
        )),
        total_withdrawals=Sum(Case(
            When(ecash_category='withdrawal', then='amount'),
            default=Value(0)
        )),
    )

    # Continue with snapshot creation...
```

### 6.3 Update MemberFinancialHealth Task

Current problem: 413K queries for 59K users.

Fixed approach using bulk aggregation:

```python
# finance/tasks.py

@shared_task
def calculate_member_financial_health():
    from accounting.models import ECashEntry, CashTransaction
    from finance.models import MemberFinancialHealth
    from django.db.models import Count, Sum, Q, F

    ninety_days_ago = timezone.now() - timedelta(days=90)
    thirty_days_ago = timezone.now() - timedelta(days=30)

    # Step 1: Get all balances in ONE query
    balances = dict(
        ECashEntry.objects.values('user_id').annotate(
            total=Sum('amount')
        ).values_list('user_id', 'total')
    )

    # Step 2: Get 90-day withdrawal stats in ONE query
    withdrawal_stats = dict(
        CashTransaction.objects.filter(
            category='withdrawal',
            status='approved',
            approved_at__gte=ninety_days_ago
        ).values('user_id').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).values_list('user_id', flat=False)
    )

    # Step 3: Get 90-day deposit stats in ONE query
    deposit_stats = dict(
        CashTransaction.objects.filter(
            category='topup',
            status='approved',
            approved_at__gte=ninety_days_ago
        ).values('user_id').annotate(
            total=Sum('amount')
        ).values_list('user_id', 'total')
    )

    # Step 4: Get 90-day commission stats in ONE query
    commission_stats = dict(
        ECashEntry.objects.filter(
            ecash_type__in=[
                'affiliate_commission_tap',
                'retail_commission',
                'retail_commission_hybrid',
                'diamond_bonus_tap'
            ],
            timestamp__gte=ninety_days_ago
        ).values('user_id').annotate(
            total=Sum('amount')
        ).values_list('user_id', 'total')
    )

    # Step 5: Build health records
    health_records = []
    for user_id in balances.keys():
        balance = balances.get(user_id, Decimal('0'))
        withdrawals = withdrawal_stats.get(user_id, {})
        deposits = deposit_stats.get(user_id, Decimal('0'))
        commissions = commission_stats.get(user_id, Decimal('0'))

        health = MemberFinancialHealth(
            user_id=user_id,
            current_balance=abs(balance) if balance < 0 else 0,
            total_withdrawals_90d=withdrawals.get('total', 0),
            withdrawal_count_90d=withdrawals.get('count', 0),
            total_deposits_90d=deposits,
            commission_income_90d=abs(commissions) if commissions < 0 else 0,
            # ... calculate health_score
        )
        health_records.append(health)

    # Step 6: Bulk upsert
    MemberFinancialHealth.objects.bulk_create(
        health_records,
        update_conflicts=True,
        update_fields=['current_balance', 'total_withdrawals_90d', ...],
        unique_fields=['user_id']
    )
```

**Query reduction:** 413,000 queries → ~10 queries.

### 6.4 Add V2/V3 Reconciliation Check

```python
# finance/tasks.py

@shared_task
def check_ecash_reconciliation():
    """
    Compare V2 (ECash) and V3 (ECashEntry) totals.
    Log discrepancies for investigation.
    """
    from ecash.models import ECash
    from accounting.models import ECashEntry
    from finance.models import ReconciliationLog

    # Get V2 total (legacy)
    v2_total = ECash.objects.filter(
        ecash_category='credit'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    # Get V3 total (new)
    v3_total = ECashEntry.objects.aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')

    discrepancy = abs(v2_total) - abs(v3_total)

    ReconciliationLog.objects.create(
        recon_type='ecash_v2_v3',
        expected_amount=abs(v2_total),
        actual_amount=abs(v3_total),
        discrepancy=discrepancy,
        status='matched' if abs(discrepancy) < Decimal('0.01') else 'discrepancy',
        notes=f"V2 ECash total: {v2_total}, V3 ECashEntry total: {v3_total}"
    )

    if abs(discrepancy) > Decimal('100'):
        # Alert if discrepancy > ₱100
        from notifications.services import send_notification
        send_notification(
            user=get_finance_admin(),
            template_code='finance_alert',
            context={
                'alert_type': 'V2/V3 Ledger Discrepancy',
                'amount': discrepancy
            }
        )
```

---

## Phase 7: Data Archival Strategy (Week 4+)

**Goal:** Control table growth for long-term scalability.

### 7.1 Archive Policy

| Table | Retention | Archive After |
|-------|-----------|---------------|
| `ECashEntry` | 24 months active | Move to `ECashEntryArchive` |
| `ECash` (V2) | Freeze | No new entries after V1 migration |
| `CashTransaction` | 24 months active | Move to `CashTransactionArchive` |

### 7.2 Archive Table Schema

```python
# accounting/models.py

class ECashEntryArchive(models.Model):
    """
    Archived eCash entries older than 24 months.
    Read-only, used for historical reports only.
    """
    original_id = models.BigIntegerField(db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    cash_transaction_id = models.BigIntegerField(null=True)
    ecash_type = models.CharField(max_length=100)
    ecash_category = models.CharField(max_length=50)
    ecash_grouping = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    description = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(db_index=True)
    archived_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]
```

### 7.3 Monthly Archive Task

```python
@shared_task
def archive_old_ecash_entries():
    """
    Monthly task to archive entries older than 24 months.
    """
    cutoff = timezone.now() - timedelta(days=730)  # 24 months

    # Get entries to archive
    old_entries = ECashEntry.objects.filter(
        timestamp__lt=cutoff
    ).exclude(
        id__in=ECashEntryArchive.objects.values_list('original_id', flat=True)
    )[:10000]  # Batch of 10K

    archives = []
    for entry in old_entries:
        archives.append(ECashEntryArchive(
            original_id=entry.id,
            user_id=entry.user_id,
            cash_transaction_id=entry.cash_transaction_id,
            ecash_type=entry.ecash_type,
            ecash_category=entry.ecash_category,
            ecash_grouping=entry.ecash_grouping,
            amount=entry.amount,
            balance_after=entry.balance_after,
            description=entry.description,
            timestamp=entry.timestamp,
        ))

    with transaction.atomic():
        ECashEntryArchive.objects.bulk_create(archives)
        ECashEntry.objects.filter(
            id__in=[a.original_id for a in archives]
        ).delete()

    logger.info(f"Archived {len(archives)} eCash entries")
```

---

## Implementation Timeline

| Week | Phase | Tasks | Status |
|------|-------|-------|--------|
| 1 | Phase 1 | Add composite indexes | ⏳ Pending |
| 1 | Phase 2 | Fix race condition | ⏳ Pending |
| 2 | Phase 3 | Implement balance caching | ⏳ Pending |
| 2 | Phase 4 | Fix N+1 queries | ⏳ Pending |
| 3 | Phase 5 | Populate balance_after | ⏳ Pending |
| 3-4 | Phase 6 | Fix Finance integration | ⏳ Pending |
| 4+ | Phase 7 | Data archival (optional) | ⏳ Future |

---

## Testing Checklist

### Phase 1-2 Tests
- [ ] Balance query uses new indexes (EXPLAIN ANALYZE)
- [ ] Concurrent withdrawal test (should fail one)
- [ ] Concurrent transfer test (should fail one)

### Phase 3-4 Tests
- [ ] Cache hit rate > 80% in production
- [ ] DataTable loads in < 500ms
- [ ] ECashEntryService init runs 1 query

### Phase 5 Tests
- [ ] balance_after matches SUM(amount) for all users
- [ ] New entries populate balance_after correctly
- [ ] get_balance_fast() returns correct value

### Phase 6 Tests
- [ ] FinanceDailySnapshot uses V3 data
- [ ] MemberFinancialHealth matches member-facing balance
- [ ] Reconciliation task detects discrepancies

---

## Rollback Plan

Each phase can be rolled back independently:

| Phase | Rollback |
|-------|----------|
| 1 | Drop indexes (no data impact) |
| 2 | Revert code changes (feature flag) |
| 3 | Disable cache, fall back to DB |
| 4 | Revert select_related changes |
| 5 | Ignore balance_after, use SUM() |
| 6 | Revert to V2 queries |
| 7 | Restore from archive table |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Balance query time | ~100ms | <10ms |
| Dashboard load queries | 75+ | <10 |
| Daily health task duration | Timeout | <5 min |
| Cache hit rate | 0% | >80% |
| Race condition incidents | Unknown | 0 |

---

## Appendix A: Files to Modify

| File | Changes |
|------|---------|
| `accounting/utils.py` | Atomic balance check, populate balance_after |
| `accounting/migrations/0022_*.py` | New indexes |
| `ecash/cache.py` | New file - caching layer |
| `ecash/utils.py` | Use cache functions |
| `ecash/views.py` | Use cache, add select_related |
| `api/views/ecash.py` | Atomic withdrawals, use cache |
| `services/ecash_entry_service.py` | Batch system account loading |
| `finance/tasks.py` | Bulk aggregation, use V3 |
| `finance/views/ecash.py` | Add select_related |

---

## Appendix B: New Files to Create

| File | Purpose |
|------|---------|
| `ecash/cache.py` | Balance and summary caching |
| `accounting/management/commands/backfill_balance_after.py` | Backfill command |
| `accounting/migrations/0022_ecash_optimization_indexes.py` | Index migration |
| `accounting/models.py` (update) | Add ECashEntryArchive |

---

*Document created: 2026-02-19*
*Last updated: 2026-02-19*
*Author: Development Team*

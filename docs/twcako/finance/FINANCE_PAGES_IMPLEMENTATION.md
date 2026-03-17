# Finance Module - Additional Pages Implementation

**Version:** 1.1
**Date:** 2026-02-17
**Last Updated:** 2026-02-22
**Status:** Implemented (Phase 3 Complete)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Pages Built](#2-pages-built)
3. [Backend API Endpoints](#3-backend-api-endpoints)
4. [Frontend Implementation](#4-frontend-implementation)
5. [Data Flow](#5-data-flow)
6. [Migration Checklist](#6-migration-checklist)
7. [Testing Guide](#7-testing-guide)

---

## 1. Overview

This document covers the additional finance pages built on top of the existing Finance Monitoring Dashboard. These pages provide comprehensive financial management capabilities for the TWCako platform.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     V4 Frontend (Next.js)                        │
│                    http://localhost:3000                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Finance Pages:                                          │    │
│  │  - /finance-monitoring    (Main Dashboard)               │    │
│  │  - /approval-queue        (Approval Management)          │    │
│  │  - /commissions           (Commission Tracking)          │    │
│  │  - /revenue               (Revenue Analytics)            │    │
│  │  - /expenses              (Expense Management)           │    │
│  │  - /assets                (Assets & Petty Cash)          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Django Backend                               │
│               http://api.localhost:8000                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  API Endpoints: /api/finance/*                           │    │
│  │  - 18+ endpoints for finance operations                  │    │
│  │  - Authentication: JWT Bearer token                      │    │
│  │  - Authorization: is_staff OR is_finance role            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Pages Built

### 2.1 Approval Queue (`/approval-queue`)

**Purpose:** Manage pending approvals (payments, withdrawals, top-ups) with SLA tracking.

**Features:**
- Pending approvals table with real-time SLA countdown
- Priority indicators (Normal, High, Urgent)
- Type filtering (Withdrawal, Payment, Top-up, Refund)
- Quick approve/reject actions
- Detail dialog with:
  - Transaction details
  - Member financial health score
  - Recent transaction history
  - Risk flags display
- History tab showing resolved items
- SLA compliance metrics

**Key Components:**
- `ApprovalQueueClient.tsx` - Main page component
- `ApprovalDetailDialog` - Detail/action modal
- `SLAStatus` - SLA countdown chip
- `StatsCard` - KPI summary cards

**Data Sources:**
- `ApprovalQueueItem` model
- `MemberFinancialHealth` model
- `CashTransaction` model

---

### 2.2 Commission Dashboard (`/commissions`)

**Purpose:** Track commission payouts by type and identify top earners.

**Features:**
- Total commission KPI for selected period
- Commission breakdown by type:
  - TAP Commission
  - Diamond Bonus
  - Retail Commission
  - Retail Hybrid
  - Sponsor Profit
  - Founder Bonus
  - RankUp Bonus
- Top 10 earners leaderboard
- Daily commission trend chart
- Period selector (7/30/60/90 days)

**Key Components:**
- `CommissionsClient.tsx` - Main page component
- `CommissionBreakdownCard` - Type breakdown with progress bars
- `TopEarnersCard` - Leaderboard table
- `CommissionTrendChart` - Animated bar chart

**Data Sources:**
- `ECashEntry` model (commission transactions)
- `FinanceDailySnapshot` model (daily aggregates)
- `ECash` model (balances)

---

### 2.3 Revenue Dashboard (`/revenue`)

**Purpose:** Track platform revenue streams and trends.

**Features:**
- Total revenue KPI for selected period
- Revenue breakdown by source:
  - Platform Fees
  - Subscriptions
  - Processing Fees
- Donut chart visualization
- Stacked daily trend chart (by revenue source)
- Daily revenue trend line
- Period selector (7/30/60/90 days)

**Key Components:**
- `RevenueClient.tsx` - Main page component
- `RevenueBreakdownCard` - Source breakdown with donut chart
- `StackedRevenueChart` - Stacked bar chart by source
- `RevenueTrendChart` - Daily trend visualization

**Data Sources:**
- `FinanceDailySnapshot` model (daily revenue aggregates)

---

### 2.4 Operational Expenses (`/expenses`)

**Purpose:** Track business expenses and loan obligations.

**Features:**
- Monthly expense summary
- Expense breakdown by category:
  - Events & Meetings
  - Software Subscriptions
  - Travel & Transport
  - Office & Admin
  - Personnel
  - Marketing
  - Other
- Pending approval count
- Category/status filters
- Active loans tracking with:
  - Current balance
  - Monthly payment
  - Interest rate
- Upcoming loan payments (next 30 days)

**Key Components:**
- `ExpensesClient.tsx` - Main page component
- `CategoryBreakdown` - Expense by category chart
- `ActiveLoansCard` - Loans table
- `LoansDueCard` - Upcoming payments

**Data Sources:**
- `OperationalExpense` model
- `Loan` model
- `LoanPayment` model

---

### 2.5 Assets & Petty Cash (`/assets`)

**Purpose:** Manage company assets and petty cash funds.

**Features:**
- **Assets Tab:**
  - Asset registry table
  - Asset types: Real Estate, Vehicle, Equipment, Investment
  - Purchase price vs current value
  - Location/assignment tracking
  - Status indicators

- **Petty Cash Tab:**
  - Fund cards with balance gauges
  - Replenishment alerts (< 30% threshold)
  - Today's disbursements tracking
  - Daily limit monitoring
  - Transaction history per fund
  - Last reconciliation date

**Key Components:**
- `AssetsClient.tsx` - Main page component
- `PettyCashFundCard` - Fund status card
- `TransactionsTable` - Fund transaction history

**Data Sources:**
- `CompanyAsset` model
- `PettyCashFund` model
- `PettyCashTransaction` model

---

## 3. Backend API Endpoints

### 3.1 New Endpoints Added

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/finance/approval-queue/<id>/` | GET | Get approval item details with member health |
| `/api/finance/approval-queue/<id>/action/` | POST | Perform action (approve/reject/assign/escalate/take) |
| `/api/finance/approval-queue/history/` | GET | Get resolved items with SLA statistics |
| `/api/finance/commissions/` | GET | Get commission breakdown and top earners |
| `/api/finance/revenue/` | GET | Get revenue breakdown and trends |

### 3.1.1 Phase 3 Endpoints (2026-02-22)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/finance/settlements/` | GET | List all supplier settlements |
| `/api/finance/settlements/` | POST | Create new settlement |
| `/api/finance/settlements/<id>/` | GET | Get settlement details |
| `/api/finance/settlements/<id>/action/` | POST | Perform settlement action (submit/dispute/approve/pay) |
| `/api/finance/settlements/calculate/` | POST | Calculate settlement for supplier & period |
| `/api/finance/reports/income-statement/` | GET | Download income statement (PDF/Excel) |
| `/api/finance/reports/expenses/` | GET | Download expense report (PDF/Excel) |
| `/api/finance/reports/assets/` | GET | Download asset register (PDF/Excel) |
| `/api/finance/reports/loan/<id>/` | GET | Download loan schedule (PDF/Excel) |

### 3.2 Existing Endpoints (from Phase 1)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/finance/dashboard/` | GET | Main dashboard metrics |
| `/api/finance/snapshots/` | GET | Historical daily snapshots |
| `/api/finance/alerts/` | GET | Finance alerts list |
| `/api/finance/alerts/<id>/` | GET/POST | Alert detail and actions |
| `/api/finance/approval-queue/` | GET | Pending approvals list |
| `/api/finance/member-health/<username>/` | GET | Member financial health |
| `/api/finance/expenses/` | GET | Operational expenses list |
| `/api/finance/expenses/summary/` | GET | Expenses by category |
| `/api/finance/assets/` | GET | Company assets list |
| `/api/finance/loans/` | GET | Active loans list |
| `/api/finance/loans/due/` | GET | Loans due in 30 days |
| `/api/finance/petty-cash/` | GET | Petty cash dashboard |
| `/api/finance/petty-cash/<id>/transactions/` | GET | Fund transactions |

### 3.3 API Authorization

All finance endpoints require:
```python
# In each view
if not (user.is_staff or user.is_finance or user.username in ['twcfinance', 'evgeronilla']):
    return Response({'detail': 'Finance access required'}, status=403)
```

### 3.4 Approval Action Payload

```json
// POST /api/finance/approval-queue/<id>/action/

// Approve
{ "action": "approve", "notes": "Verified and approved" }

// Reject
{ "action": "reject", "rejection_reason": "insufficient_balance", "notes": "Balance too low" }

// Assign
{ "action": "assign", "assignee": "username" }

// Escalate
{ "action": "escalate" }

// Take (self-assign)
{ "action": "take" }
```

---

## 4. Frontend Implementation

### 4.1 File Structure

```
TWCAKOV4/src/
├── app/
│   ├── api/finance/
│   │   ├── dashboard/route.ts           # Existing
│   │   ├── alerts/route.ts              # Existing
│   │   ├── approval-queue/
│   │   │   ├── route.ts                 # Existing - list
│   │   │   ├── [id]/route.ts            # NEW - detail & actions
│   │   │   └── history/route.ts         # NEW - history
│   │   ├── commissions/route.ts         # NEW
│   │   └── revenue/route.ts             # NEW
│   └── (dashboards)/
│       ├── finance-monitoring/          # Existing
│       ├── approval-queue/              # NEW
│       │   ├── page.tsx
│       │   └── ApprovalQueueClient.tsx
│       ├── commissions/                 # NEW
│       │   ├── page.tsx
│       │   └── CommissionsClient.tsx
│       ├── revenue/                     # NEW
│       │   ├── page.tsx
│       │   └── RevenueClient.tsx
│       ├── expenses/                    # NEW
│       │   ├── page.tsx
│       │   └── ExpensesClient.tsx
│       └── assets/                      # NEW
│           ├── page.tsx
│           └── AssetsClient.tsx
├── hooks/
│   └── useFinance.ts                    # Updated with new hooks
├── types/domain/
│   └── finance.ts                       # Updated with new types
└── config/
    └── menuItems.ts                     # Updated with finance submenu
```

### 4.2 New TypeScript Types

```typescript
// Added to types/domain/finance.ts

// Approval Queue Detail
interface ApprovalQueueDetailResponse {
  item: ApprovalQueueDetailItem;
  member_health: ApprovalMemberHealth | null;
  recent_transactions: RecentTransaction[];
}

// Approval Queue History
interface ApprovalHistoryResponse {
  count: number;
  page: number;
  stats: ApprovalHistoryStats;
  items: ApprovalHistoryItem[];
}

// Commission Dashboard
interface CommissionDashboardResponse {
  period: { days: number; start_date: string; end_date: string };
  total_commission: number;
  breakdown: CommissionBreakdownItem[];
  daily_trend: CommissionDailyTrend[];
  top_earners: CommissionTopEarner[];
}

// Revenue Dashboard
interface RevenueDashboardResponse {
  period: { days: number; start_date: string; end_date: string };
  total_revenue: number;
  breakdown: RevenueBreakdownItem[];
  daily_trend: RevenueDailyTrend[];
}
```

### 4.3 New SWR Hooks

```typescript
// Added to hooks/useFinance.ts

useApprovalQueueDetail(itemId: number | null)
useApprovalQueueHistory(filters?)
useCommissionDashboard(days?: number)
useRevenueDashboard(days?: number)
```

### 4.4 Navigation Menu Update

```typescript
// In config/menuItems.ts

{
  title: "Finance Dashboard",
  icon: "wallet-money-outline",
  href: "/finance-monitoring",
  bgcolor: "primary",
  chip: "New",
  chipColor: "info",
  children: [
    { title: "Overview", href: "/finance-monitoring" },
    { title: "Approval Queue", href: "/approval-queue" },
    { title: "Commissions", href: "/commissions" },
    { title: "Revenue", href: "/revenue" },
    { title: "Expenses", href: "/expenses" },
    { title: "Assets & Petty Cash", href: "/assets" },
  ],
}
```

---

## 5. Data Flow

### 5.1 Approval Action Flow

```
User clicks "Approve" in UI
        │
        ▼
ApprovalQueueClient calls authPostFetcher
        │
        ▼
Next.js API route: POST /api/finance/approval-queue/[id]
        │
        ▼
Django API: POST /api/finance/approval-queue/<id>/action/
        │
        ▼
ApprovalQueueActionAPIView.post()
  ├── Validate user authorization
  ├── Update ApprovalQueueItem status
  ├── Update linked CashTransaction status
  ├── Calculate resolution_time_minutes
  └── Return success response
        │
        ▼
SWR mutate() triggers refresh
        │
        ▼
UI updates with item removed from queue
```

### 5.2 Commission Data Flow

```
CommissionDashboardAPIView.get()
        │
        ├── Query ECashEntry by commission types
        │     - affiliate_commission_tap
        │     - diamond_bonus_tap
        │     - retail_commission
        │     - etc.
        │
        ├── Aggregate by type for breakdown
        │
        ├── Query FinanceDailySnapshot for trends
        │
        └── Query ECash for top earners
        │
        ▼
Return aggregated response
```

---

## 6. Migration Checklist

### 6.1 Backend Migration

- [ ] **Run migrations** (if any new models added)
  ```bash
  python manage.py makemigrations finance
  python manage.py migrate
  ```

- [ ] **Verify API endpoints work**
  ```bash
  # Test with curl or httpie
  curl -H "Authorization: Bearer $TOKEN" \
    http://api.localhost:8000/finance/commissions/
  ```

- [ ] **Seed test data** (optional for testing)
  ```bash
  python manage.py seed_finance_data
  ```

- [ ] **Register admin** (models should already be registered)
  ```bash
  # Verify at http://api.localhost:8000/admin/finance/
  ```

### 6.2 Frontend Migration

- [ ] **Copy new files to V4 project:**
  ```
  src/app/(dashboards)/approval-queue/
  src/app/(dashboards)/commissions/
  src/app/(dashboards)/revenue/
  src/app/(dashboards)/expenses/
  src/app/(dashboards)/assets/
  src/app/api/finance/approval-queue/[id]/route.ts
  src/app/api/finance/approval-queue/history/route.ts
  src/app/api/finance/commissions/route.ts
  src/app/api/finance/revenue/route.ts
  ```

- [ ] **Update existing files:**
  ```
  src/types/domain/finance.ts  (add new types)
  src/hooks/useFinance.ts      (add new hooks)
  src/config/menuItems.ts      (add children to Finance Dashboard)
  ```

- [ ] **Install dependencies** (should already be present)
  ```bash
  npm install framer-motion @mui/material
  ```

- [ ] **Build and test**
  ```bash
  npm run build
  npm run dev
  ```

### 6.3 Environment Variables

Ensure these are set:
```env
# .env.local (Next.js)
DJANGO_API_BASE=http://api.localhost:8000/api

# .env (Django)
# No new variables required
```

### 6.4 User Permissions

Finance pages require users with:
- `is_staff = True` OR
- `is_finance = True` OR
- Username in `['twcfinance', 'evgeronilla']`

To grant finance access to a user:
```python
# In Django shell
from accounts.models import User
user = User.objects.get(username='newfinanceuser')
user.is_finance = True
user.save()
```

---

## 7. Testing Guide

### 7.1 Manual Testing Checklist

**Approval Queue:**
- [ ] View pending approvals list
- [ ] Filter by type (withdrawal, payment, topup)
- [ ] Filter by priority (urgent, high, normal)
- [ ] Search by reference or member
- [ ] Click item to view details
- [ ] Verify member health score displays
- [ ] Quick approve an item
- [ ] Reject an item with reason
- [ ] Switch to History tab
- [ ] Verify SLA compliance stats

**Commissions:**
- [ ] View total commission amount
- [ ] Change period (7/30/60/90 days)
- [ ] Verify breakdown by type
- [ ] Check top earners list
- [ ] Verify trend chart renders

**Revenue:**
- [ ] View total revenue
- [ ] Change period (7/30/60/90 days)
- [ ] Verify donut chart breakdown
- [ ] Check stacked bar chart
- [ ] Verify daily trend

**Expenses:**
- [ ] View monthly total
- [ ] Filter by category
- [ ] Filter by status
- [ ] Switch to Loans tab
- [ ] View active loans
- [ ] View loans due

**Assets & Petty Cash:**
- [ ] View assets list
- [ ] Filter by type
- [ ] Switch to Petty Cash tab
- [ ] View fund balances
- [ ] Click to view transactions
- [ ] Verify replenishment alerts

### 7.2 API Testing

```bash
# Get approval queue
curl -X GET "http://api.localhost:8000/finance/approval-queue/" \
  -H "Authorization: Bearer $TOKEN"

# Approve an item
curl -X POST "http://api.localhost:8000/finance/approval-queue/1/action/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve", "notes": "Test approval"}'

# Get commissions
curl -X GET "http://api.localhost:8000/finance/commissions/?days=30" \
  -H "Authorization: Bearer $TOKEN"

# Get revenue
curl -X GET "http://api.localhost:8000/finance/revenue/?days=30" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 8. Code Review & Audit Log

### Review: 2026-02-22 (Saturday, 10:30 AM PHT)

**Reviewer:** CTO Team
**Scope:** Phase 2 API endpoints and integration with Phase 1

#### Verification Summary

| Component | Status | Notes |
|-----------|--------|-------|
| New API Endpoints (5) | ✅ Complete | Detail, actions, history, commissions, revenue |
| Commission Dashboard | ✅ Verified | Uses ECashEntry (V3) correctly |
| Revenue Dashboard | ✅ Verified | Uses FinanceDailySnapshot |
| Approval Actions | ✅ Functional | approve/reject/assign/escalate/take |
| Authorization | ⚠️ Review | Uses same hardcoded pattern as Phase 1 |

#### Phase 2 Specific Findings

| # | Finding | Status |
|---|---------|--------|
| 1 | Commission API handles negative amounts correctly (V3 stores credits as negative) | ✅ Good |
| 2 | Top earners query orders by ASC to get highest (negative = credit) | ✅ Correct |
| 3 | Approval action updates both `ApprovalQueueItem` AND linked `CashTransaction` | ✅ Good |
| 4 | Resolution time calculated correctly on approve/reject | ✅ Good |
| 5 | Manager approval required for amounts >= PHP 50,000 | ✅ Implemented |

#### Migration Checklist Status

| Item | Status | Notes |
|------|--------|-------|
| Backend migrations | ⏳ Pending | Need to run on Railway |
| API endpoints verified | ✅ Done | Tested locally |
| Frontend files | 📋 Ready | V4 components prepared |
| User permissions | ✅ Documented | `is_staff` or `is_finance` |
| Seed data | ✅ Available | `python manage.py seed_finance_data` |

---

## 9. Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-17 | 1.0 | Initial implementation | Finance Module Team |
| 2026-02-22 | 1.1 | Code review audit, added Section 8 & 9 | CTO Team |
| 2026-02-22 | 1.2 | Phase 3 endpoints (Settlements, Reports), audit trail | CTO Team |

---

## Related Documentation

- [Finance Monitoring Implementation](./FINANCE_MONITORING_IMPLEMENTATION.md) - Phase 1 docs
- [Finance Review Issues](./FINANCE_REVIEW_ISSUES.md) - **Open issues from code review**
- [V4 Finance Monitoring Spec](./V4_FINANCE_MONITORING_SPEC.md) - Full specification
- [V4 Frontend Integration Guide](./V4_FRONTEND_INTEGRATION.md) - Frontend patterns

---

*Document Version: 1.2*
*Created: 2026-02-17*
*Last Updated: 2026-02-22 12:00 PM PHT*
*Author: CTO Team*

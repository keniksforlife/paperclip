# TWCako Affiliate/Distributor System — Current State & Improvements

> Created: 2026-03-02
> Status: In progress (separate dev)

---

## Current System Overview

The affiliate/distributor system is the MLM backbone of TWCako. The backend is largely functional — the main gaps are in the affiliate-facing frontend.

---

## MLM Structure

### Hierarchy
```
Diamond Coach (Team Leader)
  └── Distributor (sponsor)
        └── Affiliate (sponsored member)
              └── Loyal Customer / VIP Customer
```

### Membership Types
| Type | Commission | Can Sponsor? |
|------|-----------|-------------|
| Loyal Customer | None | No |
| VIP Customer | None | No |
| Affiliate | 20% of SRP | Yes |
| Distributor | 27% of SRP (direct) / 7% (from affiliate sale) | Yes |
| Supplier | N/A | No |

### Sponsor Chain
- `TeamMember.sponsor` — direct upline
- `TeamMember.sponsor2` — secondary sponsor (binary structure)
- `TeamMember.team` — assigned Team (led by Diamond Coach)
- `PackageOrder.placement_leg` — left/right leg for binary placement

---

## Commission Calculation

### Product Sales
| Scenario | Affiliate Gets | Distributor Gets | Diamond Gets |
|----------|---------------|-----------------|-------------|
| Affiliate sells (₱1,000 SRP) | ₱200 (20%) | ₱70 (7%) | Bonus (variable) |
| Distributor sells directly | — | ₱270 (27%) | Bonus (variable) |

### Subscription Sales
- Affiliate commission: 30% of subscription price
- Founder allocation: 50% of subscription price

### Commission Types (ECashEntry)
| Active Types | Description |
|-------------|-------------|
| `affiliate_commission_tap` | TAP product affiliate commission |
| `retail_commission` | Retail sales commission |
| `retail_commission_hybrid` | Hybrid retail commission |
| `diamond_bonus_tap` | Diamond/Coach bonuses |
| `distributor_sale` | Direct distributor sales |
| `subscription_income` | Subscription commissions |
| `platform_fee` | Platform fee deductions |

**Discontinued**: `affiliate_commission_vcp`, `affiliate_commission_phdp`, `affiliate_commission_glup`, `affiliate_commission_gldp`, `affiliate_bonus_tap`

---

## Payment & Payout System

### eCash Flow
```
Sale completed
  → CashTransaction created (status: pending)
  → ECashEntry created (type: affiliate_commission_tap, etc.)
  → Finance approves → status: approved
  → eCash available in wallet
  → User requests withdrawal
  → Withdrawal record created (status: pending)
  → Finance approves withdrawal
  → Withdrawal fee applied
  → Disbursed to user's bank account
```

### Refund Handling
- Automatic reversal entries created with `[REFUND]` prefix
- Both CashTransaction and ECashEntry are reversed

---

## Reward Programs
| Program | Description |
|---------|-------------|
| Distributor Moneyback | Moneyback program for distributors |
| Builder Moneyback | Builder-tier moneyback |
| Subscription Bonus | Bonus for subscription sales |
| Sponsoring Bonus | Bonus for recruiting new members |
| RankUp Bonus | Bonus for rank advancement |
| RankUp Express | Accelerated rank-up program |
| Travel Incentive | Travel rewards |
| Retail CashBack | Cashback on retail sales |

Tracked via `TWCRewardClaims` and `TWCRewardMonitoring` models.

---

## Training & Onboarding

### Affiliate Bootcamp (ABC) — 3 Days
- Day 1, Day 2, Day 3 attendance tracking
- Day 3 certificate
- ABC certificate completion

### Distributor Bootcamp (DBC) — 4 Days
- Day 1 through Day 4 attendance tracking
- DBC certificate completion

### Onboarding Status
- `is_affiliate_onboarding` — affiliate onboarding in progress
- `is_distributor_onboarding` — distributor onboarding in progress
- `is_onboarding_call` — onboarding call scheduled/completed

---

## Member Monitoring (Celery Tasks — Running Daily)

| Task | Schedule | Purpose |
|------|----------|---------|
| `calculate_member_kpis` | Daily 3:00 AM | Login counts, sales metrics, funnel metrics, team metrics, engagement score, lifecycle stage |
| `update_login_activity` | On login | Track login events |
| `check_at_risk_members` | Daily | Identify at-risk/dormant members |
| `generate_team_activity_report` | On demand | Team performance reports |
| `reset_monthly_metrics` | 1st of month | Reset monthly counters |
| `capture_daily_snapshots` | Daily | MemberActivitySnapshot + TeamAnalyticsSnapshot |
| `cleanup_old_snapshots` | Periodic | Prune data older than 365 days |

### Lifecycle Stages
```
New → Onboarding → Trained → Active → At Risk → Dormant → Churned
```

---

## Existing API Endpoints

### Member/Affiliate Management
```
GET  /api/account/member/user/                    # List members by type
GET  /api/account/member/user/affiliates/          # List affiliate contacts
POST /api/account/member/user/affiliates/          # Toggle onboarding/training
GET  /api/account/member/user/affiliates/sponsor/  # Sponsor details
POST /api/account/member/user/affiliates/sponsor/  # Update sponsor
```

### Member Monitoring
```
GET  /api/member-activity/                         # User's own activity
GET  /api/member-activity/team/                    # Team member activity
GET  /api/member-activity/follow-up-queue/         # At-risk members
GET  /api/member-activity/dashboard/               # Monitoring dashboard
GET  /api/member-activity/<user_id>/               # Member detail
GET  /api/member-activity/<user_id>/trend/         # Engagement trends
GET  /api/member-activity/analytics/team-trend/    # Team trends
GET  /api/member-activity/analytics/comparison/    # Team comparison
GET  /api/member-activity/analytics/top-performers/ # Top performers
```

### Finance (requires IsFinanceUser)
```
GET  /api/finance/commissions/                     # Commission breakdown
GET  /api/finance/revenue/                         # Revenue dashboard
GET  /api/finance/member-health/<username>/         # Member financial health
```

---

## What's Working Well
- MLM sponsor chain structure
- Commission calculation and recording
- Payment approval workflow
- eCash wallet system
- Withdrawal processing
- Refund handling
- Daily member monitoring with lifecycle stages
- Team analytics snapshots
- Training/bootcamp tracking

## What Needs Improvement

### Frontend (Major Gaps)
- No affiliate earnings/commission dashboard
- No payout history page
- No team/downline tree or list view
- No commission calculator tool
- No commission reports (exportable)
- No binary placement visualization

### Backend
- Commission dashboard API locked behind `IsFinanceUser` — affiliates can't see their own data
- No affiliate-specific commission endpoints
- No bonus automation (sponsoring, rank-up bonuses are manual)
- No bulk payout processing
- No commission forecasting

### Code Cleanup
- ECash V2 and V3 coexist — migration incomplete
- Discontinued commission types still in code
- Some helper endpoints use inconsistent patterns

---

## Key File Locations

| Component | Path |
|-----------|------|
| User & Team Models | `accounts/models.py` |
| Commission Models | `accounting/models.py` |
| Product Commission Config | `shops/models.py` |
| Order Models | `orders/models.py` |
| ECash Models | `ecash/models.py` |
| Member Monitoring Models | `accounts/models.py` (line 1312+) |
| Celery Tasks | `accounts/tasks.py` |
| Reward Models | `twc_reward/models.py` |
| API Views | `api/views/accounts.py`, `api/views/finance_monitoring.py` |
| Frontend (Affiliate) | `TWCAKOV4/src/app/(UserDashboard)/contacts/affiliate/` |
| Frontend (Member Dashboard) | `TWCAKOV4/src/app/(dashboards)/member-monitoring/` |

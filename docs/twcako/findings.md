# Findings & Current State — TWCako Platform

> Consolidated from 50+ docs and loose .txt files. Last synced: 2026-03-03.

---

## Project Overview

TWCako is a Django-based MLM + E-Commerce platform with:
- **59,518 users** across 95 database tables
- **864K** eCash V2 records, **72K** eCash V3 records, **4.66M** prospect profiles
- Multi-tier affiliate system (Diamond Coach -> Distributor -> Affiliate -> Customer)
- 8 reward programs for distributors
- Funnel system for Facebook Ads traffic
- Manager: Ed Geronilla (evgeronilla@twcako.com)

---

## Module Status Summary

### COMPLETE Modules

| Module | Key Stats | Last Updated | Notes |
|--------|-----------|-------------|-------|
| Finance Phases 1-3 | 28 models, 73 endpoints, 11 Celery tasks | 2026-03-02 | Production-ready, needs deployment steps |
| Supplier Phases 1-6 | 11 models, 35 endpoints, 231 products backfilled | 2026-03-03 | All phases complete: Dashboard, Catalog, Inventory, Orders, Settlements, Analytics, Affiliate Commissions |
| Member Monitoring | 2 models, engagement scoring (0-100), 7 lifecycle stages | 2026-02-22 | V3+V4, daily KPI Celery task running |
| Notification Center | 5 models, 18 templates, 4 channels (in-app, push, SMS, email) | 2026-02-15 | Firebase credentials needed in prod |
| Module Switcher | 7 modules, glass-morphic UI, permission-based | 2026-03-01 | Live in V4 |
| Finance Latest Features | Cash Transactions, Auto Journal, Reports, COA updates | 2026-03-02 | WeasyPrint needed for PDF in prod |
| Enterprise Audit (P1) | Gunicorn workers fixed, zero-downtime, Celery concurrency | 2026-02-28 | P2-P4 still pending |

### IN-PROGRESS Modules

| Module | What's Done | What's Remaining | Owner |
|--------|------------|-----------------|-------|
| Affiliate System | Backend mostly working | Frontend gaps: no earnings dashboard, no team tree, no payout history | Separate dev |
| Railway Deployment | 3 core services running (Django, V4, Celery) | Credentials, domains, cleanup unused services | CTO + Sinoy |
| DB Optimization | Phase 1 indexes done locally | Apply to prod, Phase 2-3 pending (large table indexes, archival) | Sinoy |

### COMPLETE: Supplier Module — All Phases (Verified 2026-03-10)

**Supplier Backend Stats:**
- 13 models in `supplier/models.py`
- 45+ API views across: `supplier_dashboard.py` (18), `supplier_orders.py` (11), `supplier_analytics.py` (6), `affiliate_commissions.py` (7), `supplier_settlements.py` (4), `supplier_fulfillment.py` (7), `supplier_ecash.py` (4)
- 15 Celery tasks in `supplier/tasks.py`
- 19 V4 API route directories
- 22 V4 dashboard pages
- 28 SWR hooks in `useSupplier.ts`
- 708 lines TypeScript types in `supplier.ts`

### RECENTLY COMPLETED Modules

| Module | Verified | Notes |
|--------|----------|-------|
| Media Library AI Enhancement | 2026-03-10 | 7 models, 21 views, 6 tasks, 7 V4 pages, 18 hooks — fully implemented |
| Founder Suite (Staff + Audit) | 2026-03-09 | 5 models, 30 views, 12 V4 pages, 12 hooks |
| Supplier Restructure | 2026-03-07 | Parent-branch hierarchy, routing rules, feature gating |

### NOT STARTED Modules

| Module | Estimated Effort | Target | Key Blocker |
|--------|-----------------|--------|-------------|
| eCash Optimization | 7 phases, 4 weeks | ASAP (security risk) | None |
| CI/CD Pipeline | 1-2 weeks | Q1 | GitHub admin access |
| BIR Compliance | TBD | March 2026 (URGENT) | BIR sandbox access |
| Gamification | 6 weeks | Q2 Apr-May | Member Monitoring, Notifications |
| Mobile App | 4 weeks | Q2 May-Jun | V4 frontend stable |
| V1 Migration | 10+ weeks | Q3+ | Many open questions |
| Cloudflare Setup | 1 week | ASAP | Account setup |
| Scaling Strategy | 4 tiers | Pre-launch | Cloudflare first |

---

## Critical Issues (Action Required)

### SECURITY CRITICAL
1. **eCash Double-Spend Vulnerability** — Balance calculated via full table scan; no atomic locking on withdrawals. Race condition allows double-spend.
   - Fix: `SELECT FOR UPDATE` in withdrawal flow
   - Source: `docs/features/ECASH_OPTIMIZATION_PLAN.md`

### PRODUCTION ISSUES (from Mar 1 Test Report)
2. **Permission Inconsistency** — 6 finance endpoints require `IsFinanceUser` but 3 use only `IsAuthenticated`. No users have `is_finance=True` set.
3. **Session Missing Permissions** — Frontend can't check `is_finance`, `is_admin` etc. because session data doesn't include these flags.
4. **Orders API 401** — `/api/orders/active` returns unauthorized.
5. **Typos in Backend** — "LIABILITYS", "EQUITYS" in account type choices.
6. **Media CORS** — Static/media files missing CORS headers.
7. **Dead References** — Vercel analytics script and Segment CDN reference in templates.

### DEPLOYMENT GAPS
8. **Migrations Not Applied** — 0329 (DB indexes), 0003 (Finance Phase 3), 0004 (vendor field) pending on Railway.
9. **COA Not Seeded** — Chart of Accounts (68 accounts) not populated on production.
10. **No Fiscal Periods** — Can't generate journal entries without fiscal year/periods.
11. **WeasyPrint Missing** — PDF report generation won't work without it.

---

## Architecture & Integration Points

### Data Flow
```
Browser -> Cloudflare (CDN/WAF) -> Next.js V4 (API Routes) -> Django Backend -> PostgreSQL
                                                             -> Celery/Redis (async tasks)
                                                             -> S3 (files)
```

### Key Integration Dependencies
```
Notification Center ─── required by ──→ Finance Alerts
                    ─── required by ──→ Member Monitoring Follow-ups
                    ─── required by ──→ Gamification Achievements
                    ─── required by ──→ Supplier Onboarding Alerts

Finance Module ──── required by ──→ Supplier Settlements (Phase 4)
               ──── required by ──→ Affiliate Commission Endpoints
               ──── required by ──→ BIR Compliance

Member Monitoring ── required by ──→ Gamification (activity signals)

V4 Frontend ──── required by ──→ ALL UI features
            ──── required by ──→ Mobile App (shared patterns)

Cloudflare ──── required by ──→ Scaling Strategy
           ──── required by ──→ DDoS Protection (already attacked)
```

### Permission System
```
api/permissions.py:
  - IsFounder        → founder/admin access
  - IsFinanceUser    → finance team access
  - IsFinanceManager → finance manager access
  - IsSupplierUser   → supplier dashboard access
  - IsAuthenticated  → any logged-in user
```

### Subdomain Routing (django-hosts)
```
twcako.com          → Main app
api.twcako.com      → Django REST API
v4.twcako.com       → Next.js V4 frontend
[supplier].twcako.com → Brand storefronts (Phase 7)
```

---

## Financial System Details

### eCash Dual Ledger (V2 vs V3)
| Aspect | V2 (ecash_ecash) | V3 (accounting_ecashentry) |
|--------|-------------------|---------------------------|
| Records | 864,000 | 72,000 |
| Status | Legacy | Source of truth |
| Used by | Some old views | Finance module, new features |
| Issue | Still being read by some code | Missing balance_after field |

### 29+ ECashEntry Transaction Types
Inflows: Member payments, TAP commission, Diamond commission, retail margin, sponsoring bonus, rank-up bonus, builder moneyback, travel incentive, founder share
Outflows: Withdrawals, shipping/logistics, gateway fees, refunds

### Finance Reports Available
1. Income Statement (12-month columnar, tax line items)
2. Balance Sheet (current vs prior period comparison)
3. Cash Flow Statement (budget vs actual)
4. Expense Report
5. Asset Register
6. Trial Balance
7. Loan Schedule
8. Cash Position (daily view)

---

## Supplier System Details

### Two Supplier Types
| Type | Pricing | Approval | Examples |
|------|---------|----------|----------|
| Brand | Fixed by platform | Pre-approved | Sante, Mood, Chingu Trends |
| Independent | Self-set by supplier | Founder approval required | Marketplace sellers |

### Supplier Inventory (as of 2026-03-07)
| ID | Supplier | Role | Products | Status |
|----|----------|------|----------|--------|
| 2 | Sante Valenzuela | Sante branch (NCR) | 118 | Active |
| 6 | Sante CDO | Sante branch (Mindanao) | 0 -> backfill 118 | Active |
| 12 | Live4More | Sante branch (NCR) + fulfillment hub | 0 -> backfill 118 | Active |
| 1 | Chingu Trends | Standalone (bags) | 0 (later) | Active |
| 8 | Mood | Standalone | 109 | Active |
| 11 | TWC Online Store | Freebie container (zero commission) | 4 -> drop | DEACTIVATE |
| 9 | Mandaluyong Hub | Defunct | 0 | DEACTIVATE |
| 7 | MercatusPH | Defunct | 0 | DEACTIVATE |

### Live4More Discovery (2026-03-07)
- Has dedicated Django app: `live4more/` with views, templates, tasks, URLs
- 4 fulfillment views: Package Orders, SNS Redemption, Hub Delivery, BP Encoding
- 2 Celery tasks: `mark_sns_done_task`, `mark_bp_encoded_task`
- `User.is_live4more` permission flag for access control
- Fulfiller key maps to `"mandaluyong_hub"` in `shops/utils.py`
- Order routing: freebie/VW orders -> Live4More, sante orders -> Valenzuela (hardcoded by ID)

### TWC Online Store Discovery (2026-03-07)
- 4 products with `category_1='twc'` — all freebies, zero commission
- `Shop.is_freebie` property checks `category_1 == "twc"`
- Used as premium package bonuses, promotional items
- Will be replaced by `BranchPromotion` model

### Phase Status (Verified 2026-03-10)
- Phase 1: Foundation (10 models, dashboard) — COMPLETE
- Phase 2: Catalog & Inventory (4 pages, backfill) — COMPLETE
- Phase 3: Order Management (8 API views, 4 V4 pages) — COMPLETE (2026-03-03)
- Phase 4: Settlements (4 API views, KPI+table+dialogs) — COMPLETE (2026-03-03)
- Phase 5: Analytics & Reports (6 API views, Recharts dashboard) — COMPLETE (2026-03-03)
- Phase 6: Affiliate Commission Integration (6 API views, dashboard) — COMPLETE (2026-03-03)
- **Supplier Restructure: Parent-Branch Hierarchy — COMPLETE (2026-03-07)**
  - Phase A: Model + Data Foundation — COMPLETE
  - Phase B: Live4More Feature Migration — COMPLETE
  - Phase C: Founders Hub Supplier Management — COMPLETE
  - Phase D: Branch Onboarding Flow — COMPLETE
  - Phase E: Supplier Dashboard Updates — COMPLETE (E1b-E7 all done)
  - Full plan: `docs/supplier/SUPPLIER_RESTRUCTURE_PLAN.md`
- **Spike Theme Redesign — COMPLETE (2026-03-07)**: All 9 supplier pages + dashboard rewritten
- **Brand Storefronts (Phase 7) — IN PROGRESS**: 5 models exist, storefront views partial

---

## Infrastructure Details

### Railway Services (Current)
| Service | Status | Notes |
|---------|--------|-------|
| Django Backend (Gunicorn) | Running | 4 workers (was hardcoded to 1) |
| Next.js V4 Frontend | Running | Standalone mode |
| Celery Worker + Beat | Running | Concurrency increased from 2 |
| PostgreSQL v16 | Running | Warning icon — investigate |
| Redis | Running | Single-node |
| Postgres-uUCs | UNUSED | Delete |
| Redis-XK-o | UNUSED | Delete |

### Object Storage (Updated 2026-03-12)
- **Decision:** Cloudflare R2 replaces Linode Object Storage
- **Status:** Django settings updated, awaiting Cloudflare account setup + file migration
- **Config:** `production.py` uses `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ACCOUNT_ID`, `R2_CUSTOM_DOMAIN`
- **Custom domain:** `assets.twcako.com` (planned)
- **Migration tool:** rclone (Linode → R2)
- **Docs:** `docs/infrastructure/CLOUDFLARE_R2_STORAGE.md`
- **Legacy cleanup needed:** `twcako/aws/conf.py` has hardcoded AWS credentials (SECURITY), `twcako/cdn/` unused

### Missing External Services
- Cloudflare: Not configured (DDoS attacks already detected)
- Sentry: Not configured (no error tracking)
- **~~Linode S3:~~** Replaced by Cloudflare R2 (config ready, awaiting setup)
- SendGrid: API key not set (no email)
- Xendit: Keys not set (no payment processing)
- Firebase: Credentials not set (no push notifications)

### Cost Projections
- Development phase (now): ~$20-30/mo (Railway)
- Launch phase (May 2026+): ~$150-250/mo (Railway + Cloudflare Pro + services)

---

## Team & Process

### Team Structure
| Role | Person | Responsibilities |
|------|--------|-----------------|
| CTO | AI-assisted | Architecture, frontend, mobile, new features, code review |
| Backend Dev | Sinoy | V4 migration (20% remaining), infra, Celery, APIs, DB optimization |
| Manager | Ed Geronilla | Strategic direction |
| Finance Controller | Coach Jaymie | Finance requirements, testing |

### Git Workflow
- `main` → production (Railway auto-deploy)
- `develop` → integration branch
- `feature/*` → CTO features
- `infra/*` → Sinoy infrastructure
- `fix/*` → bug fixes
- Conventional Commits format required
- 1 PR review required

### Communication
- Daily 15-min sync
- Thursday weekly calls
- GitHub PRs for code review

---

## Resources & Key File Paths

### Documentation
- Master docs index: `docs/README.md`
- Finance master index: `docs/finance/FINANCE_MODULE_INDEX.md`
- Supplier master index: `docs/supplier/SUPPLIER_MODULE_INDEX.md`
- V4 executive summary: `docs/v4/V4_SPEC_EXECUTIVE_SUMMARY.md`
- Week-by-week timeline: `docs/v4/V4_IMPLEMENTATION_TIMELINE.md`
- Task delegation: `docs/v4/V4_TASK_DELEGATION.md`

### Key Code Paths
- Finance models: `finance/models.py`
- Finance views: `api/views/finance_*.py`
- Finance tasks: `finance/tasks.py`
- Supplier models: `supplier/models.py`
- Supplier views: `api/views/supplier_views.py`
- Member monitoring: `accounts/models.py` (MemberActivity, MemberActivityLog)
- Notifications: `notifications/` app
- Permissions: `api/permissions.py`
- ECash V3: `accounting/models.py` (ECashEntry)
- ECash V2: `ecash/models.py` (ECash - legacy)
- V4 Frontend: Separate repo (keniksforlife/TWCAKOV4)

### GitHub Repos
- Backend: `Techno-Wealth-Creators/TWCako`
- Frontend V4: `keniksforlife/TWCAKOV4`

---

*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*

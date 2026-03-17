# Task Plan: TWCako Platform — Centralized Master Plan

> Integrated from 50+ docs across `docs/`, loose `.txt` files, and production test reports.
> Last synced: 2026-03-07

## Goal
Build TWCako into a production-ready, scalable MLM + E-Commerce platform supporting 10,000+ DAU with complete Finance, Supplier, Member Monitoring, Notification, Gamification, and Mobile modules — deployed on Railway with Cloudflare edge protection.

## Current Phase
Phase 3 (Week 3 of V4 Implementation Timeline — Finance Monitoring + Member Monitoring enhancements)

## Tech Stack
- **Backend:** Django 3.2, PostgreSQL 16, Celery 5.x, Redis 6+, AWS S3
- **Frontend:** Next.js 16, MUI 7, SWR, next-auth v5, TypeScript
- **Deployment:** Railway (Docker), Cloudflare (CDN/WAF)
- **Team:** CTO (AI-assisted) + Sinoy (backend dev)

---

## Workstream Overview

| # | Workstream | Status | Priority | Docs |
|---|-----------|--------|----------|------|
| 1 | Finance Module (Phases 1-3) | COMPLETE | - | `docs/finance/` (17 docs) |
| 2 | Finance Monitoring (V4 Spec) | NOT STARTED | P0 - This Week | `docs/v4/V4_FINANCE_MONITORING_*` |
| 3 | Supplier Module (Phases 1-4) | COMPLETE | - | `docs/supplier/` (4 docs) |
| 4 | Supplier Module (Phases 5-7) | PLANNED | P1 - Q1 | `docs/planning/SUPPLIER_MODULE_PLAN.md` |
| 5 | Member Monitoring | COMPLETE (backend+V4) | Maintenance | `docs/features/MEMBER_MONITORING_IMPLEMENTATION.md` |
| 6 | Notification Center | COMPLETE (V3+V4) | Needs Prod Setup | `docs/features/NOTIFICATION_CENTER_IMPLEMENTATION.md` |
| 7 | Module Switcher | COMPLETE | - | `docs/features/MODULE_SWITCHER.md` |
| 8 | eCash Optimization | NOT STARTED | P0 - CRITICAL | `docs/features/ECASH_OPTIMIZATION_PLAN.md` |
| 9 | Infrastructure & Scaling | PARTIAL | P1 | `docs/infrastructure/` (9 docs) |
| 10 | CI/CD & GitHub | NOT STARTED | P2 | `docs/infrastructure/GITHUB_SETUP_CHECKLIST.md` |
| 11 | Gamification | PLANNED (Q2) | P3 | `docs/v4/V4_GAMIFICATION_SELLERS_PLAN.md` |
| 12 | Mobile App (Expo) | PLANNED (Q2) | P3 | Timeline only |
| 13 | V1 Migration | DRAFT | P4 | `docs/v4/V1_MIGRATION_STRATEGY.md` |
| 14 | BIR Compliance | PLANNED | P1 - URGENT | `docs/finance/FINANCE_MODULE_ROADMAP.md` |
| 15 | Media Library AI Enhancement | IMPLEMENTED | - | `docs/media-library/MEDIA_LIBRARY_AI_ENHANCEMENT_PLAN.md` |

---

## Phase 1: CRITICAL FIXES (This Week — Mar 3-7)
> Security and production stability items that must be done first.

### 1A: eCash Race Condition Fix (SECURITY CRITICAL)
- [ ] Implement `SELECT FOR UPDATE` in withdrawal flow to prevent double-spend
- [ ] Add composite indexes on eCash tables
- [ ] Test concurrent withdrawal scenario
- **Source:** `docs/features/ECASH_OPTIMIZATION_PLAN.md` Phase 1-2
- **Status:** not_started

### 1B: Production Permission Fixes
- [ ] Grant `is_finance=True` to authorized users via Django admin
- [ ] Standardize finance API permissions (6 endpoints use `IsFinanceUser`, 3 use only `IsAuthenticated`)
- [ ] Include permission flags (`is_finance`, `is_admin`, etc.) in session data response
- [ ] Fix `/api/orders/active` 401 error
- **Source:** `docs/planning/PRODUCTION_TEST_REPORT_2026-03-01.md`
- **Status:** not_started

### 1C: Production Deployment Gaps
- [ ] Apply DB optimization migration 0329 to Railway production
- [ ] Apply Finance Phase 3 migration to production
- [ ] Apply JournalEntry vendor field migration 0004 to production
- [ ] Seed Chart of Accounts (68 accounts) on production
- [ ] Create first fiscal year and periods on production
- [ ] Run production backfill for auto-journal generation
- [ ] Install WeasyPrint on production for PDF reports
- [ ] Fix "LIABILITYS"/"EQUITYS" typos in backend
- **Source:** Multiple finance docs, DB_OPTIMIZATION_MIGRATION.md
- **Status:** not_started

---

## Phase 2: Finance Monitoring System (Mar 3-14 — Weeks 3-4)
> ~85 tasks across 10 sub-phases. See `docs/v4/V4_FINANCE_MONITORING_TASKS.md` for full breakdown.

### 2A: Models & Database (Week 3 Day 3)
- [ ] Create 14 new models (FinanceDailySnapshot, FinanceAlert, ApprovalQueueItem, MemberFinancialHealth, SupplierSettlement, ReconciliationLog, TransactionAuditLog, OperationalExpense, CompanyAsset, Loan, LoanPayment, AssetIncome, PettyCashFund, PettyCashTransaction)
- [ ] Run migrations locally and test
- **Status:** not_started

### 2B: Transaction Signals & Alert Triggers (Week 3 Day 4)
- [ ] Wire Django signals for ECashEntry/CashTransaction events
- [ ] Implement 21 alert types with severity levels
- [ ] Connect to Notification Center
- **Status:** not_started

### 2C: SLA & Anomaly Detection (Week 3 Day 5)
- [ ] Build SLA configuration with 4-72 hour thresholds
- [ ] Implement anomaly detection Celery tasks (velocity spikes, balance draining, cross-account patterns)
- **Status:** not_started

### 2D: Financial Health Scoring (Week 4 Day 1)
- [ ] Implement member financial health score (0-100) with 6 risk flags
- **Status:** not_started

### 2E: 5 Dashboard Views (Week 4 Day 3)
- [ ] Finance Home dashboard (KPIs, cashflow chart, action items)
- [ ] Commission Dashboard (breakdown by type, top 10 earners)
- [ ] Revenue Dashboard (by source, donut chart, stacked bar)
- [ ] Approval Queue (SLA tracking, quick approve/reject)
- [ ] Courier Payable dashboard
- **Status:** not_started

### 2F: Enhanced Approval Workflow (Week 4 Day 4)
- [ ] 3-tier approval authority matrix
- [ ] Implement approval chain with escalation
- **Status:** not_started

### 2G: Reconciliation System (Week 4 Day 5)
- [ ] Bank reconciliation (auto-matching algorithm)
- [ ] Courier reconciliation
- [ ] Xendit payment gateway reconciliation
- **Status:** not_started

### 2H: Automated Reports
- [ ] Daily, weekly, monthly automated report generation
- [ ] PDF/XLSX export for all 7 report types
- **Status:** not_started

### 2I: Ops Expenses, Assets, Petty Cash (Post-Week 4)
- [ ] Operational expense management UI
- [ ] Asset management and tracking
- [ ] Petty cash with controls and reconciliation
- **Status:** not_started

### 2J: Testing & QA
- [ ] >95% SLA compliance verification
- [ ] <2s dashboard load time
- [ ] >99% reconciliation match rate
- **Status:** not_started

---

## Phase 3: Infrastructure Hardening (Mar 10-21)
> Must be done before scaling. See `docs/infrastructure/` for full details.

### 3A: Cloudflare Setup (BLOCKING for scaling)
- [ ] Add twcako.com domain to Cloudflare
- [ ] Upgrade to Pro plan ($20/mo)
- [ ] Configure SSL, DNS records, WAF rules
- [ ] Set cache rules for funnel pages (95%+ cache hit target)
- [ ] Configure rate limiting and DDoS protection
- **Source:** `docs/infrastructure/INFRASTRUCTURE_SETUP_CHECKLIST.md` Phase 1
- **Status:** not_started

### 3B: Cloudflare R2 Object Storage ✅ CONFIG READY (2026-03-12)
- [x] Update `production.py` — R2 storage config (replaces Linode S3)
- [x] Update `local.py` — R2 custom domain support for local dev
- [x] Create documentation: `docs/infrastructure/CLOUDFLARE_R2_STORAGE.md`
- [ ] Create R2 bucket (`twcako-storage`, Asia Pacific region)
- [ ] Enable public access + custom domain (`assets.twcako.com`)
- [ ] Create R2 API token (scoped to bucket)
- [ ] Set R2 env vars on Railway (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ACCOUNT_ID`, `R2_CUSTOM_DOMAIN`)
- [ ] Migrate files from Linode to R2 using rclone
- [ ] Run `collectstatic` on Railway
- [ ] Verify uploads + static/media file serving
- [ ] Remove old Linode env vars
- [ ] Delete legacy `twcako/aws/` and `twcako/cdn/` directories
- [ ] Rotate hardcoded AWS credentials in `twcako/aws/conf.py` (SECURITY)
- **Source:** `docs/infrastructure/CLOUDFLARE_R2_STORAGE.md`
- **Status:** config_ready — awaiting Cloudflare account setup

### 3C: Railway Cleanup & Configuration
- [ ] Delete unused Postgres-uUCs and Redis-XK-o services
- [ ] Set SendGrid API key for email
- [ ] Set Sentry DSN for error tracking
- [ ] Set Xendit keys for payment processing
- [ ] Configure custom domains (twcako.com)
- [ ] Investigate Postgres warning icon
- **Source:** `docs/infrastructure/RAILWAY_DEPLOYMENT_GUIDE.md`
- **Status:** not_started

### 3D: Enterprise Readiness (Priority 2-4)
- [ ] Scale backend/frontend/worker to 2 replicas
- [ ] Configure Sentry error tracking
- [ ] Configure SendGrid email
- [ ] Create staging environment (separate Railway project)
- [ ] Set up uptime monitoring (UptimeRobot) and Slack alerting
- **Source:** `docs/planning/ENTERPRISE_READINESS_AUDIT.md`
- **Status:** not_started (Priority 1 DONE: Gunicorn workers, zero-downtime, Celery concurrency)

### 3D: Database Performance
- [ ] Apply Phase 2 timestamp indexes on large tables (4.66M prospectprofile, 864K ecash)
- [ ] Phase 3: Archive old prospectprofile records (50-70% reduction)
- **Source:** `docs/infrastructure/DB_OPTIMIZATION_REPORT.md`
- **Status:** Phase 1 complete locally, pending production deploy

---

## Phase 4: Supplier Module Phases 5-7 (Mar 21 — Q1 End)
> ~144 hours total across 3 remaining phases. See `docs/planning/SUPPLIER_MODULE_PLAN.md`.

### 4A: Phase 3 — Order Management ✅ COMPLETE (2026-03-03)
- [x] Order list with full lifecycle (pending -> confirmed -> shipped -> delivered)
- [x] Shipping integration and tracking
- [x] Returns/refund workflow
- [x] Inventory auto-reserve on order, auto-deduct on shipment
- **Status:** complete
- **Backend:** `api/views/supplier_orders.py` — 8 views (list, detail, summary, accept, ship, deliver, return, reject)
- **V4 Pages:** `/orders`, `/orders/pending`, `/orders/returns`, `/orders/[id]`

### 4B: Phase 4 — Settlements ✅ COMPLETE (2026-03-03)
- [x] Wire existing settlement Celery task to supplier order data
- [x] Per-order line items in settlement calculation
- [x] Dispute workflow (supplier can dispute, founder resolves)
- [x] Weekly settlement cycle automation
- **Status:** complete
- **Backend:** `api/views/supplier_settlements.py` — 4 views (list, summary, detail, dispute)
- **V4 Pages:** `/settlements` (KPI cards + table + detail/dispute dialogs)
- **Migration:** `finance/migrations/0008_supplier_settlement_fk.py` — supplier_id int → supplier FK

### 4C: Phase 5 — Analytics & Reports ✅ COMPLETE (2026-03-03)
- [x] Backend: `api/views/supplier_analytics.py` — 6 API views (overview, revenue, orders, inventory, export, kpi-history)
- [x] Backend: `supplier/tasks.py` — 4 Celery tasks (snapshot_supplier_kpis, update_inventory_turnover, check_low_stock_alerts, backfill_kpi_history)
- [x] Backend: 6 URL routes in `api/urls.py`
- [x] V4: 6 API route proxies (`/api/supplier/analytics/*`)
- [x] V4: 5 SWR hooks in `useSupplier.ts` (useSupplierAnalytics, useSupplierRevenueAnalytics, useSupplierOrderAnalytics, useSupplierInventoryAnalytics, useSupplierKPIHistory)
- [x] V4: ~150 lines TypeScript types for analytics responses
- [x] V4: Full Analytics Dashboard page with Recharts (revenue trend line chart, order status pie chart, inventory health progress bars, top products table, low stock alerts, slow movers)
- [x] V4: CSV export buttons for 4 report types (overview, revenue, orders, inventory)
- **Status:** complete
- **Files created:**
  - `api/views/supplier_analytics.py` (6 API views, ~450 lines)
  - `supplier/tasks.py` (4 Celery tasks, ~250 lines)
  - `TWCAKOV4/src/app/api/supplier/analytics/route.ts` + 5 subroutes
  - `TWCAKOV4/src/app/(dashboards)/supplier/analytics/AnalyticsDashboardClient.tsx` (~500 lines)

### 4D: Phase 6 — Affiliate Commission Integration ✅ COMPLETE (2026-03-03)
- [x] `AffiliateCommission` model with status tracking (pending/earned/paid/cancelled)
- [x] 5 Celery tasks: process_affiliate_commission_for_order, process_pending_affiliate_commissions, payout_affiliate_commissions, cancel_commission_for_order, recalculate_affiliate_commission
- [x] 6 API views: list, summary, detail, projected earnings, payout history, commission rates
- [x] 6 URL routes: `/api/affiliate/commissions/*`, `/api/affiliate/payouts/`, `/api/affiliate/commission-rates/`
- [x] 6 V4 API route proxies
- [x] `useAffiliate.ts` with 6 SWR hooks
- [x] `types/domain/affiliate.ts` (~130 lines of TypeScript types)
- [x] Full Commission Dashboard at `/supplier/commissions`: KPI cards, earnings trend chart, commission type pie chart, commissions table with filters and detail dialog, commission rates tab
- **Status:** complete
- **Files created:**
  - `supplier/models.py` — added `AffiliateCommission` model
  - `supplier/migrations/0002_affiliate_commission.py`
  - `supplier/tasks.py` — added 5 commission-related tasks
  - `api/views/affiliate_commissions.py` (6 API views, ~350 lines)
  - `TWCAKOV4/src/app/api/affiliate/*` (6 route files)
  - `TWCAKOV4/src/hooks/useAffiliate.ts`
  - `TWCAKOV4/src/types/domain/affiliate.ts`
  - `TWCAKOV4/src/app/(dashboards)/supplier/commissions/AffiliateCommissionDashboard.tsx` (~450 lines)

### 4E: Supplier Restructure — Parent-Branch Hierarchy ✅ COMPLETE
> Full plan: `docs/supplier/SUPPLIER_RESTRUCTURE_PLAN.md`
> Replaces Phase 7 Storefronts as the next supplier priority.

#### Phase A: Model + Data Foundation [status: complete]
- [x] A1: Add `parent_supplier`, `branch_code`, `branch_features`, `is_parent`, `onboarding_status` to Supplier
- [x] A2: Add helper methods (`is_branch`, `display_name`, `branches`, `sibling_branches`, `has_feature`)
- [x] A3: Create `BranchRoutingRule` model in `supplier/models.py`
- [x] A4: Create `BranchPromotion` model in `supplier/models.py`
- [x] A5: Data migration: create Sante parent (ID:14), assign 3 branches, set features/codes
- [x] A6: Backfill CDO + Live4More with 118 sante products each (fresh inventory at 0)
- [x] A7: Deactivate TWC Online Store (ID:11), Mandaluyong Hub (ID:9), MercatusPH (ID:7)
- [x] A8: Drop 4 SupplierProduct records from TWC Online Store
- [x] A9: Refactor `shops/utils.py` `get_order_supplier()` to use BranchRoutingRule + legacy fulfiller key compat

#### Phase B: Live4More Feature Migration [status: complete]
- [x] B1: Refactored all 6 Live4More views to use `_get_supplier_for_user()` instead of hardcoded supplier lookups
- [x] B2: Created `BranchFeatureAccessMixin` + `@require_feature` decorator in `supplier/decorators.py`
- [x] B3: All 6 views now gated by `required_feature` (fulfillment_hub, package_orders, sns_redemption, hub_delivery, bp_encoding)
- [x] B4: URLs unchanged — views still served from `live4more/urls.py` (same paths, new auth logic)
- [x] B5: Copied `mark_sns_done_task` + `mark_bp_encoded_task` to `supplier/tasks.py`, views import from new location
- [x] B6: `User.is_live4more` kept for backwards compat in `_get_supplier_for_user()` but no longer used as auth gate
- [x] B7: `live4more/` app kept as-is (views refactored in place, not duplicated)

#### Phase C: Founders Hub - Supplier Management [status: complete]
- [x] C1: Created `api/views/founders_suppliers.py` with 10 API views / 10 URL endpoints
  - FounderSupplierListAPIView (GET list, POST create standalone)
  - FounderSupplierDetailAPIView (GET detail, PUT update)
  - FounderBranchListAPIView (GET branches, POST add branch)
  - FounderFeatureToggleAPIView (PUT toggle features)
  - FounderKPIRollupAPIView (GET combined KPIs across branches)
  - FounderRoutingRuleListAPIView (GET list, POST create)
  - FounderRoutingRuleDetailAPIView (PUT update, DELETE)
  - FounderRoutingTestAPIView (POST test routing)
  - FounderBranchOnboardAPIView (POST full wizard: user + branch + products + routing)
  - SupplierFeaturesAPIView (GET enabled features for current branch)
- [x] C2: V4 spec created: `docs/supplier/V4_FOUNDERS_SUPPLIER_MANAGEMENT.md` (types, hooks, pages, API proxies)
- [x] C3: V4 page: Supplier & Branch Management (list + detail + expandable parent rows + filter tabs)
- [x] C4: V4 page: Feature Toggle Grid (switch matrix per feature, save to API)
- [x] C5: V4 page: Order Routing Rule Editor with "Test routing" panel (add/edit/delete rules + live test)
- [x] C6: V4 page: Branch KPI Roll-up Dashboard (6 KPI cards + Recharts bar chart + branch breakdown table)

#### Phase D: Branch Onboarding Flow [status: complete]
- [x] D1: Backend onboarding wizard API — `FounderBranchOnboardAPIView` (POST /founders/branches/onboard/)
  - Creates user, supplier/branch, copies products, sets features, creates routing rules — all atomic
  - Supports `onboarding_status` (onboarding -> active) and `activate` flag
- [x] D2: V4 onboarding wizard (6-step MUI Stepper: Basic Info, User Account, Parent/Type, Features, Routing Rules, Review & Activate)
- [x] D3: Validation + activation logic — built into onboard endpoint + supplier detail PUT

#### Phase E: Supplier Dashboard Updates [status: complete]
- [x] E1: Backend: `SupplierFeaturesAPIView` (GET /supplier/features/) returns branch identity + features
- [x] E1b: V4: Branch identity in WelcomeCard header (supplier name + "Sante Branch" chip for branches)
- [x] E2: V4: Feature gating in nav menu (Catalog/Orders/Finance/Analytics gated by branch_features)
- [x] E3: Backend: Promotions CRUD API (GET/POST /supplier/promotions/, PUT/DELETE /supplier/promotions/{id}/) — V4 page in V4 repo
- [x] E4: V4: Customer-facing order display shows parent brand name (SupplierSerializer.display_name)
- [x] E5: **Supplier Dashboard Spike Redesign V2** (2026-03-07) — Full rewrite of `SupplierDashboardClient.tsx` (~1000 lines) using Spike theme patterns
  - Backend: 8 new KPI fields (total_revenue_all_time, in_transit_orders, total_orders, completed_orders, fulfillment_rate, avg_order_value, out_of_stock_items, inventory_value), `top_products` via OrderItems aggregation, `recent_orders` with customer/product names
  - Frontend: WelcomeCard (3 revenue tiers), 6 gradient TopKPICards, RevenueTrendCard (AreaChart + sidebar stats), OrderPipelineCard (BarChart), InventoryHealthCard (PieChart donut), TopProductsCard (avatars + LinearProgress), RecentOrdersCard (5-column table), LowStockAlertsCard
  - Types: `SupplierKPIs` extended (8 new fields), `TopProduct` interface added, `RecentOrder` extended (customer_name, product_name)
  - Bug fixes: OrderItems query (not ProductOrder.product), `customer_profile` FK, `orderitems_set` related_name, 90-day data fallback
- [x] E6: **Supplier Menu Icons** (2026-03-07) — Added Tabler icons to all supplier menu items
  - Fixed 4 broken top-level icon names (`wallet-broken`, `chart-broken`, `settings-broken` -> valid mappings)
  - Added distinct icons to all 15 child menu items (Products, Inventory, Stock History, All Orders, Pending, Returns, Settlements, Commissions, Sales Analytics, Product Performance, Storefront Settings, Members, Subscription, Shop Profile, Bank Details)
  - Updated `DesktopMenuItems.tsx` and `MobileDrawer.tsx` to render Tabler icons for child items (fallback to bullet dot)
- [x] E7: **Supplier Pages Spike Theme Redesign** (2026-03-07) — Full rewrite of all 9 supplier pages using Spike theme patterns
  - Replaced `FinanceKPICard` with Spike gradient TopCards (decorative circles + white text)
  - Replaced `motion.div` + `containerVariants`/`itemVariants` with plain `Box`
  - Replaced `Paper` + `elevatedCardSx` with `Card elevation={0} variant="outlined"` (DashCard)
  - Replaced `tableHeadCellSx` with `Typography variant="subtitle2" fontWeight={600}` + borderless rows
  - All Chips converted to `variant="outlined"` with `borderWidth: 1.5`
  - All buttons use `textTransform: "none"`
  - All business logic and dialogs fully preserved
  - Pages: ProductCatalog, AllOrders, Inventory, StockHistory, Settlements, PendingOrders, Returns, Analytics, Commissions

**Dependencies:** A -> B, A -> C, B -> E, C -> D, A -> E

---

## Phase 5: Affiliate System Frontend (Ongoing)
> Backend mostly functional; frontend has major gaps.

- [ ] Build affiliate earnings/commission dashboard
- [ ] Build payout history page
- [ ] Build team/downline tree view
- [ ] Create affiliate-specific commission endpoints (currently behind `IsFinanceUser`)
- [ ] Automate bonus calculations (sponsoring, rank-up currently manual)
- [ ] Clean up eCash V2/V3 coexistence
- [ ] Add bulk payout processing
- **Source:** `docs/planning/AFFILIATE_SYSTEM_CURRENT_STATE.md`
- **Status:** in_progress (by separate developer)

---

## Phase 6: eCash Full Optimization (Weeks 2-4)
> 7-phase plan to fix performance and security. See `docs/features/ECASH_OPTIMIZATION_PLAN.md`.

- [ ] Phase 1: Composite indexes (Week 1) — moved to Phase 1A above
- [ ] Phase 2: Race condition fix with SELECT FOR UPDATE (Week 1) — moved to Phase 1A above
- [ ] Phase 3: Redis balance caching with 5-min TTL
- [ ] Phase 4: Fix N+1 queries (75+ queries per page) with select_related/batch loading
- [ ] Phase 5: Populate `balance_after` field for O(1) lookups + backfill command
- [ ] Phase 6: Fix Finance Monitoring to use V3 data instead of V2 + reconciliation check
- [ ] Phase 7: Data archival for records >24 months (ECashEntryArchive model)
- **Status:** not_started

---

## Phase 7: CI/CD & Dev Process (Q1)
> See `docs/planning/DEVELOPMENT_PROCESS_SOP.md` and `docs/infrastructure/GITHUB_SETUP_CHECKLIST.md`.

- [ ] Create RAILWAY_TOKEN and add as GitHub secret
- [ ] Set branch protection rules (main + develop require PR approval)
- [ ] Set up CI/CD workflow files (ci.yml, deploy-staging.yml, deploy-production.yml)
- [ ] Create staging Railway project connected to develop branch
- [ ] Set up GitHub environments (staging auto-deploy, production manual approval)
- [ ] Install pre-commit hooks (ruff, bandit, pytest)
- [ ] Configure team permissions (CTO=Admin, Senior=Maintain, Junior=Write)
- **Status:** not_started

---

## Phase 8: BIR Compliance (URGENT — March 2026 deadline)
> See `docs/finance/FINANCE_MODULE_ROADMAP.md` Phase 4.

- [ ] Implement e-invoicing (JSON/XML export)
- [ ] BIR API integration
- [ ] Tax calculations (VAT, income tax)
- [ ] Compliance reports
- [ ] BIR accreditation application
- [ ] BIR sandbox testing
- **Status:** not_started

---

## Phase 9: Gamification System (Q2 — Apr-May)
> Sellers/TAP Affiliates only (separate from TWC Rewards). See `docs/v4/V4_GAMIFICATION_SELLERS_PLAN.md`.

### 9A: Foundation (Weeks 7-8)
- [ ] Create gamification models (XP, Rank, Badge, Streak, PointTransaction)
- [ ] Implement XP earning across 5 categories (daily, sales, funnel, training, referrals)
- [ ] 8 rank levels (Starter to Legend) with XP multipliers
- [ ] Basic XP widget in dashboard
- **Status:** planned

### 9B: Engagement (Weeks 9-10)
- [ ] 3 streak types (Login, Sales, Visitors) with milestones
- [ ] 20+ badges across 6 categories with 5 rarity levels
- [ ] Badge unlock logic and push notifications
- **Status:** planned

### 9C: Social (Weeks 11-12)
- [ ] 5 leaderboard types (weekly/monthly/all-time)
- [ ] Rank-up celebrations
- [ ] Full gamification profile page
- **Status:** planned

### 9D: Advanced (Future)
- [ ] Challenges system
- [ ] Rewards store and XP redemption
- [ ] Mobile integration
- **Status:** planned

---

## Phase 10: Mobile App (Q2 — May-Jun)
> Expo (React Native) for OTA updates. See `docs/v4/V4_IMPLEMENTATION_TIMELINE.md` Weeks 13-16.

- [ ] Set up Expo project structure
- [ ] Core screens (Dashboard, Orders, Profile)
- [ ] Push notifications (FCM)
- [ ] Offline support
- [ ] Beta testing
- **Status:** planned

---

## Phase 11: Performance & Security Hardening (Q2 — Jun)
> See `docs/v4/V4_IMPLEMENTATION_TIMELINE.md` Weeks 17-18.

- [ ] Performance optimization (caching, query optimization, CDN)
- [ ] Security audit (OWASP top 10, penetration testing)
- [ ] Load testing for 10,000+ DAU
- **Status:** planned

---

## Phase 12: V1 Migration (Q3+)
> See `docs/v4/V1_MIGRATION_STRATEGY.md`. Major decisions still pending.

- [ ] Team discussion on open questions (company name, data migration, KYC)
- [ ] Build 6-step Migration Wizard UI
- [ ] Build migration API endpoints (5 endpoints)
- [ ] Create LegacyUserMapping and MigrationECashTransfer models
- [ ] Phased rollout: Internal -> Diamond -> Distributors -> Affiliates -> All (~10 weeks)
- **Status:** draft — pending team discussion

---

## Phase 13: Media Library AI Enhancement ✅ IMPLEMENTED
> See `docs/media-library/MEDIA_LIBRARY_AI_ENHANCEMENT_PLAN.md` for full details.
> **Audit 2026-03-10:** All components exist in codebase.

### What Exists (Verified):
- [x] **7 Django models** in `media_library/models.py`: MediaCategory, Media, AIProviderConfig, UserGenerationQuota, AIGeneratedImage, GenerationHistory, MediaUpload
- [x] **21 API views** in `api/views/media_library.py`: GenerateImageAPIView, MediaListAPIView, AdminProvidersListAPIView, AdminAnalyticsAPIView, + 17 more
- [x] **6 Celery tasks** in `media_library/tasks.py`: generate_ai_image, reset_daily_quotas, reset_monthly_quotas, cleanup_temporary_images, generate_upload_thumbnail, backfill_provider_configs
- [x] **7 V4 pages**: main, gallery, generate, history, uploads, admin/providers, admin/quotas
- [x] **18 SWR hooks** in `useMediaLibrary.ts`
- [x] **388 lines types** in `types/domain/mediaLibrary.ts`
- **Status:** complete

### Remaining Polish (if needed):
- [ ] Verify AI provider API keys configured in production
- [ ] Test end-to-end generation flow with real DALL-E 3 / Stability AI
- [ ] Mobile responsiveness pass
- **Status:** needs_verification

---

## Key Decisions Made

| Decision | Rationale | Source |
|----------|-----------|--------|
| Separate Gamification from TWC Rewards | Gamification for Sellers/Affiliates only; TWC Rewards is for Distributors | V4_GAMIFICATION_SELLERS_PLAN.md |
| Two supplier types (Brand vs Independent) | Brand = fixed pricing; Independent = marketplace with founder approval | SUPPLIER_MODULE_PLAN.md |
| V4 Proxy Pattern (Browser->Next.js->Django) | Clean separation, JWT auth, SWR caching | V4_FRONTEND_INTEGRATION.md |
| Railway + Cloudflare architecture | Railway for compute, Cloudflare for edge/CDN/WAF | INFRASTRUCTURE_PLAN.md |
| Cloudflare R2 over Linode/AWS S3 | Zero egress fees, Manila PoP, integrates with Cloudflare CDN/WAF plan | CLOUDFLARE_R2_STORAGE.md |
| Django 3.2 stays (no upgrade) | Stable, V4 frontend handles modern UI | V4_QUICK_REFERENCE.md |
| Phase 3 finance = double-entry accounting | BIR compliance requirement, proper COA | FINANCE_PHASE3_ADVANCED_ACCOUNTING.md |
| eCash V3 (ECashEntry) is source of truth | V2 (ecash_ecash) legacy, V3 preferred | ECASH_OPTIMIZATION_PLAN.md |
| Multi-provider AI architecture | Flexibility to add new AI providers easily | MEDIA_LIBRARY_AI_ENHANCEMENT_PLAN.md |
| Tiered AI access control | Founders unlimited, admins limited, members browse | MEDIA_LIBRARY_AI_ENHANCEMENT_PLAN.md |
| Expo for mobile (not native) | OTA updates, code sharing with web, faster dev | twc planning.txt |
| Controlled notifications, no member broadcasts | Prevent social media bans | twc planning.txt |
| Parent-branch supplier hierarchy | Sante has 3 branches (Valenzuela, CDO, Live4More), need independent inventory + dashboards | SUPPLIER_RESTRUCTURE_PLAN.md |
| Chingu Trends is standalone supplier | Sells bags etc., not a Sante branch | 2026-03-07 discussion |
| Keep Live4More name | User preference, no rename | 2026-03-07 discussion |
| Drop TWC Online Store freebie products | Replace with BranchPromotion model any supplier can use | 2026-03-07 discussion |
| No multi-branch user for now | Single user per branch | 2026-03-07 discussion |
| Customer-facing shows parent brand name | Internal reporting per branch, customers see "Sante" | 2026-03-07 discussion |
| Region-based routing + founder overrides | Configurable BranchRoutingRule with priority + conditions | 2026-03-07 discussion |
| Self-service branch onboarding wizard | Needed for future expansion, 6-step flow | 2026-03-07 discussion |
| Centralized supplier management in Founders Hub | No parent supplier login needed, managed from founder dashboard | 2026-03-07 discussion |
| Live4More fulfillment features shared via branch_features | Any branch can get fulfillment features enabled by founder | 2026-03-07 discussion |

---

## Open Questions (Need Team Discussion)

| # | Question | Context | Source |
|---|----------|---------|--------|
| 1 | XP-to-eCash conversion rate? | Gamification rewards | V4_GAMIFICATION_SELLERS_PLAN.md |
| 2 | Leaderboard rewards (eCash amounts)? | Weekly/monthly prizes | V4_GAMIFICATION_SELLERS_PLAN.md |
| 3 | New company name for V1 migration? | Rebranding decision | V1_MIGRATION_STRATEGY.md |
| 4 | Prospect data migration default? | Keep vs archive | V1_MIGRATION_STRATEGY.md |
| 5 | Subscription handling during migration? | Supplier plan continuity | V1_MIGRATION_STRATEGY.md |
| 6 | KYC requirements for migration? | Compliance | V1_MIGRATION_STRATEGY.md |
| 7 | Gamification: exclusive perks for ranks? | Rank incentives | V4_GAMIFICATION_SELLERS_PLAN.md |
| 8 | BIR accreditation timeline? | March 2026 deadline | FINANCE_MODULE_ROADMAP.md |

---

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| JWT auth broken in production (V4) | Multiple | Fixed — see RAILWAY_DEPLOYMENT_GUIDE.md issue #7 |
| macOS lockfile vs Linux Docker | 1 | Regenerate lockfile in Docker build |
| NEXT_PUBLIC_ env vars not available at runtime | 1 | Must be set at build time |
| DRF `?format=` conflicts with report exports | 1 | Changed to `?export=` parameter |
| 6 finance endpoints blocked by IsFinanceUser | 1 | Need to grant is_finance=True to users |

---

## Loose .txt Files Status

These root-level `.txt` files contain session transcripts/notes. Their content is now integrated into this plan:

| File | Content | Status |
|------|---------|--------|
| `twc planning.txt` | Strategic planning meeting transcript (Filipino) | Integrated |
| `notes.txt` | Django code snippets/cheat sheet | Reference only |
| `Automated Member Monitoring.txt` | Initial member monitoring implementation session | Superseded by formal docs |
| `member monitoring automation.txt` | V4 auth debugging session | Resolved |
| `notifications feature.txt` | Notification center implementation session | Superseded by formal docs |
| `finance initial.txt` | Initial finance models implementation session | Superseded by formal docs |
| `udpated finance ui.txt` | Finance dashboard UI revamp session | Complete |
| `app switcher.txt` | Coach Jaymie's 6 finance updates session | Partially complete |
| `template-layout.txt` | V3 HTML template reference snippet | Reference only |

---

## Notes
- Re-read this plan before major decisions
- Update phase status as work progresses: not_started -> in_progress -> complete
- Log ALL errors to prevent repetition
- Check `docs/v4/V4_IMPLEMENTATION_TIMELINE.md` for week-by-week schedule
- Check `docs/v4/V4_TASK_DELEGATION.md` for CTO vs Sinoy task split

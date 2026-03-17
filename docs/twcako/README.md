# TWCako Documentation

> Django-based MLM + E-Commerce platform documentation

## Quick Links

| Need to... | Go to |
|------------|-------|
| Deploy to Railway | [infrastructure/RAILWAY_DEPLOYMENT_GUIDE.md](infrastructure/RAILWAY_DEPLOYMENT_GUIDE.md) |
| Understand Finance module | [finance/FINANCE_MODULE_INDEX.md](finance/FINANCE_MODULE_INDEX.md) |
| Understand Supplier module | [supplier/SUPPLIER_MODULE_INDEX.md](supplier/SUPPLIER_MODULE_INDEX.md) |
| Set up local dev | [infrastructure/LOCAL_DATABASE_SETUP.md](infrastructure/LOCAL_DATABASE_SETUP.md) |
| V4 Frontend overview | [v4/V4_SPEC_EXECUTIVE_SUMMARY.md](v4/V4_SPEC_EXECUTIVE_SUMMARY.md) |

---

## Directory Structure

```
docs/
├── finance/          # Finance module (17 docs)
├── supplier/         # Supplier/Merchant module (4 docs)
├── infrastructure/   # Deployment, DB, scaling (9 docs)
├── v4/               # V4 frontend specs & implementation (11 docs)
├── features/         # Feature implementations (4 docs)
└── planning/         # Team planning, supplier plans, affiliate docs (7 docs)
```

---

## Finance (`finance/`)

Core financial management system documentation.

| Document | Description |
|----------|-------------|
| [FINANCE_MODULE_INDEX.md](finance/FINANCE_MODULE_INDEX.md) | **Start here** - Master index |
| [FINANCE_API_REFERENCE.md](finance/FINANCE_API_REFERENCE.md) | All 73 API endpoints |
| [FINANCE_DATABASE_MODELS.md](finance/FINANCE_DATABASE_MODELS.md) | All 28 database models |
| [FINANCE_DASHBOARD_V4.md](finance/FINANCE_DASHBOARD_V4.md) | V4 Dashboard UI components |
| [FINANCE_DEPLOYMENT_GUIDE.md](finance/FINANCE_DEPLOYMENT_GUIDE.md) | Production deployment |
| [FINANCE_LATEST_FEATURES.md](finance/FINANCE_LATEST_FEATURES.md) | Recent feature updates |
| [FINANCE_MODULE_ROADMAP.md](finance/FINANCE_MODULE_ROADMAP.md) | Gap analysis & future plans |

### Implementation Docs
| Document | Description |
|----------|-------------|
| [FINANCE_MONITORING_IMPLEMENTATION.md](finance/FINANCE_MONITORING_IMPLEMENTATION.md) | Phase 1: Monitoring |
| [FINANCE_CRUD_IMPLEMENTATION.md](finance/FINANCE_CRUD_IMPLEMENTATION.md) | Phase 1: CRUD operations |
| [FINANCE_PHASE2_IMPLEMENTATION.md](finance/FINANCE_PHASE2_IMPLEMENTATION.md) | Phase 2: Enhanced workflows |
| [FINANCE_PHASE3_ADVANCED_ACCOUNTING.md](finance/FINANCE_PHASE3_ADVANCED_ACCOUNTING.md) | Phase 3: Backend |
| [FINANCE_PHASE3_V4_FRONTEND.md](finance/FINANCE_PHASE3_V4_FRONTEND.md) | Phase 3: Frontend |
| [FINANCE_PAGES_IMPLEMENTATION.md](finance/FINANCE_PAGES_IMPLEMENTATION.md) | V4 page components |

### Other
| Document | Description |
|----------|-------------|
| [FINANCE_CODE_QUALITY_REPORT.md](finance/FINANCE_CODE_QUALITY_REPORT.md) | Build verification |
| [FINANCE_REVIEW_ISSUES.md](finance/FINANCE_REVIEW_ISSUES.md) | Known issues |
| [FINANCE_JAYMIE_UPDATES.md](finance/FINANCE_JAYMIE_UPDATES.md) | Jaymie's update notes |
| [JOURNAL_AUTO_GENERATION.md](finance/JOURNAL_AUTO_GENERATION.md) | Auto journal entries |

---

## Supplier (`supplier/`)

Merchant/Supplier management system — marketplace, inventory, orders, settlements, and B2B storefronts. **Phase 1 (Foundation) + Phase 2 (Catalog & Inventory) complete.**

| Document | Description |
|----------|-------------|
| [SUPPLIER_MODULE_INDEX.md](supplier/SUPPLIER_MODULE_INDEX.md) | **Start here** - Master index (Phase 1 + 2 complete) |
| [SUPPLIER_DATABASE_MODELS.md](supplier/SUPPLIER_DATABASE_MODELS.md) | All 10 models + 3 modifications |
| [SUPPLIER_API_REFERENCE.md](supplier/SUPPLIER_API_REFERENCE.md) | All 17 API endpoints |
| [SUPPLIER_V4_FRONTEND.md](supplier/SUPPLIER_V4_FRONTEND.md) | 16 V4 pages, 9 hooks, 8 API routes |

### Planning Docs
| Document | Description |
|----------|-------------|
| [SUPPLIER_MODULE_PLAN.md](planning/SUPPLIER_MODULE_PLAN.md) | Full technical plan (7 phases) |
| [SUPPLIER_MODULE_BUSINESS_PLAN.md](planning/SUPPLIER_MODULE_BUSINESS_PLAN.md) | Non-technical business overview |
| [AFFILIATE_SYSTEM_CURRENT_STATE.md](planning/AFFILIATE_SYSTEM_CURRENT_STATE.md) | Existing affiliate system analysis |

---

## Infrastructure (`infrastructure/`)

Deployment, database, and scaling documentation.

| Document | Description |
|----------|-------------|
| [RAILWAY_DEPLOYMENT_GUIDE.md](infrastructure/RAILWAY_DEPLOYMENT_GUIDE.md) | **Primary** - Railway/Docker setup |
| [LOCAL_DATABASE_SETUP.md](infrastructure/LOCAL_DATABASE_SETUP.md) | Local PostgreSQL setup |
| [DATABASE_SYNC_GUIDE.md](infrastructure/DATABASE_SYNC_GUIDE.md) | Sync prod/local DBs |
| [DB_OPTIMIZATION_REPORT.md](infrastructure/DB_OPTIMIZATION_REPORT.md) | DB performance analysis |
| [DB_OPTIMIZATION_MIGRATION.md](infrastructure/DB_OPTIMIZATION_MIGRATION.md) | Optimization migrations |
| [SCALING_STRATEGY.md](infrastructure/SCALING_STRATEGY.md) | Horizontal scaling plan |
| [INFRASTRUCTURE_PLAN.md](infrastructure/INFRASTRUCTURE_PLAN.md) | Full infra architecture |
| [INFRASTRUCTURE_SETUP_CHECKLIST.md](infrastructure/INFRASTRUCTURE_SETUP_CHECKLIST.md) | Setup checklist |
| [GITHUB_SETUP_CHECKLIST.md](infrastructure/GITHUB_SETUP_CHECKLIST.md) | GitHub repo setup |

---

## V4 Frontend (`v4/`)

Next.js 16 + MUI 7 frontend specifications and implementation.

| Document | Description |
|----------|-------------|
| [V4_SPEC_EXECUTIVE_SUMMARY.md](v4/V4_SPEC_EXECUTIVE_SUMMARY.md) | **Start here** - Overview |
| [V4_FRONTEND_INTEGRATION.md](v4/V4_FRONTEND_INTEGRATION.md) | V4 + Django integration |
| [V4_QUICK_REFERENCE.md](v4/V4_QUICK_REFERENCE.md) | Quick reference guide |
| [V4_IMPLEMENTATION_TIMELINE.md](v4/V4_IMPLEMENTATION_TIMELINE.md) | Implementation schedule |
| [V4_TASK_DELEGATION.md](v4/V4_TASK_DELEGATION.md) | Task assignments |
| [V1_MIGRATION_STRATEGY.md](v4/V1_MIGRATION_STRATEGY.md) | V1 to V4 migration |

### Feature Specs
| Document | Description |
|----------|-------------|
| [V4_FINANCE_MONITORING_SPEC.md](v4/V4_FINANCE_MONITORING_SPEC.md) | Finance monitoring spec |
| [V4_FINANCE_MONITORING_TASKS.md](v4/V4_FINANCE_MONITORING_TASKS.md) | Finance monitoring tasks |
| [V4_MEMBER_MONITORING_AND_SUPPLIER_SPEC.md](v4/V4_MEMBER_MONITORING_AND_SUPPLIER_SPEC.md) | Member monitoring spec |
| [V4_GAMIFICATION_SELLERS_PLAN.md](v4/V4_GAMIFICATION_SELLERS_PLAN.md) | Gamification plan |
| [V4_GAMIFICATION_INTEGRATION.md](v4/V4_GAMIFICATION_INTEGRATION.md) | Gamification integration |

---

## Features (`features/`)

Standalone feature implementation documentation.

| Document | Description |
|----------|-------------|
| [NOTIFICATION_CENTER_IMPLEMENTATION.md](features/NOTIFICATION_CENTER_IMPLEMENTATION.md) | Notification system |
| [MEMBER_MONITORING_IMPLEMENTATION.md](features/MEMBER_MONITORING_IMPLEMENTATION.md) | Member analytics & monitoring |
| [MODULE_SWITCHER.md](features/MODULE_SWITCHER.md) | Dashboard module switcher |
| [ECASH_OPTIMIZATION_PLAN.md](features/ECASH_OPTIMIZATION_PLAN.md) | E-cash optimization |

---

## Planning (`planning/`)

Team meetings, audits, module plans, and process documentation.

| Document | Description |
|----------|-------------|
| [DEVELOPMENT_PROCESS_SOP.md](planning/DEVELOPMENT_PROCESS_SOP.md) | CI/CD, git workflow |
| [CTO_TEAM_MEETING_AGENDA.md](planning/CTO_TEAM_MEETING_AGENDA.md) | Team meeting notes |
| [ENTERPRISE_READINESS_AUDIT.md](planning/ENTERPRISE_READINESS_AUDIT.md) | Enterprise audit |
| [PRODUCTION_TEST_REPORT_2026-03-01.md](planning/PRODUCTION_TEST_REPORT_2026-03-01.md) | Latest test report |
| [SUPPLIER_MODULE_PLAN.md](planning/SUPPLIER_MODULE_PLAN.md) | Supplier module technical plan |
| [SUPPLIER_MODULE_BUSINESS_PLAN.md](planning/SUPPLIER_MODULE_BUSINESS_PLAN.md) | Supplier module business overview |
| [AFFILIATE_SYSTEM_CURRENT_STATE.md](planning/AFFILIATE_SYSTEM_CURRENT_STATE.md) | Affiliate system current state & improvements |

---

## Tech Stack

- **Backend:** Django 3.2, PostgreSQL, Celery, Redis, AWS S3
- **Frontend:** Next.js 16, MUI 7, SWR, next-auth v5
- **Deployment:** Railway (Docker)

## Contact

Manager: Ed Geronilla (evgeronilla@twcako.com)

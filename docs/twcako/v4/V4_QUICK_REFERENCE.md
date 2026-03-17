# TWCako V4 Quick Reference Guide
## CTO Onboarding Summary

**Created:** 2026-02-14
**For:** New CTO Reference

---

## Project Overview

| Item | Details |
|------|---------|
| **Project** | TWCako - MLM + E-Commerce Platform |
| **Current Version** | V3 (V4 migration 80% complete) |
| **Stack** | Django 3.2, PostgreSQL, Celery, Redis, AWS S3 |
| **Multi-tenant** | django-hosts for subdomain routing |
| **Team** | CTO (You) + Sinoy (Backend Dev) |

---

## V4 Priority Features

### Q1 2026 (Feb 17 - Mar 31)

| # | Feature | Status |
|---|---------|--------|
| 1 | Infrastructure Setup | Planned |
| 2 | Notification Center | Planned |
| 3 | Member Monitoring System | Planned |
| 4 | Supplier Process Management | Planned |

### Q2 2026 (Apr 1 - Jun 30)

| # | Feature | Status |
|---|---------|--------|
| 5 | Gamification System (Sellers Only) | Planned |
| 6 | Mobile App (Expo) | Planned |
| 7 | Performance Optimization | Planned |
| 8 | Security Hardening | Planned |

---

## Task Split Summary

### You (CTO Team)

```
✓ Architecture & System Design
✓ New Models & Services (AI-accelerated)
✓ Frontend / UI Components
✓ Mobile App Development
✓ Documentation & Specs
✓ Code Review & QA
✓ Security Audit
```

### Sinoy (Existing Dev)

```
✓ Finish V4 Migration (20% remaining)
✓ Infrastructure (Cloudflare, staging, CI/CD)
✓ Celery Tasks (background jobs)
✓ API Endpoints
✓ Database & Performance
✓ Integrations (SMS, Email, Push backend)
✓ Data Migrations & Backfills
```

---

## Week 1 Kickoff (Feb 17-21)

### Your Tasks

| Task | Est. Time |
|------|-----------|
| Sync with Sinoy on V4 status | 1h |
| Create Firebase project for FCM | 1h |
| Security audit of codebase | 4h |
| Document infrastructure requirements | 2h |
| Set up dev environment with AI tools | 2h |
| Design notification models | 2h |

### Sinoy's Tasks

| Task | Est. Time |
|------|-----------|
| Brief CTO on V4 migration status | 1h |
| Finish remaining V4 migration | 8h |
| Set up Cloudflare account | 2h |
| Configure DNS + SSL | 2h |
| Enable DDoS protection | 1h |
| Set up staging environment | 4h |
| Configure Sentry monitoring | 2h |

---

## Key Technical Decisions Made

| Decision | Choice |
|----------|--------|
| SMS Follow-ups | System Automated |
| Supplier Testing | 10 orders minimum |
| Notification Channels | In-app + Push (FCM) + SMS + Email |
| Push Service | Firebase Cloud Messaging |
| Gamification Target | Sellers/Affiliates ONLY (not Distributors) |
| Gamification Rewards | TBD - Team discussion needed |
| Competition Style | Individual Rankings |
| Mobile Framework | Expo (React Native) |

---

## Notification Channels

| Channel | Desktop | Android | iOS |
|---------|---------|---------|-----|
| In-App | ✅ | ✅ | ✅ |
| Browser Push | ✅ | ✅ | ❌ |
| SMS | ✅ | ✅ | ✅ |
| Email | ✅ | ✅ | ✅ |

**Note:** iOS Safari does not support web push. SMS is the fallback until native app is built.

---

## Member Lifecycle Stages

| Stage | Days Inactive | Action |
|-------|---------------|--------|
| New | 0-7 | Welcome sequence |
| Onboarding | Any (ABC incomplete) | Training reminders |
| Trained | Any (no sales) | Sales coaching |
| Active | 0-13 | Maintain engagement |
| At Risk | 14-29 | Urgent SMS follow-up |
| Dormant | 30-59 | Re-engagement campaign |
| Churned | 60+ | Win-back or archive |

---

## Supplier Onboarding Flow

```
Draft → Application → Document Review → Testing (10 orders) → Approved
                              ↓                    ↓
                          Rejected            <80% = Rejected
```

---

## Gamification Structure (Sellers/Affiliates Only)

**Note:** Gamification is for Sellers/TAP Affiliates. Distributors already have TWC Rewards.

### Ranks

| Level | Name | XP Required | Total XP | Perks |
|-------|------|-------------|----------|-------|
| 1 | Starter | 0 | 0 | Basic access |
| 2 | Bronze | 250 | 250 | Profile badge |
| 3 | Silver | 500 | 750 | Leaderboard eligible |
| 4 | Gold | 1,000 | 1,750 | XP multiplier 1.1x |
| 5 | Platinum | 2,000 | 3,750 | XP multiplier 1.15x |
| 6 | Diamond | 3,500 | 7,250 | XP multiplier 1.2x |
| 7 | Elite | 5,000 | 12,250 | XP multiplier 1.25x |
| 8 | Legend | 10,000 | 22,250 | XP multiplier 1.5x |

**Rewards (TBD):** eCash conversion rates to be discussed with team.

### XP Values (Key Activities)

| Activity | XP |
|----------|-----|
| Daily login | 5 |
| Make a sale | 10 |
| Sale > ₱1,000 | 25 |
| Sale > ₱5,000 | 50 |
| Complete ABC | 300 (total) |
| Refer new seller | 50 |
| 7-day login streak | 25 |
| 30-day login streak | 100 |

---

## Infrastructure Requirements

| Component | Service | Purpose |
|-----------|---------|---------|
| CDN/DDoS | Cloudflare | Protection + caching |
| Push Notifications | Firebase (FCM) | Browser + mobile push |
| Email | SendGrid | Transactional email |
| SMS | TWC SMS API | Existing system |
| Monitoring | Sentry | Error tracking |
| Staging | Linode (mirror) | Testing environment |

---

## Git Workflow

```
main (production)
  └── staging (testing)
        └── develop (integration)
              ├── feature/* (your branches)
              ├── infra/* (Sinoy's branches)
              └── fix/* (bug fixes)
```

---

## Key Contacts

| Role | Name | Email |
|------|------|-------|
| Manager | Ed Geronilla | evgeronilla@twcako.com |
| Support | - | support@twcako.com |

---

## Documents Created

| Document | Purpose |
|----------|---------|
| `V4_MEMBER_MONITORING_AND_SUPPLIER_SPEC.md` | Full technical spec with code |
| `V4_SPEC_EXECUTIVE_SUMMARY.md` | Business-friendly spec (no code) |
| `V4_IMPLEMENTATION_TIMELINE.md` | Week-by-week schedule |
| `V4_TASK_DELEGATION.md` | CTO vs Sinoy task split |
| `V4_GAMIFICATION_SELLERS_PLAN.md` | Gamification for Sellers (XP, badges, ranks) |
| `V4_GAMIFICATION_INTEGRATION.md` | Integration with existing TWC Rewards |
| `V4_QUICK_REFERENCE.md` | This summary document |

---

## Quick Commands

### Run Development Server
```bash
python manage.py runserver
```

### Run Celery Worker
```bash
celery -A twcako worker -l info
```

### Run Celery Beat (Scheduler)
```bash
celery -A twcako beat -l info
```

### Create Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

---

## Next Steps (Monday Feb 17)

1. [ ] Meet with Sinoy - V4 migration status
2. [ ] Set up Firebase project
3. [ ] Security audit of codebase
4. [ ] Create feature branch structure
5. [ ] Start notification center development

---

*Quick Reference v1.0 - Created 2026-02-14*

# TWCako Enterprise Readiness Audit

**Date:** 2026-02-28
**Author:** CTO
**Status:** Priority 1 Complete
**Railway Project:** twcako-production (Techno Wealth Creators workspace)

---

## Executive Summary

This document audits the current Railway infrastructure for enterprise-readiness and heavy load capacity. It identifies critical gaps and provides an action plan to ensure the platform can handle 10,000+ daily active users and Facebook Ad campaign traffic spikes.

### Current Domain
- **Backend API:** `api.twctechwarriors.com` (temporary, env-driven)
- **Frontend Dashboard:** `dashboard.twctechwarriors.com` (temporary, env-driven)

---

## Current Infrastructure State

### Services Overview

| Service | Service ID | Replicas | Status |
|---------|-----------|----------|--------|
| TWCako Backend | `fcfb9f91-24d5-4896-8d25-8970cf590358` | 1 | ✅ Running |
| TWCako Frontend | `5fa37afb-208b-4c81-ab49-540dc19c0111` | 1 | ✅ Running |
| TWCako-Worker | `cf6feaec-4097-4cf7-8b10-263261072d5d` | 1 | ✅ Running |
| Postgres-YIRB | `1b0f2fe3-36e1-4e5c-9094-bc9a2bbb001e` | 1 | ✅ Running |
| Redis-dAaP | `7a99d2b4-73ae-4bef-9df7-4f77279193a5` | 1 | ✅ Running |

### Current Capacity (Single Replica) - UPDATED 2026-02-28

| Service | Workers/Processes | Concurrent Capacity | Status |
|---------|-------------------|---------------------|--------|
| Backend | 3 Gunicorn workers x 4 threads | ~48 connections | ✅ Fixed |
| Frontend | 1 Node.js process | ~100 connections | ⚠️ Scale replicas for more |
| Worker | 4 Celery workers | ~4 tasks/second | ✅ Fixed |

---

## Critical Issues

### Issue 1: Gunicorn Hardcoded to 1 Worker

**Location:** `scripts/start.py` lines 74-83

**Current Code:**
```python
os.execvp('gunicorn', [
    'gunicorn',
    'twcako.wsgi:application',
    '--bind', f'0.0.0.0:{port}',
    '--workers', '1',           # ❌ HARDCODED - ignores gunicorn.conf.py
    '--timeout', '120',
    '--log-level', 'info',
    '--access-logfile', '-',
    '--error-logfile', '-',
])
```

**Problem:** The startup script bypasses `gunicorn.conf.py` which has proper production settings (3 workers, 4 threads each).

**Impact:**
- Only 16 concurrent connections per replica
- Single point of failure within the process
- Cannot utilize available CPU/memory

**Fix:** Use the existing `gunicorn.conf.py`:
```python
os.execvp('gunicorn', [
    'gunicorn',
    'twcako.wsgi:application',
    '-c', 'gunicorn.conf.py',
])
```

**Status:** 🔴 Critical - Must fix

---

### Issue 2: No Zero-Downtime Deployment Configuration

**Missing Environment Variables:**
```bash
RAILWAY_DEPLOYMENT_OVERLAP_SECONDS=30    # Keep old deployment running during switch
RAILWAY_DEPLOYMENT_DRAINING_SECONDS=30   # Grace period for shutdown
```

**Impact:** Brief downtime during each deployment as old container stops before new one is ready.

**Status:** 🔴 Critical - Must fix

---

### Issue 3: Celery Concurrency Too Low

**Location:** `scripts/start_worker.py` line 85

**Current:** `--concurrency=2`

**Problem:** Only 2 parallel task workers. During peak:
- Notification queue backs up
- Finance calculations delayed
- Member KPI updates slow

**Fix:** Make configurable via environment variable:
```python
concurrency = os.environ.get('CELERY_CONCURRENCY', '4')
```

**Status:** 🟡 High Priority

---

### Issue 4: No Horizontal Scaling (Single Replicas)

**Current `railway.json`:**
```json
{
  "deploy": {
    "numReplicas": 1
  }
}
```

**Impact:**
- No load distribution
- Single point of failure
- Cannot handle traffic spikes

**Target for Launch:**
| Service | Dev Phase | Launch | FB Campaign |
|---------|-----------|--------|-------------|
| Backend | 1 | 2 | 4-6 |
| Frontend | 1 | 2 | 2-3 |
| Worker | 1 | 2 | 3 |

**Status:** 🟡 Scale before launch

---

## Missing Enterprise Features

### Error Tracking (Sentry)

**Status:** ❌ Not configured

**Required Env Vars:**
```bash
SENTRY_DSN=https://xxx@sentry.io/xxx
```

**Impact:** No visibility into production errors. Debugging requires manual log analysis.

---

### Object Storage (S3/Linode)

**Status:** ❌ Not configured (using local filesystem fallback)

**Required Env Vars:**
```bash
LINODE_BUCKET_ACCESS_KEY=xxx
LINODE_BUCKET_SECRET_KEY=xxx
AWS_STORAGE_BUCKET_NAME=twcako-media
AWS_S3_REGION_NAME=ap-southeast-1
```

**Impact:**
- Static files not CDN-cached
- Media uploads not persistent across deploys
- Increased container storage usage

---

### Email Service (SendGrid)

**Status:** ❌ Not configured

**Required Env Var:**
```bash
SENDGRID_API_KEY=SG.xxx
```

**Impact:** No transactional emails (password reset, notifications, etc.)

---

### Staging Environment

**Status:** ❌ Not created

**Required:** Separate Railway project `twcako-staging` with:
- Own PostgreSQL instance
- Own Redis instance
- Mirrors production structure

**Impact:** No safe environment for testing before production deploy.

---

## What's Already Working Well

| Feature | Status | Notes |
|---------|--------|-------|
| Health checks | ✅ | Backend: `/health/live/`, Frontend: `/api/health` |
| Cloudflare CDN | ✅ | Active, caching working |
| SSL/TLS | ✅ | Full (strict) mode |
| Private networking | ✅ | Services use `.railway.internal` |
| Docker optimization | ✅ | Multi-stage builds |
| Environment-driven domains | ✅ | `CUSTOM_DOMAIN`, `PARENT_HOST`, etc. |
| CORS configuration | ✅ | Dynamic based on `CUSTOM_DOMAIN` |
| Restart policies | ✅ | `ON_FAILURE` with retries |
| Database backups | ✅ | Railway automatic |
| Redis persistence | ✅ | Railway automatic |

---

## Action Plan

### Priority 1: Critical Fixes (Immediate) ✅ COMPLETED 2026-02-28

| # | Task | Status |
|---|------|--------|
| 1.1 | Fix Gunicorn to use `gunicorn.conf.py` | ✅ Done |
| 1.2 | Add zero-downtime deployment env vars | ✅ Done |
| 1.3 | Make Celery concurrency configurable | ✅ Done |

**Changes Made:**
- `scripts/start.py`: Now uses `gunicorn.conf.py` with configurable `GUNICORN_WORKERS` (default: 3) and `GUNICORN_THREADS` (default: 4)
- `scripts/start_worker.py`: Now uses `CELERY_CONCURRENCY` env var (default: 4)
- Backend env vars added: `GUNICORN_WORKERS=3`, `GUNICORN_THREADS=4`, `RAILWAY_DEPLOYMENT_OVERLAP_SECONDS=30`, `RAILWAY_DEPLOYMENT_DRAINING_SECONDS=30`
- Worker env vars added: `CELERY_CONCURRENCY=4`

### Priority 2: Scaling Preparation (Before Launch)

| # | Task | Command |
|---|------|---------|
| 2.1 | Scale backend to 2 replicas | `railway scale "TWCako Backend"=2` |
| 2.2 | Scale frontend to 2 replicas | `railway scale "TWCako Frontend"=2` |
| 2.3 | Scale worker to 2 replicas | `railway scale "TWCako-Worker"=2` |

### Priority 3: External Services (This Month)

| # | Task | Env Var |
|---|------|---------|
| 3.1 | Configure Sentry | `SENTRY_DSN` |
| 3.2 | Configure S3 storage | `LINODE_BUCKET_*` |
| 3.3 | Configure SendGrid | `SENDGRID_API_KEY` |

### Priority 4: Infrastructure (Before Launch)

| # | Task | Notes |
|---|------|-------|
| 4.1 | Create staging environment | Separate Railway project |
| 4.2 | Set up uptime monitoring | Better Uptime or similar |
| 4.3 | Configure alerting | Slack integration |

---

## Scaling Quick Reference

### Manual Scaling Commands

```bash
# Scale for normal operation (launch)
railway scale "TWCako Backend"=2
railway scale "TWCako Frontend"=2
railway scale "TWCako-Worker"=2

# Scale for FB campaign (24h before)
railway scale "TWCako Backend"=4
railway scale "TWCako-Worker"=3

# Scale down after campaign
railway scale "TWCako Backend"=2
railway scale "TWCako-Worker"=2
```

### Capacity Planning

| Replicas | Backend Capacity | Est. Concurrent Users |
|----------|------------------|----------------------|
| 1 | ~50 req/sec | ~500 |
| 2 | ~100 req/sec | ~1,000 |
| 4 | ~200 req/sec | ~2,500 |
| 6 | ~300 req/sec | ~4,000 |

*With Cloudflare caching (~60% hit rate), effective capacity is ~2.5x higher.*

---

## Environment Variables Checklist

### Backend (TWCako Backend)

| Variable | Status | Value/Notes |
|----------|--------|-------------|
| `DJANGO_SETTINGS_MODULE` | ✅ | `twcako.settings.production` |
| `DJANGO_SECRET_KEY` | ✅ | Set |
| `DATABASE_URL` | ✅ | Auto-injected |
| `REDIS_URL` | ✅ | Auto-injected |
| `CUSTOM_DOMAIN` | ✅ | `twctechwarriors.com` |
| `PARENT_HOST` | ✅ | `twctechwarriors.com` |
| `SITE_URL` | ✅ | Set |
| `GUNICORN_WORKERS` | ✅ | `3` |
| `GUNICORN_THREADS` | ✅ | `4` |
| `SENTRY_DSN` | ❌ | Missing |
| `LINODE_BUCKET_ACCESS_KEY` | ❌ | Missing |
| `LINODE_BUCKET_SECRET_KEY` | ❌ | Missing |
| `SENDGRID_API_KEY` | ❌ | Missing |
| `RAILWAY_DEPLOYMENT_OVERLAP_SECONDS` | ✅ | `30` |
| `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` | ✅ | `30` |

### Frontend (TWCako Frontend)

| Variable | Status | Value/Notes |
|----------|--------|-------------|
| `DJANGO_API_BASE` | ✅ | Set |
| `NEXT_PUBLIC_DJANGO_API_BASE` | ✅ | Set |
| `NEXTAUTH_SECRET` | ✅ | Set |
| `NEXTAUTH_URL` | ✅ | Set |
| `NODE_ENV` | ✅ | `production` |

### Worker (TWCako-Worker)

| Variable | Status | Value/Notes |
|----------|--------|-------------|
| `RUN_MODE` | ✅ | `worker` |
| `DATABASE_URL` | ✅ | Auto-injected |
| `REDIS_URL` | ✅ | Auto-injected |
| `CELERY_CONCURRENCY` | ✅ | `4` |

---

## Monitoring Checklist

| Monitor | URL | Expected |
|---------|-----|----------|
| Backend Health | `https://api.twctechwarriors.com/health/live/` | `{"status": "alive"}` |
| Frontend Health | `https://dashboard.twctechwarriors.com/api/health` | `{"status": "ok"}` |
| Backend Login | `https://api.twctechwarriors.com/account/login/` | HTTP 200 |
| API Auth | `POST /auth/token/` | HTTP 400 (no creds) or 200 |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-28 | Priority 1 fixes completed (Gunicorn, zero-downtime, Celery) | CTO |
| 2026-02-28 | Initial audit document created | CTO |

---

*This document is part of the TWCako infrastructure documentation suite.*

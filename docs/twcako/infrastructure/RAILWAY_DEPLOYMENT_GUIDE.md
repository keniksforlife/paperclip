# TWCako Railway Deployment Guide

> **Document Status:** Living document - continuously updated
> **Last Updated:** 2026-02-25
> **Author:** Kent Lucky Buhawe (CTO)
> **Django Backend URL:** https://twcako-production-8d16.up.railway.app
> **V4 Frontend URL:** https://twcakov4-production-6679.up.railway.app

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Infrastructure Audit](#infrastructure-audit)
4. [Step-by-Step: Django Backend Setup](#step-by-step-django-backend-setup)
5. [Step-by-Step: V4 Frontend Setup](#step-by-step-v4-frontend-setup)
6. [Step-by-Step: Celery Worker Setup](#step-by-step-celery-worker-setup)
7. [Django Changes for V4 Connectivity](#django-changes-for-v4-connectivity)
8. [Configuration Files Reference](#configuration-files-reference)
9. [Environment Variables](#environment-variables)
10. [Key Design Decisions](#key-design-decisions)
11. [Post-Deploy: Migrations & Setup](#post-deploy-migrations--setup)
12. [Day-to-Day Operations](#day-to-day-operations)
13. [Issues Encountered & Solutions](#issues-encountered--solutions)
14. [Troubleshooting Playbook](#troubleshooting-playbook)
15. [Current Status](#current-status)
16. [Infrastructure Roadmap](#infrastructure-roadmap)
17. [Complete Re-Setup Guide](#complete-re-setup-guide)
18. [Change Log](#change-log)

---

## Overview

| Service | Stack | Repo | Railway URL |
|---------|-------|------|-------------|
| **Django Backend** | Django 3.2, Gunicorn, python:3.10-slim | `Techno-Wealth-Creators/TWCako` | `twcako-production-8d16.up.railway.app` |
| **V4 Frontend** | Next.js 16, node:22-slim, standalone | `keniksforlife/TWCAKOV4` | `twcakov4-production-6679.up.railway.app` |
| **Celery Worker** | Same Dockerfile, RUN_MODE=worker | `Techno-Wealth-Creators/TWCako` | `twcako-worker.railway.internal` |
| **PostgreSQL** | Railway managed v16 | — | `postgres.railway.internal:5432` |
| **Redis** | Railway managed | — | `redis.railway.internal:6379` |

| Item | Value |
|------|-------|
| Railway Project | `twcako-production` |
| Railway Project ID | `82de7023-ce1f-4bcc-86de-a956dbf5db3f` |
| Environment | `production` (`378efb3e-d6e4-45e8-b964-952ea2285676`) |
| Region | asia-southeast1 |
| Est. Cost | ~$30-50/month (dev phase) |

---

## Architecture

```
Internet (Browser)
  │
  ▼
┌──────────────────────────────────────────────────────────────┐
│                    Railway Private Network                     │
│                                                               │
│  ┌──────────────────┐       ┌──────────────────┐             │
│  │   V4 Frontend    │──────▶│   Django Backend  │             │
│  │   (Next.js 16)   │ HTTP  │   (Gunicorn)     │             │
│  │   TWCAKOV4        │       │   TWCako          │             │
│  │   Port 3000      │       │   Port 8000      │             │
│  └──────────────────┘       └────────┬──────────┘             │
│                                      │                        │
│                              ┌───────┴────────┐              │
│                              │                │               │
│                        ┌─────┴─────┐   ┌─────┴─────┐        │
│                        │ PostgreSQL │   │   Redis   │        │
│                        │ Port 5432  │   │ Port 6379 │        │
│                        └─────┬─────┘   └─────┬─────┘        │
│                              │                │               │
│                        ┌─────┴────────────────┴─────┐        │
│                        │   TWCako-Worker              │        │
│                        │   Celery Worker + Beat       │        │
│                        │   (RUN_MODE=worker)          │        │
│                        │   35+ background tasks       │        │
│                        └─────────────────────────────┘        │
│                                                               │
└──────────────────────────────────────────────────────────────┘

Data Flow:
  Browser → V4 Frontend (SSR + API routes) → Django Backend → PostgreSQL
  Django Backend → Redis → Celery Worker (background tasks)
  Celery Beat → Redis → Celery Worker (periodic/scheduled tasks)
```

**Key architectural note:** Django uses `django-hosts` for subdomain routing (`api.twcako.com`), but Railway doesn't support subdomains on auto-generated domains. The Django `dashboard.py` URL conf (DEFAULT_HOST) has all V4 API endpoints duplicated without the `api/` prefix for non-subdomain access.

---

## Infrastructure Audit

> **Last audited:** 2026-02-25 via `railway variables` CLI

### Service Inventory

| Service | Service ID | Internal Domain | Status | Connected To |
|---------|-----------|-----------------|--------|--------------|
| **TWCako** | `f9c77fdf-13a8-4373-b774-86f0d2c63f3a` | `twcako.railway.internal` | ACTIVE | Postgres, Redis |
| **TWCAKOV4** | `4282c7bb-5420-4635-b5bf-0b5d703ea2a7` | `twcakov4.railway.internal` | ACTIVE | TWCako (HTTP only) |
| **TWCako-Worker** | `328adea4-2cf1-428b-b7e0-2de2de582d76` | `twcako-worker.railway.internal` | ACTIVE | Postgres, Redis (Celery) |
| **Postgres** | `d9860be3-9082-46a2-9b80-3a056e2ed452` | `postgres.railway.internal` | ACTIVE | TWCako + Worker use `DATABASE_URL` |
| **Redis** | `682985e7-04a3-4c06-9bee-94815c414eb5` | `redis.railway.internal` | ACTIVE | TWCako + Worker use `REDIS_URL` |

### How connections were verified

```bash
# TWCako's DATABASE_URL points to postgres.railway.internal (password: XEK...WEJ)
# TWCako's REDIS_URL points to redis.railway.internal (password: nWt...uwG)
# Postgres-uUCs has different password (MUa...Bjv) — NOT used anywhere
# Redis-XK-o has different password (haL...TKC) — NOT used anywhere
```

### Public Proxy Endpoints (for external access)

| Service | Public Proxy | Port |
|---------|-------------|------|
| **Postgres** (ACTIVE) | `shortline.proxy.rlwy.net` | `48710` |
| **Redis** (ACTIVE) | `centerbeam.proxy.rlwy.net` | `47060` |
| Postgres-uUCs (UNUSED) | `centerbeam.proxy.rlwy.net` | `18817` |
| Redis-XK-o (UNUSED) | `switchback.proxy.rlwy.net` | `31453` |

### What Redis is used for

| Feature | Config Key | Status |
|---------|-----------|--------|
| **Django cache** | `CACHES["default"]` → `django_redis.cache.RedisCache` | Working |
| **Session backend** | `SESSION_ENGINE` → `cached_db` | Working |
| **Celery broker** | `CELERY_BROKER_URL` → `REDIS_URL` | Working (TWCako-Worker) |
| **Celery result backend** | `CELERY_RESULT_BACKEND` → `REDIS_URL` | Working (TWCako-Worker) |
| **Celery beat scheduler** | `DatabaseScheduler` via Redis broker | Working (embedded in worker) |

### Important: CELERY_BROKER_URL in production

`base.py` reads `REDIS_SERVER_URL` for Celery, but Railway provides `REDIS_URL`. The fix in `production.py` overrides both `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` from `REDIS_URL` when available.

---

## Step-by-Step: Django Backend Setup

> **This is the guide for deploying the Django backend.**
> Follow these steps IN ORDER.

### Step 1: Create Railway Project

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Create project (or link existing)
railway init
```

### Step 2: Connect GitHub Repository

1. Railway Dashboard → Project → Settings → Source
2. Connect to GitHub repo: `Techno-Wealth-Creators/TWCako`
3. Branch: `main`
4. Auto-deploy: **ON**

### Step 3: Add PostgreSQL

1. Railway Dashboard → **+ New** → **Database** → **PostgreSQL**
2. Click the PostgreSQL service → **Connect** tab
3. Click **"Add Reference Variable"** next to the TWCako web service
4. This auto-sets: `DATABASE_URL`, `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT`
5. Also manually add individual vars (production.py uses both formats):
   - `POSTGRES_HOST` = `${{Postgres.PGHOST}}`
   - `POSTGRES_USER` = `${{Postgres.PGUSER}}`
   - `POSTGRES_PASSWORD` = `${{Postgres.PGPASSWORD}}`
   - `POSTGRES_DB` = `${{Postgres.PGDATABASE}}`
   - `POSTGRES_PORT` = `${{Postgres.PGPORT}}`

### Step 4: Add Redis

1. Railway Dashboard → **+ New** → **Database** → **Redis**
2. Link to TWCako service (auto-sets `REDIS_URL`)

### Step 5: Set Environment Variables

In Railway Dashboard → TWCako Service → **Variables**, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `DJANGO_SETTINGS_MODULE` | `twcako.settings.production` | **Required** |
| `DJANGO_SECRET_KEY` | *(generate a secure key)* | **Required** |
| `PORT` | `8000` | Must match Dockerfile |
| `DEBUG` | `0` | Never `1` in production |
| `USE_POSTGRES` | `1` | Enables PostgreSQL |
| `LINODE_BUCKET_ACCESS_KEY` | *(from Linode)* | For static/media files |
| `LINODE_BUCKET_SECRET_KEY` | *(from Linode)* | For static/media files |
| `SENDGRID_API_KEY` | *(from SendGrid)* | For emails |
| `SENTRY_DSN` | *(from Sentry)* | For error tracking |

> **Note:** If `LINODE_BUCKET_ACCESS_KEY` is not set, static files fall back to local filesystem (OK for initial testing).

### Step 6: Deploy

Push to main and Railway auto-deploys, OR:
```bash
railway up
```

### Step 7: Generate Public URL

```bash
railway domain
# Creates: https://your-service.up.railway.app
```

### Step 8: Run Migrations

> **CRITICAL** - The app will return 500 errors until migrations are run.

**Option A: Railway Dashboard** (Recommended)
1. Go to TWCako service → **Settings** → **Execute Command**
2. Run: `python manage.py migrate --noinput`
3. Run: `python manage.py createsuperuser` (interactive)

**Option B: Via startup script** (already configured)
- The Dockerfile CMD runs `python manage.py migrate --noinput` on every deploy
- Check logs to verify: `railway logs --since 5m`

**Option C: Via Railway CLI** (requires local deps)
```bash
railway shell
# Then in the shell:
python manage.py migrate --noinput
```

### Step 9: Verify

```bash
# Health check
curl https://your-service.up.railway.app/health/live/
# Expected: {"status": "alive", "timestamp": "..."}

# Login page
curl -s -o /dev/null -w "%{http_code}" https://your-service.up.railway.app/account/login/
# Expected: 200 (after migrations)
```

---

## Step-by-Step: V4 Frontend Setup

> **Prerequisites:** Django backend must be deployed and running first.

### Step 1: Create V4 Service in Railway

1. Railway Dashboard → Same project (`twcako-production`) → **+ New** → **GitHub Repo**
2. Connect to: `keniksforlife/TWCAKOV4`, branch: `main`
3. Railway detects the `Dockerfile` automatically

### Step 2: Set V4 Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `DJANGO_API_BASE` | `https://twcako-production-8d16.up.railway.app` | **Required** — server-side API calls |
| `NEXT_PUBLIC_DJANGO_API_BASE` | `https://twcako-production-8d16.up.railway.app` | **Required** — client-side API calls |
| `NEXTAUTH_SECRET` | *(generate: `openssl rand -base64 32`)* | **Required** — session encryption |
| `NODE_ENV` | `production` | **Required** |
| `NEXT_PUBLIC_SITE_URL` | *(set after deploy, see Step 4)* | V4 public URL |
| `NEXTAUTH_URL` | *(set after deploy, see Step 4)* | Must match public URL |

### Step 3: Deploy & Get URL

```bash
# First deploy triggers automatically on push
# Generate public domain:
railway domain --service TWCAKOV4
# Example: https://twcakov4-production-6679.up.railway.app
```

### Step 4: Set URL Variables (after domain assigned)

```bash
railway variable set \
  NEXT_PUBLIC_SITE_URL="https://twcakov4-production-XXXX.up.railway.app" \
  NEXTAUTH_URL="https://twcakov4-production-XXXX.up.railway.app" \
  --service TWCAKOV4
```

This triggers a redeploy with correct URLs.

### Step 5: Verify V4

```bash
# Health check
curl https://twcakov4-production-XXXX.up.railway.app/api/health
# Expected: {"status":"ok"}

# Test backend connectivity (should return auth error, not URL parse error)
curl -X POST https://twcakov4-production-XXXX.up.railway.app/api/auth/token-pair \
  -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'
# Expected: {"success":false,"error":"No active account found..."}

# Visit in browser → should redirect to /login
```

### V4 Key Files

| File | Purpose |
|------|---------|
| `next.config.ts` | `output: "standalone"` for Docker |
| `Dockerfile` | Multi-stage build (node:22-slim), installs Linux native binaries |
| `.dockerignore` | Excludes node_modules, .next, .git |
| `railway.json` | Dockerfile builder, `/api/health` health check |
| `src/app/api/health/route.ts` | Health check endpoint |

### V4 Dockerfile Details

The Dockerfile uses `node:22-slim` (Debian) instead of Alpine because Tailwind CSS v4 and Next.js use native binaries (`lightningcss`, `@tailwindcss/oxide`, `@next/swc`) that need glibc. The lockfile is generated on macOS, so Linux binaries are installed explicitly:

```dockerfile
RUN npm ci
RUN npm install --no-save \
    lightningcss-linux-x64-gnu@1.30.2 \
    @tailwindcss/oxide-linux-x64-gnu@4.1.18 \
    @next/swc-linux-x64-gnu@16.1.6
```

**Important:** When upgrading these packages, update the versions here too.

---

## Step-by-Step: Celery Worker Setup

> **Status:** DEPLOYED and running (2026-02-25)
> **Prerequisites:** Django backend and Redis must be deployed and running.

### Architecture

The worker uses the **same Dockerfile** as TWCako with a `RUN_MODE` environment variable:
- `RUN_MODE=web` (default) → starts Gunicorn web server
- `RUN_MODE=worker` → starts Celery worker + beat

This means both services share the same Docker image and build process.

### What the Worker Runs

- **Celery Worker** (concurrency=2) — processes background tasks
- **Celery Beat** (embedded) — schedules periodic tasks via `django_celery_beat.DatabaseScheduler`
- **Health check server** — lightweight HTTP server on PORT for Railway health checks

### 35+ Registered Tasks

| Category | Tasks |
|----------|-------|
| **Accounts/Members** | `calculate_member_kpis`, `check_at_risk_members`, `reset_monthly_metrics`, `capture_daily_snapshots`, `cleanup_old_snapshots`, `update_login_activity`, `daily_db_cleanup` |
| **Finance** | `calculate_daily_snapshot`, `calculate_member_financial_health`, `check_pending_sla`, `detect_anomalies`, `escalate_pending_approvals`, `check_loan_payments_due`, `check_petty_cash_balances`, `check_ecash_reconciliation`, `calculate_supplier_settlements`, `check_budget_utilization`, `generate_recurring_expenses` |
| **Notifications** | `send_notification_task`, `create_and_send_notification`, `mark_notifications_read`, `cleanup_old_notifications`, `retry_failed_notifications` |
| **SMS** | `send_sms_task`, `send_order_notification_task`, `send_single_sms_task`, `send_bulk_sms_task` |
| **University** | `enable_bootcamp_live`, `disable_bootcamp_live`, `twc_bootcamp_watch_time_task` |
| **Other** | `set_user_auto_subscribed`, `mark_bp_encoded_task`, `mark_sns_done_task` |

### Step 1: Create Worker Service

```bash
# Via Railway CLI
railway add --service "TWCako-Worker" --repo "Techno-Wealth-Creators/TWCako"

# Or via Railway Dashboard:
# + New → GitHub Repo → Techno-Wealth-Creators/TWCako → Name: TWCako-Worker
```

### Step 2: Set Environment Variables

```bash
railway service TWCako-Worker

# Required variables
railway variable set \
  DJANGO_SETTINGS_MODULE="twcako.settings.production" \
  DJANGO_SECRET_KEY="<same as TWCako>" \
  USE_POSTGRES="1" \
  DEBUG="0" \
  RUN_MODE="worker"

# Reference variables (resolved automatically by Railway)
railway variable set \
  'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  'REDIS_URL=${{Redis.REDIS_URL}}' \
  'POSTGRES_HOST=${{Postgres.PGHOST}}' \
  'POSTGRES_USER=${{Postgres.PGUSER}}' \
  'POSTGRES_PASSWORD=${{Postgres.PGPASSWORD}}' \
  'POSTGRES_DB=${{Postgres.PGDATABASE}}' \
  'POSTGRES_PORT=${{Postgres.PGPORT}}'
```

### Step 3: Deploy & Verify

```bash
# Deployment triggers automatically on push to main
# Check status:
railway service TWCako-Worker && railway service status

# Check logs:
railway service TWCako-Worker && railway logs

# Expected log output:
# === TWCako Celery Worker Startup ===
# Health check server listening on port 8080
# Connected to redis://default:**@redis.railway.internal:6379//
# beat: Starting...
# celery@<hostname> ready.
```

### Key Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Shared with TWCako. CMD checks `RUN_MODE` env var. |
| `scripts/start_worker.py` | Worker startup: health check server + Celery subprocess |
| `twcako/celery.py` | Celery app config, beat schedule (20+ periodic tasks) |
| `twcako/settings/production.py` | `CELERY_BROKER_URL` override from `REDIS_URL` |

### Issue: Celery Broker URL Mismatch

**Problem:** `base.py` sets `CELERY_BROKER_URL = os.environ.get("REDIS_SERVER_URL")` but Railway provides `REDIS_URL`.

**Fix:** `production.py` overrides both `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` from `REDIS_URL` when available.

---

## Django Changes for V4 Connectivity

Railway doesn't support subdomains on auto-generated domains, so the V4 frontend can't reach `api.twcako.com`. All V4 API endpoints must exist in the **dashboard URL conf** (`twcako/urls/dashboard.py`) which is the `DEFAULT_HOST`.

### Endpoints Added to `dashboard.py`

| Path | View | Purpose |
|------|------|---------|
| `auth/login` | `LoginAPIView` | V4 login (returns JWT tokens) |
| `me` | `MeAPIView` | Current user profile |
| `auth/refresh` | `RefreshTokenAPIView` | Token refresh |
| `auth/token/` | `TokenObtainPairView` | SimpleJWT token pair |
| `auth/token/refresh/` | `TokenRefreshView` | SimpleJWT token refresh |
| `check-username/<slug>/` | `CheckUsernameAPIView` | User verification after login |
| `member-activity/...` | Various | Member monitoring endpoints |
| `finance/...` | Various | Finance monitoring endpoints |

### CORS Configuration (`base.py`)

```python
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https:\/\/.*\.twctest\.com$",
    r"^https:\/\/.*\.twclocaldev\.com$",
    r"^https:\/\/.*\.twcako\.com$",
    r"^https:\/\/.*\.up\.railway\.app$",  # Railway services
]
```

### Critical Fix: `production.py` REST_FRAMEWORK

**Problem:** `production.py` was completely overriding `REST_FRAMEWORK` dict with only throttle settings, which removed `JWTAuthentication` from `DEFAULT_AUTHENTICATION_CLASSES`. All Bearer token auth failed with 403.

**Fix:** Merge throttle settings instead of replacing:
```python
# WRONG - replaces entire dict, removes JWT auth:
REST_FRAMEWORK = { 'DEFAULT_THROTTLE_CLASSES': [...] }

# CORRECT - merges into existing dict from base.py:
REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = [...]
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {...}
```

### V4 Server-Side API Routes: Use `DJANGO_API_BASE`

**Important:** All Next.js API routes (server-side) must use `process.env.DJANGO_API_BASE`, NOT `process.env.NEXT_PUBLIC_DJANGO_API_BASE`. The `NEXT_PUBLIC_*` prefix causes the value to be inlined at build time by turbopack, which results in empty strings if the var wasn't available during Docker build.

- `DJANGO_API_BASE` → server-side routes (read from runtime environment)
- `NEXT_PUBLIC_DJANGO_API_BASE` → client-side code only (inlined at build time)

---

## Configuration Files Reference

### Dockerfile (`/Dockerfile`)

```dockerfile
FROM python:3.10-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV DJANGO_SETTINGS_MODULE=twcako.settings.production
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /app/static /app/public/static /tmp/logs

EXPOSE 8000
CMD ["python", "-u", "/app/scripts/start.py"]
```

### Startup Script (`/scripts/start.py`)

Python-based startup that:
1. Tests DB connection
2. Runs `migrate --noinput` (best-effort, doesn't block)
3. Runs `collectstatic --noinput` (best-effort, doesn't block)
4. Starts Gunicorn

### railway.json (`/railway.json`)

```json
{
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile" },
  "deploy": {
    "numReplicas": 1,
    "healthcheckPath": "/health/live/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Key Settings Files

| File | Purpose |
|------|---------|
| `twcako/settings/production.py` | Production config (DB, cache, S3, security) |
| `twcako/settings/base.py` | Shared config (INSTALLED_APPS, MIDDLEWARE) |
| `twcako/middleware.py` | Custom middleware (includes health check bypass) |
| `capi_param_builder/__init__.py` | Local stub (PyPI package is broken) |
| `api/views/health.py` | Health check views |

---

## Environment Variables

### Auto-set by Railway (when services are linked)

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | PostgreSQL service |
| `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` | PostgreSQL service |
| `REDIS_URL` | Redis service |
| `RAILWAY_PUBLIC_DOMAIN` | Railway platform |
| `RAILWAY_PRIVATE_DOMAIN` | Railway platform |
| `PORT` | Railway platform |

### Django Backend — Must Set Manually

| Variable | Required? | Notes |
|----------|-----------|-------|
| `DJANGO_SETTINGS_MODULE` | **Yes** | `twcako.settings.production` |
| `DJANGO_SECRET_KEY` | **Yes** | Use `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `LINODE_BUCKET_ACCESS_KEY` | For S3 | Static/media files. Falls back to local if not set. |
| `LINODE_BUCKET_SECRET_KEY` | For S3 | Must be set together with ACCESS_KEY |
| `SENDGRID_API_KEY` | For email | Transactional emails |
| `SENTRY_DSN` | For monitoring | Error tracking |
| `XENDIT_API_KEY` | For payments | Payment processing |
| `XENDIT_WEBHOOK_KEY` | For payments | Payment webhooks |

### V4 Frontend — Must Set Manually

| Variable | Required? | Notes |
|----------|-----------|-------|
| `DJANGO_API_BASE` | **Yes** | Django backend URL (no trailing slash). Used by server-side API routes at runtime. |
| `NEXT_PUBLIC_DJANGO_API_BASE` | **Yes** | Same URL. Used by client-side code (inlined at build time). |
| `NEXTAUTH_SECRET` | **Yes** | Generate with `openssl rand -base64 32`. Session encryption key. |
| `NEXTAUTH_URL` | **Yes** | V4 public URL. Set after Railway assigns domain. |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | Same as NEXTAUTH_URL. |
| `NODE_ENV` | **Yes** | `production` |

---

## Key Design Decisions

### 1. HealthCheckShortCircuitMiddleware (FIRST in MIDDLEWARE)

**Problem:** Django middleware (sessions, sites, custom) query the database on every request. Before migrations, these queries crash the health check.

**Solution:** `HealthCheckShortCircuitMiddleware` is the FIRST middleware in the chain. For any path starting with `/health`, it returns `{"status": "alive"}` immediately without calling ANY other middleware.

**Location:** `twcako/middleware.py`, registered in `twcako/settings/base.py`

### 2. Conditional S3 Storage

**Problem:** `STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'` crashes if S3 credentials aren't set.

**Solution:** In `production.py`, S3 storage is only enabled when both `LINODE_BUCKET_ACCESS_KEY` and `LINODE_BUCKET_SECRET_KEY` are present. Otherwise, falls back to `django.contrib.staticfiles.storage.StaticFilesStorage`.

### 3. Conditional Redis Cache

**Problem:** Redis cache fails if `REDIS_URL` isn't set.

**Solution:** In `production.py`, Redis is used when `REDIS_URL` is present. Otherwise, falls back to `django.core.cache.backends.locmem.LocMemCache`.

### 4. DATABASE_URL Support

**Problem:** Railway provides `DATABASE_URL` but the original code used individual `POSTGRES_*` variables.

**Solution:** `production.py` uses `dj-database-url` to parse `DATABASE_URL` when available, falls back to individual variables.

### 5. Local capi_param_builder Stub

**Problem:** The PyPI package `capi-param-builder` installs metadata but NO actual Python module.

**Solution:** Local stub at `capi_param_builder/__init__.py` with minimal `ParamBuilder` class.

### 6. SSL Redirect Disabled

**Problem:** `SECURE_SSL_REDIRECT = True` causes 301 redirects for internal health checks (HTTP).

**Solution:** `SECURE_SSL_REDIRECT = False` because Railway/Cloudflare handles HTTPS at the edge.

---

## Post-Deploy: Migrations & Setup

### First-time Setup Checklist

After the first successful deployment:

- [ ] Run migrations: `python manage.py migrate --noinput`
- [ ] Create superuser: `python manage.py createsuperuser`
- [ ] Create default Site: `python manage.py shell -c "from django.contrib.sites.models import Site; Site.objects.get_or_create(id=1, defaults={'domain': 'twcako.com', 'name': 'TWCako'})"`
- [ ] Set Linode S3 credentials in Railway Variables
- [ ] Run collectstatic: `python manage.py collectstatic --noinput`
- [ ] Verify login page works
- [ ] Configure custom domain (if needed)

---

## Day-to-Day Operations

### Deploy a Change

```bash
git add <files>
git commit -m "description"
git push origin main
# Railway auto-deploys
```

### Check Logs

```bash
railway logs                    # Stream live logs
railway logs --since 5m         # Last 5 minutes
railway logs --lines 100        # Last 100 lines
railway logs --filter "@level:error"  # Errors only
```

### Check Health

```bash
curl https://your-service.up.railway.app/health/live/
```

### Restart Service

Railway Dashboard → Service → **Settings** → **Restart**

### Run Management Commands

Railway Dashboard → Service → **Settings** → **Execute Command**
```
python manage.py <command>
```

---

## Issues Encountered & Solutions

### Django Backend Issues (1-13)

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | Python not found | Nixpacks detected Node.js | Use Dockerfile |
| 2 | allauth setuptools error | Old allauth 0.47.0 | Upgrade to 0.57.0 |
| 3 | urllib3 conflict | trackingmore-sdk-python | Remove, use trackingmore==0.2 |
| 4 | typing_extensions conflict | Hard version pins | Remove pins |
| 5 | gunicorn not found | Missing from requirements.txt | Add gunicorn==21.2.0 |
| 6 | allauth middleware missing | allauth 0.57.0+ requirement | Add AccountMiddleware |
| 7 | Static directory missing | No /app/static | mkdir in Dockerfile |
| 8 | production.py missing base | No `from .base import *` | Add import |
| 9 | Health check 301 | SECURE_SSL_REDIRECT | Set to False |
| 10 | GitHub Actions failing | Missing RAILWAY_TOKEN | Disable workflows |
| 11 | capi_param_builder missing | PyPI package broken | Local stub |
| 12 | **collectstatic blocks gunicorn** | S3 creds missing + && chain | Conditional S3 + \|\| true |
| 13 | **Middleware blocks health check** | DB queries before health view | ShortCircuit middleware |

### V4 Frontend Issues (14-19)

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 14 | `lightningcss.linux-x64-musl.node` not found | Alpine uses musl, lockfile from macOS | Switch to `node:22-slim` (Debian/glibc) |
| 15 | `lightningcss.linux-x64-gnu.node` not found | macOS lockfile missing Linux optional dep | `npm install --no-save lightningcss-linux-x64-gnu` |
| 16 | `@tailwindcss/oxide-linux-x64-gnu` not found | Same lockfile issue | Add to explicit install |
| 17 | `Missing env DJANGO_API_BASE` at build | Not passed as Docker build ARG | Add `ARG DJANGO_API_BASE` + `ENV` in Dockerfile |
| 18 | `Failed to parse URL from /auth/token/` | `NEXT_PUBLIC_*` inlined as empty by turbopack | Changed 16 API routes to use `DJANGO_API_BASE` |
| 19 | **JWT auth 403 in production** | `production.py` replaced `REST_FRAMEWORK` dict, removing JWT auth | Merge throttle settings instead of replacing |
| 20 | `/check-username/` returns 404 | Endpoint only in api subdomain urlconf | Added to `dashboard.py` |
| 21 | `/check-username/` returns 500 | `get_sponsor_username()` crashes for users without teammember | Wrapped sponsor fields in try/except |

### Details for Critical Issues

**Issue 12 - collectstatic blocks gunicorn (THE SILENT KILLER):**
The Dockerfile CMD was: `migrate && collectstatic && gunicorn`. When collectstatic fails (no S3 creds), the `&&` chain stops and gunicorn NEVER starts. Health check sees "service unavailable". Fix: conditional S3 storage + `|| true` fallback.

**Issue 13 - Middleware blocks health check:**
Even after gunicorn starts, health checks return 500 because middleware classes query DB tables that don't exist (no migrations yet). Fix: `HealthCheckShortCircuitMiddleware` runs FIRST and returns 200 for `/health` paths.

**Issue 14-16 - macOS lockfile + Linux Docker:**
`npm ci` respects the lockfile strictly. Since it was generated on macOS, platform-specific optional dependencies for Linux (lightningcss, @tailwindcss/oxide, @next/swc) aren't included. Must explicitly install the `-linux-x64-gnu` variants after `npm ci`.

**Issue 18 - NEXT_PUBLIC_ in server-side routes:**
Turbopack inlines `NEXT_PUBLIC_*` env vars at build time in ALL code (client AND server). If the var wasn't set during Docker build, it becomes an empty string permanently. Server-side API routes must use non-prefixed env vars (`DJANGO_API_BASE`) which are read from the runtime environment.

**Issue 19 - JWT auth broken in production (THE REAL BLOCKER):**
`production.py` had `REST_FRAMEWORK = { ... }` which completely replaced the dict from `restconf/main.py`, wiping out `DEFAULT_AUTHENTICATION_CLASSES` (including `JWTAuthentication`). All Bearer token auth returned 403 "Authentication credentials were not provided". Fix: use `REST_FRAMEWORK['key'] = value` to merge instead of replace.

---

## Troubleshooting Playbook

### Health Check Fails: "service unavailable"

**Means:** Container isn't running / port not bound.

1. Check build logs: `railway logs --build --latest`
2. Check if CMD is failing: look for error before gunicorn starts
3. Common causes: `&&` chain failure, missing dependency, import error

### Health Check Fails: HTTP 500

**Means:** Gunicorn runs but request errors.

1. Check runtime logs: `railway logs --since 5m`
2. Look for `ProgrammingError: relation "X" does not exist` → migrations needed
3. Look for `ModuleNotFoundError` → missing dependency

### Health Check Fails: HTTP 301

**Means:** SSL redirect.

1. Set `SECURE_SSL_REDIRECT = False` in production.py

### Static Files Return 500

**Means:** S3 storage configured but no credentials.

1. Set `LINODE_BUCKET_ACCESS_KEY` and `LINODE_BUCKET_SECRET_KEY` in Railway Variables
2. OR: Static files fall back to local if these vars are not set

### Login Page Returns 500

**Means:** Database tables don't exist.

1. Run migrations via Railway Dashboard → Execute Command
2. `python manage.py migrate --noinput`

### V4: `Failed to parse URL from /auth/token/`

**Means:** `DJANGO_API_BASE` is empty — API routes are using `NEXT_PUBLIC_DJANGO_API_BASE` instead.

1. Check that the API route uses `process.env.DJANGO_API_BASE` (NOT `NEXT_PUBLIC_`)
2. Verify the env var is set: `railway variable list --service TWCAKOV4`

### V4: `lightningcss` / `@tailwindcss/oxide` not found during build

**Means:** macOS lockfile doesn't include Linux native binaries.

1. Check the Dockerfile installs the correct versions after `npm ci`
2. Update versions when upgrading tailwindcss/next.js

### V4: JWT auth returns 403 "Authentication credentials were not provided"

**Means:** `JWTAuthentication` isn't in `DEFAULT_AUTHENTICATION_CLASSES`.

1. Check `production.py` isn't replacing `REST_FRAMEWORK` dict entirely
2. Should use `REST_FRAMEWORK['key'] = value` to merge

### V4: `/check-username/` returns 404

**Means:** Endpoint not in dashboard urlconf.

1. Add the endpoint to `twcako/urls/dashboard.py`
2. Import the view and add the path

### Railway CLI Commands

```bash
railway login                    # Authenticate
railway status                   # Show linked project/service
railway variables                # List all env vars
railway logs                     # Stream logs
railway logs --build --latest    # Build logs
railway logs --since 5m          # Recent runtime logs
railway logs --service TWCAKOV4  # V4 frontend logs
railway service status --all     # All services status
railway domain                   # Generate public URL
railway open                     # Open dashboard
railway redeploy --service X --yes  # Redeploy (reuses image)
```

---

## Current Status

### Django Backend (2026-02-25)

- [x] Dockerfile builds successfully (~30-100s)
- [x] Gunicorn starts with 3 workers
- [x] Health check passes (`/health/live/` returns 200)
- [x] Public URL: https://twcako-production-8d16.up.railway.app
- [x] PostgreSQL connected (DATABASE_URL)
- [x] Redis connected (REDIS_URL)
- [x] Migrations applied, data imported
- [x] JWT authentication working (Bearer tokens)
- [x] V4 API endpoints in dashboard urlconf (no subdomain needed)
- [x] CORS configured for Railway origins
- [x] S3 storage falls back gracefully
- [x] Redis cache falls back gracefully

### V4 Frontend (2026-02-25)

- [x] Dockerfile builds successfully (~3-4 min)
- [x] Standalone Next.js server starts
- [x] Health check passes (`/api/health` returns 200)
- [x] Public URL: https://twcakov4-production-6679.up.railway.app
- [x] Backend connectivity working (DJANGO_API_BASE)
- [x] Login flow working (JWT auth → /me → check-username)
- [x] Dashboard loads after login

### Celery Worker (2026-02-25)

- [x] TWCako-Worker service created
- [x] RUN_MODE=worker env var set
- [x] Connected to Redis broker (`redis.railway.internal:6379`)
- [x] Connected to PostgreSQL (`postgres.railway.internal:5432`)
- [x] 35+ tasks registered
- [x] Beat scheduler running (DatabaseScheduler)
- [x] Health check server on port 8080
- [x] `celery@<hostname> ready.`

### Pending

- [ ] Delete unused Postgres-uUCs service (Railway Dashboard → Service → Delete)
- [ ] Delete unused Redis-XK-o service (Railway Dashboard → Service → Delete)
- [ ] Set Linode S3 credentials for static/media files
- [ ] Set SendGrid API key for email
- [ ] Set Sentry DSN for error tracking
- [ ] Set Xendit keys for payment processing
- [ ] Custom domain configuration (twcako.com)
- [ ] Re-enable CI/CD with RAILWAY_TOKEN
- [ ] Investigate Postgres warning icon

---

## Infrastructure Roadmap

### Phase 1: Cleanup (Do Now)

| Task | How | Est. Time |
|------|-----|-----------|
| Delete Postgres-uUCs | Railway Dashboard → Service → Settings → Delete | 1 min |
| Delete Redis-XK-o | Railway Dashboard → Service → Settings → Delete | 1 min |
| Investigate Postgres warning | Click the warning icon in Railway Dashboard | 5 min |

### Phase 2: Essential Services (This Week)

| Task | How | Est. Time |
|------|-----|-----------|
| ~~Deploy Celery Worker~~ | ~~See Celery Worker Setup~~ | ~~Done~~ |
| Set S3 credentials | Add `LINODE_BUCKET_ACCESS_KEY` + `SECRET_KEY` to TWCako vars | 5 min |
| Set SendGrid API key | Add `SENDGRID_API_KEY` to TWCako vars | 5 min |

### Phase 3: Production Hardening (This Month)

| Task | How | Est. Time |
|------|-----|-----------|
| Custom domain | Railway Dashboard → TWCako → Settings → Custom Domain → Add `api.twcako.com` | 15 min |
| Custom domain V4 | Same for TWCAKOV4 → Add `app.twcako.com` or `v4.twcako.com` | 15 min |
| Sentry error tracking | Create Sentry project, add `SENTRY_DSN` to both services | 30 min |
| Xendit payments | Add `XENDIT_API_KEY` + `XENDIT_WEBHOOK_KEY` to TWCako vars | 5 min |

### Phase 4: CI/CD & Scaling (Future)

| Task | How | Est. Time |
|------|-----|-----------|
| CI/CD pipeline | Generate `RAILWAY_TOKEN`, add to GitHub Actions secrets | 1 hr |
| Auto-scaling | Railway Dashboard → Service → Settings → Auto-scale rules | 15 min |
| Database backups | Railway handles automatic backups, verify schedule | 10 min |
| Read replica | If needed: add `POSTGRES_REPLICA_HOST` (production.py already supports it) | 30 min |

---

## Complete Re-Setup Guide

> **Use this if you need to rebuild the entire Railway project from scratch.**
> Follow these steps IN ORDER.

### Prerequisites

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Verify
railway whoami
```

### Step 1: Create Railway Project

```bash
railway init
# Choose: "Empty Project"
# Name: "twcako-production"
```

### Step 2: Add PostgreSQL

1. Railway Dashboard → **+ New** → **Database** → **PostgreSQL**
2. Wait for it to come online
3. Note the `DATABASE_URL` from its Variables tab

### Step 3: Add Redis

1. Railway Dashboard → **+ New** → **Database** → **Redis**
2. Wait for it to come online
3. Note the `REDIS_URL` from its Variables tab

### Step 4: Deploy Django Backend (TWCako)

1. Railway Dashboard → **+ New** → **GitHub Repo** → `Techno-Wealth-Creators/TWCako` → branch: `main`
2. Railway detects `Dockerfile` automatically
3. Add environment variables:

```bash
# Link CLI to project
cd /path/to/TWCako
railway link

# Set service
railway service TWCako

# Set variables (replace values with your own)
railway variable set \
  DJANGO_SETTINGS_MODULE="twcako.settings.production" \
  DJANGO_SECRET_KEY="$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')" \
  PORT="8000" \
  DEBUG="0" \
  USE_POSTGRES="1" \
  DATABASE_URL='${{Postgres.DATABASE_URL}}' \
  REDIS_URL='${{Redis.REDIS_URL}}' \
  POSTGRES_HOST='${{Postgres.PGHOST}}' \
  POSTGRES_USER='${{Postgres.PGUSER}}' \
  POSTGRES_PASSWORD='${{Postgres.PGPASSWORD}}' \
  POSTGRES_DB='${{Postgres.PGDATABASE}}' \
  POSTGRES_PORT='${{Postgres.PGPORT}}'
```

4. Generate public domain:
```bash
railway domain --service TWCako
# Note the assigned URL (e.g., twcako-production-XXXX.up.railway.app)
```

5. Wait for deploy to complete, then verify:
```bash
curl https://twcako-production-XXXX.up.railway.app/health/live/
# Expected: {"status": "alive", ...}
```

### Step 5: Import Database (if restoring)

```bash
# Connect to Railway PostgreSQL public proxy
psql "postgresql://postgres:PASSWORD@shortline.proxy.rlwy.net:PORT/railway"

# Import from backup
pg_restore -h shortline.proxy.rlwy.net -p PORT -U postgres -d railway backup.dump
```

### Step 6: Deploy V4 Frontend (TWCAKOV4)

1. Railway Dashboard → **+ New** → **GitHub Repo** → `keniksforlife/TWCAKOV4` → branch: `main`
2. Add environment variables:

```bash
railway service TWCAKOV4

railway variable set \
  DJANGO_API_BASE="https://twcako-production-XXXX.up.railway.app" \
  NEXT_PUBLIC_DJANGO_API_BASE="https://twcako-production-XXXX.up.railway.app" \
  NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  NODE_ENV="production"
```

3. Generate domain and set URL vars:
```bash
railway domain --service TWCAKOV4
# Note the assigned URL

railway variable set \
  NEXTAUTH_URL="https://twcakov4-production-YYYY.up.railway.app" \
  NEXT_PUBLIC_SITE_URL="https://twcakov4-production-YYYY.up.railway.app" \
  --service TWCAKOV4
```

4. Verify:
```bash
curl https://twcakov4-production-YYYY.up.railway.app/api/health
# Expected: {"status":"ok"}
```

### Step 7: Deploy Celery Worker (TWCako-Worker)

See [Celery Worker Setup](#step-by-step-celery-worker-setup).

### Step 8: Set Optional Credentials

```bash
railway service TWCako

# S3 for static/media files
railway variable set \
  LINODE_BUCKET_ACCESS_KEY="your-key" \
  LINODE_BUCKET_SECRET_KEY="your-secret"

# Email
railway variable set SENDGRID_API_KEY="SG.xxx"

# Error tracking
railway variable set SENTRY_DSN="https://xxx@sentry.io/xxx"

# Payments
railway variable set \
  XENDIT_API_KEY="xnd_xxx" \
  XENDIT_WEBHOOK_KEY="xxx"
```

### Step 9: Verify Everything

```bash
# Django health
curl https://twcako-production-XXXX.up.railway.app/health/live/

# Django API (should return auth error, not 500)
curl -X POST https://twcako-production-XXXX.up.railway.app/auth/token/ \
  -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'

# V4 health
curl https://twcakov4-production-YYYY.up.railway.app/api/health

# V4 login page (browser)
# Visit https://twcakov4-production-YYYY.up.railway.app/login

# Celery worker (check logs)
railway logs --service TWCako-Worker
```

### Quick Reference: All Service IDs

| Service | Service ID |
|---------|-----------|
| TWCako | `f9c77fdf-13a8-4373-b774-86f0d2c63f3a` |
| TWCAKOV4 | `4282c7bb-5420-4635-b5bf-0b5d703ea2a7` |
| TWCako-Worker | `328adea4-2cf1-428b-b7e0-2de2de582d76` |
| Postgres | `d9860be3-9082-46a2-9b80-3a056e2ed452` |
| Redis | `682985e7-04a3-4c06-9bee-94815c414eb5` |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-02-25 | Celery Worker deployed: TWCako-Worker service, RUN_MODE switch, health check server |
| 2026-02-25 | Fixed: CELERY_BROKER_URL uses REDIS_URL in production.py (was REDIS_SERVER_URL) |
| 2026-02-25 | Infrastructure audit: identified 2 unused services (Postgres-uUCs, Redis-XK-o) |
| 2026-02-25 | Added: Infrastructure Audit, Celery Worker Setup, Roadmap, Re-Setup Guide |
| 2026-02-25 | V4 Frontend deployed on Railway (TWCAKOV4 service) |
| 2026-02-25 | Added token endpoints + check-username to dashboard.py |
| 2026-02-25 | Added Railway CORS regex to base.py |
| 2026-02-25 | Fixed production.py REST_FRAMEWORK override (JWT auth broken) |
| 2026-02-25 | Fixed CheckUsernameAPIView crash for users without teammember |
| 2026-02-25 | Fixed V4 API routes: NEXT_PUBLIC_ → DJANGO_API_BASE |
| 2026-02-25 | V4 Dockerfile: node:22-slim + explicit Linux native binaries |
| 2026-02-25 | Comprehensive V4 deployment documentation added |
| 2026-02-24 | Initial Django Railway deployment - health check passing |
| 2026-02-24 | Fixed 13 Django deployment issues (see table above) |
| 2026-02-24 | Added HealthCheckShortCircuitMiddleware |
| 2026-02-24 | Made S3/Redis/DB configs conditional with fallbacks |
| 2026-02-24 | Created Python startup script (scripts/start.py) |
| 2026-02-24 | Added local capi_param_builder stub |

---

*This document is part of the TWCako deployment documentation suite.*
*For questions, contact Kent Lucky Buhawe (CTO).*

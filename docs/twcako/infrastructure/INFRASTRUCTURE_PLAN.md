# TWCako Production Infrastructure Plan

**Version:** 2.0
**Date:** 2026-02-22
**Author:** CTO
**Status:** Planning
**Last Updated:** 2026-02-22 (Enterprise-grade improvements)

---

## Executive Summary

This document outlines the production infrastructure for TWCako, designed to handle:
- **10,000+ daily active users**
- **High traffic from Facebook Ads**
- **99.9% uptime SLA**
- **Separated frontend/backend architecture**
- **Manual scaling with pre-campaign preparation** (Railway limitation)
- **Zero-downtime deployments**
- **Private networking between services (IPv6)**
- **High-availability PostgreSQL cluster**

### Deployment Phases

| Phase | Timeline | Target Cost | Focus |
|-------|----------|-------------|-------|
| **Development** | Now - Apr 2026 | **~$20-30/mo** | Minimal, functional, easy to upgrade |
| **Launch** | May 2026+ | ~$150-250/mo | Scale for 10k+ DAU, FB campaigns |

### Key Railway Limitations (For Launch Phase)

| Feature | Expected | Reality | Mitigation |
|---------|----------|---------|------------|
| **Auto-scaling** | Automatic based on CPU/Memory | **Manual only** | Pre-scale before FB campaigns, or use Judoscale |
| **PostgreSQL Replica** | Native read replica | **Not available** | Use PostgreSQL HA Cluster Template (launch phase) |
| **PgBouncer** | Built-in | **Not included** | Use `django-db-connection-pool` |
| **Redis Cluster** | Multi-node | **Single node only** | Consider Upstash for HA (launch phase) |

---

## Architecture Overview

### Development Phase (Now - Apr 2026) ~$20-30/mo

```
                              ┌─────────────────┐
                              │   Cloudflare    │
                              │   (FREE Plan)   │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                      │
                    ▼                                      ▼
          ┌─────────────────┐                  ┌─────────────────┐
          │  staging.       │                  │  api-staging.   │
          │  twcako.com     │                  │  twcako.com     │
          │  (Next.js)      │                  │  (Django)       │
          └────────┬────────┘                  └────────┬────────┘
                   │                                    │
                   └──────────────┬─────────────────────┘
                                  │
                         Railway (Minimal)
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
        ┌──────────┐        ┌──────────┐        ┌──────────┐
        │  Web x1  │        │ Worker x1│        │PostgreSQL│
        │ Gunicorn │        │  Celery  │        │ (Single) │
        └──────────┘        └──────────┘        └──────────┘
                                  │
                            ┌─────┴─────┐
                            │   Redis   │
                            │(Railway)  │
                            └───────────┘
```

**Development Phase Services:**
| Service | Replicas | Est. Cost | Notes |
|---------|----------|-----------|-------|
| Web (Django) | 1 | ~$5-10 | Minimal usage during dev |
| Celery Worker | 1 | ~$3-5 | Combined worker + beat |
| PostgreSQL | 1 | ~$5-10 | Single instance |
| Redis | 1 | ~$3-5 | Railway Redis |
| **Total** | | **~$16-30/mo** | |

---

### Launch Phase (May 2026+) ~$150-250/mo

```
                                    ┌─────────────────┐
                                    │   Cloudflare    │
                                    │   (Pro $20/mo)  │
                                    └────────┬────────┘
                                             │ HTTPS (Public)
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
              ▼                              ▼                              ▼
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│     twcako.com        │      │  dashboard.twcako.com │      │    api.twcako.com     │
│  or app.twcako.com    │      │  (Member Dashboard)   │      │   (Django REST API)   │
│  (Next.js Frontend)   │      │  (Next.js Frontend)   │      │                       │
└───────────┬───────────┘      └───────────┬───────────┘      └───────────┬───────────┘
            │                              │                              │
            └──────────────────────────────┼──────────────────────────────┘
                                           │
                              Railway (Production Scale)
                            ════════════════════════════════
                              Private Network (IPv6/Wireguard)
                            ════════════════════════════════
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                              │
                    ▼                                              ▼
        ┌───────────────────────┐    HTTP (Internal)   ┌───────────────────────┐
        │   Frontend Service    │◄────────────────────►│   Backend Service     │
        │   (Next.js x2)        │   .railway.internal  │   (Django + Gunicorn) │
        └───────────────────────┘                      └───────────┬───────────┘
                                                                   │
                                              ┌────────────────────┼────────────────────┐
                                              │                    │                    │
                                              ▼                    ▼                    ▼
                                        ┌──────────┐        ┌──────────┐        ┌──────────┐
                                        │  Web x2  │        │  Celery  │        │  Celery  │
                                        │ Gunicorn │        │ Workers  │        │   Beat   │
                                        │  (IPv6)  │        │  (x2-3)  │        │   (x1)   │
                                        └──────────┘        └──────────┘        └──────────┘
                                              │
                               ┌──────────────┴──────────────┐
                               │   Private Network (IPv6)    │
                               ▼                             ▼
                    ┌─────────────────────┐          ┌─────────────┐
                    │     PostgreSQL      │          │    Redis    │
                    │  (Add HA Cluster    │          │  (Upstash   │
                    │   when needed)      │          │  if needed) │
                    └─────────────────────┘          └─────────────┘
```

### Private Networking (Enable at Launch)

All inter-service communication uses Railway's private network:
- **Protocol:** Wireguard encrypted tunnels
- **Addressing:** IPv6 (`.railway.internal` DNS)
- **Benefits:** No egress costs, lower latency, enhanced security
- **Requirement:** Services must bind to `[::]` (IPv6)

### Domain Structure (Complete Setup)

**Set up ALL domains now, even in dev phase. At launch, just scale up.**

| Domain | Purpose | Service | Phase |
|--------|---------|---------|-------|
| `twcako.com` | Main landing / marketing | Next.js (Railway) | Dev |
| `www.twcako.com` | Redirect to twcako.com | Cloudflare redirect | Dev |
| `app.twcako.com` | Member app / funnels | Next.js (Railway) | Dev |
| `dashboard.twcako.com` | Member dashboard | Next.js (Railway) | Dev |
| `api.twcako.com` | REST API (Django) | Django (Railway) | Dev |
| `*.store.twcako.com` | Member stores (wildcard) | Next.js (Railway) | Dev |
| `staging.twcako.com` | Staging frontend | Railway Staging | Dev |
| `api-staging.twcako.com` | Staging API | Railway Staging | Dev |

### Member Store Subdomains

Each member gets their own store subdomain:
```
john.store.twcako.com    → Member John's store
maria.store.twcako.com   → Member Maria's store
*.store.twcako.com       → Wildcard catches all
```

**Wildcard SSL:** Cloudflare FREE plan supports wildcard SSL for `*.store.twcako.com`

---

## Component Breakdown

### 1. CDN & Edge Layer (Cloudflare) - SET UP NOW

> **Strategy:** Set up complete Cloudflare configuration now (FREE plan). Upgrade to Pro at launch.

**Cloudflare Plan by Phase:**

| Phase | Plan | Cost | Features |
|-------|------|------|----------|
| **Development** | FREE | $0 | SSL, CDN, basic DDoS, DNS |
| **Launch** | Pro | $20/mo | WAF, better caching, image optimization |
| **Scale** | Business | $200/mo | Advanced WAF, 100% uptime SLA |

---

### Cloudflare DNS Setup (Complete)

**Set up ALL records now:**

```
TYPE    NAME                    CONTENT                         PROXY
─────────────────────────────────────────────────────────────────────────
# Main domains
CNAME   twcako.com             <railway-frontend>.up.railway.app   ✅ Proxied
CNAME   www                    twcako.com                          ✅ Proxied
CNAME   app                    <railway-frontend>.up.railway.app   ✅ Proxied
CNAME   dashboard              <railway-frontend>.up.railway.app   ✅ Proxied

# API
CNAME   api                    <railway-backend>.up.railway.app    ✅ Proxied

# Member stores (WILDCARD)
CNAME   *.store                <railway-frontend>.up.railway.app   ✅ Proxied

# Staging
CNAME   staging                <railway-staging-fe>.up.railway.app ✅ Proxied
CNAME   api-staging            <railway-staging-be>.up.railway.app ✅ Proxied

# Email (if using)
MX      @                      mail provider records               DNS only
TXT     @                      SPF/DKIM records                    DNS only
```

**Get Railway URLs:**
```bash
# After deploying to Railway, get the public URL:
railway status
# Shows: https://twcako-production-xxxx.up.railway.app
```

---

### Cloudflare SSL/TLS Settings

```
SSL/TLS Mode: Full (strict)
Always Use HTTPS: ON
Minimum TLS Version: TLS 1.2
Automatic HTTPS Rewrites: ON
```

**Edge Certificates:**
- Universal SSL (FREE) covers: `twcako.com`, `*.twcako.com`
- For `*.store.twcako.com`, you need **Advanced Certificate Manager** ($10/mo) OR use Cloudflare for SaaS

**Simpler Option for Stores:**
```
# Instead of *.store.twcako.com, use path-based routing:
twcako.com/store/john    → John's store
twcako.com/store/maria   → Maria's store

# This avoids wildcard SSL complexity
```

---

### Cloudflare Page Rules (Set Up Now)

**Development Phase (FREE plan - 3 rules max):**

| Rule | URL Pattern | Setting |
|------|-------------|---------|
| 1 | `*twcako.com/static/*` | Cache Level: Cache Everything, Edge TTL: 1 month |
| 2 | `*twcako.com/api/*` | Cache Level: Bypass |
| 3 | `*twcako.com/admin/*` | Cache Level: Bypass, Security Level: High |

**Launch Phase (Pro plan - 20 rules):**

| Rule | URL Pattern | Setting |
|------|-------------|---------|
| 1 | `*twcako.com/static/*` | Cache Everything, Edge TTL: 1 year |
| 2 | `*twcako.com/media/*` | Cache Everything, Edge TTL: 1 month |
| 3 | `api.twcako.com/*` | Cache Bypass, Security: High |
| 4 | `*twcako.com/admin/*` | Cache Bypass, Security: High |
| 5 | `*twcako.com/health/*` | Cache Bypass |
| 6 | `*.store.twcako.com/*` | Cache Standard, Edge TTL: 1 day |

---

### Cloudflare Security Settings

**Development Phase (Basic):**
```
Security Level: Medium
Challenge Passage: 30 minutes
Browser Integrity Check: ON
```

**Launch Phase (Hardened):**
```
Security Level: High
Challenge Passage: 15 minutes
Browser Integrity Check: ON
Bot Fight Mode: ON (Pro)
WAF: ON with OWASP ruleset (Pro)

# Rate Limiting Rules (Pro)
- Login endpoint: 5 requests/minute per IP
- API endpoints: 100 requests/minute per IP
- Store pages: 60 requests/minute per IP
```

---

### Cloudflare Redirect Rules

```
# www to non-www
www.twcako.com/* → https://twcako.com/$1 (301 redirect)

# HTTP to HTTPS (automatic with "Always Use HTTPS")
```

---

### Load Balancing Architecture

**Cloudflare acts as your load balancer (FREE):**

```
                         Internet
                            │
                            ▼
                    ┌───────────────┐
                    │  Cloudflare   │
                    │  (Edge/CDN)   │
                    │               │
                    │ • SSL termination
                    │ • DDoS protection
                    │ • Caching
                    │ • Geographic routing
                    └───────┬───────┘
                            │
           ┌────────────────┼────────────────┐
           │                │                │
           ▼                ▼                ▼
    ┌────────────┐   ┌────────────┐   ┌────────────┐
    │  Railway   │   │  Railway   │   │  Railway   │
    │  Frontend  │   │  Frontend  │   │  Backend   │
    │  (Next.js) │   │  (Next.js) │   │  (Django)  │
    │            │   │            │   │            │
    │ twcako.com │   │ dashboard. │   │ api.       │
    │ app.       │   │ *.store.   │   │ twcako.com │
    └────────────┘   └────────────┘   └────────────┘
           │                │                │
           └────────────────┼────────────────┘
                            │
                    Railway Internal
                    Load Balancer
                    (handles replicas)
```

**How it works:**
1. **Cloudflare** routes traffic by domain to correct Railway service
2. **Railway** distributes requests across replicas (when you scale to 2+)
3. **No extra load balancer needed** - Railway handles this automatically

---

### 2. Frontend (Next.js on Railway)

**Why Railway for Frontend:**
- Single platform for frontend + backend (easier management)
- Cloudflare CDN handles static asset caching
- Same deployment pipeline as backend
- **Private networking** for internal API calls (no egress costs)
- Cost-effective for our scale
- Can migrate to Vercel later if needed

**Setup:**
```
Repository: Techno-Wealth-Creators/TWCAKOV4
Production Branch: main
Staging Branch: develop
```

**Environment Variables:**
```bash
# Public (exposed to browser)
NEXT_PUBLIC_API_URL=https://api.twcako.com
NEXT_PUBLIC_SITE_URL=https://twcako.com
NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.twcako.com
NEXTAUTH_URL=https://dashboard.twcako.com
NEXTAUTH_SECRET=<generate-secure-secret>

# Private (server-side only - uses Railway private network)
# For API routes and server components
INTERNAL_API_URL=http://django-web.railway.internal:8000
```

**Private Networking for SSR/API Routes:**

```typescript
// lib/api.ts - Use internal URL for server-side calls
const getApiUrl = () => {
  // Server-side: use private network (no egress, faster)
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL || 'http://django-web.railway.internal:8000';
  }
  // Client-side: use public URL
  return process.env.NEXT_PUBLIC_API_URL || 'https://api.twcako.com';
};
```

**Railway Frontend Service:**
| Setting | Value |
|---------|-------|
| Build Command | `npm run build` |
| Start Command | `npm start -- -H ::` |
| Port | 3000 |
| Health Check | `/api/health` |
| Replicas | 2 (manual scaling) |

> **Note:** The `-H ::` flag enables IPv6 binding for private networking.

**Next.js IPv6 Configuration:**

If using custom server, ensure IPv6 binding:
```javascript
// server.js (if custom server)
const server = app.listen(port, '::', () => {
  console.log(`> Ready on http://[::]:${port}`);
});
```

---

### Member Store Subdomains (*.store.twcako.com)

**Option A: Wildcard Subdomain (Recommended)**

```typescript
// middleware.ts - Handle store subdomains
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Check if it's a store subdomain
  // e.g., john.store.twcako.com
  const storeMatch = hostname.match(/^([^.]+)\.store\.twcako\.com$/);

  if (storeMatch) {
    const storeSlug = storeMatch[1];
    // Rewrite to /store/[slug] internally
    return NextResponse.rewrite(
      new URL(`/store/${storeSlug}${request.nextUrl.pathname}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

**Option B: Path-Based (Simpler, No Wildcard SSL)**

```
twcako.com/store/john    → John's store
twcako.com/store/maria   → Maria's store
```

```typescript
// app/store/[slug]/page.tsx
export default function StorePage({ params }: { params: { slug: string } }) {
  // Fetch store data by slug
  return <StoreLayout storeSlug={params.slug} />;
}
```

**Recommendation:** Start with **Option B (path-based)** for simplicity.
Switch to **Option A (subdomains)** later if marketing needs custom URLs.

---

### 3. Backend (Django on Railway)

**Service Architecture:**

| Service | Replicas | Memory | CPU | Purpose |
|---------|----------|--------|-----|---------|
| `web` | 2-4 | 1GB | 1 vCPU | Django + Gunicorn |
| `celery-worker` | 2-3 | 512MB | 0.5 vCPU | Async task processing |
| `celery-beat` | 1 | 256MB | 0.25 vCPU | Task scheduler |
| `postgres` | 1 (Primary) | 2GB | 1 vCPU | Database |
| `postgres-replica` | 1 | 1GB | 0.5 vCPU | Read queries |
| `redis` | 1 | 512MB | 0.5 vCPU | Cache + Celery broker |

**Railway Project Structure (Set Up Now):**

Create ALL services now, just run at minimum scale:

```
twcako-production/
├── django-web ────────────── 1 replica (scale to 2-4 at launch)
├── celery-worker ─────────── 1 replica (scale to 2-3 at launch)
├── celery-beat ───────────── 1 replica (always 1)
├── postgres ──────────────── Railway managed
└── redis ─────────────────── Railway managed

twcako-frontend/
├── nextjs-app ────────────── 1 replica (scale to 2 at launch)
└── (shares postgres/redis with backend)

twcako-staging/
├── django-web ────────────── 1 replica
├── celery-worker ─────────── 1 replica
├── nextjs-app ────────────── 1 replica
├── postgres ──────────────── Separate staging DB
└── redis ─────────────────── Separate staging Redis
```

**Service Scaling Reference:**

| Service | Dev Phase | Launch | FB Campaign |
|---------|-----------|--------|-------------|
| django-web | 1 | 2 | 4-6 |
| celery-worker | 1 | 2 | 3 |
| celery-beat | 1 | 1 | 1 |
| nextjs-app | 1 | 2 | 2-3 |

**At launch, scaling is just:**
```bash
railway scale django-web=2
railway scale celery-worker=2
railway scale nextjs-app=2
```

**Gunicorn Configuration (IPv6 Enabled):**
```python
# gunicorn.conf.py
import os
import multiprocessing

# === CRITICAL: IPv6 binding for Railway Private Network ===
# Railway uses IPv6 for internal communication between services
port = os.environ.get('PORT', '8000')
bind = f"[::]:{port}"  # IPv6 binding (required for private networking)

# Alternative: Dual-stack binding (both IPv4 and IPv6)
# bind = [f"0.0.0.0:{port}", f"[::]:{port}"]

# Workers = (2 x CPU cores) + 1, capped at 4 for Railway
workers = min(multiprocessing.cpu_count() * 2 + 1, 4)
worker_class = "gthread"
threads = 4
timeout = 120
keepalive = 5
max_requests = 1000
max_requests_jitter = 50
preload_app = True
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Graceful shutdown (matches RAILWAY_DEPLOYMENT_DRAINING_SECONDS)
graceful_timeout = 30
```

**Why IPv6?**
- Railway's private network is IPv6-only
- Services communicate via `.railway.internal` DNS names
- Internal traffic is encrypted via Wireguard (no need for HTTPS internally)
- No egress charges for internal traffic

**Procfile:**
```
web: gunicorn twcako.wsgi:application -c gunicorn.conf.py
celery-worker: celery -A twcako worker -l info --concurrency=4 -Q default,finance,notifications
celery-beat: celery -A twcako beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### 3.5 Railway Config as Code (railway.json)

> Version control your Railway configuration for reproducible deployments.

**`railway.json` (Backend Service):**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "numReplicas": 2,
    "startCommand": "gunicorn twcako.wsgi:application -c gunicorn.conf.py",
    "healthcheckPath": "/health/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Railway Environment Variables (Zero-Downtime):**

```bash
# === DEPLOYMENT SETTINGS ===
# Keep old deployment running during switch (zero-downtime)
RAILWAY_DEPLOYMENT_OVERLAP_SECONDS=30

# Time for graceful shutdown before SIGKILL
RAILWAY_DEPLOYMENT_DRAINING_SECONDS=30

# Health check timeout (5 minutes for slow startups)
RAILWAY_HEALTHCHECK_TIMEOUT_SEC=300

# === PORT ===
PORT=8000
```

**Deployment Flow with Health Checks:**

```
1. New deployment starts
2. Health check runs against /health/
   └─ Retries up to 10 times (restartPolicyMaxRetries)
   └─ Timeout: 300 seconds (healthcheckTimeout)
3. If healthy:
   └─ Traffic switches to new deployment
   └─ Old deployment kept running for 30s (OVERLAP_SECONDS)
   └─ Old deployment receives SIGTERM
   └─ 30s grace period for shutdown (DRAINING_SECONDS)
   └─ Old deployment receives SIGKILL
4. If unhealthy:
   └─ Deployment marked as failed
   └─ Old deployment stays active
   └─ Alert sent (if configured)
```

**Multiple railway.json for Different Services:**

```
twcako/
├── railway.json              # Web service config
├── railway.worker.json       # Celery worker config
├── railway.beat.json         # Celery beat config
├── Dockerfile                # Web Dockerfile
├── Dockerfile.worker         # Worker Dockerfile
└── Dockerfile.beat           # Beat Dockerfile
```

**`railway.worker.json` (Celery Worker):**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.worker"
  },
  "deploy": {
    "numReplicas": 2,
    "startCommand": "celery -A twcako worker -l info -c 4 -Q default,finance,notifications",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

---

### 4. Database Layer (PostgreSQL)

### Development Phase: Simple Single Instance

**Railway PostgreSQL (Single Node):**
- **Plan:** Railway Hobby/Pro
- **Cost:** ~$5-10/month
- **Sufficient for:** Development, staging, up to 50k DAU

```python
# settings/base.py - Simple setup (works for dev AND launch)
import os

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('PGDATABASE', 'railway'),
        'USER': os.environ.get('PGUSER', 'postgres'),
        'PASSWORD': os.environ.get('PGPASSWORD'),
        'HOST': os.environ.get('PGHOST', 'localhost'),
        'PORT': os.environ.get('PGPORT', '5432'),
        'CONN_MAX_AGE': 60,  # Reuse connections for 60s
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}
```

---

### Launch Phase: Add Connection Pooling

When you start seeing connection issues (usually 20k+ DAU):

Install: `pip install django-db-connection-pool`

```python
# settings/production.py - With connection pooling
DATABASES = {
    'default': {
        'ENGINE': 'dj_db_conn_pool.backends.postgresql',  # Pooled
        'NAME': os.environ.get('PGDATABASE', 'railway'),
        'USER': os.environ.get('PGUSER', 'postgres'),
        'PASSWORD': os.environ.get('PGPASSWORD'),
        'HOST': os.environ.get('PGHOST'),
        'PORT': os.environ.get('PGPORT', '5432'),
        'CONN_MAX_AGE': 0,  # Let pool manage connections
        'POOL_OPTIONS': {
            'POOL_SIZE': 10,       # Base connections
            'MAX_OVERFLOW': 20,    # Extra under load
            'RECYCLE': 300,        # Recycle after 5 min
        },
    }
}
```

---

### Future Upgrade: HA Cluster (Only When Needed)

**When to upgrade:**
- DB CPU > 70% sustained
- 50k+ DAU
- Need automatic failover

**PostgreSQL 18 HA Cluster Template:**
Deploy from: https://railway.com/deploy/postgresql-18-ha-cluster-ai-and-gis-read

| Component | Purpose |
|-----------|---------|
| **Primary** | Read/Write operations |
| **Replica** | Read-only (streaming replication) |
| **Pgpool-II** | Load balancing + automatic failover |

**Cost:** ~$60-80/month (vs ~$20 for single node)

```python
# settings/production.py - With HA Cluster + Replica
DATABASES = {
    'default': {
        'ENGINE': 'dj_db_conn_pool.backends.postgresql',
        'HOST': os.environ.get('PGPOOL_HOST'),  # Via Pgpool proxy
        # ... same as above
    },
    'replica': {
        'ENGINE': 'dj_db_conn_pool.backends.postgresql',
        'HOST': os.environ.get('PG_REPLICA_HOST'),  # Direct to replica
        # ... for heavy read queries
    }
}

DATABASE_ROUTERS = ['twcako.db_router.PrimaryReplicaRouter']
```

---

### 5. Caching Layer (Redis)

### Development Phase: Railway Redis (Simple)

**Railway Redis:**
- **Cost:** ~$3-5/month
- **Setup:** One-click in Railway dashboard
- **Sufficient for:** Dev, staging, launch

```python
# settings/base.py - Simple Redis setup
import os

REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
        },
        'KEY_PREFIX': 'twcako',
        'TIMEOUT': 300,  # 5 minutes default
    }
}

# Session backend (Redis-backed)
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# Celery broker (same Redis)
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
```

---

### Launch Phase: Enhanced Config

```python
# settings/production.py - Production Redis config
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'RETRY_ON_TIMEOUT': True,
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
            },
            # Compression for large cached values
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
        },
        'KEY_PREFIX': 'twcako',
        'TIMEOUT': 300,
    }
}
```

**What to Cache (Priority Order):**

| Data | TTL | Priority |
|------|-----|----------|
| eCash balances | 5 min | Critical |
| User sessions | 24 hours | High |
| Team hierarchy | 30 min | Medium |
| Product catalog | 1 hour | Medium |
| API responses | 1-5 min | Low |

---

### Future Upgrade: Upstash (Only If Needed)

**When to consider Upstash:**
- Need multi-region (global users)
- Need automatic failover
- Railway Redis becomes bottleneck

Website: https://upstash.com/redis (Free tier: 10k commands/day)

---

### 6. Scaling Strategy

> **Important:** Railway does NOT support automatic horizontal scaling based on load.
> You must scale manually or use third-party solutions.

**Railway Scaling Options:**

| Type | How It Works | When to Use |
|------|--------------|-------------|
| **Vertical (Auto)** | Railway auto-adjusts CPU/Memory | Always on, handles small spikes |
| **Horizontal (Manual)** | You set replica count via CLI/UI | Pre-scale before FB campaigns |
| **Horizontal (Judoscale)** | Third-party auto-scaler | Production recommendation |

**Option 1: Manual Scaling (Default)**

```bash
# Before FB Ad campaign
railway scale web=4

# After campaign ends
railway scale web=2

# Check current replicas
railway status
```

**Option 2: Judoscale (Recommended for Enterprise)**

Website: https://judoscale.com/railway

| Feature | Benefit |
|---------|---------|
| **Auto-scale** | Based on request queue depth |
| **Cost** | ~$20/month |
| **Setup** | Add adapter gem/package |
| **Custom metrics** | Scale on custom thresholds |

**Scaling Playbook:**

| Scenario | Replicas | Action |
|----------|----------|--------|
| **Normal** | 2 web, 2 workers | Default state |
| **Peak hours (9AM-9PM PHT)** | 3 web, 2 workers | Scheduled via cron or manual |
| **FB Ads (1 day before)** | 4-6 web, 3 workers | Pre-scale 24h before campaign |
| **FB Ads (during)** | Monitor and adjust | Check Railway metrics hourly |
| **After campaign** | Scale down to 2 | Wait 2-4 hours after campaign ends |

**Pre-Campaign Checklist:**

```markdown
□ Scale web to 4-6 replicas (24h before)
□ Scale celery-worker to 3 replicas
□ Verify Redis has capacity
□ Clear unnecessary cache
□ Check database connection pool
□ Set up Slack alerts for errors
□ Have rollback plan ready
```

**Traffic Capacity Planning:**

```
Per Gunicorn instance:
- Workers: 4
- Threads: 4
- Concurrent connections: 16

With 4 replicas:
- Total concurrent: 64 connections
- With Cloudflare caching (~60% hit rate): ~160 effective req/sec
- Estimated capacity: ~500k requests/hour
```

---

### 7. Monitoring & Observability

**Recommended Stack:**

| Tool | Purpose | Cost |
|------|---------|------|
| **Sentry** | Error tracking | Free tier / $26/mo |
| **Railway Metrics** | Basic metrics | Included |
| **Better Uptime** | Uptime monitoring | Free tier |
| **Logtail** | Log aggregation | Free tier |

**Sentry Setup:**
```python
# settings/production.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    integrations=[
        DjangoIntegration(),
        CeleryIntegration(),
        RedisIntegration(),
    ],
    traces_sample_rate=0.1,  # 10% of transactions
    profiles_sample_rate=0.1,
    environment=os.environ.get('ENVIRONMENT', 'production'),
)
```

**Health Check Endpoints:**
```
/health/          → Full health check (DB, Redis, Celery)
/health/live/     → Liveness (is process running?)
/health/ready/    → Readiness (can accept traffic?)
```

> **Critical:** Railway uses hostname `healthcheck.railway.app` for health checks.
> You MUST add this to Django's ALLOWED_HOSTS or health checks will fail (403).

**Django Settings for Health Checks:**

```python
# settings/production.py

ALLOWED_HOSTS = [
    # Production domains
    'api.twcako.com',
    'staging.twcako.com',

    # Railway health checks (REQUIRED)
    'healthcheck.railway.app',

    # Private networking (internal service communication)
    '.railway.internal',

    # Railway deployment URLs (for staging/preview)
    '.up.railway.app',
]

CSRF_TRUSTED_ORIGINS = [
    'https://api.twcako.com',
    'https://twcako.com',
    'https://dashboard.twcako.com',
    'https://app.twcako.com',
    'https://staging.twcako.com',
]
```

**Alerts to Configure:**
| Alert | Threshold | Action |
|-------|-----------|--------|
| Error rate | > 1% | Slack notification |
| Response time | > 2s p95 | Slack notification |
| Downtime | > 30s | SMS + Slack |
| CPU | > 90% for 5min | Auto-scale + Slack |
| Memory | > 90% | Slack notification |
| DB connections | > 80 | Slack notification |

---

### 8. Security Hardening

**Django Settings:**
```python
# Security settings for production
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
```

**Cloudflare WAF Rules:**
1. Block known bad bots
2. Challenge suspicious IPs
3. Rate limit login endpoints (10 req/min)
4. Block SQL injection patterns
5. Block XSS patterns

**API Rate Limiting:**
```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'login': '5/minute',
    }
}
```

---

### 9. Disaster Recovery

**Backup Strategy:**
| Data | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| PostgreSQL | Daily + WAL | 30 days | S3 Singapore |
| Redis | Hourly snapshot | 7 days | Railway |
| Media files | Realtime (S3) | Forever | S3 Singapore |
| Code | Git | Forever | GitHub |

**Recovery Time Objectives:**
| Scenario | RTO | RPO |
|----------|-----|-----|
| Web service failure | < 5 min | 0 (stateless) |
| Database failure | < 30 min | < 1 hour |
| Complete region failure | < 2 hours | < 1 hour |

**Rollback Procedure:**
```bash
# Railway automatic rollback
railway rollback

# Or manual via GitHub
git revert HEAD
git push origin main
```

---

## Implementation Roadmap

### 🔧 DEVELOPMENT PHASE (Now - Apr 2026)

**Goal:** Complete infrastructure setup at minimum scale (~$20-30/mo)

#### Week 1: Cloudflare Setup (Complete)
- [ ] Create Cloudflare account (FREE plan)
- [ ] Add `twcako.com` domain to Cloudflare
- [ ] Update domain registrar nameservers to Cloudflare
- [ ] Wait for DNS propagation (up to 24h)
- [ ] Configure SSL/TLS: Full (strict)
- [ ] Enable "Always Use HTTPS"
- [ ] Set up page rules (3 max on free):
  - [ ] `/static/*` → Cache Everything
  - [ ] `/api/*` → Bypass Cache
  - [ ] `/admin/*` → Bypass Cache, Security High

#### Week 1: Railway Setup (All Services)
- [ ] Create Railway project: `twcako-production`
- [ ] Deploy Django service: `django-web` (1 replica)
- [ ] Deploy Celery service: `celery-worker` (1 replica)
- [ ] Deploy Celery Beat: `celery-beat` (1 replica)
- [ ] Add PostgreSQL database
- [ ] Add Redis database
- [ ] Create Railway project: `twcako-staging`
- [ ] Deploy staging services (same structure)

#### Week 1: Connect Cloudflare to Railway
- [ ] Get Railway public URLs for each service
- [ ] Add DNS records in Cloudflare:
  - [ ] `api.twcako.com` → Railway backend
  - [ ] `twcako.com` → Railway frontend
  - [ ] `app.twcako.com` → Railway frontend
  - [ ] `dashboard.twcako.com` → Railway frontend
  - [ ] `staging.twcako.com` → Railway staging
  - [ ] `api-staging.twcako.com` → Railway staging API
- [ ] Verify SSL working on all domains
- [ ] Test health check endpoint

#### Week 1: Monitoring Setup
- [ ] Set up Sentry **FREE** tier
- [ ] Set up Better Uptime **FREE** (3 monitors)
  - [ ] Monitor: `https://api.twcako.com/health/`
  - [ ] Monitor: `https://twcako.com`
  - [ ] Monitor: `https://dashboard.twcako.com`

#### Week 2: CI/CD Pipeline
- [ ] GitHub Actions for lint + tests
- [ ] Auto-deploy to Railway staging on push to `develop`
- [ ] Auto-deploy to Railway production on push to `main`
- [ ] Add `healthcheck.railway.app` to ALLOWED_HOSTS

#### Week 3-8: Feature Development
- [ ] Focus on building features
- [ ] Use local PostgreSQL for heavy testing
- [ ] Monitor Railway costs weekly
- [ ] Keep services minimal (1 replica each)

#### Monthly: Infrastructure Review
- [ ] Check Railway billing
- [ ] Review Sentry errors
- [ ] Check uptime reports
- [ ] Verify all domains still working

---

### 🚀 LAUNCH PHASE (2 Weeks Before Launch - Apr 2026)

**Goal:** Production-ready, scalable, ~$150-250/mo

#### Pre-Launch Week 1: Scale Infrastructure
- [ ] Upgrade Cloudflare to **Pro** ($20/mo)
- [ ] Upgrade Sentry to **Team** plan
- [ ] Scale web to 2 replicas
- [ ] Separate Celery worker and beat into 2 services
- [ ] Scale worker to 2 replicas
- [ ] Add `django-db-connection-pool`
- [ ] Add critical database indexes

#### Pre-Launch Week 2: Production Hardening
- [ ] Update Gunicorn for IPv6 binding
- [ ] Configure private networking
- [ ] Add Railway deployment variables (overlap, draining)
- [ ] Set up Better Uptime monitoring
- [ ] Configure Slack alerts
- [ ] Create `railway.json` config files
- [ ] Load test with k6
- [ ] Create scaling playbook for FB campaigns

---

### 📈 POST-LAUNCH (When Needed)

**Upgrades to add based on metrics:**

| Trigger | Action |
|---------|--------|
| DB CPU > 70% sustained | Add PostgreSQL HA Cluster |
| 50k+ DAU | Add read replica |
| Redis issues | Switch to Upstash |
| Manual scaling painful | Add Judoscale |
| Advanced security needed | Upgrade Cloudflare to Business |

---

## Cost Estimate

### Development Phase (Now - Apr 2026) 🎯 Target: ~$20-35/mo

**Full infrastructure, minimum scale:**

| Service | Replicas | Monthly Cost | Notes |
|---------|----------|--------------|-------|
| **django-web** | 1 | ~$5-10 | Django + Gunicorn |
| **celery-worker** | 1 | ~$3-5 | Background tasks |
| **celery-beat** | 1 | ~$2-3 | Scheduler |
| **nextjs-app** | 1 | ~$3-5 | Frontend |
| **PostgreSQL** | 1 | ~$5-10 | Single instance |
| **Redis** | 1 | ~$3-5 | Cache + Celery broker |
| **Cloudflare** | FREE | $0 | CDN + SSL + DNS |
| **Sentry** | FREE | $0 | 5k errors/month |
| **Better Uptime** | FREE | $0 | 3 monitors |
| **S3 (Media)** | ~ | ~$1-5 | Minimal during dev |
| **Total** | | **~$22-43/month** |

**All domains configured:**
- `twcako.com` ✓
- `app.twcako.com` ✓
- `dashboard.twcako.com` ✓
- `api.twcako.com` ✓
- `staging.twcako.com` ✓

**At launch, just scale up - no new setup needed!**

---

### Launch Phase (May 2026+) - 10k DAU

| Service | Plan | Monthly Cost | Notes |
|---------|------|--------------|-------|
| **Railway Backend** | Pro | ~$50-80 | 2 web + 2 workers + 1 beat |
| **Railway Frontend** | Pro | ~$20-40 | 1-2 replicas |
| **Railway PostgreSQL** | Pro | ~$20-40 | Single instance (no replica needed yet) |
| **Railway Redis** | Pro | ~$10-20 | Single instance |
| **Cloudflare** | Pro | $20 | CDN + WAF + better caching |
| **Sentry** | Team | $26 | Error tracking |
| **Better Uptime** | Free | $0 | Uptime monitoring |
| **S3 (Media)** | ~ | $10-20 | Singapore region |
| **Total** | | **~$156-246/month** |

---

### FB Ad Campaign Mode (When Needed)

| Service | Change | Added Cost |
|---------|--------|------------|
| Web replicas | 2 → 4 | +$30-40 |
| Worker replicas | 2 → 3 | +$15-20 |
| **Campaign Total** | | **~$200-300/month** |

---

### Upgrade Path (Only When Needed)

| Upgrade | Cost | Trigger |
|---------|------|---------|
| **PostgreSQL HA Cluster** | +$40-60/mo | DB CPU > 70% sustained |
| **Upstash Redis** | +$0-20/mo | Need Redis HA/multi-region |
| **Judoscale** | +$20/mo | Tired of manual scaling |
| **Cloudflare Business** | +$180/mo | Need advanced WAF |

### Cost Optimization Tips

1. **Start with Hobby plan** - Railway auto-upgrades when needed
2. **Use all free tiers** - Cloudflare, Sentry, Better Uptime
3. **Single worker process** - Combine worker+beat during dev
4. **No replica until 50k+ DAU** - Single PostgreSQL is fine
5. **Monitor Railway usage** - Scale down when not testing

*Note: Railway charges by compute hours. Sleep services when not in use during dev.*

---

## Decisions Made

### Development Phase (Now)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hosting | Railway (single platform) | Simple, one dashboard |
| Database | **Single PostgreSQL** | Sufficient for dev, cheap |
| Redis | **Railway Redis** | Simple, cheap |
| CDN | **Cloudflare FREE** | Good enough for dev |
| Monitoring | **Sentry FREE** | 5k errors/month |
| Replicas | **1 of each** | Minimize cost |

### Launch Phase (May 2026)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CDN/WAF | **Cloudflare Pro** | Better caching, WAF |
| Monitoring | **Sentry Team** | More errors, better alerts |
| Replicas | 2 web, 2 workers | Handle 10k DAU |
| Scaling | **Manual** | Scale before FB campaigns |
| Private networking | **IPv6** | Faster internal calls |
| Health checks | 3-tier | Zero-downtime deploys |

### Future Upgrades (When Needed)

| Trigger | Upgrade |
|---------|---------|
| DB CPU > 70% | Add PostgreSQL HA Cluster |
| Connection issues | Add `django-db-connection-pool` |
| 50k+ DAU | Add read replica |
| Manual scaling painful | Add Judoscale |

### Architecture Decisions Log

| Date | Decision | Why |
|------|----------|-----|
| 2026-02-22 | Start with single PostgreSQL | No replica needed until 50k+ DAU |
| 2026-02-22 | Use Cloudflare FREE for dev | Upgrade to Pro at launch |
| 2026-02-22 | Add `healthcheck.railway.app` to ALLOWED_HOSTS | Required for Railway |
| 2026-02-22 | Plan for IPv6 at launch | Required for private networking |

---

## Appendix

### A. Environment Variables

#### Development Phase (Minimal)

```bash
# === DJANGO ===
DJANGO_SECRET_KEY=<secure-random-string>
DJANGO_SETTINGS_MODULE=twcako.settings.staging
DEBUG=0

# === DATABASE (Railway auto-provides these) ===
# Railway automatically injects: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
# Or use DATABASE_URL if you prefer

# === REDIS (Railway auto-provides) ===
REDIS_URL=<railway-provides-this>

# === SENTRY (Free tier) ===
SENTRY_DSN=https://xxx@sentry.io/xxx

# === AWS S3 (Optional during dev) ===
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_STORAGE_BUCKET_NAME=twcako-media
AWS_S3_REGION_NAME=ap-southeast-1
```

---

#### Launch Phase (Production)

```bash
# === DJANGO ===
DJANGO_SECRET_KEY=<secure-random-string>
DJANGO_SETTINGS_MODULE=twcako.settings.production
DEBUG=0
ENVIRONMENT=production

# === RAILWAY DEPLOYMENT (Zero-Downtime) ===
PORT=8000
RAILWAY_DEPLOYMENT_OVERLAP_SECONDS=30
RAILWAY_DEPLOYMENT_DRAINING_SECONDS=30
RAILWAY_HEALTHCHECK_TIMEOUT_SEC=300

# === NEXT.JS FRONTEND ===
NEXT_PUBLIC_API_URL=https://api.twcako.com
NEXT_PUBLIC_SITE_URL=https://twcako.com
NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.twcako.com
NEXTAUTH_URL=https://dashboard.twcako.com
NEXTAUTH_SECRET=<secure-random-string>

# Private networking (server-side only)
INTERNAL_API_URL=http://django-web.railway.internal:8000

# === DATABASE ===
# Railway auto-injects: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE

# === REDIS ===
REDIS_URL=<railway-provides-this>

# === AWS S3 ===
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_STORAGE_BUCKET_NAME=twcako-media
AWS_S3_REGION_NAME=ap-southeast-1

# === MONITORING ===
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### B. Railway Service Commands

```bash
# Web service
web: gunicorn twcako.wsgi:application -c gunicorn.conf.py

# Celery worker
worker: celery -A twcako worker -l info -c 4

# Celery beat
beat: celery -A twcako beat -l info

# Migrations (run manually)
release: python manage.py migrate --noinput
```

### C. Useful Commands

```bash
# Check Railway status
railway status

# View logs
railway logs -f

# SSH into service
railway shell

# Run one-off command
railway run python manage.py shell

# Scale service (MANUAL - no auto-scaling)
railway scale web=4

# Scale down after campaign
railway scale web=2

# Rollback deployment
railway rollback

# Check deployment history
railway deployments
```

### D. Pre-Campaign Scaling Checklist

```markdown
# 24 Hours Before FB Ad Campaign

## Scaling
- [ ] `railway scale web=4` (or 6 for large campaigns)
- [ ] `railway scale celery-worker=3`
- [ ] Verify replicas are running: `railway status`

## Monitoring
- [ ] Check Sentry for existing errors
- [ ] Clear old alerts
- [ ] Verify Slack webhook is working
- [ ] Set up campaign-specific alerts (if needed)

## Database
- [ ] Check connection pool usage
- [ ] Clear unnecessary cache: `redis-cli FLUSHDB` (careful!)
- [ ] Verify replica is in sync

## After Campaign (Wait 2-4 hours)
- [ ] `railway scale web=2`
- [ ] `railway scale celery-worker=2`
- [ ] Review error rates in Sentry
- [ ] Document any issues for next campaign
```

---

## Quick Setup Checklist (Week 1)

**Complete infrastructure setup in 1 day:**

### Step 1: Cloudflare (30 min)
```
□ Create account at cloudflare.com
□ Add site: twcako.com
□ Copy nameservers (e.g., anna.ns.cloudflare.com, bob.ns.cloudflare.com)
□ Update at domain registrar
□ SSL/TLS → Full (strict)
□ Edge Certificates → Always Use HTTPS: ON
```

### Step 2: Railway Backend (30 min)
```
□ Create project: twcako-production
□ Add PostgreSQL database
□ Add Redis database
□ Deploy Django from GitHub repo
□ Add environment variables
□ Note the public URL: xxx.up.railway.app
```

### Step 3: Railway Workers (15 min)
```
□ Add service: celery-worker (same repo, different start command)
□ Add service: celery-beat (same repo, different start command)
□ Connect to same PostgreSQL and Redis
```

### Step 4: Railway Frontend (15 min)
```
□ Create project: twcako-frontend (or add to same project)
□ Deploy Next.js from GitHub repo
□ Add environment variables
□ Note the public URL: xxx.up.railway.app
```

### Step 5: Connect Cloudflare DNS (15 min)
```
□ Add CNAME: api → <railway-backend>.up.railway.app (Proxied)
□ Add CNAME: @ → <railway-frontend>.up.railway.app (Proxied)
□ Add CNAME: www → twcako.com (Proxied)
□ Add CNAME: app → <railway-frontend>.up.railway.app (Proxied)
□ Add CNAME: dashboard → <railway-frontend>.up.railway.app (Proxied)
□ Add CNAME: staging → <railway-staging>.up.railway.app (Proxied)
□ Wait 5-10 min for DNS propagation
```

### Step 6: Verify (10 min)
```
□ Visit https://twcako.com - should load
□ Visit https://api.twcako.com/health/ - should return OK
□ Visit https://dashboard.twcako.com - should load
□ Check Cloudflare Analytics - traffic showing
```

### Step 7: Monitoring (10 min)
```
□ Create Sentry account (FREE)
□ Add SENTRY_DSN to Railway
□ Create Better Uptime account (FREE)
□ Add 3 monitors (api health, main site, dashboard)
```

**Total time: ~2 hours**

**Result:** Complete infrastructure ready. At launch, just run:
```bash
railway scale django-web=2
railway scale celery-worker=2
# Upgrade Cloudflare to Pro
```

---

## References

### Railway Documentation
- [Railway Django Deployment Guide](https://docs.railway.com/guides/django)
- [Railway Scaling Documentation](https://docs.railway.com/reference/scaling)
- [Railway Healthchecks](https://docs.railway.com/deployments/healthchecks)
- [Railway Private Networking](https://docs.railway.com/guides/private-networking)
- [Railway Config as Code](https://docs.railway.com/reference/config-as-code)

### Railway Templates
- [PostgreSQL 18 HA Cluster](https://railway.com/deploy/postgresql-18-ha-cluster-ai-and-gis-read)
- [Django + Celery + Redis Stack](https://github.com/Antvirf/railway_django_stack)

### Third-Party Tools
- [Judoscale for Railway (Auto-scaling)](https://judoscale.com/railway)
- [Upstash Redis (Serverless HA)](https://upstash.com/redis)

### Video Tutorial Reference
- "Deploy Django to Railway" by Justin Mitchell (Coding for Entrepreneurs)
- Key takeaways incorporated: Config as code, health checks, private networking

---

*Document generated with enterprise best practices research on 2026-02-22*

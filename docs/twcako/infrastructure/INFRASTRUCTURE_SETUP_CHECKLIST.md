# Infrastructure Setup Checklist

Step-by-step guide to set up the production infrastructure.

## Phase 1: Cloudflare Setup (Do First)

### 1.1 Add Domain to Cloudflare
- [ ] Go to https://dash.cloudflare.com
- [ ] Add site: `twcako.com`
- [ ] Update nameservers at your registrar
- [ ] Wait for DNS propagation (up to 24 hours)

### 1.2 Upgrade to Pro Plan
- [ ] Go to Overview → Change Plan → Pro ($20/month)
- [ ] Enable features unlocked by Pro

### 1.3 SSL/TLS Settings
- [ ] Go to SSL/TLS → Overview
- [ ] Set encryption mode: **Full (strict)**
- [ ] Enable "Always Use HTTPS"
- [ ] Enable "Automatic HTTPS Rewrites"

### 1.4 DNS Records
```
Type    Name              Content                         Proxy
A       dashboard         <Railway IP>                    Proxied (orange)
CNAME   api               <Railway domain>.railway.app   Proxied (orange)
CNAME   staging           <Railway staging>.railway.app  Proxied (orange)
CNAME   www               twcako.com                     Proxied (orange)
```

### 1.5 Caching Rules
Go to **Caching → Cache Rules** and create:

**Rule 1: Cache Static Assets**
```
When: URI Path contains "/static/"
Then: Cache Level = Cache Everything, Edge TTL = 1 month
```

**Rule 2: Bypass Dynamic Content**
```
When: URI Path starts with "/api/" OR "/admin/" OR "/health/"
Then: Cache Level = Bypass
```

### 1.6 Security Settings
- [ ] Security → WAF → Enable Managed Rules
- [ ] Security → Settings → Security Level = Medium
- [ ] Security → Settings → Challenge Passage = 30 minutes
- [ ] Security → Bots → Enable Bot Fight Mode

### 1.7 Rate Limiting (Optional - Pro feature)
- [ ] Security → WAF → Rate Limiting Rules
- [ ] Add rule: `/api/auth/login` - 10 requests per minute per IP

---

## Phase 2: Railway Backend Setup

### 2.1 Create Production Project
- [ ] Go to https://railway.app/dashboard
- [ ] New Project → Deploy from GitHub repo
- [ ] Select `Techno-Wealth-Creators/TWCako`
- [ ] Name: `twcako-production`

### 2.2 Create Services
In your Railway project, create these services:

| Service | Source | Start Command |
|---------|--------|---------------|
| `web` | GitHub repo | `gunicorn twcako.wsgi:application -c gunicorn.conf.py` |
| `worker` | GitHub repo | `celery -A twcako worker -l info -c 4` |
| `beat` | GitHub repo | `celery -A twcako beat -l info` |
| `postgres` | Railway template | (auto) |
| `redis` | Railway template | (auto) |

### 2.3 Configure Web Service
- [ ] Settings → Deploy → Start Command:
  ```
  gunicorn twcako.wsgi:application -c gunicorn.conf.py
  ```
- [ ] Settings → Deploy → Health Check Path: `/health/`
- [ ] Settings → Deploy → Health Check Timeout: `300`
- [ ] Settings → Networking → Generate Domain
- [ ] Settings → Scaling → Replicas: `2` (minimum)

### 2.4 Environment Variables
Add to **web** service (and share with worker/beat):

```bash
# Django
DJANGO_SECRET_KEY=<generate-new-secret>
DJANGO_SETTINGS_MODULE=twcako.settings.production
DEBUG=0
ALLOWED_HOSTS=dashboard.twcako.com,api.twcako.com,.railway.app

# Database (auto-populated by Railway)
POSTGRES_DB=${{Postgres.PGDATABASE}}
POSTGRES_USER=${{Postgres.PGUSER}}
POSTGRES_PASSWORD=${{Postgres.PGPASSWORD}}
POSTGRES_HOST=${{Postgres.PGHOST}}
POSTGRES_PORT=${{Postgres.PGPORT}}

# Redis (auto-populated by Railway)
REDIS_URL=${{Redis.REDIS_URL}}

# Sentry
SENTRY_DSN=<your-sentry-dsn>

# S3/Linode (copy from existing)
LINODE_BUCKET=twcako-storage
LINODE_BUCKET_REGION=ap-south-1
LINODE_BUCKET_ACCESS_KEY=<your-key>
LINODE_BUCKET_SECRET_KEY=<your-secret>

# SendGrid
SENDGRID_API_KEY=<your-key>

# Xendit
XENDIT_API_KEY=<your-key>
XENDIT_WEBHOOK_KEY=<your-key>
```

### 2.5 Custom Domain
- [ ] Settings → Networking → Custom Domain
- [ ] Add: `dashboard.twcako.com`
- [ ] Add: `api.twcako.com`
- [ ] Railway will provide CNAME target for Cloudflare

---

## Phase 3: Railway Staging Setup

### 3.1 Create Staging Project
- [ ] Railway Dashboard → New Project
- [ ] Deploy from GitHub → Same repo
- [ ] Name: `twcako-staging`

### 3.2 Configure Staging
- [ ] Settings → Deploy → Branch: `develop`
- [ ] Same services as production (web, worker, beat, postgres, redis)
- [ ] Add custom domain: `staging.twcako.com`

### 3.3 Staging Environment Variables
Same as production, but with:
```bash
DJANGO_SETTINGS_MODULE=twcako.settings.production
ALLOWED_HOSTS=staging.twcako.com,.railway.app
RAILWAY_ENVIRONMENT=staging
# Use separate database (Railway auto-creates)
# Use separate Redis (Railway auto-creates)
```

---

## Phase 4: Database Replica (Optional)

### 4.1 Create Read Replica
- [ ] In Railway project, click Postgres service
- [ ] Settings → Add Read Replica
- [ ] Note the replica connection string

### 4.2 Configure Django
Add to environment variables:
```bash
POSTGRES_REPLICA_HOST=<replica-host-from-railway>
```

The `db_router.py` will automatically route reads to replica.

---

## Phase 5: Sentry Setup

### 5.1 Create Sentry Project
- [ ] Go to https://sentry.io
- [ ] Create new project → Django
- [ ] Copy DSN

### 5.2 Configure Alerts
- [ ] Alerts → Create Alert Rule
- [ ] Issue Alert: When new issue → Send to Slack/Email
- [ ] Metric Alert: Error rate > 1% → Send to Slack/Email

### 5.3 Add to Railway
```bash
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## Phase 6: GitHub Actions Secrets

### 6.1 Get Railway Token
- [ ] Railway Dashboard → Account Settings → Tokens
- [ ] Create token with name: `github-actions`

### 6.2 Get Project IDs
- [ ] Production project → Settings → Project ID
- [ ] Staging project → Settings → Project ID

### 6.3 Add GitHub Secrets
Go to GitHub repo → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `RAILWAY_TOKEN` | `<token-from-step-6.1>` |
| `RAILWAY_PRODUCTION_PROJECT_ID` | `<production-project-id>` |
| `RAILWAY_STAGING_PROJECT_ID` | `<staging-project-id>` |

---

## Phase 7: Branch Protection

### 7.1 Protect main branch
GitHub → Settings → Branches → Add rule:
- [ ] Branch name pattern: `main`
- [ ] Require pull request before merging
- [ ] Required approvals: `1`
- [ ] Require status checks: `lint`, `security`, `django-checks`
- [ ] Require branches up to date

### 7.2 Protect develop branch
Same settings as main.

---

## Phase 8: Verification

### 8.1 Test Health Endpoint
```bash
curl https://dashboard.twcako.com/health/
# Should return: {"status": "healthy", ...}
```

### 8.2 Test CI Pipeline
```bash
git checkout develop
git checkout -b feature/test-infra
echo "# Test" >> README.md
git add README.md
git commit -m "test: verify infrastructure"
git push -u origin feature/test-infra
# Create PR on GitHub, verify CI passes
```

### 8.3 Test Staging Deploy
- [ ] Merge test PR to `develop`
- [ ] Verify GitHub Action triggers
- [ ] Verify staging.twcako.com is updated

### 8.4 Test Production Deploy
- [ ] Create PR from `develop` to `main`
- [ ] Merge after approval
- [ ] Verify production deployment

---

## Quick Commands

```bash
# Check Railway status
railway status

# View logs
railway logs -f

# Run Django management command
railway run python manage.py shell

# Run migrations
railway run python manage.py migrate

# Scale web service
railway scale web=3

# Rollback to previous deployment
railway rollback
```

---

## Troubleshooting

### Health check failing
1. Check `/health/` endpoint locally
2. Verify database/redis connectivity
3. Check Railway logs: `railway logs`

### Deployment stuck
1. Check GitHub Actions logs
2. Verify Railway token is valid
3. Check Railway dashboard for errors

### Database connection errors
1. Verify environment variables
2. Check connection pooling settings
3. Verify replica is synced

### Slow response times
1. Check Cloudflare cache hit ratio
2. Review Sentry performance traces
3. Check database query performance

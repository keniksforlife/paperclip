# TWCako Scaling Strategy for High-Traffic Users

**Version:** 1.0
**Date:** 2026-02-21
**Status:** Planning

---

## Problem Statement

Some members run aggressive Facebook Ads campaigns that can generate:
- **50,000+ visitors/day** to their funnel pages
- **10x traffic spikes** within minutes when ads go viral
- **Unpredictable patterns** based on ad spend

This creates risk:
1. One user's traffic can slow down everyone
2. Shared database connections get exhausted
3. Server costs spike unexpectedly
4. Page load times increase during peaks

---

## Recommended Strategy: Hybrid Approach

We recommend a **3-tier approach** combining multiple strategies:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE EDGE                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Tier 1: Edge-Cached Funnel Pages (95% of funnel traffic)   │    │
│  │  - Static HTML cached at 300+ global PoPs                   │    │
│  │  - Personalization via JavaScript/API calls                 │    │
│  │  - Cost: ~$0.01 per 10,000 requests                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Cache MISS only
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      RAILWAY INFRASTRUCTURE                          │
│                                                                      │
│  ┌───────────────────────┐    ┌───────────────────────┐             │
│  │  Tier 2: Standard     │    │  Tier 3: Premium      │             │
│  │  (Regular Members)    │    │  (High-Traffic Users) │             │
│  │                       │    │                       │             │
│  │  - Shared web pool    │    │  - Dedicated service  │             │
│  │  - Auto-scale 2-6     │    │  - Own database conn  │             │
│  │  - Shared DB/Redis    │    │  - Priority queue     │             │
│  │                       │    │  - Isolated resources │             │
│  └───────────────────────┘    └───────────────────────┘             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tier 1: Edge Caching (Implement First)

**Goal:** Serve 95%+ of funnel page traffic from Cloudflare edge, never hitting your servers.

### How It Works

1. **Visitor clicks FB Ad** → Goes to `funnel.twcako.com/user123/tap`
2. **Cloudflare checks cache** → If cached, serve immediately (< 50ms globally)
3. **Cache MISS** → Request goes to Railway, response cached for next visitor
4. **Personalization** → JavaScript calls API for user-specific data

### Implementation

**Step 1: Funnel Page Cache Rules (Cloudflare)**
```
# Cache funnel pages for 1 hour at edge
URL Pattern: funnel.twcako.com/*
Cache Level: Cache Everything
Edge TTL: 1 hour
Browser TTL: 5 minutes
```

**Step 2: Make Funnel Pages Cacheable**

The key is separating **static content** (cacheable) from **dynamic data** (API call):

```html
<!-- Funnel page (CACHED at edge) -->
<html>
<head>
  <title>{{ product.name }}</title>
</head>
<body>
  <h1>Welcome!</h1>
  <div id="user-greeting">Loading...</div>
  <div id="product-info">
    <!-- Static product info baked in -->
    <h2>{{ product.name }}</h2>
    <p>{{ product.description }}</p>
  </div>

  <script>
    // Dynamic personalization via API (NOT cached)
    fetch('/api/funnel/personalize?ref={{ referrer_code }}')
      .then(r => r.json())
      .then(data => {
        document.getElementById('user-greeting').innerText =
          `Hi! ${data.sponsor_name} invited you.`;
      });
  </script>
</body>
</html>
```

**Step 3: Cache Invalidation**

When product/funnel is updated:
```python
# In Django after funnel update
import requests

def invalidate_funnel_cache(funnel_slug):
    """Purge Cloudflare cache for this funnel."""
    response = requests.post(
        f"https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/purge_cache",
        headers={"Authorization": f"Bearer {CF_API_TOKEN}"},
        json={"files": [f"https://funnel.twcako.com/{funnel_slug}/"]}
    )
    return response.ok
```

### Cost Analysis

| Traffic | Without Cache | With Edge Cache |
|---------|--------------|-----------------|
| 100K/day | 100K server requests | ~5K server requests |
| 1M/day | Server overload | ~50K server requests |
| Cost | $100-500/mo | $20-50/mo |

---

## Tier 2: Auto-Scaling Standard Pool

**Goal:** Handle normal traffic fluctuations automatically.

### Railway Auto-Scaling Configuration

```json
// railway.json
{
  "deploy": {
    "numReplicas": 2,
    "autoscaling": {
      "enabled": true,
      "minReplicas": 2,
      "maxReplicas": 8,
      "targetCPUUtilization": 70,
      "targetMemoryUtilization": 80
    }
  }
}
```

### Scaling Triggers

| Metric | Scale Up | Scale Down |
|--------|----------|------------|
| CPU | > 70% for 2 min | < 30% for 5 min |
| Memory | > 80% for 2 min | < 40% for 5 min |
| Response Time | > 500ms p95 | < 100ms p95 |
| Queue Depth | > 50 requests | < 10 requests |

### Cost

- **Minimum (2 replicas):** ~$40/month
- **Peak (8 replicas):** ~$160/month
- **Average:** ~$80/month

---

## Tier 3: Premium Dedicated Instances

**Goal:** Provide isolated infrastructure for high-traffic users willing to pay premium.

### Architecture

```
                    Cloudflare
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ Standard │    │ Premium │    │ Premium │
   │   Pool   │    │  User A │    │  User B │
   │ (shared) │    │(dedicated)│   │(dedicated)│
   └─────────┘    └─────────┘    └─────────┘
        │               │               │
        ▼               ▼               ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ Shared  │    │  Own    │    │  Own    │
   │   DB    │    │DB Replica│   │DB Replica│
   └─────────┘    └─────────┘    └─────────┘
```

### Implementation Options

**Option A: Subdomain Routing (Recommended)**

Each premium user gets a dedicated subdomain:
```
premium-user123.funnel.twcako.com → Dedicated Railway service
```

**Cloudflare Worker for routing:**
```javascript
// Cloudflare Worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const subdomain = url.hostname.split('.')[0]

  // Check if premium user
  const premiumUsers = {
    'user123': 'premium-user123.up.railway.app',
    'user456': 'premium-user456.up.railway.app',
  }

  if (premiumUsers[subdomain]) {
    // Route to dedicated instance
    url.hostname = premiumUsers[subdomain]
    return fetch(url, request)
  }

  // Route to shared pool
  url.hostname = 'standard.up.railway.app'
  return fetch(url, request)
}
```

**Option B: Database Connection Isolation**

Premium users get dedicated database connection pools:

```python
# settings.py
DATABASES = {
    'default': { ... },  # Shared pool
    'premium': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('PREMIUM_DB_NAME'),
        # ... dedicated connection pool
    }
}

# Middleware to route premium users
class PremiumDatabaseMiddleware:
    def __call__(self, request):
        if request.user.is_premium:
            # Use dedicated connection pool
            from django.db import connections
            connections['default'] = connections['premium']
        return self.get_response(request)
```

### Premium Tier Pricing Model

| Tier | Traffic | Features | Monthly Fee |
|------|---------|----------|-------------|
| Standard | Up to 10K/day | Shared infrastructure | Included |
| Premium | Up to 100K/day | Dedicated web instance | ₱5,000 |
| Enterprise | Unlimited | Dedicated everything | ₱15,000+ |

---

## Tier 4: Serverless Funnels (Future Option)

**Goal:** Infinite scaling with zero management.

### Architecture

Deploy funnel pages to **Cloudflare Workers** or **Vercel Edge Functions**:

```
FB Ad Click → Cloudflare Worker → Edge Response (< 50ms)
                    │
                    │ API call for dynamic data
                    ▼
              Railway Backend
```

### Benefits

- **Infinite scale** - No instance limits
- **Pay per request** - $0.50 per million requests
- **Global** - Runs in 300+ cities
- **Zero cold starts** - Always warm

### Implementation

```javascript
// Cloudflare Worker - Funnel Page
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const funnelSlug = url.pathname.split('/')[1]

    // Get funnel data from KV store (cached)
    const funnelData = await env.FUNNELS.get(funnelSlug, 'json')

    if (!funnelData) {
      return new Response('Funnel not found', { status: 404 })
    }

    // Render HTML at edge
    const html = renderFunnelPage(funnelData, url.searchParams)

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
```

### Cost Comparison

| Traffic/Month | Railway | Cloudflare Workers |
|---------------|---------|-------------------|
| 1 Million | ~$50 | $0.50 |
| 10 Million | ~$200+ | $5 |
| 100 Million | Custom | $50 |

---

## Recommended Implementation Roadmap

### Phase 1: Edge Caching (Week 1) - FREE
**Impact: Reduce server load by 80-90%**

1. [ ] Configure Cloudflare cache rules for funnel pages
2. [ ] Make funnel pages cache-friendly (static + JS personalization)
3. [ ] Add cache invalidation on funnel updates
4. [ ] Monitor cache hit ratio (target: > 90%)

### Phase 2: Auto-Scaling (Week 2) - ~$40-80/mo extra
**Impact: Handle traffic spikes automatically**

1. [ ] Enable Railway auto-scaling
2. [ ] Configure scaling thresholds
3. [ ] Set up alerts for scaling events
4. [ ] Load test to verify scaling works

### Phase 3: Premium Tier (Month 2) - Revenue generating
**Impact: Monetize high-traffic users**

1. [ ] Design premium tier offering
2. [ ] Implement subdomain routing
3. [ ] Create dedicated Railway services for premium
4. [ ] Build self-service upgrade flow

### Phase 4: Serverless Funnels (Q3) - Cost optimization
**Impact: Near-zero marginal cost per visitor**

1. [ ] Evaluate Cloudflare Workers for funnel pages
2. [ ] Migrate high-traffic funnels to edge
3. [ ] Keep backend for API/dynamic features

---

## Quick Wins (Do Today)

### 1. Enable Cloudflare Page Rules

```
Rule 1: Cache Funnel Pages
URL: *twcako.com/tap/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 2 hours

Rule 2: Cache VCP Pages
URL: *twcako.com/vcp/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 2 hours
```

### 2. Add Cache Headers in Django

```python
# views.py
from django.views.decorators.cache import cache_control

@cache_control(public=True, max_age=3600)  # 1 hour
def funnel_page(request, slug):
    ...
```

### 3. Monitor Cache Performance

Cloudflare Dashboard → Analytics → Caching:
- Target **> 90% cache hit ratio** for funnel pages
- If lower, investigate why pages aren't being cached

---

## Cost Summary

| Strategy | Monthly Cost | Traffic Capacity | Notes |
|----------|--------------|------------------|-------|
| Current (no scaling) | ~$50 | 10K/day | Risk of overload |
| + Edge Caching | ~$70 | 500K/day | Best ROI |
| + Auto-scaling | ~$100-150 | 1M/day | Handles spikes |
| + Premium tier | Revenue+ | Unlimited | Profit center |
| + Serverless | Variable | Infinite | Future state |

---

## Decision Matrix

| User Type | Traffic | Solution | Monthly Cost |
|-----------|---------|----------|--------------|
| Normal member | < 1K/day | Shared + Cache | Included |
| Active seller | 1-10K/day | Shared + Cache | Included |
| Power user | 10-50K/day | Auto-scale | Included |
| FB Ads heavy | 50-200K/day | Premium tier | ₱5,000 |
| Enterprise | 200K+/day | Dedicated | ₱15,000+ |

---

## Appendix: Traffic Estimation

### Per Funnel Page Request

| Component | Without Cache | With Cache |
|-----------|--------------|------------|
| Cloudflare | 1 request | 1 request |
| Railway Web | 1 request | 0.05 requests (5% miss) |
| Database | 3-5 queries | 0.15-0.25 queries |
| Redis | 2-3 calls | 0.1-0.15 calls |

### Example: 100K Daily Visitors

| Metric | Without Cache | With Cache |
|--------|--------------|------------|
| Server requests | 100,000 | 5,000 |
| DB queries | 400,000 | 20,000 |
| Server cost | ~$100 | ~$10 |
| Response time | 200-500ms | 20-50ms |

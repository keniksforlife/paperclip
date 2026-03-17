# V4 Frontend Integration Guide

This document explains how the V4 Next.js frontend (TWCAKOV4) connects to the existing Django backend (TWCako).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        V4 Frontend                               │
│                    (Next.js 16 + MUI)                            │
│                   http://localhost:3000                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Requests
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Django Backend                               │
│              http://api.localhost:8000                           │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ django-hosts│  │ DRF + JWT   │  │   Celery    │              │
│  │ (subdomain) │  │ (auth)      │  │   (tasks)   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Project Locations

| Component | Path | Purpose |
|-----------|------|---------|
| V4 Frontend | `/Users/kentluckybuhawe/Lucky Keniks/2026/TWCAKOV4` | Next.js 16 UI |
| V3 Backend | `/Users/kentluckybuhawe/Lucky Keniks/2026/TWCako` | Django API |

---

## 1. Environment Configuration

### Frontend (.env.local)

```bash
# /TWCAKOV4/.env.local
DJANGO_API_BASE=http://api.localhost:8000
NEXT_PUBLIC_DJANGO_API_BASE=http://api.localhost:8000
NEXT_PUBLIC_DJANGO_OLD_API_BASE=http://api.localhost:8000
```

### Backend (twcako/settings/local.py)

```python
# Key setting for subdomain routing
PARENT_HOST = "localhost:8000"

# CORS already includes localhost:3000 in base.py
# CORS_ALLOWED_ORIGINS includes "http://localhost:3000"
```

---

## 2. Authentication Flow

### How It Works

1. **User submits login form** in Next.js
2. **Next.js calls** `POST /auth/login` → Django API
3. **Django returns** `{access, refresh, username, user_id}`
4. **Next.js stores tokens** in next-auth session
5. **Subsequent requests** include `Authorization: Bearer {access_token}`

### Key Files

| File | Purpose |
|------|---------|
| `TWCAKOV4/src/auth.ts` | NextAuth configuration, token handling |
| `TWCako/api/views/auth.py` | Login, /me, refresh endpoints |
| `TWCako/api/urls.py` | URL registration for auth endpoints |

### Auth Endpoints (Django)

```python
# TWCako/api/urls.py
path('auth/login', LoginAPIView.as_view()),   # POST - returns JWT tokens
path('me', MeAPIView.as_view()),              # GET - returns user profile
path('auth/refresh', RefreshTokenAPIView.as_view()),  # POST - refresh token
```

### Auth Flow (Next.js)

```typescript
// TWCAKOV4/src/auth.ts
// 1. Login: POST to /auth/login
const loginRes = await fetch(`${getApiBase()}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password }),
});

// 2. Fetch user profile: GET /me
const meRes = await fetch(`${getApiBase()}/me`, {
  headers: { Authorization: `Bearer ${login.access}` },
});

// 3. Return combined user data with tokens
return {
  ...me,
  id: String(me.id ?? login.user_id),
  accessToken: login.access,
  refreshToken: login.refresh,
};
```

---

## 3. API Request Patterns

### Next.js API Route (Proxy Pattern)

The V4 frontend uses Next.js API routes as proxies to the Django backend:

```
Browser → Next.js API Route → Django Backend
```

**Example: Creating an API Route**

```typescript
// TWCAKOV4/src/app/api/user/monitoring/members/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serverApi } from "@/lib/api/server";
import { withRouteError } from "@/lib/api/routeErrors";

const DJANGO_BASE = process.env.DJANGO_API_BASE ?? "";
const DJANGO_URL = `${DJANGO_BASE.replace(/\/+$/, "")}/member-activity/dashboard/`;

export const GET = withRouteError(async () => {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({}, { status: 401 });
  }

  const data = await serverApi(DJANGO_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
    nullOn404: true,
  });

  return NextResponse.json(data ?? {}, { status: 200 });
});
```

### SWR Hook for Data Fetching

```typescript
// TWCAKOV4/src/hooks/useMemberMonitoring.ts
import useSWR from "swr";
import { authGetFetcher } from "@/lib/fetcher";

export const MEMBER_MONITORING_KEY = "/api/user/monitoring/members";

export function useMemberMonitoring() {
  const { data, error, isLoading, mutate } = useSWR(
    MEMBER_MONITORING_KEY,
    (url) => authGetFetcher(url),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  return {
    data: data ?? null,
    isLoading,
    isError: !!error,
    error: error?.message ?? null,
    mutate,
  };
}
```

---

## 4. Django Backend Patterns

### Creating a New API Endpoint

```python
# TWCako/api/views/your_feature.py
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class YourFeatureAPIView(APIView):
    """
    GET /your-feature/
    Returns data for your feature.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user

        # Your logic here
        data = {
            'field1': 'value1',
            'field2': 'value2',
        }

        return Response(data, status=status.HTTP_200_OK)
```

### Register in URLs

```python
# TWCako/api/urls.py
from api.views.your_feature import YourFeatureAPIView

urlpatterns = [
    # ... existing paths
    path('your-feature/', YourFeatureAPIView.as_view(), name='your-feature'),
]
```

---

## 5. Subdomain Routing (django-hosts)

Django uses `django-hosts` for subdomain-based routing:

```python
# TWCako/twcako/hosts.py
host_patterns = patterns('',
    host(r'api', 'twcako.urls.api', name='api'),       # api.localhost:8000
    host(r'dashboard', 'twcako.urls.dashboard', name='dashboard'),
    host(r'www', 'twcako.urls.www', name='www'),
    host(r'(\w+)', 'twcako.urls.funnel', name='funnel'),
)
```

**For V4 frontend:**
- Always use `api.localhost:8000` for API calls
- The `PARENT_HOST` setting in `local.py` must be `localhost:8000`

---

## 6. CORS Configuration

```python
# TWCako/twcako/settings/base.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # V4 frontend
    # ... other origins
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = list(default_headers) + [
    "x-csrftoken",
    "content-type",
]
```

---

## 7. JWT Configuration

```python
# TWCako/twcako/restconf/main.py
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=365),
    'ROTATE_REFRESH_TOKENS': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}
```

---

## 8. V4 Frontend Structure

```
TWCAKOV4/src/
├── app/
│   ├── (dashboards)/           # Dashboard pages (auth protected)
│   │   ├── layout.tsx          # Auth wrapper
│   │   ├── dashboard/          # Main dashboard
│   │   └── member-monitoring/  # Member monitoring (new)
│   ├── api/                    # Next.js API routes (proxy to Django)
│   │   └── user/
│   │       └── monitoring/
│   │           └── members/route.ts
│   └── (auth)/                 # Auth pages (login, etc.)
├── hooks/                      # SWR data fetching hooks
│   └── useMemberMonitoring.ts
├── lib/
│   ├── api/
│   │   ├── server.ts           # Server-side API helper
│   │   └── client.ts           # Client-side API helper
│   └── fetcher.ts              # SWR fetcher utilities
├── types/                      # TypeScript interfaces
│   └── domain/
│       └── memberMonitoring.ts
└── components/                 # Reusable components
```

---

## 9. Key Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| Next.js | 16.1.6 | React framework |
| MUI | 7.3.7 | UI components |
| SWR | 2.3.8 | Data fetching |
| next-auth | 5.x | Authentication |
| framer-motion | - | Animations |
| recharts | - | Charts (add if needed) |

---

## 10. Adding a New Feature (Checklist)

### Backend (Django)

1. [ ] Create model in `accounts/models.py` or relevant app
2. [ ] Create migration: `python manage.py makemigrations`
3. [ ] Create API view in `api/views/your_feature.py`
4. [ ] Register URL in `api/urls.py`
5. [ ] Test with curl: `curl http://api.localhost:8000/your-endpoint/`

### Frontend (Next.js)

1. [ ] Create API route: `src/app/api/user/your-feature/route.ts`
2. [ ] Create SWR hook: `src/hooks/useYourFeature.ts`
3. [ ] Create types: `src/types/domain/yourFeature.ts`
4. [ ] Create page: `src/app/(dashboards)/your-feature/page.tsx`
5. [ ] Create client component: `src/app/(dashboards)/your-feature/YourFeatureClient.tsx`

---

## 11. Testing the Integration

### 1. Start Django

```bash
cd /Users/kentluckybuhawe/Lucky\ Keniks/2026/TWCako
python manage.py runserver 8000
```

### 2. Start Next.js

```bash
cd /Users/kentluckybuhawe/Lucky\ Keniks/2026/TWCAKOV4
npm run dev
```

### 3. Test API Directly

```bash
# Login
curl -X POST http://api.localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_USER","password":"YOUR_PASS"}'

# Use returned access token
curl http://api.localhost:8000/your-endpoint/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Access Frontend

Open `http://localhost:3000` and login

---

## 12. Troubleshooting

### "CredentialsSignin" Error
- Check Django server is running on port 8000
- Check PARENT_HOST in local.py is `localhost:8000`
- Check .env.local uses `api.localhost:8000`

### CORS Errors
- Verify `http://localhost:3000` is in CORS_ALLOWED_ORIGINS
- Check browser console for specific CORS error details

### 401 Unauthorized
- Check JWT token is valid and not expired
- Verify Authorization header format: `Bearer {token}`
- Check user exists in Django database

### Subdomain Not Resolving
- Modern browsers support `*.localhost` natively
- If issues, add to `/etc/hosts`: `127.0.0.1 api.localhost`

---

## 13. Quick Reference

### Django API Endpoints for V4

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/auth/login` | POST | No | Get JWT tokens |
| `/me` | GET | Yes | Get user profile |
| `/auth/refresh` | POST | No | Refresh access token |
| `/member-activity/` | GET | Yes | User's own activity |
| `/member-activity/team/` | GET | Yes | Team member activities |
| `/member-activity/dashboard/` | GET | Yes | Dashboard metrics |
| `/member-activity/follow-up-queue/` | GET | Yes | Follow-up queue |

### Environment Variables

| Variable | Frontend | Backend | Value |
|----------|----------|---------|-------|
| DJANGO_API_BASE | .env.local | - | http://api.localhost:8000 |
| PARENT_HOST | - | local.py | localhost:8000 |
| DEBUG | - | .env | 1 |

---

## 14. Member Monitoring Feature (Implemented 2026-02-15)

### Frontend Files Created

```
TWCAKOV4/src/
├── types/domain/memberMonitoring.ts     # TypeScript interfaces
├── hooks/useMemberMonitoring.ts         # SWR hooks for data fetching
├── app/
│   ├── api/user/monitoring/
│   │   ├── members/route.ts             # Dashboard metrics proxy
│   │   ├── team/route.ts                # Team activity proxy
│   │   └── follow-up/route.ts           # Follow-up queue proxy
│   └── (dashboards)/member-monitoring/
│       ├── page.tsx                     # Server component
│       ├── MemberMonitoringClient.tsx   # Main client component
│       └── _components/
│           ├── EngagementMetrics.tsx    # Summary cards
│           ├── LifecycleChart.tsx       # Pie chart (recharts)
│           ├── FollowUpQueue.tsx        # Priority queue list
│           └── TeamActivityTable.tsx    # DataGrid table
```

### Backend Endpoints (Django)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/member-activity/dashboard/` | GET | Dashboard metrics + lifecycle distribution |
| `/member-activity/team/` | GET | Team member activity list |
| `/member-activity/follow-up-queue/` | GET | Prioritized follow-up queue |

### Access the Feature

After login, navigate to: `http://localhost:3000/member-monitoring`

---

## 15. Notification Center Feature (Implemented 2026-02-15)

### Frontend Files Created

```
TWCAKOV4/src/
├── types/domain/notifications.ts           # TypeScript interfaces
├── hooks/useNotifications.ts               # SWR hooks
├── app/
│   ├── api/user/notifications/
│   │   ├── route.ts                        # List proxy
│   │   ├── mark-read/route.ts              # Mark read proxy
│   │   ├── unread-count/route.ts           # Count proxy
│   │   └── preferences/route.ts            # Preferences proxy
│   └── (dashboards)/notifications/
│       ├── page.tsx
│       ├── NotificationsClient.tsx
│       ├── _components/NotificationList.tsx
│       └── preferences/
│           ├── page.tsx
│           └── PreferencesClient.tsx
└── components/navbar/NotificationBell.tsx  # Navbar bell component
```

### Backend Endpoints (Django)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications/` | GET | List notifications (paginated) |
| `/api/notifications/mark-read/` | POST | Bulk mark as read |
| `/api/notifications/unread-count/` | GET | Get unread count |
| `/api/notifications/preferences/` | GET/POST | Manage preferences |

### Access the Feature

- **Notification Bell**: Visible in navbar header
- **List Page**: `http://localhost:3000/notifications`
- **Preferences**: `http://localhost:3000/notifications/preferences`

---

## 16. Related Documentation

- [V1 Migration Strategy](./V1_MIGRATION_STRATEGY.md)
- [Notification Center Implementation](./NOTIFICATION_CENTER_IMPLEMENTATION.md)
- [V4 Member Monitoring & Supplier Spec](./V4_MEMBER_MONITORING_AND_SUPPLIER_SPEC.md)
- [V4 Gamification Plan](./V4_GAMIFICATION_SELLERS_PLAN.md)

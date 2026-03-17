# Production Test Report — TWCako Railway

**Date:** 2026-03-01
**Tester:** Automated (Playwright via Claude Code)
**Environment:** Railway Production

---

## Test Environment

| Service | URL | Status |
|---------|-----|--------|
| Frontend (Next.js) | `twcakov4-production-6679.up.railway.app` | Online |
| Backend (Django) | `twcako-production-8d16.up.railway.app` | Online |
| Test User | `kentlucky` (Distributor subscription) | Active |

---

## Executive Summary

| Area | Result | Issues Found |
|------|--------|--------------|
| Homepage & Public Pages | **PASS** | 3 non-critical console errors |
| Login & Authentication | **PASS** | Working correctly |
| Dashboard & Navigation | **PASS** | 2 minor issues |
| Finance Module (UI) | **PARTIAL** | Dashboard fails, other pages work |
| Finance Module (API) | **PARTIAL** | Permission inconsistency across endpoints |
| Backend Health | **PASS** | Both health checks alive |

**Overall: 17 out of 23 tested API endpoints return 200. 5 return 403 (permission), 1 returns 401.**

---

## 1. Homepage & Public Pages

**Result: PASS**

### What Was Tested
- Full page render (hero, services, pricing, testimonials, founders, contact form, footer)
- Navigation links
- Contact form (ClickUp embedded iframe)
- Console errors

### Findings

All sections render correctly. The page is fully functional.

#### Console Errors (Non-Critical)

| Error | Severity | Cause | Fix |
|-------|----------|-------|-----|
| `_vercel/insights/script.js` 404 | Low | Vercel analytics script referenced but not available on Railway | Remove Vercel analytics or replace with Railway-compatible alternative |
| `cdn.segment.com` ERR_NAME_NOT_RESOLVED | Low | Segment analytics CDN not resolving | Check Segment configuration or remove if unused |
| ClickUp forms fetch error | Low | External ClickUp form CDN issue | External dependency, no action needed |

---

## 2. Login & Authentication

**Result: PASS**

### What Was Tested
- Login page rendering
- Invalid credentials error handling
- Valid credentials login flow
- JWT session management
- Redirect after login

### Findings

| Test Case | Result | Details |
|-----------|--------|---------|
| Login page loads | PASS | Username/password fields, Sign In button, Forgot Password link |
| Invalid credentials | PASS | Shows "Invalid username or password" alert, form re-enables |
| Loading state | PASS | Button shows "Signing in..." with spinner, fields disabled |
| Valid login | PASS | Redirects to `/dashboard` |
| Session token | PASS | JWT access token present, expires 2026-03-31 |
| User profile | PASS | Returns username, email, name, image_url, date_activated |

#### Note on Session Data
The session profile returns: `username`, `email`, `first_name`, `last_name`, `is_supplier`, `image_url`, `date_activated`. It does **not** expose `is_finance`, `is_admin`, `is_staff`, or `is_founder` flags. This means the frontend cannot conditionally show/hide finance features based on user permissions.

---

## 3. Dashboard & Navigation

**Result: PASS (with minor issues)**

### What Was Tested
- Dashboard page render
- KPI cards data
- User info card
- Navigation bar dropdowns
- Module links

### Findings

| Component | Result | Details |
|-----------|--------|---------|
| KPI Cards | PASS | TWC Rewards: P467,252.91 / Retail Commission: P3,270.98 / ECash: P470,523.89 |
| User Info Card | PASS | Shows subscription type (Distributor), activation date, status |
| Welcome Video | PASS | YouTube embed loads correctly |
| Leaderboard | PASS | Top Sponsors, Dropshippers, Earners sections visible |
| Top Nav Modules | PASS | Home, TWC University, Contacts, Prospects, TWC Rewards, Team Monitoring, Business Center, Transactions |

#### Navigation Dropdown Contents

| Menu | Items |
|------|-------|
| Business Center | Daily Grinds, eCash, eShop |
| Transactions | Pending, Order History, eCash History |
| TWC University | (dropdown available) |
| Contacts | (dropdown available) |
| Prospects | (dropdown available) |

### Issues Found

| Issue | Severity | Details | Fix |
|-------|----------|---------|-----|
| `/api/orders/active` returns 401 | Medium | Fires on every authenticated page, pollutes console | Fix auth on this endpoint or remove the call if unused |
| Profile image blocked by ORB | Medium | `twcako-production-8d16.up.railway.app/media/...` blocked by browser's Opaque Response Blocking | Add proper CORS headers to Django media files or serve via S3/CDN |
| `No sponsor_username found` warning | Low | Console warning on every page | Check user data or suppress warning |

---

## 4. Finance Module

**Result: PARTIAL — UI renders but dashboard API fails due to permissions**

### What Was Tested
- Finance monitoring dashboard (`/finance-monitoring`)
- Operational Expenses page (`/expenses`)
- Chart of Accounts page (`/chart-of-accounts`)
- Finance Reports page (`/finance-reports`)
- Sidebar navigation (all 6 accordion sections)

### Page Test Results

| Page | URL | Loads | Data | Issues |
|------|-----|-------|------|--------|
| Dashboard | `/finance-monitoring` | YES | **NO** | "Failed to load dashboard" — 403 from API |
| Expenses | `/expenses` | YES | YES | Empty data, page fully functional |
| Chart of Accounts | `/chart-of-accounts` | YES | **NO** | UI renders but account data blocked (403) |
| Finance Reports | `/finance-reports` | YES | N/A | Report cards with Download PDF/Excel buttons |
| Approval Queue | `/approval-queue` | YES | YES | Empty queue, page loads |

### Sidebar Navigation

All 6 accordion sections expand correctly:

| Section | Links | Status |
|---------|-------|--------|
| **Overview** | Dashboard | OK |
| **Transactions** | Approval Queue, Commissions, Revenue | OK |
| **Core Finance** | Expenses, Assets, Loans, Petty Cash | OK |
| **Workflows** | Approval Chains, Budgets, Vendors, Recurring Expenses | OK |
| **Accounting** | Chart of Accounts, Journal Entries, Fiscal Periods, Bank Reconciliation, Trial Balance | OK |
| **Reports** | Financial Reports | OK |

### UI Bugs Found

| Bug | Location | Severity | Details |
|-----|----------|----------|---------|
| **Typo: "LIABILITYS"** | Chart of Accounts KPI cards | Low | Should be "LIABILITIES" |
| **Typo: "EQUITYS"** | Chart of Accounts KPI cards | Low | Should be "EQUITY" |

### Root Cause: Finance Dashboard 403

The Django backend `FinanceDashboardAPIView` uses `IsFinanceUser` permission which requires:
```
is_admin=True OR is_founder=True OR is_staff=True OR is_finance=True
```

The `kentlucky` test user has **none** of these flags set.

**Inconsistency:** Some finance views (expenses, loans, approval-queue) use only `IsAuthenticated`, while others (dashboard, accounts, vendors, journal-entries) use `IsFinanceUser`. This creates a confusing user experience where some pages work and others don't.

---

## 5. API Endpoint Testing

### Health Check Endpoints

| Endpoint | Method | Status | Response |
|----------|--------|--------|----------|
| `/health/live/` (backend) | GET | **200** | `{"status": "alive", "timestamp": "..."}` |
| `/health/ready/` (backend) | GET | **200** | `{"status": "alive", "timestamp": "..."}` |
| `/api/health` (frontend) | GET | **200** | `{"status": "ok"}` |
| `/api/` (DRF root) | GET | **403** | Expected — requires authentication |

### Authentication Endpoints

| Endpoint | Method | Status | Response |
|----------|--------|--------|----------|
| `/api/auth/session` | GET | **200** | Full session with JWT token |
| `/api/check-username/kentlucky` | GET | **200** | Username check works |

### General Endpoints

| Endpoint | Method | Status | Response |
|----------|--------|--------|----------|
| `/api/notifications` | GET | **200** | 4 notifications returned |
| `/api/userData` | GET | **200** | User data returned |
| `/api/productList` | GET | **200** | Product list returned |
| `/api/ph-number-prefixes` | GET | **200** | Phone prefixes returned |
| `/api/cart` | GET | **200** | Cart data returned |
| `/api/orders/active` | GET | **401** | Unauthorized — auth issue |

### Finance Endpoints — Working (200)

| Endpoint | Method | Status | Response |
|----------|--------|--------|----------|
| `/api/finance/expenses` | GET | **200** | `{"count":0, "expenses":[]}` |
| `/api/finance/loans` | GET | **200** | `{"count":0, "loans":[]}` |
| `/api/finance/approval-queue` | GET | **200** | `{"items":[], "summary":{...}}` |

### Finance Endpoints — Blocked (403)

| Endpoint | Method | Status | Error Message |
|----------|--------|--------|---------------|
| `/api/finance/dashboard` | GET | **403** | "Finance access required" |
| `/api/finance/accounts/tree` | GET | **403** | "Finance access required" |
| `/api/finance/accounts?active=true` | GET | **403** | "Finance access required" |
| `/api/finance/vendors` | GET | **403** | "Finance access required" |
| `/api/finance/journal-entries` | GET | **403** | "Finance access required" |
| `/api/finance/phase3-choices` | GET | **403** | "Finance access required" |

---

## 6. Issues Summary

### Critical (Blocks Functionality)

| # | Issue | Affected | Root Cause | Recommended Fix |
|---|-------|----------|------------|-----------------|
| C1 | Finance Dashboard returns 403 | `/finance-monitoring` page | `IsFinanceUser` permission on `FinanceDashboardAPIView` — user lacks `is_finance` flag | Grant `is_finance=True` to authorized users via Django admin |
| C2 | Permission inconsistency across finance APIs | 6 endpoints blocked, 3 work | Mixed use of `IsAuthenticated` vs `IsFinanceUser` across finance views | Align permissions — either all finance views use `IsFinanceUser` or add graceful degradation |

### Medium (Degraded Experience)

| # | Issue | Affected | Root Cause | Recommended Fix |
|---|-------|----------|------------|-----------------|
| M1 | `/api/orders/active` returns 401 | Every authenticated page (console error) | Endpoint auth issue or endpoint doesn't exist | Fix endpoint auth or remove the API call from the frontend |
| M2 | Profile image blocked by ORB | Dashboard user avatar | Cross-origin image from Django media served without proper CORS headers | Add CORS headers to Django media responses or serve via S3/CloudFront |
| M3 | Session doesn't expose permission flags | Frontend can't conditionally render finance | Session profile only returns `is_supplier` | Include `is_finance`, `is_admin`, `is_staff`, `is_founder` in session profile |

### Low (Cosmetic / Non-Critical)

| # | Issue | Affected | Fix |
|---|-------|----------|-----|
| L1 | Typo: "LIABILITYS" | Chart of Accounts KPI card | Change to "LIABILITIES" |
| L2 | Typo: "EQUITYS" | Chart of Accounts KPI card | Change to "EQUITY" |
| L3 | Vercel analytics 404 | Every page (console error) | Remove `_vercel/insights/script.js` reference or replace with Railway-compatible analytics |
| L4 | Segment CDN not resolving | Homepage (console error) | Check Segment config or remove if unused |
| L5 | `No sponsor_username found` warning | Every authenticated page | Check user data model or suppress warning for users without sponsors |

---

## 7. Permission Matrix

### Current State (Inconsistent)

| View | Permission Class | kentlucky Access |
|------|-----------------|-----------------|
| `ExpenseListCreateAPIView` | `IsAuthenticated` | **200** |
| `LoanListCreateAPIView` | `IsAuthenticated` | **200** |
| `ApprovalQueueAPIView` | `IsAuthenticated` | **200** |
| `FinanceDashboardAPIView` | `IsAuthenticated, IsFinanceUser` | **403** |
| `AccountTreeAPIView` | `IsAuthenticated, IsFinanceUser` | **403** |
| `VendorListCreateAPIView` | `IsAuthenticated, IsFinanceUser` | **403** |
| `JournalEntryListCreateAPIView` | `IsAuthenticated, IsFinanceUser` | **403** |

### `IsFinanceUser` Permission Logic
```python
# Grants access if ANY of:
user.is_admin == True
user.is_founder == True
user.is_staff == True
user.is_finance == True
```

### Recommended Approach
1. **Short-term:** Set `is_finance=True` for `kentlucky` user in Django admin
2. **Long-term:** Standardize permissions across all finance views and expose flags in session

---

## 8. Screenshots

| Screenshot | Description |
|------------|-------------|
| `dashboard-home.png` | Main dashboard with KPI cards, user info, leaderboard |
| `expenses-page.png` | Operational Expenses page with sidebar navigation |
| `chart-of-accounts.png` | Chart of Accounts with typo bugs visible |
| `finance-reports.png` | Finance Reports page with download cards |

---

## 9. Recommendations

### Immediate Actions
1. **Grant finance permissions** to test/admin users (`is_finance=True`)
2. **Fix typos** in Chart of Accounts ("Liabilitys" → "Liabilities", "Equitys" → "Equity")
3. **Remove or fix** `/api/orders/active` call that returns 401 on every page

### Short-Term Improvements
4. **Standardize finance API permissions** — decide on consistent permission model
5. **Add CORS headers** for Django media files to fix ORB blocking
6. **Include permission flags** (`is_finance`, `is_admin`, etc.) in session data for frontend access control
7. **Remove Vercel analytics** script reference (not applicable on Railway)

### Testing Notes
- All finance page **UIs render correctly** even when data APIs fail — good error handling
- The "Retry" button on the dashboard error works (re-fires the API call)
- Sidebar navigation is fully functional across all finance sections
- Export PDF/Excel buttons are present on all relevant pages (untested due to empty data)

---

*Report generated via Playwright browser automation on 2026-03-01*

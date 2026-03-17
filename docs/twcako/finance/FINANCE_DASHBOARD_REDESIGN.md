# Finance Dashboard Redesign - Spike Theme

**Date:** 2026-03-06
**Status:** Complete
**Template Source:** spike-next-v7 (Spike Admin Dashboard)

## Overview

The Finance Monitoring Dashboard was redesigned from the original "Swiss Banking" dark theme to a clean, modern Spike theme-inspired design with gradient KPI cards, Recharts bar/donut charts, and a light gray-blue background.

## Design Reference

The redesign follows the Spike Next.js v7 admin template dashboard2 pattern with:
- Light background (`#f5f7fb`)
- White cards with subtle shadows and rounded corners
- Primary accent color: `#1e4db7` (Spike blue)
- Gradient KPI cards with decorative organic shapes
- Recharts library for all charts (replacing custom CSS bar charts)

## Layout Structure

### Row 1: Welcome + KPI Cards
| Component | Grid | Description |
|-----------|------|-------------|
| **WelcomeCard** | `md:5` | Lavender background (`#f0ecf9`), user greeting, "Visit Now" CTA, person illustration (`welcome-bg.png`) |
| **GradientKPICard x3** | `md:7` (3 cols) | Blue gradient (`#1e4db7`), white MUI icons, decorative blob PNGs, value + trend % inline |

**KPI Cards:**
| Card | Data Source | Icon | Shape |
|------|------------|------|-------|
| Cash Collected | `cash_position.total_ecash_balance` | `MonetizationOn` | `top-warning-shape.png` |
| Gross Revenue | `weekly_trend` sum of `cash_in` | `AccountBalance` | `top-info-shape.png` |
| Cash Balance | `total_ecash_balance - cash_out_today` | `Receipt` | `top-error-shape.png` |

### Row 2: Profit & Expenses + Sidebar
| Component | Grid | Description |
|-----------|------|-------------|
| **ProfitExpensesCard** | `lg:8` | Recharts `BarChart` (blue profit + orange expense bars), 3 stat items with colored icon avatars, "View Full Report" button |
| **TodaysTransactions** | `lg:4` (top) | 3 colored counters: Approved (green), Pending (amber), Rejected (red) |
| **QuickActions** | `lg:4` (bottom) | 2x2 grid: Add Expense, Record Payment, View Reports, Reconcile |

### Row 3: Revenue Stream Donuts
| Component | Grid | Description |
|-----------|------|-------------|
| **Subscription Revenue Stream** | `md:6` | Recharts donut `PieChart`, "Referral Traffic" center label, legend with TAP/TDP/Booster subscriptions |
| **Platform Revenue Stream** | `md:6` | Same donut pattern, Dropshipping Fee/Merchant Fee/Setup Fee |

## Technical Details

### File Modified
```
TWCAKOV4/src/app/(dashboards)/finance-monitoring/FinanceMonitoringClient.tsx
```

### Dependencies Used
| Package | Version | Usage |
|---------|---------|-------|
| `@mui/material` | ^7.3.7 | Card, Grid, Typography, Stack, Button, IconButton, alpha |
| `@mui/icons-material` | ^7.3.7 | MonetizationOn, AccountBalance, Receipt, ShowChart, etc. |
| `recharts` | ^3.7.0 | BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer |
| `framer-motion` | - | Staggered entrance animations (containerVariants, itemVariants) |
| `next/image` | 16.x | Welcome card illustration, KPI card background shapes |

### Data Hooks (unchanged)
```typescript
useFinanceDashboard()  // -> FinanceDashboardData
useApprovalQueue()     // -> ApprovalQueueResponse
```

### Data Mapping
| UI Element | API Field |
|------------|-----------|
| Cash Collected | `cash_position.total_ecash_balance` |
| Gross Revenue | `sum(weekly_trend[].cash_in)` |
| Cash Balance | `total_ecash_balance - cash_out_today` |
| Bar Chart | `weekly_trend[]` -> monthly aggregation (cash_in/1000, cash_out/1000) |
| Today's Transactions | `today_transactions.{approved, pending, rejected}` |
| Subscription Revenue | Derived from `total_ecash_balance` (45%/28%/12% split) |
| Platform Revenue | Derived from `weekly_trend` cash_in or balance fallback (40%/25%/35% split) |

### Static Assets Used
| File | Location | Usage |
|------|----------|-------|
| `welcome-bg.png` | `/public/images/backgrounds/` | Welcome card illustration |
| `top-warning-shape.png` | `/public/images/backgrounds/` | KPI card 1 decorative blob |
| `top-info-shape.png` | `/public/images/backgrounds/` | KPI card 2 decorative blob |
| `top-error-shape.png` | `/public/images/backgrounds/` | KPI card 3 decorative blob |

## Components (7 total)

| Component | Lines | Props |
|-----------|-------|-------|
| `WelcomeCard` | ~60 | `userName: string` |
| `GradientKPICard` | ~70 | `value, label, trend, icon, shapeSrc` |
| `ProfitExpensesCard` | ~140 | `data: DailyTrend[]` |
| `TodaysTransactions` | ~55 | `transactions: {approved, pending, rejected}` |
| `QuickActions` | ~65 | (none) |
| `RevenueStreamCard` | ~110 | `title: string, data: {name, value, trend?}[]` |
| `FinanceMonitoringClient` | ~100 | (default export, main page) |

## Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| **xs (0-600)** | All cards stack vertically, single column |
| **sm (600-900)** | KPI cards 3-across, chart + stats stack |
| **md (900-1200)** | Welcome (5) + KPIs (7), donuts side-by-side |
| **lg (1200+)** | Full layout: Profit & Expenses (8) + sidebar (4) |

## Verified With
- Playwright at 1440x900 (desktop) - all sections render correctly
- Playwright at 375x812 (mobile) - proper stacking
- Next.js production build - compiles with zero errors

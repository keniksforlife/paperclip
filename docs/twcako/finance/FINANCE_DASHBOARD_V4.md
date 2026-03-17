# Finance Dashboard V4 - Documentation

**Last Updated:** 2026-02-22
**Version:** 4.0
**Author:** TWCako Development Team

---

## Overview

The Finance Dashboard V4 is a modern, compact, and professional financial monitoring interface built with Next.js 16 and MUI 7. It provides real-time visibility into cash flow, pending approvals, and key financial metrics.

---

## Architecture

### Tech Stack
- **Framework:** Next.js 16 (App Router)
- **UI Library:** MUI 7 (Material UI)
- **State Management:** SWR for data fetching
- **Animations:** Framer Motion
- **Styling:** MUI sx prop + alpha utilities

### File Structure
```
TWCAKOV4/src/
├── app/(dashboards)/
│   └── finance-monitoring/
│       ├── page.tsx                    # Server component wrapper
│       └── FinanceMonitoringClient.tsx # Main dashboard client component
├── components/finance/
│   └── FinancePageLayout.tsx           # Sidebar navigation wrapper
├── hooks/
│   └── useFinance.ts                   # SWR hooks for finance data
└── types/domain/
    └── finance.ts                      # TypeScript types
```

---

## Sidebar Navigation

The Finance module uses a dedicated sidebar navigation (`FinancePageLayout.tsx`) that wraps all finance pages.

### Navigation Structure

| Section | Items | Routes |
|---------|-------|--------|
| **Overview** | Dashboard | `/finance-monitoring` |
| **Transactions** | Approval Queue | `/approval-queue` |
| | Commissions | `/commissions` |
| | Revenue | `/revenue` |
| **Core Finance** | Expenses | `/expenses` |
| | Assets | `/assets` |
| | Loans | `/loans` |
| | Petty Cash | `/petty-cash` |
| **Workflows** | Approval Chains | `/approval-chains` |
| | Budgets | `/budgets` |
| | Vendors | `/vendors` |
| | Recurring Expenses | `/recurring-expenses` |
| **Accounting** | Chart of Accounts | `/chart-of-accounts` |
| | Journal Entries | `/journal-entries` |
| | Fiscal Periods | `/fiscal-periods` |
| | Bank Reconciliation | `/bank-reconciliation` |
| | Trial Balance | `/trial-balance` |
| **Reports** | Financial Reports | `/finance-reports` |

### Sidebar Features
- Collapsible sections with icons
- Active page highlighting (primary color background)
- Sticky positioning on desktop
- Mobile drawer with floating action button
- Responsive design (hidden on mobile, drawer on tap)

---

## Dashboard Components

### 1. Header Section
```
┌─────────────────────────────────────────────────────────────┐
│ Good evening, Finance Team!          [↻] [Sun, Feb 22] [Export] │
│ Your financial overview for today                            │
└─────────────────────────────────────────────────────────────┘
```

**Elements:**
- Dynamic greeting based on time of day
- Refresh button (revalidates SWR cache)
- Date chip showing current date
- Export button → links to `/finance-reports`

### 2. KPI Cards Row
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total eCash  │ │ Cash In Today│ │ Cash Out Today│ │ Pending     │
│ ₱48.19M      │ │ ₱0.00       │ │ ₱0.00        │ │ 0           │
│ System balance│ │ +12.5% vs yest│ │ -8.3% vs yest│ │ Within SLA  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

**Data Sources:**
- `cash_position.total_ecash_balance`
- `cash_position.cash_in_today`
- `cash_position.cash_out_today`
- `queueData.items.length`

### 3. Cashflow Chart
```
┌─────────────────────────────────────────────────────────────┐
│ Cashflow                                    [This Week ▼]   │
│ ₱0.00  +0%                                                  │
│ ● In ₱0.00  ● Out ₱0.00                                    │
│                                                             │
│    ▓▓  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓                             │
│    M   T   W   T   F   S   S                               │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Bar chart showing daily cash in (blue) vs cash out (red)
- Period selector (This Week / Month)
- Tooltip on hover showing exact amounts
- Legend with totals

### 4. Tasks Card (Right Sidebar)
```
┌─────────────────────────────────┐
│ Tasks                       [3] │  (Dark blue background)
│ ● 2 overdue items          Now  │  → /approval-queue
│ ○ Process 5 approvals    Today  │  → /approval-queue
│ ○ Daily reconciliation     EOD  │  → /bank-reconciliation
└─────────────────────────────────┘
```

**Features:**
- Priority indicators (red dot = high priority)
- Clickable rows navigate to relevant pages
- Dynamic based on actual queue data

### 5. Today's Transactions
```
┌─────────────────────────────────┐
│ Today's Transactions            │
│ ┌─────┐ ┌─────┐ ┌─────┐       │
│ │  0  │ │  0  │ │  0  │       │
│ │Apprvd│ │Pendng│ │Reject│      │
│ └─────┘ └─────┘ └─────┘       │
└─────────────────────────────────┘
```

**Data Source:** `today_transactions` from dashboard API

### 6. Quick Actions
```
┌─────────────────────────────────┐
│ Quick Actions                   │
│ ┌─────────────┐ ┌─────────────┐│
│ │ Add Expense │ │Record Payment││
│ └─────────────┘ └─────────────┘│
│ ┌─────────────┐ ┌─────────────┐│
│ │ View Reports│ │ Reconcile   ││
│ └─────────────┘ └─────────────┘│
└─────────────────────────────────┘
```

**Links:**
| Button | Route |
|--------|-------|
| Add Expense | `/expenses/new` |
| Record Payment | `/approval-queue` |
| View Reports | `/finance-reports` |
| Reconcile | `/bank-reconciliation` |

### 7. Queue Breakdown (By Type)
```
┌─────────────────────────────────┐
│ By Type                 0 total │
│ No items                        │
│ (or shows progress bars by type)│
└─────────────────────────────────┘
```

**Types tracked:**
- Withdrawal (orange)
- Payment (blue)
- Top-up (green)

### 8. Pending Approvals Table
```
┌─────────────────────────────────────────────────────────────┐
│ Pending Approvals                              [View All →] │
├─────────┬──────────┬──────────┬─────────────────────────────┤
│ Member  │ Type     │ Amount   │ SLA                         │
├─────────┼──────────┼──────────┼─────────────────────────────┤
│ John D. │ withdrawal│ ₱5,000  │ 4h                          │
│ Jane S. │ payment  │ ₱12,500  │ Overdue                     │
└─────────┴──────────┴──────────┴─────────────────────────────┘
```

**Features:**
- Shows top 5 pending items
- SLA breach highlighting (red background)
- Clickable rows → `/approval-queue`
- "View All" button → `/approval-queue`
- Empty state: "All caught up!" with checkmark

---

## Data Flow

### API Endpoints Used

```typescript
// Dashboard summary
GET /api/finance/dashboard/
Response: {
  cash_position: {
    total_ecash_balance: number,
    cash_in_today: number,
    cash_out_today: number,
    net_today: number
  },
  pending_approvals: { count: number, sla_breached: number },
  alerts: { critical: number, high: number, medium: number, low: number },
  today_transactions: { approved: number, pending: number, rejected: number, total: number },
  weekly_trend: Array<{ date: string, cash_in: number, cash_out: number, net: number }>
}

// Approval queue
GET /api/finance/approval-queue/
Response: {
  items: ApprovalQueueItem[],
  summary: { total: number, urgent: number, sla_breached: number }
}
```

### SWR Hooks

```typescript
import { useFinanceDashboard, useApprovalQueue } from "@/hooks/useFinance";

// In component:
const { data: dashboardData, isLoading, mutate } = useFinanceDashboard();
const { data: queueData } = useApprovalQueue();
```

---

## Responsive Design

| Breakpoint | Behavior |
|------------|----------|
| **Desktop (lg+)** | 2-column layout: Main (8 cols) + Sidebar (4 cols) |
| **Tablet (md)** | Single column, stacked layout |
| **Mobile (xs-sm)** | Single column, compact cards, drawer sidebar |

### KPI Cards
- Desktop: 4 columns (3 each)
- Mobile: 2 columns (6 each)

---

## Styling Guidelines

### Color Palette
| Purpose | Color | Hex |
|---------|-------|-----|
| Cash In / Positive | Green | `#22c55e` |
| Cash Out / Negative | Red | `#ef4444` |
| Pending / Warning | Orange | `#f59e0b` |
| Primary / Info | Blue | `#3b82f6` |
| Neutral | Purple | `#8b5cf6` |

### Card Styling
```typescript
{
  borderRadius: 2,           // 8px
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "none",
}
```

### Typography Scale
| Element | Variant | Font Weight |
|---------|---------|-------------|
| Page Title | h5 | 800 |
| Card Title | subtitle2 | 700 |
| KPI Value | h5 | 700 |
| Labels | caption | 500-600 |
| Body Text | body2/caption | 400 |

---

## Adding New Widgets

To add a new widget to the dashboard:

1. **Create the component:**
```typescript
function NewWidget({ data }: { data: SomeType }) {
  return (
    <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", boxShadow: "none" }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Typography variant="subtitle2" fontWeight={700}>Widget Title</Typography>
        {/* Widget content */}
      </CardContent>
    </Card>
  );
}
```

2. **Add to layout in the return statement:**
```typescript
<motion.div variants={itemVariants}>
  <NewWidget data={someData} />
</motion.div>
```

3. **Wrap with animation variants for entrance animation**

---

## Performance Considerations

- **SWR Caching:** Data is cached and revalidated on focus
- **Motion Animations:** Staggered entrance animations (0.03s delay)
- **Lazy Loading:** Components render as data becomes available
- **Memoization:** `useMemo` used for computed values

---

## Testing Checklist

- [ ] All Quick Action buttons navigate correctly
- [ ] Task items are clickable and navigate
- [ ] Approval table rows are clickable
- [ ] "View All" button works
- [ ] Export button navigates to reports
- [ ] Refresh button revalidates data
- [ ] Sidebar navigation works on all pages
- [ ] Mobile drawer opens/closes properly
- [ ] Empty states display correctly
- [ ] Loading state shows spinner
- [ ] Error state shows retry button

---

## Related Documentation

- [Finance Module Index](./FINANCE_MODULE_INDEX.md)
- [Finance API Reference](./FINANCE_API_REFERENCE.md)
- [V4 Frontend Integration](./V4_FRONTEND_INTEGRATION.md)
- [Finance Phase 3 Frontend](./FINANCE_PHASE3_V4_FRONTEND.md)

---

## Changelog

### v4.0 (2026-02-22)
- Complete redesign with compact, professional layout
- Added sidebar navigation with collapsible sections
- Moved Today's Transactions and Quick Actions to right sidebar
- Full-width Cashflow chart
- All interactive elements now functional with proper routing
- Improved responsive design
- Added Framer Motion animations

### v3.0 (2026-02-22)
- Initial professional design
- Clean white stat cards
- Line chart visualization

### v2.0 (2026-02-17)
- Gradient KPI cards
- Action items panel
- Alerts widget

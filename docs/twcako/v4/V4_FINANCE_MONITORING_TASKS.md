# V4 Finance Monitoring System - Task Breakdown

**Timeline:** Weeks 3-4 (Mar 3-14, 2026)
**Dependencies:** Notification Center (Week 2), WebSocket (Week 1)

---

## Phase 1: Models & Database (Week 3, Day 3)

### 1.1 Core Finance Models
- [ ] Create `FinanceDailySnapshot` model
  - Date (unique), total_ecash_balance, cash_in, cash_out
  - Transaction counts by type, commission totals, platform revenue
  - Pending counts, rejection rates, courier payables
- [ ] Create `FinanceAlert` model
  - Alert types: large_withdrawal, duplicate_payment, velocity_spike, sla_breach, balance_anomaly, high_refund_rate, dormant_high_balance, reconciliation_mismatch
  - Severity levels: low, medium, high, critical
  - Status: open, acknowledged, investigating, resolved, dismissed
  - Assigned_to, resolved_by, resolution_notes
- [ ] Create `ApprovalQueueItem` model
  - Generic FK to CashTransaction/withdrawal
  - Priority: normal, high, urgent
  - SLA deadline, escalation_level (0-2)
  - Assigned_to, resolution_time
- [ ] Create `MemberFinancialHealth` model
  - Member FK, health_score (0-100)
  - Balance stability, payment_behavior, income_activity scores
  - Risk flags (JSONField): high_withdrawal_risk, dormant_high_balance, frequent_rejections, velocity_anomaly, balance_plunge
  - Last calculated timestamp

### 1.2 Reconciliation Models
- [ ] Create `ReconciliationLog` model
  - Date, type (bank, xendit, courier, ecash, supplier)
  - Expected amount, actual amount, variance
  - Status: matched, variance, investigating, resolved
  - Resolution notes, performed_by

### 1.3 Supplier Settlement Models
- [ ] Create `SupplierSettlement` model
  - Supplier FK, period_start, period_end
  - Total orders, total_amount, deductions (returns, fees)
  - Net payable, status (calculating, pending_review, disputed, approved, processing, paid)
  - Payment reference, paid_date

### 1.4 Audit Models
- [ ] Create `TransactionAuditLog` model
  - Generic FK to any transaction
  - Action: create, update, approve, reject, adjustment
  - Previous values (JSONField), new values (JSONField)
  - User, IP address, reason, timestamp

### 1.5 Operational Finance Models
- [ ] Create `OperationalExpense` model
  - Date, category, subcategory (choices)
  - Description, amount, vendor, payment_method
  - Receipt (FileField), approved_by, status
  - Reimbursement tracking
- [ ] Create `CompanyAsset` model
  - Name, type (real_estate, vehicle, equipment, investment)
  - Acquisition date, purchase_price, current_value
  - Location/assignment, status (active, sold, disposed)
- [ ] Create `Loan` model
  - Name, type, lender, related_asset (FK optional)
  - Principal, interest_rate, term_months
  - Monthly payment, due_day, current_balance
  - Start date, next_payment_date, status
- [ ] Create `LoanPayment` model
  - Loan FK, payment_date, amount_paid
  - Principal portion, interest portion, late_fee
  - Balance after, payment_method, reference
- [ ] Create `AssetIncome` model
  - Asset FK, income_date, income_type
  - Amount, platform_fees, net_income, source

### 1.6 Petty Cash Models
- [ ] Create `PettyCashFund` model
  - Name, custodian (User FK), float_amount
  - Current balance, location/purpose, status
  - Last replenishment date
- [ ] Create `PettyCashTransaction` model
  - Fund FK, type (disbursement, replenishment, adjustment)
  - Date, amount, description, expense_category
  - Recipient, receipt, approved_by, balance_after

### 1.7 Migrations
- [ ] Create and run migrations for all new models
- [ ] Add indexes for frequently queried fields (date, status, member)

---

## Phase 2: Signals & Alert Triggers (Week 3, Day 4)

### 2.1 Transaction Signals
- [ ] Signal on CashTransaction create/update → check for large withdrawal
- [ ] Signal on CashTransaction create → check for duplicate payment
- [ ] Signal on withdrawal approval → update MemberFinancialHealth

### 2.2 Alert Creation Logic
- [ ] `create_large_withdrawal_alert()` - > PHP 30k (High), > PHP 100k (Critical)
- [ ] `create_duplicate_payment_alert()` - same ref within 24h
- [ ] `create_velocity_spike_alert()` - 3x normal transaction rate
- [ ] `create_balance_draining_alert()` - > 80% withdrawn in 24h
- [ ] `create_sla_breach_alert()` - past deadline

### 2.3 Alert Notification Integration
- [ ] Connect alerts to Notification Center (push, in-app)
- [ ] Critical alerts → push + SMS
- [ ] High alerts → push + in-app
- [ ] Medium/Low → in-app only

---

## Phase 3: SLA & Anomaly Detection (Week 3, Day 5)

### 3.1 SLA Configuration
- [ ] Create SLA config table or settings
  - Withdrawal (Normal): 24h
  - Withdrawal (> 30k): 12h
  - Withdrawal (> 100k): 4h
  - Payment: 24h
  - Top-Up: 48h
  - Refund: 4h (Urgent)

### 3.2 Celery Tasks - SLA
- [ ] `check_pending_sla` task (every 30 mins)
  - Query ApprovalQueueItem past SLA
  - Create SLA breach alerts
  - Auto-escalate (level 0 → 1 → 2)
- [ ] `escalate_pending_approvals` task (hourly)
  - Escalation matrix: Staff (12h) → Supervisor (24h) → Manager (48h)

### 3.3 Celery Tasks - Anomaly Detection
- [ ] `detect_anomalies` task (every 15 mins)
  - Velocity spike detection (3x normal rate)
  - New account large withdrawal (< 7 days, > 20k)
  - Withdrawal > Earnings (120% in 90 days)
  - Cross-account patterns (same device/IP)

---

## Phase 4: Financial Health Scoring (Week 4, Day 1)

### 4.1 Health Score Calculation
- [ ] Create `calculate_member_financial_health()` function
  - Balance Stability (25%): consistent vs volatile
  - Payment Behavior (25%): rejections history
  - Income Activity (25%): regular commissions
  - Transaction Patterns (15%): normal vs anomalous
  - Account Age (10%): > 1 year = 10, < 30 days = 2

### 4.2 Risk Flag Detection
- [ ] `high_withdrawal_risk` - withdrawals > 120% earnings (90d)
- [ ] `dormant_high_balance` - no login 30d + balance > PHP 10k
- [ ] `frequent_rejections` - 3+ rejections in 30d
- [ ] `velocity_anomaly` - 5x normal rate
- [ ] `balance_plunge` - > 80% drop in 7 days
- [ ] `new_account_high_activity` - < 7 days, high volume

### 4.3 Celery Task
- [ ] `calculate_member_financial_health` task (daily 2 AM)
  - Recalculate all member scores
  - Update risk flags
  - Log score changes

---

## Phase 5: Finance Dashboard (Week 4, Day 3)

### 5.1 Finance Home Dashboard
- [ ] Cash Position widget
  - Total eCash, cash in/out today, net flow
- [ ] Pending Approvals widget
  - Count by type, oldest item, SLA status
- [ ] Active Alerts widget
  - Critical/high alerts list
- [ ] Today's Transactions widget
  - Completed vs processing counts
- [ ] Weekly Trend chart
  - 7-day cash flow visualization

### 5.2 Commission Dashboard
- [ ] Commission by type breakdown (TAP, Diamond, Retail, etc.)
- [ ] Top earners this period
- [ ] Commission trends chart
- [ ] Pending commission calculations

### 5.3 Revenue Dashboard
- [ ] Revenue by source (platform fees, subscriptions)
- [ ] Revenue by funnel (TAP, VCP, VW, Dropshipping)
- [ ] Revenue trends (daily, weekly, monthly)

### 5.4 Approval Queue Dashboard
- [ ] My assigned items list
- [ ] Unassigned queue
- [ ] Filter by type, priority, age
- [ ] SLA countdown indicators (red/yellow/green)
- [ ] Bulk actions (approve, assign, escalate)

### 5.5 API Endpoints
- [ ] `GET /api/finance/dashboard/` - main dashboard data
- [ ] `GET /api/finance/cash-position/` - real-time cash
- [ ] `GET /api/finance/pending-approvals/` - queue data
- [ ] `GET /api/finance/alerts/` - active alerts
- [ ] `GET /api/finance/commissions/` - commission breakdown
- [ ] `GET /api/finance/revenue/` - revenue metrics

---

## Phase 6: Enhanced Approval Screen (Week 4, Day 4)

### 6.1 Approval Authority Matrix
- [ ] Implement authority checks
  - Payment: 0-10k (Staff), 10-50k (Supervisor), 50k+ (Manager)
  - Withdrawal: 0-20k (Staff), 20-50k (Supervisor), 50k+ (Manager + CTO notify)
  - Refund: Any (Manager)
  - Manual Adjustment: Manager + CTO approval

### 6.2 Enhanced Approval UI
- [ ] Member financial summary panel
  - Health score, risk flags, balance history
- [ ] Recent transaction history
- [ ] Balance before/after preview
- [ ] Approval checklist
  - Balance sufficient, bank verified, no risk flags, within authority

### 6.3 Rejection Workflow
- [ ] Rejection reason dropdown (insufficient_balance, suspicious_activity, etc.)
- [ ] Required notes field
- [ ] Auto-notify member on rejection

---

## Phase 7: Reconciliation System (Week 4, Day 5)

### 7.1 Daily Reconciliation Tasks
- [ ] `calculate_daily_snapshot` task (daily 11:59 PM)
  - Capture all daily metrics
  - Store in FinanceDailySnapshot
- [ ] `run_reconciliation` task (daily 11:45 PM)
  - Bank matching logic
  - Xendit matching logic
  - Create ReconciliationLog entries

### 7.2 Reconciliation UI
- [ ] Bank reconciliation view
  - Upload CSV, auto-match, flag variances
- [ ] Courier SOA reconciliation view
  - JNT statement upload, match orders
- [ ] Xendit reconciliation view
  - API fetch, verify fees

### 7.3 Variance Alerts
- [ ] Bank variance > PHP 1,000 → High alert
- [ ] Courier variance > PHP 5,000 → High alert
- [ ] ECash sum mismatch → Critical alert

---

## Phase 8: Reports (Week 4, Day 5)

### 8.1 Automated Reports
- [ ] Daily Cash Summary (6 AM email)
  - Cash position, transaction breakdown, alerts
- [ ] Weekly Finance Digest (Monday 8 AM)
  - Trends, alerts summary, supplier payables
- [ ] SLA Performance Report (weekly)
  - Approval times, breach count

### 8.2 Celery Tasks
- [ ] `send_daily_report` task (daily 6 AM)
- [ ] `send_weekly_digest` task (Monday 8 AM)
- [ ] `generate_monthly_expense_report` task (1st of month)

### 8.3 On-Demand Reports
- [ ] Member eCash Statement (date range filter)
- [ ] Transaction Search (ref, amount, status)
- [ ] Commission Report (member, type, date)
- [ ] Supplier Statement (supplier, date)

---

## Phase 9: Operational Expenses (Future - After Week 4)

### 9.1 Expense Management UI
- [ ] Create expense form with receipt upload
- [ ] Category/subcategory selection
- [ ] Expense approval workflow
- [ ] Expense dashboard (monthly by category)

### 9.2 Asset Management UI
- [ ] Asset registry CRUD
- [ ] Loan tracking with amortization
- [ ] Asset income logging

### 9.3 Petty Cash UI
- [ ] Fund management (custodian assignment)
- [ ] Disbursement recording
- [ ] Replenishment workflow
- [ ] Monthly reconciliation

---

## Phase 10: Testing & QA

### 10.1 Unit Tests
- [ ] Model tests (all 14 models)
- [ ] Health score calculation tests
- [ ] Alert trigger tests
- [ ] SLA calculation tests

### 10.2 Integration Tests
- [ ] Approval workflow end-to-end
- [ ] Alert → Notification flow
- [ ] Reconciliation matching

### 10.3 Load Testing
- [ ] Dashboard performance (< 2s P95)
- [ ] Celery task performance

---

## Success Metrics Checklist

| Metric | Target | Status |
|--------|--------|--------|
| SLA Compliance | > 95% | [ ] |
| Avg Approval Time | < 8 hours | [ ] |
| Alert Response | < 2 hours | [ ] |
| False Positive Rate | < 10% | [ ] |
| Reconciliation Match | > 99% | [ ] |
| Dashboard Load | < 2 seconds | [ ] |
| Health Coverage | 100% members | [ ] |

---

*Total Tasks: ~85 items*
*Created: 2026-02-15*

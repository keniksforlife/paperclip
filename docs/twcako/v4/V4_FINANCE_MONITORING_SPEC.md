# TWCako V4 Finance Monitoring System
## Comprehensive Specification

**Version:** 2.0
**Date:** 2026-02-15
**Author:** CTO Planning Session
**Status:** Draft for V4 Implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Financial Architecture](#2-current-financial-architecture)
3. [Complete Financial Flows Inventory](#3-complete-financial-flows-inventory)
4. [Finance Monitoring System Design](#4-finance-monitoring-system-design)
5. [Real-Time Dashboards](#5-real-time-dashboards)
6. [Reconciliation & Settlement](#6-reconciliation--settlement)
7. [Automated Alerts & Fraud Detection](#7-automated-alerts--fraud-detection)
8. [Approval Workflow Enhancement](#8-approval-workflow-enhancement)
9. [Financial Reporting Suite](#9-financial-reporting-suite)
10. [Member Financial Health](#10-member-financial-health)
11. [Supplier Financial Management](#11-supplier-financial-management)
12. [Operational Expenses & Asset Management](#12-operational-expenses--asset-management)
13. [Compliance & Audit Trail](#13-compliance--audit-trail)
14. [Implementation Plan](#14-implementation-plan)

---

## 1. Executive Summary

### Project Objectives

1. **Complete Financial Visibility** - Track ALL money movements across every channel, commission type, and fee structure
2. **Real-Time Monitoring** - Live dashboards for cash position, pending items, and alerts
3. **Automated Reconciliation** - Daily matching of bank, courier, and gateway transactions
4. **Fraud Prevention** - Rule-based anomaly detection with escalation workflows
5. **Supplier Settlement** - Structured payment process for suppliers/merchants
6. **Compliance Readiness** - Complete audit trails for regulatory requirements

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monitoring Scope | All 29+ transaction types | Complete financial picture |
| Reconciliation | Automated daily matching | Reduce manual work, catch errors early |
| Supplier Payments | Weekly settlement cycle | Balance cash flow with supplier needs |
| Alert System | Multi-tier (Info → Critical) | Prioritize attention appropriately |
| Audit Trail | Every modification logged | Regulatory compliance, fraud investigation |

---

## 2. Current Financial Architecture

### 2.1 Existing Systems

| System | Purpose | Current State |
|--------|---------|---------------|
| **ECashEntry** | Complete ledger (29+ transaction types) | Working, needs better grouping |
| **CashTransaction** | Payments, topups, withdrawals | Working, needs SLA tracking |
| **XenditPayment** | Payment gateway integration | Working |
| **OrderTransaction** | Order-level financial tracking | Working |
| **VWOrder** | Virtual Warehouse financial flows | Working, complex |
| **TWCRewardClaims** | Rewards program tracking | Working |

### 2.2 System Virtual Accounts

These accounts route money through the system:

| Account | Purpose |
|---------|---------|
| `twcfounder` | Founder income allocation |
| `twcincome` | Company revenue |
| `cashunrestricted` | General cash pool |
| `live4more` | Virtual Warehouse operations |
| `jntpayable` | JNT courier payable |
| `bank_fee` | Bank fee tracking |
| Various fee accounts | Platform, xendit, shipping fees |

### 2.3 Critical Gaps Requiring V4 Solution

| Gap | Impact | V4 Solution |
|-----|--------|-------------|
| No consolidated cash position | Finance team lacks real-time visibility | Real-time dashboard |
| No SLA tracking on approvals | Late approvals undetected | ApprovalQueueItem model |
| No daily reconciliation | Manual, error-prone process | Automated reconciliation tasks |
| No supplier settlement workflow | Ad-hoc payments | Supplier settlement system |
| No fraud detection | Reactive investigation only | Automated anomaly alerts |
| No commission consolidation | 10+ commission types scattered | Commission dashboard |
| No courier reconciliation | JNT SOA matching manual | Automated courier matching |
| No audit trail for changes | Limited accountability | TransactionAuditLog model |

---

## 3. Complete Financial Flows Inventory

### 3.1 Money Inflows (Cash In)

#### Member Payments & Top-Ups
| Flow | Description | Current Tracking |
|------|-------------|------------------|
| Xendit Payments | GCash, PayMaya, Credit Card | XenditPayment model |
| Bank Transfers | GoTyme, BDO, Metrobank, etc. | CashTransaction |
| eCash Transfers | Peer-to-peer internal | ECashEntry |
| Cash Deposits | Manual cash handling | CashTransaction |

#### Commission Income (To Members)
| Commission Type | Amount/Rate | Trigger |
|-----------------|-------------|---------|
| Affiliate Commission (TAP) | PHP 400 | TAP subscription sale |
| Diamond Bonus (TAP) | PHP 100 | Upline diamond cut |
| Retail Commission | Variable | Retail sale completion |
| Retail Commission (Hybrid) | Variable | Sponsor's retail sale |
| Founder Bonus | Variable | Special program |
| Subscription Income | PHP 999 / 4,999 | TAP/TDP subscription |
| Sponsor Profit | Variable | Team profit share |
| RankUp Bonus | Variable | Rank promotion |
| RankUp Express | Variable | Express promotion |

#### Platform Revenue
| Revenue Type | Rate/Amount | Source |
|--------------|-------------|--------|
| Platform Fee (VCP) | PHP 100 | VCP transaction |
| Platform Fee (TDP) | PHP 136 | TDP transaction |
| VW Restock Platform Fee | Dynamic | VW restock orders |
| VW Transfer Fee | PHP 30 | VW transfers |
| Merchant Platform Fee | Variable | E-shop orders |
| Member Platform Fee | Variable | E-shop orders |
| Subscription Fee | PHP 399 | Subscription packages |
| Processing Fee | Variable | Credit card processing |

### 3.2 Money Outflows (Cash Out)

#### Member Withdrawals
| Flow | Fee | Processing |
|------|-----|------------|
| Standard Withdrawal | PHP 50 | Bank transfer |
| VW Withdrawal | PHP 30 | Convert inventory to cash |
| Founder/Supplier Withdrawal | No fee | Special accounts |

#### Shipping & Logistics Costs
| Cost Type | Rate | Carrier |
|-----------|------|---------|
| Shipping Fee (Charged) | PHP 150 (VCP) | All |
| Actual SF | Variable | JNT, LBC, GoGo |
| COD Fee | Variable | COD orders |
| RTS Fee (COD) | PHP 150 member / PHP 120 platform | Returns |
| RTS Fee (Non-COD) | PHP 30 | Returns |
| Courier Payable (JNT) | SOA-based | JNT bulk payment |

#### Gateway & Bank Fees
| Fee Type | Rate | When Applied |
|----------|------|--------------|
| Xendit Fee | 5% | All Xendit transactions |
| Bank Fee | Variable | Withdrawal disbursement |
| Transfer Fee | Variable | Inter-bank transfers |

### 3.3 Virtual Warehouse Flows

| Transaction Type | Financial Impact |
|------------------|------------------|
| VW Restock | Member pays, inventory added |
| VW Order | Customer pays, seller earns |
| VW Withdrawal | Inventory to cash conversion |
| VW Transfer | Inventory between members (PHP 30 fee) |
| SNS Income | 5% of gross to TWC |

### 3.4 Rewards & Incentives

| Program | Type | Claim Process |
|---------|------|---------------|
| Distributor Moneyback | Cash back | Claim via TWCRewardClaims |
| Builder Moneyback | Cash back | Claim via TWCRewardClaims |
| Subscription Bonus | Bonus | Auto-credited |
| Sponsoring Bonus | Bonus | Auto-credited |
| RankUp Bonus | Milestone | Claim required |
| Travel Incentive | Non-cash | Manual processing |
| Retail CashBack | Cash back | Auto-credited |

### 3.5 Refunds & Returns

| Scenario | Financial Impact |
|----------|------------------|
| Full Refund | Reverse all ECashEntry records |
| Partial Refund | Create negative entries |
| RTS (Return to Sender) | Fee distribution: member/platform/merchant |
| Chargeback | Not currently tracked - GAP |

---

## 4. Finance Monitoring System Design

### 4.1 New Models Required

#### FinanceDailySnapshot
Daily financial position summary for trend analysis and reporting.

**Purpose:** End-of-day snapshot of all financial metrics

**Key Fields:**
- Date (unique)
- Total eCash balance (all members)
- Cash in/out for the day
- Transaction counts by type
- Commission totals by type
- Platform revenue totals
- Pending transaction counts
- Rejection/refund rates
- Courier payable totals

#### FinanceAlert
Tracks all finance-related alerts and their resolution.

**Alert Types:**
- Large withdrawal (> PHP 30k, > PHP 100k)
- Duplicate payment detection
- Velocity spike (3x normal rate)
- SLA breach (pending too long)
- Balance anomaly (sudden drops)
- High refund rate
- Dormant high balance
- Multiple rejections
- Supplier payment overdue
- Reconciliation mismatch

**Severity Levels:** Low → Medium → High → Critical

#### ApprovalQueueItem
Enhanced tracking for pending approvals with SLA management.

**Key Features:**
- SLA deadline calculation
- Priority assignment (Normal, High, Urgent)
- Assignment tracking (who's working on it)
- Escalation tracking (level 0-2)
- Resolution time logging

#### MemberFinancialHealth
Financial engagement scoring for members.

**Health Factors:**
- Balance stability (consistent vs volatile)
- Payment behavior (on-time, rejections)
- Income activity (regular commissions)
- Transaction patterns (normal vs anomalous)
- Account age

**Risk Flags:**
- High withdrawal risk (withdrawing > earning)
- Dormant high balance
- Frequent rejections
- Velocity anomaly
- Balance plunge

#### SupplierSettlement
Track supplier payment cycles.

**Key Fields:**
- Supplier reference
- Settlement period (start/end dates)
- Total orders in period
- Total amount owed
- Deductions (returns, fees, chargebacks)
- Net payable
- Settlement status (pending, approved, paid)
- Payment reference

#### ReconciliationLog
Track daily reconciliation status.

**Reconciliation Types:**
- Bank account matching
- Xendit gateway matching
- Courier SOA matching
- eCash balance verification
- Supplier invoice matching

**Fields:**
- Date
- Type
- Expected amount
- Actual amount
- Variance
- Status (matched, variance, investigating)
- Resolution notes

#### TransactionAuditLog
Complete audit trail for all financial changes.

**Tracked Events:**
- Status changes
- Amount modifications
- Approval/rejection actions
- Manual adjustments
- Who, what, when, why

#### OperationalExpense
Track non-platform business expenses.

**Key Fields:**
- Expense date, category, subcategory
- Description, amount, vendor
- Payment method, receipt attachment
- Approval status, approved by
- Reimbursement tracking

**Categories:** Events/Meetings, Software, Travel, Office, Personnel

#### CompanyAsset
Track company-owned assets.

**Key Fields:**
- Asset name, type, description
- Acquisition date, purchase price
- Current value, location/assignment
- Status (active, sold, disposed)

**Types:** Real Estate, Vehicle, Equipment, Investment

#### Loan
Track loans and scheduled payments.

**Key Fields:**
- Loan name, type, lender
- Related asset (optional)
- Principal, interest rate, term
- Monthly payment, due day
- Current balance, next payment date
- Status (active, paid_off)

#### LoanPayment
Track individual loan payments.

**Key Fields:**
- Loan reference, payment date
- Amount paid (principal + interest)
- Balance after payment
- Payment method, reference

#### AssetIncome
Track income from company assets.

**Key Fields:**
- Asset reference, income date
- Income type (rental, dividend, etc.)
- Amount, platform fees, net income
- Source description

#### PettyCashFund
Track petty cash funds and custodians.

**Key Fields:**
- Fund name, custodian
- Float amount, current balance
- Location/purpose
- Status (active, suspended, closed)
- Last replenishment date

#### PettyCashTransaction
Track petty cash disbursements and replenishments.

**Key Fields:**
- Fund reference, transaction type
- Date, amount, description
- Expense category, recipient
- Receipt attachment
- Balance after transaction

---

## 5. Real-Time Dashboards

### 5.1 Finance Home Dashboard

**Primary Widgets:**

| Widget | Content |
|--------|---------|
| Cash Position | Total eCash, cash in/out today, net flow |
| Pending Approvals | Count by type, oldest item, SLA status |
| Active Alerts | Critical/high alerts requiring action |
| Today's Transactions | Completed vs processing counts |
| Weekly Trend | 7-day cash flow chart |

**Real-Time Updates:** WebSocket connection for live data

### 5.2 Commission Dashboard

**Purpose:** Consolidated view of all commission payouts

**Sections:**
- Commission by type (TAP, Diamond, Retail, etc.)
- Top earners this period
- Commission trends over time
- Pending commission calculations
- Commission rate configuration

### 5.3 Revenue Dashboard

**Purpose:** Platform revenue tracking

**Sections:**
- Revenue by source (platform fees, subscription, etc.)
- Revenue trends (daily, weekly, monthly)
- Revenue by funnel (TAP, VCP, VW, Dropshipping)
- Fee collection rates
- Revenue forecasting

### 5.4 Approval Queue Dashboard

**Purpose:** Manage pending approvals efficiently

**Features:**
- My assigned items
- Unassigned queue
- Filter by type, priority, age
- SLA countdown indicators
- Bulk actions (approve, assign, escalate)
- Member financial summary on detail view

### 5.5 Courier Payable Dashboard

**Purpose:** Track courier settlements

**Sections:**
- Payable by carrier (JNT, LBC, GoGo)
- Pending SOA matching
- Payment history
- Variance alerts

---

## 6. Reconciliation & Settlement

### 6.1 Daily Reconciliation Process

| Time | Task | Automated |
|------|------|-----------|
| 11:30 PM | Capture day's ending balances | Yes |
| 11:45 PM | Calculate expected vs actual | Yes |
| 12:00 AM | Generate reconciliation report | Yes |
| 6:00 AM | Email summary to Finance | Yes |
| 9:00 AM | Review variances (manual) | No |

### 6.2 Bank Reconciliation

**Process:**
1. Import bank statement (CSV/API)
2. Match transactions by reference
3. Flag unmatched items
4. Investigate variances
5. Create adjusting entries if needed
6. Mark reconciliation complete

### 6.3 Courier SOA Reconciliation (JNT)

**Process:**
1. Upload JNT Statement of Account
2. Match against OrderTransaction records
3. Verify COD amounts collected
4. Calculate net payable
5. Approve for payment
6. Record payment reference

### 6.4 Xendit Gateway Reconciliation

**Process:**
1. Fetch Xendit settlement report
2. Match against XenditPayment records
3. Verify fee calculations
4. Flag mismatches
5. Update payment statuses

### 6.5 Supplier Settlement Cycle

**Weekly Settlement (Every Friday):**

| Day | Activity |
|-----|----------|
| Monday | Calculate previous week's orders |
| Tuesday | Generate supplier statement |
| Wednesday | Supplier review period |
| Thursday | Finance approval |
| Friday | Payment disbursement |

**Settlement Calculation:**
- Total orders fulfilled
- Less: Returns/RTS
- Less: Platform fees
- Less: Penalties (if any)
- = Net Payable

---

## 7. Automated Alerts & Fraud Detection

### 7.1 Alert Rules

#### Transaction Alerts
| Rule | Trigger | Severity | Channels |
|------|---------|----------|----------|
| Large Withdrawal | > PHP 30,000 | High | Push, In-app |
| Very Large Withdrawal | > PHP 100,000 | Critical | Push, SMS, In-app |
| Duplicate Payment | Same ref within 24h | High | In-app |
| Rapid Withdrawals | 3+ in 1 hour | High | In-app |
| Balance Draining | > 80% withdrawn in 24h | Critical | Push, SMS |

#### SLA Alerts
| Rule | Trigger | Severity | Action |
|------|---------|----------|--------|
| SLA Warning | 4 hours before deadline | Medium | Push |
| SLA Breach | Past deadline | Critical | Push, SMS, Auto-escalate |
| Stuck Transaction | Pending > 72 hours | High | Manager notification |

#### Reconciliation Alerts
| Rule | Trigger | Severity |
|------|---------|----------|
| Bank Variance | > PHP 1,000 discrepancy | High |
| Courier Variance | > PHP 5,000 discrepancy | High |
| Balance Integrity | ECash sum mismatch | Critical |

#### Fraud Detection
| Pattern | Detection Method | Action |
|---------|------------------|--------|
| Velocity Spike | 3x normal transaction rate | Flag for review |
| New Account Large Withdrawal | < 7 days old, > 20k withdrawal | Hold for manual review |
| Cross-Account Pattern | Multiple accounts, same device | Investigation alert |
| Withdrawal > Earnings | 120% of deposits in 90 days | Risk flag |

### 7.2 Alert Resolution Workflow

1. **Alert Created** → Notification sent
2. **Alert Assigned** → Staff picks up
3. **Investigation** → Review transaction/member
4. **Resolution** → Approve, reject, or escalate
5. **Documented** → Notes added for audit
6. **Closed** → Alert marked resolved

### 7.3 Escalation Matrix

| Initial Level | Escalation L1 | Escalation L2 | Escalation L3 |
|---------------|---------------|---------------|---------------|
| Finance Staff (12h) | Finance Supervisor (24h) | Finance Manager (48h) | CTO |
| Auto-assigned | Auto-escalate | Auto-escalate | Manual |

---

## 8. Approval Workflow Enhancement

### 8.1 Approval Authority Matrix

| Transaction Type | Amount Range | Approver Level |
|------------------|--------------|----------------|
| Payment | PHP 0 - 10,000 | Finance Staff |
| Payment | PHP 10,001 - 50,000 | Finance Supervisor |
| Payment | PHP 50,001+ | Finance Manager |
| Withdrawal | PHP 0 - 20,000 | Finance Staff |
| Withdrawal | PHP 20,001 - 50,000 | Finance Supervisor |
| Withdrawal | PHP 50,001+ | Finance Manager + CTO notification |
| Refund | Any amount | Finance Manager |
| Manual Adjustment | Any amount | Finance Manager + CTO approval |
| Supplier Payment | Any amount | Finance Manager |

### 8.2 SLA Configuration

| Transaction Type | Priority | SLA (Hours) |
|------------------|----------|-------------|
| Withdrawal (Normal) | Normal | 24 |
| Withdrawal (> 30k) | High | 12 |
| Withdrawal (> 100k) | Urgent | 4 |
| Payment | Normal | 24 |
| Top-Up | Normal | 48 |
| Refund | Urgent | 4 |
| Supplier Settlement | Normal | 72 |

### 8.3 Enhanced Approval Process

**Before Approval, System Shows:**
- Member financial summary
- Financial health score
- Risk flags (if any)
- Recent transaction history
- Balance before/after
- Similar past transactions

**Approval Checklist:**
- Balance sufficient
- Bank details verified
- No active risk flags
- Within approver authority
- No duplicate requests

**Required for Rejection:**
- Rejection reason (dropdown)
- Additional notes
- Member notification

---

## 9. Financial Reporting Suite

### 9.1 Automated Reports

| Report | Frequency | Recipients | Content |
|--------|-----------|------------|---------|
| Daily Cash Summary | Daily 6 AM | Finance Team | Cash position, transactions, pending |
| Weekly Finance Digest | Monday 8 AM | Finance Manager, CTO | Trends, alerts, supplier payables |
| Monthly Financial Report | 1st of month | Management | Full summary, P&L indicators |
| SLA Performance Report | Weekly | Finance Manager | Approval times, breaches |
| Commission Payout Report | Weekly | Finance, CTO | Commission by type, top earners |
| Supplier Settlement Report | Weekly | Finance | Pending/completed settlements |
| Reconciliation Status | Daily | Finance | Match rates, variances |

### 9.2 Daily Cash Summary Contents

**Cash Position:**
- Opening balance
- Cash in (by source)
- Cash out (by type)
- Closing balance
- Net change

**Transaction Breakdown:**
- Payments: count, amount
- Withdrawals: count, amount
- Top-ups: count, amount
- Refunds: count, amount

**Commission Summary:**
- By type: TAP, Diamond, Retail, etc.
- Total distributed
- Pending calculations

**Platform Revenue:**
- Platform fees collected
- Subscription revenue
- Processing fees

**Pending End-of-Day:**
- Pending payments
- Pending withdrawals
- Pending supplier settlements

**Alerts Summary:**
- Alerts triggered
- Alerts resolved
- Active critical alerts

**Approval Metrics:**
- Average approval time
- SLA compliance rate
- Rejection rate

### 9.3 On-Demand Reports

| Report | Purpose | Filters |
|--------|---------|---------|
| Member eCash Statement | Individual ledger | Member, date range |
| Transaction Search | Find specific transactions | Reference, amount, status, type |
| Rejection Analysis | Why transactions fail | Date range, reason category |
| Commission Report | Commission payouts | Member, type, date range |
| Supplier Statement | Supplier transaction history | Supplier, date range |
| Courier Payable | Carrier payment history | Carrier, date range |
| Fee Collection | Platform fee tracking | Fee type, date range |
| Refund Analysis | Refund patterns | Date range, reason |

---

## 10. Member Financial Health

### 10.1 Health Score Calculation (0-100)

| Factor | Weight | Scoring |
|--------|--------|---------|
| Balance Stability | 25% | Consistent = 25, Volatile = 5-15 |
| Payment Behavior | 25% | No rejections = 25, Per rejection -5 |
| Income Activity | 25% | Regular commissions = 25, None = 0 |
| Transaction Patterns | 15% | Normal = 15, Anomalies = 0-10 |
| Account Age | 10% | > 1 year = 10, < 30 days = 2 |

### 10.2 Score Interpretation

| Score | Rating | Description | Action |
|-------|--------|-------------|--------|
| 90-100 | Excellent | Highly active, no issues | Fast-track approvals |
| 70-89 | Good | Regular activity, minor flags | Standard process |
| 50-69 | Fair | Some inactivity or issues | Enhanced review |
| 30-49 | Poor | Significant concerns | Manager review required |
| 0-29 | Critical | High risk | Hold all transactions |

### 10.3 Risk Flags

| Flag | Trigger | Impact |
|------|---------|--------|
| `high_withdrawal_risk` | Withdrawals > 120% of earnings (90d) | Enhanced review |
| `dormant_high_balance` | No login 30d + balance > PHP 10,000 | Outreach required |
| `frequent_rejections` | 3+ rejections in 30 days | Manual review all |
| `velocity_anomaly` | 5x normal transaction rate | Fraud check |
| `balance_plunge` | > 80% balance drop in 7 days | Alert triggered |
| `new_account_high_activity` | < 7 days old, high volume | Enhanced scrutiny |

---

## 11. Supplier Financial Management

### 11.1 Supplier Payment Tracking

**Track Per Supplier:**
- Total orders this period
- Orders fulfilled
- Returns/RTS
- Platform fees deducted
- Net payable
- Payment history
- Current balance owed

### 11.2 Settlement Workflow

**Weekly Cycle:**
1. **Monday:** System calculates orders for previous week
2. **Tuesday:** Generate supplier statement (PDF/email)
3. **Wednesday:** Supplier reviews, raises disputes
4. **Thursday:** Finance reviews, resolves disputes, approves
5. **Friday:** Payment disbursed, recorded

**Settlement Statuses:**
- Calculating
- Pending Review
- Disputed
- Approved
- Payment Processing
- Paid
- Partial Payment

### 11.3 Supplier Financial Alerts

| Alert | Trigger | Action |
|-------|---------|--------|
| High Returns | > 5% return rate | Performance review |
| Payment Overdue | > 3 days past schedule | Escalate to Manager |
| Dispute Unresolved | > 5 days pending | Escalate to Manager |
| Large Settlement | > PHP 100,000 | CTO notification |

---

## 12. Operational Expenses & Asset Management

### 12.1 Expense Categories

#### Business Operations
| Category | Examples | Tracking Needs |
|----------|----------|----------------|
| **Events & Meetings** | Leaders Assembly, Dinner meetings, Training events, Outdoor meetings, Team building | Date, attendees, venue, receipts |
| **Travel & Transport** | Gas, Grab/taxi, Parking, Toll fees | Purpose, receipts, reimbursement |
| **Food & Entertainment** | Team meals, Client entertainment, Event catering | Attendees, occasion, receipts |
| **Office & Admin** | Office supplies, Printing, Shipping | Category, vendor, receipts |

#### Software & Subscriptions
| Category | Examples | Tracking Needs |
|----------|----------|----------------|
| **SaaS Subscriptions** | AWS, Sentry, SendGrid, Twilio SMS, Firebase, Domain renewals | Monthly cost, renewal date, auto-renew |
| **Tools & Licenses** | Design tools, Productivity apps, Development tools | Per-seat or flat, expiry |
| **Marketing** | Ads (FB, Google), Email tools, Landing pages | Campaign, ROI tracking |

#### Personnel & Contractors
| Category | Examples | Tracking Needs |
|----------|----------|----------------|
| **Allowances** | Travel allowance, Communication allowance | Recipient, period |
| **Contractor Payments** | Freelancers, Consultants | Contract terms, deliverables |
| **Incentives** | Performance bonus, Travel incentive payouts | Recipient, criteria |

### 12.2 New Model: OperationalExpense

**Purpose:** Track all non-platform business expenses

**Key Fields:**
- Expense date
- Category (event, software, travel, office, personnel, other)
- Subcategory (leaders_assembly, dinner_meeting, aws, etc.)
- Description
- Amount
- Payment method (cash, bank transfer, credit card, eCash)
- Vendor/payee
- Receipt attachment
- Approved by
- Status (pending, approved, paid, rejected)
- Reimbursement (if applicable, to whom)
- Notes

**Expense Categories:**
```
EVENTS_MEETINGS
├── leaders_assembly
├── dinner_meeting
├── outdoor_meeting
├── training_event
├── team_building
└── other_event

SOFTWARE_SUBSCRIPTIONS
├── cloud_hosting (AWS, etc.)
├── monitoring (Sentry, etc.)
├── communication (SMS, email)
├── marketing_tools
├── development_tools
└── other_software

TRAVEL_TRANSPORT
├── gas_fuel
├── grab_taxi
├── parking
├── toll_fees
├── airfare
├── accommodation
└── other_travel

OFFICE_ADMIN
├── supplies
├── printing
├── shipping
├── utilities
└── other_office

PERSONNEL
├── allowances
├── contractor_payment
├── incentive_payout
└── other_personnel
```

### 12.3 Asset Management

#### Asset Categories
| Category | Examples | Tracking Needs |
|----------|----------|----------------|
| **Real Estate** | Condo (Airbnb), Office space | Location, purchase price, loan, income |
| **Vehicles** | Company car | Purchase, loan, maintenance |
| **Equipment** | Laptops, Cameras, Office equipment | Serial, warranty, assigned to |
| **Investments** | Stocks, Crypto, Other | Current value, P&L |

### 12.4 New Model: CompanyAsset

**Purpose:** Track company-owned assets

**Key Fields:**
- Asset name
- Asset type (real_estate, vehicle, equipment, investment)
- Description
- Acquisition date
- Purchase price
- Current value (for investments)
- Location/assignment
- Status (active, sold, disposed)
- Notes

### 12.5 Loan & Liability Tracking

#### Loan Types
| Type | Examples | Tracking Needs |
|------|----------|----------------|
| **Real Estate Loans** | Condo mortgage | Principal, rate, term, monthly, balance |
| **Vehicle Loans** | Car financing | Principal, rate, term, monthly, balance |
| **Business Loans** | Bank loans, Credit lines | Purpose, rate, term, monthly, balance |
| **Equipment Financing** | Leases | Term, monthly, buyout |

### 12.6 New Model: Loan

**Purpose:** Track all loans and scheduled payments

**Key Fields:**
- Loan name
- Loan type (mortgage, vehicle, business, equipment, other)
- Related asset (FK to CompanyAsset, optional)
- Lender/bank
- Principal amount
- Interest rate (annual)
- Loan term (months)
- Start date
- Monthly payment amount
- Payment due day (1-31)
- Current balance
- Next payment date
- Status (active, paid_off, defaulted)
- Notes

### 12.7 New Model: LoanPayment

**Purpose:** Track each loan payment made

**Key Fields:**
- Loan (FK)
- Payment date
- Amount paid
- Principal portion
- Interest portion
- Late fee (if any)
- Balance after payment
- Payment method
- Reference/receipt
- Notes

### 12.8 Income from Assets

#### Income Types
| Asset Type | Income Type | Tracking |
|------------|-------------|----------|
| **Condo (Airbnb)** | Rental income | Per booking, guest, platform fees |
| **Investments** | Dividends, Capital gains | Per transaction |

### 12.9 New Model: AssetIncome

**Purpose:** Track income generated from assets

**Key Fields:**
- Asset (FK to CompanyAsset)
- Income date
- Income type (rental, dividend, capital_gain, other)
- Amount
- Source/description (e.g., "Airbnb booking #12345")
- Platform fees (e.g., Airbnb cut)
- Net income
- Notes

### 12.10 Operational Expense Dashboard

**Widgets:**
| Widget | Content |
|--------|---------|
| Monthly Expenses | Total by category, trend vs last month |
| Pending Approvals | Expenses awaiting approval |
| Software Renewals | Upcoming subscription renewals |
| Loan Payments Due | Next 30 days loan payments |
| Asset Income | Monthly income from assets |
| Net Operating Cash | Income - Expenses - Loan Payments |

### 12.11 Expense Approval Workflow

| Amount | Approver |
|--------|----------|
| PHP 0 - 5,000 | Finance Staff |
| PHP 5,001 - 20,000 | Finance Manager |
| PHP 20,001+ | CTO/CEO |

**Approval Process:**
1. Expense submitted with receipt
2. Category assigned
3. Approval requested
4. Approver reviews
5. Approved/Rejected
6. If approved, payment processed
7. Marked as paid with reference

### 12.12 Reports

| Report | Frequency | Content |
|--------|-----------|---------|
| Monthly Expense Summary | Monthly | Expenses by category, vs budget |
| Software Subscription Report | Monthly | All subscriptions, upcoming renewals |
| Loan Amortization Report | Monthly | All loans, payments, balances |
| Asset Performance Report | Quarterly | Asset values, income generated |
| P&L Summary | Monthly | Revenue - Platform Expenses - Operational Expenses |

### 12.13 Petty Cash Management

#### Overview
Track physical cash held for small, immediate expenses that can't wait for approval workflows.

#### Petty Cash Funds
| Fund | Custodian | Float Amount | Purpose |
|------|-----------|--------------|---------|
| **Main Office** | Finance Staff | PHP 10,000 | Office supplies, meals, transport |
| **Events** | Events Lead | PHP 5,000 | Event-related small purchases |
| **Field Operations** | Field Manager | PHP 5,000 | On-the-ground expenses |

### 12.14 New Model: PettyCashFund

**Purpose:** Track each petty cash fund and its custodian

**Key Fields:**
- Fund name
- Custodian (FK to User)
- Float amount (standard balance to maintain)
- Current balance
- Location/purpose
- Status (active, suspended, closed)
- Last replenishment date
- Notes

### 12.15 New Model: PettyCashTransaction

**Purpose:** Track every petty cash disbursement and replenishment

**Key Fields:**
- Fund (FK to PettyCashFund)
- Transaction type (disbursement, replenishment, adjustment)
- Date
- Amount
- Description/purpose
- Expense category (same as OperationalExpense categories)
- Recipient (who received the cash)
- Receipt attachment
- Approved by (for replenishments)
- Balance after transaction
- Notes

**Transaction Types:**
```
DISBURSEMENT - Cash paid out for expense
├── Amount is negative (reduces balance)
├── Requires: description, category, receipt
└── Small amounts only (< PHP 1,000 per transaction)

REPLENISHMENT - Cash added to restore float
├── Amount is positive (increases balance)
├── Requires: approval, source (bank withdrawal, eCash)
├── Should restore to float amount
└── Creates reconciliation checkpoint

ADJUSTMENT - Corrections
├── Can be positive or negative
├── Requires: reason, approved by
└── Used for: counting errors, lost funds
```

### 12.16 Petty Cash Workflow

**Daily Operations:**
1. Custodian makes small purchases
2. Records disbursement with receipt
3. Balance decreases

**Replenishment Process:**
1. Balance falls below threshold (e.g., 30% of float)
2. Custodian requests replenishment
3. Finance reviews all disbursements since last replenishment
4. Finance approves replenishment
5. Cash disbursed to restore float
6. Replenishment recorded

**Monthly Reconciliation:**
1. Physical cash count
2. Compare to system balance
3. Record any adjustments
4. Sign-off by custodian and Finance

### 12.17 Petty Cash Controls

| Control | Rule |
|---------|------|
| **Max Single Disbursement** | PHP 1,000 |
| **Daily Limit Per Fund** | PHP 3,000 |
| **Receipt Required** | Yes, for all disbursements |
| **Replenishment Threshold** | 30% of float remaining |
| **Reconciliation Frequency** | Monthly |
| **Surprise Cash Count** | Quarterly |

### 12.18 Petty Cash Dashboard

**Widgets:**
| Widget | Content |
|--------|---------|
| Fund Balances | Current balance per fund, % of float |
| Low Balance Alert | Funds below replenishment threshold |
| Recent Disbursements | Last 10 disbursements across all funds |
| Pending Replenishments | Replenishment requests awaiting approval |
| Monthly Usage | Disbursements by category this month |
| Reconciliation Status | Last reconciliation date per fund |

### 12.19 Petty Cash Alerts

| Alert | Trigger | Action |
|-------|---------|--------|
| Low Balance | Balance < 30% of float | Notify custodian & Finance |
| Daily Limit Exceeded | Disbursements > daily limit | Block further disbursements |
| Missing Receipt | Disbursement without receipt after 24h | Notify custodian |
| Overdue Reconciliation | No reconciliation in 35+ days | Notify Finance Manager |
| Large Adjustment | Adjustment > PHP 500 | Notify Finance Manager |
| Negative Balance | Balance goes negative | Critical alert to Finance |

### 12.20 Petty Cash Reports

| Report | Frequency | Content |
|--------|-----------|---------|
| Daily Petty Cash Summary | Daily | All disbursements, ending balances |
| Replenishment Report | Per replenishment | All disbursements since last, total |
| Monthly Reconciliation | Monthly | Physical count vs system, adjustments |
| Custodian Activity Report | Monthly | Disbursements by custodian |
| Category Analysis | Monthly | Petty cash usage by expense category |

### 12.21 Budget Tracking (Future Enhancement)

**Concept:** Set monthly budgets per category, track actual vs budget

**Budget Categories:**
- Events & Meetings: PHP X/month
- Software: PHP X/month
- Travel: PHP X/month
- Office: PHP X/month
- Personnel: PHP X/month

**Alerts:**
- Budget 80% consumed
- Budget exceeded
- Unusual spike in category

---

## 13. Compliance & Audit Trail

### 13.1 Transaction Audit Log

**Every financial transaction change records:**
- Timestamp
- User who made change
- Action type (create, update, approve, reject)
- Previous values
- New values
- IP address
- Reason/notes

### 13.2 Approval Audit

**Every approval records:**
- Approver
- Approval timestamp
- Amount approved
- Authority level used
- Checklist completion
- Any override (and reason)

### 13.3 Reconciliation Audit

**Every reconciliation records:**
- Date reconciled
- Who performed
- Expected vs actual
- Variances found
- Resolution actions
- Sign-off

### 13.4 Compliance Reports

| Report | Frequency | Purpose |
|--------|-----------|---------|
| Authority Violations | Weekly | Staff exceeding limits |
| Manual Adjustments | Weekly | All manual changes for review |
| Large Transactions | Daily | Regulatory threshold monitoring |
| Rejection Patterns | Monthly | Process improvement |
| SLA Breaches | Weekly | Performance monitoring |

---

## 14. Implementation Plan

### 14.1 Integration with V4 Timeline

Finance Monitoring is integrated into **Weeks 3-4** alongside Member Monitoring (shared patterns).

### Week 3: Foundation (Mar 3-7)

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Mon-Tue | Member Monitoring models | Activity tracking live |
| Wed | Finance models | FinanceDailySnapshot, FinanceAlert, ApprovalQueueItem |
| Thu | Finance signals & alerts | Alert triggering on transactions |
| Fri | SLA tracking & anomaly detection | Automated SLA checks |

### Week 4: Dashboards & Integration (Mar 10-14)

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Mon | Member & Finance scoring | Engagement + Financial health |
| Tue | Member dashboard | Team overview, follow-up queue |
| Wed | Finance dashboard | Cash position, pending approvals |
| Thu | Enhanced approval screen | Authority checks, member summary |
| Fri | Reports & testing | Daily report generation, integration tests |

### 14.2 Celery Tasks Schedule

| Task | Schedule | Purpose |
|------|----------|---------|
| `calculate_daily_snapshot` | Daily 11:59 PM | End-of-day financial summary |
| `check_pending_sla` | Every 30 minutes | SLA breach detection |
| `detect_anomalies` | Every 15 minutes | Fraud pattern detection |
| `calculate_member_financial_health` | Daily 2:00 AM | Health score recalculation |
| `send_daily_report` | Daily 6:00 AM | Email daily summary |
| `escalate_pending_approvals` | Hourly | Auto-escalate SLA breaches |
| `run_reconciliation` | Daily 11:45 PM | Bank/gateway matching |
| `calculate_supplier_settlement` | Weekly Monday 6:00 AM | Supplier statement generation |
| `check_loan_payments_due` | Daily 8:00 AM | Alert for upcoming loan payments |
| `check_subscription_renewals` | Daily 8:00 AM | Alert for upcoming software renewals |
| `generate_monthly_expense_report` | Monthly 1st 6:00 AM | Operational expense summary |
| `calculate_asset_income` | Monthly 1st 6:00 AM | Asset income summary |
| `check_petty_cash_balances` | Daily 9:00 AM | Alert for low petty cash balances |
| `check_petty_cash_reconciliation` | Daily 9:00 AM | Alert for overdue reconciliations |
| `generate_daily_petty_cash_summary` | Daily 6:00 PM | Daily petty cash report |

### 14.3 Dependencies

| Component | Depends On |
|-----------|------------|
| Finance Alerts | Notification Center (Week 2) |
| Real-time Dashboard | WebSocket setup (Week 1) |
| Member Financial Health | Can run independently |
| Supplier Settlement | Supplier Process (Week 5-6) |

### 14.4 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| SLA Compliance | > 95% | Approvals within SLA |
| Avg Approval Time | < 8 hours | Mean resolution time |
| Alert Response | < 2 hours | Time to acknowledge |
| False Positive Rate | < 10% | Alerts dismissed without action |
| Reconciliation Match Rate | > 99% | Matched vs total transactions |
| Dashboard Load Time | < 2 seconds | P95 page load |
| Member Health Coverage | 100% | Members with calculated score |

---

## Appendix A: ECashEntry Transaction Types (29+)

### Income Types
- `affiliate_commission_tap`
- `diamond_bonus_tap`
- `retail_commission`
- `retail_commission_hybrid`
- `subscription_income`
- `freebie_sale`
- `distributor_sale`
- `merchant_sale`
- `seller_sale`
- `sponsor_profit`
- `supplier_sales`
- `founder_bonus`
- `other_income`

### Cash Flow Types
- `cash_receipt`
- `ecash_payment`
- `ecash_receipt`
- `ecash_withdrawal`
- `initial_balance`

### Fee Types
- `platform_fee`
- `xendit_fee`
- `withdrawal_fee`
- `shipping_fee`
- `cod_fee`
- `actual_sf`
- `rts_fee`
- `system_fee`

### Legacy/Discontinued
- `affiliate_commission_vcp`
- `affiliate_commission_phdp`
- `affiliate_commission_glup`
- `affiliate_commission_gldp`

---

## Appendix B: Alert Templates

### Large Withdrawal Alert
**Title:** Large Withdrawal Request - PHP {amount}

**Content:**
- Member: {name}
- Amount: PHP {amount}
- Current Balance: PHP {balance}
- Balance After: PHP {balance_after}
- Financial Health: {score}/100
- Risk Flags: {flags}
- Actions: [View Details] [Approve] [Reject]

### SLA Breach Alert
**Title:** SLA Breach - {type} Pending {hours}h

**Content:**
- Transaction: {reference}
- Member: {name}
- Amount: PHP {amount}
- Submitted: {timestamp}
- SLA Deadline: {deadline}
- Breached By: {hours}h
- Escalated To: {escalated_to}
- Action: [Take Action Now]

### Reconciliation Variance Alert
**Title:** Reconciliation Variance - {type}

**Content:**
- Date: {date}
- Type: {bank/xendit/courier}
- Expected: PHP {expected}
- Actual: PHP {actual}
- Variance: PHP {variance}
- Action: [Investigate]

---

## Appendix C: Phase 2 Considerations (Future)

### Not in V4 Scope, Track for Future:
1. **Machine Learning Fraud Detection** - Predictive models
2. **Multi-Currency Support** - If expanding internationally
3. **Tax Reporting Automation** - BIR integration
4. **Payment Plan/Installment** - Structured payment options
5. **Chargeback Management** - Gateway dispute handling
6. **Advanced Forecasting** - Cash flow prediction
7. **Mobile Finance Dashboard** - Finance app features

---

*Document Version: 2.0*
*Created: 2026-02-15*
*Last Updated: 2026-02-15*
*Integration: V4 Weeks 3-4 (alongside Member Monitoring)*

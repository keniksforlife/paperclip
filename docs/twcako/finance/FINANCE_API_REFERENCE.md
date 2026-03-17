# Finance Module - API Reference

**Version:** 1.0
**Date:** 2026-02-22
**Total Endpoints:** 73

---

## Table of Contents

1. [Authentication](#authentication)
2. [Phase 1: Monitoring & CRUD](#phase-1-monitoring--crud)
3. [Phase 2: Enhanced Workflows](#phase-2-enhanced-workflows)
4. [Phase 3: Advanced Accounting](#phase-3-advanced-accounting)
5. [Response Formats](#response-formats)
6. [Error Codes](#error-codes)

---

## Authentication

All endpoints require JWT authentication.

```http
Authorization: Bearer <access_token>
```

### Permission Levels

| Permission | Description |
|------------|-------------|
| `view_finance` | View dashboards, reports |
| `manage_expenses` | Create/edit expenses |
| `manage_assets` | Create/edit assets |
| `manage_loans` | Create/edit loans |
| `manage_pettycash` | Manage petty cash funds |
| `approve_items` | Approve/reject queue items |
| `manage_accounts` | Manage chart of accounts |
| `post_journalentries` | Post journal entries |
| `close_fiscalperiods` | Close fiscal periods |

---

## Phase 1: Monitoring & CRUD

### Dashboard & Monitoring

#### GET `/api/finance/dashboard/`

Main finance dashboard metrics.

**Response:**
```json
{
  "cash_balance": 1250000.00,
  "receivables": 450000.00,
  "payables": 280000.00,
  "monthly_revenue": 890000.00,
  "monthly_expenses": 320000.00,
  "pending_approvals": 12,
  "alerts": [
    {"id": 1, "type": "budget_exceeded", "severity": "high", "title": "..."}
  ],
  "cash_flow_trend": [
    {"date": "2026-02-01", "inflow": 50000, "outflow": 32000}
  ]
}
```

---

#### GET `/api/finance/snapshots/`

Historical daily snapshots.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `days` | int | Number of days (default: 30) |

**Response:**
```json
{
  "snapshots": [
    {
      "date": "2026-02-22",
      "cash_balance": 1250000.00,
      "receivables": 450000.00,
      "payables": 280000.00,
      "daily_revenue": 45000.00,
      "daily_expenses": 12000.00
    }
  ]
}
```

---

#### GET `/api/finance/alerts/`

Finance alerts list.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `active`, `acknowledged`, `resolved` |
| `severity` | string | `low`, `medium`, `high`, `critical` |
| `type` | string | Alert type filter |
| `page` | int | Page number |

**Response:**
```json
{
  "count": 25,
  "page": 1,
  "page_size": 20,
  "alerts": [
    {
      "id": 1,
      "alert_type": "budget_exceeded",
      "alert_type_display": "Budget Exceeded",
      "severity": "high",
      "status": "active",
      "title": "Marketing budget exceeded 100%",
      "description": "...",
      "related_user": "john_doe",
      "related_amount": 15000.00,
      "assigned_to": "finance_manager",
      "created_at": "2026-02-22T10:30:00Z",
      "resolved_at": null
    }
  ]
}
```

---

#### GET `/api/finance/alerts/{id}/`

Alert detail with full information.

---

#### POST `/api/finance/alerts/{id}/`

Update alert (acknowledge, resolve).

**Request:**
```json
{
  "action": "acknowledge",  // or "resolve"
  "notes": "Looking into this..."
}
```

---

### Approval Queue

#### GET `/api/finance/approval-queue/`

Pending approval items.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `type` | string | Item type filter |
| `priority` | string | `low`, `medium`, `high`, `urgent` |
| `sla_breached` | bool | Filter breached SLA items |

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "item_type": "expense",
      "item_type_display": "Expense",
      "reference_id": "EXP-2026-0001",
      "user": {
        "username": "john_doe",
        "full_name": "John Doe"
      },
      "amount": 5000.00,
      "description": "Office supplies",
      "priority": "medium",
      "status": "pending",
      "submitted_at": "2026-02-22T09:00:00Z",
      "sla_hours": 48,
      "hours_remaining": 36.5,
      "sla_breached": false
    }
  ],
  "summary": {
    "total": 12,
    "pending": 8,
    "in_review": 4,
    "sla_breached": 1
  }
}
```

---

#### GET `/api/finance/approval-queue/{id}/`

Approval item detail.

---

#### POST `/api/finance/approval-queue/{id}/action/`

Approve, reject, or escalate item.

**Request:**
```json
{
  "action": "approve",  // or "reject", "escalate"
  "notes": "Approved per policy",
  "escalate_to": "finance_director"  // only for escalate
}
```

---

#### GET `/api/finance/approval-queue/history/`

Resolved approval history.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `days` | int | Days of history (default: 30) |
| `action` | string | `approved`, `rejected` |

---

### Expenses

#### GET `/api/finance/expenses/`

List operational expenses.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Category filter |
| `status` | string | `draft`, `pending`, `approved`, `rejected` |
| `date_from` | date | Start date (YYYY-MM-DD) |
| `date_to` | date | End date |
| `vendor` | string | Vendor filter |
| `page` | int | Page number |

**Response:**
```json
{
  "expenses": [...],
  "count": 150,
  "summary": {
    "total_amount": 285000.00,
    "by_category": {
      "utilities": 45000.00,
      "supplies": 32000.00
    }
  }
}
```

---

#### POST `/api/finance/expenses/`

Create new expense.

**Request:**
```json
{
  "expense_date": "2026-02-22",
  "category": "supplies",
  "subcategory": "office",
  "amount": 2500.00,
  "description": "Printer paper and ink",
  "vendor": "Office Depot",
  "payment_method": "petty_cash",
  "receipt": "<file upload>"
}
```

---

#### GET `/api/finance/expenses/{id}/`

Expense detail.

---

#### PUT `/api/finance/expenses/{id}/`

Update expense (draft/pending only).

---

#### DELETE `/api/finance/expenses/{id}/`

Delete expense (draft only).

---

#### POST `/api/finance/expenses/{id}/submit/`

Submit expense for approval.

---

#### GET `/api/finance/expenses/summary/`

Monthly expense summary by category.

---

### Assets

#### GET `/api/finance/assets/`

Company assets list.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Asset category |
| `status` | string | `active`, `disposed`, `under_maintenance` |
| `location` | string | Location filter |

---

#### POST `/api/finance/assets/`

Register new asset.

**Request:**
```json
{
  "name": "Dell Laptop XPS 15",
  "category": "equipment",
  "purchase_date": "2026-02-22",
  "purchase_price": 85000.00,
  "serial_number": "DL-XPS15-001",
  "location": "Main Office",
  "assigned_to": "john_doe",
  "depreciation_method": "straight_line",
  "useful_life_years": 5
}
```

---

#### GET `/api/finance/assets/{id}/`

Asset detail with depreciation schedule.

---

#### PUT `/api/finance/assets/{id}/`

Update asset information.

---

#### POST `/api/finance/assets/{id}/dispose/`

Mark asset as disposed.

**Request:**
```json
{
  "disposal_date": "2026-02-22",
  "disposal_method": "sold",
  "disposal_amount": 25000.00,
  "notes": "Sold to employee"
}
```

---

### Loans

#### GET `/api/finance/loans/`

Active loans list.

---

#### POST `/api/finance/loans/`

Create new loan record.

**Request:**
```json
{
  "lender": "BDO",
  "loan_type": "business",
  "principal": 500000.00,
  "interest_rate": 12.0,
  "term_months": 24,
  "start_date": "2026-02-01",
  "payment_frequency": "monthly",
  "purpose": "Equipment purchase"
}
```

---

#### GET `/api/finance/loans/{id}/`

Loan detail with payment schedule.

---

#### PUT `/api/finance/loans/{id}/`

Update loan information.

---

#### POST `/api/finance/loans/{id}/payment/`

Record loan payment.

**Request:**
```json
{
  "payment_date": "2026-02-22",
  "amount": 25000.00,
  "principal_portion": 18000.00,
  "interest_portion": 7000.00,
  "reference": "BDO-PAY-001"
}
```

---

#### GET `/api/finance/loans/due/`

Loans due in next 30 days.

---

### Petty Cash

#### GET `/api/finance/petty-cash/`

Petty cash dashboard.

**Response:**
```json
{
  "funds": [
    {
      "id": 1,
      "name": "Main Office Fund",
      "custodian": "jane_doe",
      "balance": 8500.00,
      "limit": 10000.00,
      "last_replenishment": "2026-02-15",
      "pending_count": 3
    }
  ],
  "total_balance": 25000.00,
  "monthly_disbursements": 12500.00
}
```

---

#### POST `/api/finance/petty-cash/{fund_id}/disburse/`

Request disbursement.

**Request:**
```json
{
  "amount": 500.00,
  "purpose": "Office snacks",
  "recipient": "John Doe",
  "receipt": "<file upload>"
}
```

---

#### POST `/api/finance/petty-cash/{fund_id}/replenish/`

Request fund replenishment.

**Request:**
```json
{
  "amount": 5000.00,
  "notes": "Replenish to limit"
}
```

---

#### POST `/api/finance/petty-cash/{fund_id}/reconcile/`

Submit reconciliation.

**Request:**
```json
{
  "physical_count": 8450.00,
  "notes": "50 PHP variance - rounding",
  "receipts": ["<file>", "<file>"]
}
```

---

#### GET `/api/finance/petty-cash/{fund_id}/transactions/`

Fund transaction history.

---

### Member Financial Health

#### GET `/api/finance/member-health/{username}/`

Member's financial health score.

**Response:**
```json
{
  "username": "john_doe",
  "health_score": 85,
  "health_status": "healthy",
  "metrics": {
    "payment_timeliness": 90,
    "order_consistency": 82,
    "return_rate": 5.2,
    "credit_utilization": 45.0
  },
  "recommendations": [
    "Consider increasing order frequency"
  ]
}
```

---

### Reports

#### GET `/api/finance/reports/income-statement/`

Download income statement.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `period` | string | `monthly`, `quarterly`, `yearly` |
| `date` | date | Period date |
| `format` | string | `pdf`, `excel` |

---

#### GET `/api/finance/reports/expenses/`

Download expense report.

---

#### GET `/api/finance/reports/assets/`

Download asset register.

---

#### GET `/api/finance/reports/loan/{id}/`

Download loan amortization schedule.

---

### Choices

#### GET `/api/finance/choices/`

Form dropdown options.

**Response:**
```json
{
  "expense_categories": [
    {"value": "utilities", "label": "Utilities"},
    {"value": "supplies", "label": "Office Supplies"}
  ],
  "asset_categories": [...],
  "payment_methods": [...],
  "loan_types": [...],
  "depreciation_methods": [...]
}
```

---

## Phase 2: Enhanced Workflows

### Approval Chains

#### GET `/api/finance/approval-chains/`

List approval chains.

**Response:**
```json
{
  "chains": [
    {
      "id": 1,
      "name": "High Value Expense",
      "item_type": "expense",
      "min_amount": 10000.00,
      "max_amount": 100000.00,
      "is_active": true,
      "levels": [
        {"order": 1, "role": "manager", "sla_hours": 24},
        {"order": 2, "role": "finance_director", "sla_hours": 48}
      ]
    }
  ]
}
```

---

#### POST `/api/finance/approval-chains/`

Create approval chain.

**Request:**
```json
{
  "name": "Critical Expense",
  "item_type": "expense",
  "min_amount": 100000.00,
  "max_amount": null,
  "levels": [
    {"role": "finance_director", "sla_hours": 24},
    {"role": "ceo", "sla_hours": 48}
  ]
}
```

---

#### GET `/api/finance/approval-chains/{id}/`

Chain detail.

---

#### PUT `/api/finance/approval-chains/{id}/`

Update chain.

---

#### DELETE `/api/finance/approval-chains/{id}/`

Delete chain (if no active instances).

---

#### GET `/api/finance/my-approvals/`

Pending approvals for current user.

---

#### POST `/api/finance/my-approvals/{instance_id}/action/`

Approve/reject at current level.

**Request:**
```json
{
  "action": "approve",
  "notes": "Approved"
}
```

---

### Budgets

#### GET `/api/finance/budgets/`

List budgets.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `year` | int | Budget year |
| `category` | string | Category filter |

**Response:**
```json
{
  "budgets": [
    {
      "id": 1,
      "name": "Marketing Q1 2026",
      "category": "marketing",
      "period_start": "2026-01-01",
      "period_end": "2026-03-31",
      "amount": 150000.00,
      "spent": 82500.00,
      "remaining": 67500.00,
      "utilization_percent": 55.0,
      "status": "active"
    }
  ]
}
```

---

#### POST `/api/finance/budgets/`

Create budget.

**Request:**
```json
{
  "name": "IT Q2 2026",
  "category": "technology",
  "period_start": "2026-04-01",
  "period_end": "2026-06-30",
  "amount": 200000.00,
  "warning_threshold": 0.80,
  "notes": "Software licenses and hardware"
}
```

---

#### GET `/api/finance/budgets/{id}/`

Budget detail with expense breakdown.

---

#### PUT `/api/finance/budgets/{id}/`

Update budget.

---

#### DELETE `/api/finance/budgets/{id}/`

Delete budget.

---

### Vendors

#### GET `/api/finance/vendors/`

List vendors.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `active`, `inactive` |
| `category` | string | Vendor category |
| `search` | string | Name/TIN search |

---

#### POST `/api/finance/vendors/`

Create vendor.

**Request:**
```json
{
  "name": "ABC Supplies Inc.",
  "tin": "123-456-789-000",
  "address": "123 Main St, Manila",
  "contact_person": "Juan Dela Cruz",
  "contact_email": "juan@abc.com",
  "contact_phone": "+63 917 123 4567",
  "payment_terms": 30,
  "category": "supplies",
  "notes": "Preferred supplier"
}
```

---

#### GET `/api/finance/vendors/{id}/`

Vendor detail with transaction history.

---

#### PUT `/api/finance/vendors/{id}/`

Update vendor.

---

#### DELETE `/api/finance/vendors/{id}/`

Deactivate vendor (soft delete).

---

### Recurring Expenses

#### GET `/api/finance/recurring-expenses/`

List recurring expenses.

**Response:**
```json
{
  "recurring": [
    {
      "id": 1,
      "name": "Monthly Rent",
      "category": "facilities",
      "amount": 50000.00,
      "frequency": "monthly",
      "day_of_month": 1,
      "vendor": "ABC Realty",
      "next_occurrence": "2026-03-01",
      "is_active": true,
      "auto_approve": false
    }
  ]
}
```

---

#### POST `/api/finance/recurring-expenses/`

Create recurring expense.

**Request:**
```json
{
  "name": "Internet Bill",
  "category": "utilities",
  "amount": 3500.00,
  "frequency": "monthly",
  "day_of_month": 15,
  "vendor_id": 5,
  "start_date": "2026-03-01",
  "end_date": null,
  "auto_approve": true,
  "notes": "PLDT Fiber"
}
```

---

#### GET `/api/finance/recurring-expenses/{id}/`

Recurring expense detail.

---

#### PUT `/api/finance/recurring-expenses/{id}/`

Update recurring expense.

---

#### DELETE `/api/finance/recurring-expenses/{id}/`

Delete recurring expense.

---

#### POST `/api/finance/recurring-expenses/{id}/pause/`

Pause/resume schedule.

---

#### GET `/api/finance/phase2-choices/`

Phase 2 form options.

---

## Phase 3: Advanced Accounting

### Chart of Accounts

#### GET `/api/finance/accounts/`

List all accounts (flat).

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `type` | string | `asset`, `liability`, `equity`, `revenue`, `expense` |
| `is_active` | bool | Active status filter |
| `search` | string | Code/name search |

---

#### GET `/api/finance/accounts/tree/`

Hierarchical account tree.

**Response:**
```json
{
  "accounts": [
    {
      "id": 1,
      "code": "1000",
      "name": "Assets",
      "account_type": "asset",
      "balance": 5250000.00,
      "children": [
        {
          "id": 2,
          "code": "1100",
          "name": "Current Assets",
          "children": [...]
        }
      ]
    }
  ]
}
```

---

#### POST `/api/finance/accounts/`

Create account.

**Request:**
```json
{
  "code": "1115",
  "name": "Petty Cash - Branch 2",
  "account_type": "asset",
  "parent_id": 3,
  "description": "Branch 2 petty cash fund",
  "is_active": true
}
```

---

#### GET `/api/finance/accounts/{id}/`

Account detail.

---

#### PUT `/api/finance/accounts/{id}/`

Update account.

---

#### DELETE `/api/finance/accounts/{id}/`

Deactivate account (if no transactions).

---

#### GET `/api/finance/accounts/{id}/ledger/`

Account ledger (transactions).

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `date_from` | date | Start date |
| `date_to` | date | End date |
| `page` | int | Page number |

**Response:**
```json
{
  "account": {...},
  "opening_balance": 100000.00,
  "entries": [
    {
      "date": "2026-02-22",
      "reference": "JE-2026-0001",
      "description": "Monthly rent",
      "debit": 50000.00,
      "credit": 0,
      "balance": 150000.00
    }
  ],
  "closing_balance": 125000.00
}
```

---

#### POST `/api/finance/accounts/seed/`

Seed default chart of accounts (68 accounts).

---

### Journal Entries

#### GET `/api/finance/journal-entries/`

List journal entries.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `draft`, `posted`, `reversed` |
| `entry_type` | string | `standard`, `adjusting`, `closing`, `reversing` |
| `date_from` | date | Start date |
| `date_to` | date | End date |
| `fiscal_period` | int | Period ID |

---

#### POST `/api/finance/journal-entries/`

Create journal entry.

**Request:**
```json
{
  "date": "2026-02-22",
  "entry_type": "standard",
  "description": "Monthly rent payment",
  "fiscal_period_id": 2,
  "lines": [
    {"account_id": 25, "description": "Rent expense", "debit": 50000.00, "credit": 0},
    {"account_id": 5, "description": "Cash payment", "debit": 0, "credit": 50000.00}
  ]
}
```

**Validation:**
- Total debits must equal total credits
- At least 2 lines required
- Fiscal period must be open

---

#### GET `/api/finance/journal-entries/{id}/`

Entry detail with lines.

---

#### PUT `/api/finance/journal-entries/{id}/`

Update entry (draft only).

---

#### DELETE `/api/finance/journal-entries/{id}/`

Delete entry (draft only).

---

#### POST `/api/finance/journal-entries/{id}/post/`

Post entry to ledger.

---

#### POST `/api/finance/journal-entries/{id}/reverse/`

Create reversing entry.

**Request:**
```json
{
  "reversal_date": "2026-02-28",
  "reason": "Correction"
}
```

---

### Fiscal Periods

#### GET `/api/finance/fiscal-years/`

List fiscal years.

**Response:**
```json
{
  "years": [
    {
      "id": 1,
      "name": "FY 2026",
      "start_date": "2026-01-01",
      "end_date": "2026-12-31",
      "is_closed": false,
      "periods": [
        {"id": 1, "name": "January 2026", "status": "closed"},
        {"id": 2, "name": "February 2026", "status": "open"}
      ]
    }
  ]
}
```

---

#### POST `/api/finance/fiscal-years/`

Create fiscal year (auto-generates periods).

**Request:**
```json
{
  "name": "FY 2027",
  "start_date": "2027-01-01",
  "end_date": "2027-12-31"
}
```

---

#### GET `/api/finance/fiscal-periods/`

List fiscal periods.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `year` | int | Fiscal year ID |
| `status` | string | `open`, `closing`, `closed` |

---

#### GET `/api/finance/fiscal-periods/current/`

Get current open period.

---

#### GET `/api/finance/fiscal-periods/{id}/`

Period detail with closing checklist.

**Response:**
```json
{
  "id": 2,
  "name": "February 2026",
  "fiscal_year": {"id": 1, "name": "FY 2026"},
  "start_date": "2026-02-01",
  "end_date": "2026-02-28",
  "status": "open",
  "closing_checklist": {
    "transactions_reviewed": true,
    "bank_reconciliation_complete": false,
    "adjusting_entries_posted": false,
    "trial_balance_balanced": true,
    "reports_generated": false,
    "management_approved": false
  },
  "entry_summary": {
    "total": 45,
    "draft": 3,
    "posted": 40,
    "reversed": 2
  }
}
```

---

#### PUT `/api/finance/fiscal-periods/{id}/`

Update period (status, checklist).

---

#### POST `/api/finance/fiscal-periods/{id}/close/`

Close fiscal period.

**Requirements:**
- All checklist items complete
- No draft entries
- Trial balance balanced

---

#### POST `/api/finance/fiscal-periods/{id}/reopen/`

Reopen closed period (admin only).

---

### Bank Reconciliation

#### GET `/api/finance/bank-accounts/`

List bank accounts.

---

#### POST `/api/finance/bank-accounts/`

Add bank account.

**Request:**
```json
{
  "bank_name": "BDO",
  "account_name": "TWCako Operating",
  "account_number": "1234567890",
  "account_type": "checking",
  "gl_account_id": 5,
  "currency": "PHP"
}
```

---

#### GET `/api/finance/bank-accounts/{id}/`

Bank account detail.

---

#### PUT `/api/finance/bank-accounts/{id}/`

Update bank account.

---

#### GET `/api/finance/bank-statements/`

List bank statements.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `bank_account` | int | Bank account ID |
| `status` | string | `draft`, `in_progress`, `reconciled` |

---

#### POST `/api/finance/bank-statements/`

Upload bank statement.

**Request:**
```json
{
  "bank_account_id": 1,
  "statement_date": "2026-02-28",
  "opening_balance": 500000.00,
  "closing_balance": 525000.00,
  "lines": [
    {"date": "2026-02-15", "description": "Deposit", "amount": 50000.00, "type": "credit"},
    {"date": "2026-02-20", "description": "Check #001", "amount": 25000.00, "type": "debit"}
  ]
}
```

---

#### GET `/api/finance/bank-statements/{id}/`

Statement detail with lines.

---

#### POST `/api/finance/bank-statements/{id}/auto-match/`

Auto-match statement lines to journal entries.

**Response:**
```json
{
  "matched": 15,
  "unmatched": 3,
  "matches": [
    {
      "line_id": 1,
      "journal_entry_id": 45,
      "confidence": 0.95
    }
  ]
}
```

---

#### POST `/api/finance/bank-statements/{id}/manual-match/`

Manually match line to entry.

**Request:**
```json
{
  "line_id": 3,
  "journal_entry_id": 48
}
```

---

#### POST `/api/finance/bank-statements/{id}/reconcile/`

Complete reconciliation.

---

### Trial Balance

#### GET `/api/finance/trial-balance/`

Generate trial balance.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `as_of_date` | date | Report date |
| `fiscal_period` | int | Period ID |

**Response:**
```json
{
  "as_of_date": "2026-02-28",
  "entries": [
    {
      "account_code": "1100",
      "account_name": "Cash",
      "account_type": "asset",
      "debit": 1250000.00,
      "credit": 0
    }
  ],
  "totals": {
    "debit": 5250000.00,
    "credit": 5250000.00,
    "is_balanced": true
  }
}
```

---

#### GET `/api/finance/trial-balance/export/`

Export trial balance (CSV/Excel).

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `format` | string | `csv`, `xlsx` |
| `as_of_date` | date | Report date |

---

#### GET `/api/finance/phase3-choices/`

Phase 3 form options.

---

## Response Formats

### Success Response

```json
{
  "data": {...},
  "message": "Success"
}
```

### Pagination

```json
{
  "results": [...],
  "count": 150,
  "page": 1,
  "page_size": 20,
  "next": "/api/finance/expenses/?page=2",
  "previous": null
}
```

### Error Response

```json
{
  "error": "Validation failed",
  "details": {
    "amount": ["This field is required."],
    "date": ["Date cannot be in the future."]
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Validation failed |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Business rule violation |
| 422 | Unprocessable - Data integrity error |
| 500 | Server Error - Internal error |

### Common Business Errors

| Error | Description |
|-------|-------------|
| `PERIOD_CLOSED` | Cannot post to closed fiscal period |
| `UNBALANCED_ENTRY` | Journal entry debits != credits |
| `DUPLICATE_CODE` | Account code already exists |
| `BUDGET_EXCEEDED` | Expense exceeds budget |
| `SLA_BREACHED` | Approval SLA exceeded |
| `INSUFFICIENT_BALANCE` | Petty cash insufficient |

---

*Document Version: 1.0*
*Last Updated: 2026-02-22*

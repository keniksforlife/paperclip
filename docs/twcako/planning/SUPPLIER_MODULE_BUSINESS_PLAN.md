# TWCako Merchant/Supplier Module — Business Overview

> Created: 2026-03-02
> Prepared for: Management & Stakeholders

---

## What Are We Building?

A complete Merchant/Supplier system that handles everything a supplier needs to operate within TWCako — from managing their products and inventory, to processing orders, receiving payments, and even running their own branded online shop for their members.

---

## Two Types of Suppliers

### 1. Brand Suppliers (e.g. Sante, Live4More)

- Products and pricing are **fixed by the platform** — they cannot change prices
- They manage inventory, fulfill orders, and receive settlements
- They can have their **own branded online shop** for their external members (see Phase 7 below)

### 2. Independent / Marketplace Suppliers

- Can list products with their **own pricing**
- Price changes require **founder approval** before going live (for safety)
- Full control over their catalog, inventory, and orders

---

## What Suppliers Get

### Supplier Dashboard
A modern, professional dashboard (same quality as the Finance module) where suppliers can see at a glance:
- Today's revenue and monthly revenue
- Pending orders that need action
- Pending settlement amounts
- Active products and low stock alerts
- On-time delivery rate and ratings

### Product Catalog Management
- View and manage all their listed products
- Add products from the central TWCako catalog to their own shop
- Set pricing (independent suppliers only, with founder approval)
- Mark products as featured or inactive

### Inventory Management
- Real-time stock levels per product
- Low stock warnings and out-of-stock alerts
- Restock recording and manual adjustments
- Full stock movement history (audit trail)

### Order Processing
The complete order lifecycle:

1. **New order comes in** — supplier sees it in their Pending queue
2. **Accept order** — inventory is reserved
3. **Ship order** — add tracking number, mark as shipped
4. **Order delivered** — inventory deducted, order added to settlement
5. **Returns** — supplier reviews return request, approves/rejects, inventory restored if approved

### Settlements & Payments
Settlements are calculated **weekly** (every Sunday at 10 PM, already configured):

| Line Item | Amount |
|-----------|--------|
| Gross Sales | PHP 150,000 |
| (-) Returns | PHP 5,000 |
| (-) Affiliate Commissions | PHP 15,000 |
| (-) Platform Fee | PHP 7,500 |
| (-) Shipping Adjustments | PHP 2,000 |
| **= Net Payable** | **PHP 120,500** |

Suppliers can view each settlement with a per-order breakdown, and can raise disputes if needed. Settlements go through an approval workflow before payment.

### Analytics & Reports
- Sales trends (daily, weekly, monthly)
- Top-selling products
- Inventory turnover and efficiency
- Commission breakdown
- Exportable reports (CSV/PDF)

### Shop Settings
- Shop profile and business information
- Bank details for settlement payments

---

## How Affiliates Earn From Supplier Products

When an affiliate refers a customer who purchases a supplier's product:

1. **Direct referrer** gets the largest share of the commission (e.g. 60%)
2. **Their sponsor** gets a share (e.g. 30%)
3. **Diamond coach** gets a share (e.g. 10%)

Commissions are calculated during settlement and credited to eCash wallets. The supplier sees total "Commissions Paid" as a deduction in their settlement.

---

## Phase 7: Brand Supplier Storefronts (B2B SaaS — Major Revenue Opportunity)

This is the **biggest strategic addition** — turning TWCako into a platform that serves brand suppliers by hosting their own online shop.

### How It Works

1. A brand supplier (e.g. Sante Manila branch) subscribes to a plan
2. They get their own branded storefront: **sante-manila.twcako.com**
3. Their own members (people outside of TWC) register on that storefront
4. These external members browse and purchase products at fixed brand pricing
5. Orders flow through TWCako's normal order and fulfillment system
6. TWCako earns subscription fees + transaction fees on every order

### External Members
- These are **NOT** TWCako members — they belong to the brand supplier's network
- They can only **browse and purchase** — no commissions, no MLM structure
- They have their own accounts, login, order history on the branded storefront

### Subscription Plans (ManyChat-Style)

Managed by Founders in the admin dashboard. Example structure:

| Plan | Member Limit | Monthly Fee | Transaction Fee |
|------|-------------|-------------|-----------------|
| **Starter** | 2,500 members | PHP X/month | 3-5% per order |
| **Growth** | 10,000 members | PHP X/month | 3-5% per order |
| **Business** | 50,000 members | PHP X/month | 3-5% per order |
| **Enterprise** | Unlimited | Custom pricing | Negotiated |

Plans, pricing, and features are fully adjustable by Founders.

### Revenue Streams for TWCako

| Source | Description |
|--------|-------------|
| **Monthly Subscription** | Recurring fee per brand supplier per plan |
| **Transaction Fee** | Percentage of every order placed on the storefront |
| **Overage Fees** | When member count exceeds plan limit |
| **Plan Upgrades** | Revenue from suppliers moving to higher tiers |

### What Brand Suppliers See in Their Dashboard

- **Storefront Settings** — logo, colors, banner, description, contact info
- **Members** — list of their external members, count vs. plan limit, usage warnings
- **Subscription** — current plan, billing history, upgrade option

### What Founders See

- **Plans Management** — create and edit subscription tiers and pricing
- **Active Storefronts** — all brand storefronts with member counts and plan status
- **Subscription Billing** — revenue tracking, past-due accounts, payment history
- **Member Limits** — alerts when suppliers are approaching their plan limits

### Limit Enforcement

- At **80%** of member limit — supplier gets a warning in their dashboard
- At **100%** — new member registration is blocked, supplier prompted to upgrade
- **Past-due** subscriptions — storefront is suspended until payment is resolved

---

## Supplier Dashboard Navigation

```
Overview
  - Dashboard

Catalog
  - Products
  - Inventory
  - Stock History

Orders
  - All Orders
  - Pending
  - To Ship
  - Returns

Finance
  - Settlements
  - Commissions
  - eCash Wallet

Analytics
  - Sales Analytics
  - Product Performance

My Storefront (brand suppliers only)
  - Storefront Settings
  - Members
  - Subscription

Settings
  - Shop Profile
  - Bank Details
```

---

## Pricing Change Approval Process (Independent Suppliers Only)

To prevent unauthorized price manipulation:

1. Supplier submits a price change request with the new price and a reason
2. Request goes to **Founders review queue** (status: Pending)
3. Founder reviews and either:
   - **Approves** — price is updated and goes live immediately
   - **Rejects** — supplier is notified with the reason
4. All price change history is logged for audit

Brand suppliers (Sante, Live4More, etc.) do **not** have this option — their pricing is fixed.

---

## Founders Control (Future Module)

All supplier-related approvals and controls will eventually be centralized in a **Founders Control Module**:

- Unified approval queue across all modules (pricing, settlements, finance, members)
- Platform-wide KPI dashboard
- Supplier and affiliate oversight
- Subscription plan and billing management
- System configuration and policy management
- Full audit trail viewer

This will be planned separately after the Finance module is complete.

---

## Implementation Phases

| Phase | What Gets Built | Priority |
|-------|----------------|----------|
| **1. Foundation** | Supplier dashboard, core data structure, navigation | High |
| **2. Product Catalog & Inventory** | Product listing, inventory tracking, stock alerts | High |
| **3. Order Management** | Order processing, shipping, returns | High |
| **4. Settlements & Finance** | Weekly settlements, payment tracking, dispute handling | Medium |
| **5. Analytics & Reports** | Sales trends, product performance, exportable reports | Medium |
| **6. Affiliate Integration** | Multi-tier commission tracking for supplier products | Lower |
| **7. Brand Storefronts** | Branded shops, external members, subscription plans | Strategic |

---

## Key Decisions Made

| Decision | Answer |
|----------|--------|
| Can multiple suppliers sell the same product? | **Yes** — marketplace model with different pricing per supplier |
| How often are settlements paid? | **Weekly** — calculated every Sunday at 10 PM |
| How do affiliate commissions work? | **Multi-tier** — splits between direct referrer, sponsor, and diamond coach |
| How do we handle existing supplier data? | **Auto-migrate** — match and link existing records |
| Can brand suppliers change pricing? | **No** — fixed by platform |
| Can independent suppliers change pricing? | **Yes** — but requires **founder approval** |
| How do brand storefronts work? | **Subdomain per supplier** (e.g. sante-manila.twcako.com) |
| Can external members earn commissions? | **No** — purchase only, no MLM |
| How are storefront plans managed? | **By Founders** — ManyChat-style tiered plans with member limits |

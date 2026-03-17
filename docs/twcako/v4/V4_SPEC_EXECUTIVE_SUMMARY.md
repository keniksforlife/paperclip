# TWCako V4 Specification
## Executive Summary (Non-Technical Version)

**Version:** 1.1
**Date:** 2026-02-14
**Author:** CTO Planning Session
**Status:** Draft for V4 Implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Member Monitoring System](#3-member-monitoring-system)
4. [Supplier/Merchant Process](#4-suppliermerchant-process)
5. [Notification Center](#5-notification-center)
6. [Gamification System](#6-gamification-system)
7. [Dashboard Requirements](#7-dashboard-requirements)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

## 1. Executive Summary

### Project Objectives

1. **Automated Member Monitoring** - Track member KPIs, activities, training attendance, sales performance, and funnel analytics with automated follow-up notifications.

2. **Supplier Process Management** - Implement a structured onboarding workflow with testing phases, performance tracking, and compliance monitoring.

3. **Unified Notification Center** - Build a centralized notification system supporting in-app, SMS, and email channels.

4. **Gamification System** - Increase member engagement through points, badges, ranks, leaderboards, and rewards.

### Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SMS Follow-ups | System Automated | Consistent follow-ups without manual intervention |
| Supplier Testing | 10 orders minimum | Sufficient sample to assess quality/reliability |
| Notification System | Full Notification Center | Comprehensive multi-channel communication |
| Gamification Goals | Sales + Training + Recruitment | Comprehensive engagement across all activities |
| Reward Type | Hybrid (eCash + Perks) | Tangible value plus exclusive benefits |
| Competition Style | Individual Rankings | Drives personal performance |

---

## 2. Current State Analysis

### What Currently Exists in V3

| Area | Current Capabilities |
|------|---------------------|
| **Member Tracking** | ABC/DBC bootcamp attendance, funnel visits, video watch time |
| **Sales Tracking** | Order history, commission logging, eCash transactions |
| **Supplier Management** | Basic profile, business documents, product inventory |
| **Notifications** | Manual SMS, no centralized system |
| **Gamification** | None |

### Critical Gaps Identified

| Gap | Business Impact |
|-----|-----------------|
| No unified member dashboard | Diamonds can't effectively monitor team |
| No lifecycle stage tracking | No proactive retention efforts |
| No last login tracking | Can't identify inactive members |
| No engagement scoring | Can't prioritize follow-ups |
| No supplier onboarding workflow | Inconsistent, manual process |
| No supplier testing phase | Quality issues after approval |
| No performance metrics | Can't evaluate supplier reliability |
| No gamification | Lower engagement, higher churn |

---

## 3. Member Monitoring System

### 3.1 Member Activity Tracking

The system will track comprehensive activity metrics for each member:

**Engagement Metrics:**
- Last login date and time
- Login frequency (7-day and 30-day counts)
- Days since last activity

**Sales KPIs:**
- Total lifetime sales (count and amount)
- Sales this month
- Last sale date
- Average order value

**Funnel & Link Sharing:**
- Total funnel page visitors
- Monthly visitor count
- Prospect opt-ins
- Conversion rate percentage

**Team Building:**
- Direct downlines count
- Total team size
- Active team members (last 30 days)

**Training Progress:**
- ABC Day 1, 2, 3 completion
- DBC Day 1, 2, 3, 4 completion
- Certificate status

### 3.2 Member Lifecycle Stages

Members will be automatically categorized into lifecycle stages:

| Stage | Definition | Days Inactive | Trigger Action |
|-------|------------|---------------|----------------|
| **New** | Recently activated | 0-7 days | Welcome sequence |
| **Onboarding** | In training, ABC not complete | Any | Training reminders |
| **Trained** | ABC done, no sales yet | Any | Sales coaching |
| **Active** | Making sales regularly | 0-13 | Maintain engagement |
| **At Risk** | No activity | 14-29 | Urgent follow-up SMS |
| **Dormant** | No activity | 30-59 | Re-engagement campaign |
| **Churned** | No activity | 60+ | Win-back or archive |

### 3.3 Engagement Score

Each member receives an engagement score (0-100) calculated from:

| Factor | Max Points | Criteria |
|--------|------------|----------|
| **Login Frequency** | 25 | 5+ logins/week = 25, 3-4 = 20, 1-2 = 10 |
| **Sales Activity** | 25 | 10+ sales/month = 25, 5-9 = 20, 1-4 = 15 |
| **Training Completion** | 25 | DBC done = 25, ABC done = 15, ABC started = 5 |
| **Funnel Activity** | 25 | 50+ visitors/month = 25, 20-49 = 20, 5-19 = 10 |

### 3.4 Activity Event Logging

All member activities will be logged for audit trail:

- Login/logout events
- Training attendance (each ABC/DBC day)
- Sales completed
- Funnel visits and prospect conversions
- Team recruitment
- Lifecycle stage changes
- Notifications sent

### 3.5 Automated Follow-up Rules

| Rule | Trigger | Notification Channel |
|------|---------|---------------------|
| Training Reminder | ABC Day 1 not attended after 3 days | SMS + In-app |
| Inactive Alert | No login for 7 days | SMS |
| At Risk Warning | No activity for 14 days | SMS + Email |
| Sales Nudge | Active member, no sales in 14 days | In-app |
| Expiry Warning | Subscription expires in 7 days | SMS + Email |
| Welcome | New member activated | Email + In-app |
| First Sale Congrats | Member makes first sale | In-app |

---

## 4. Supplier/Merchant Process

### 4.1 Supplier Information Tracked

**Business Details:**
- Business name and address
- Pickup location for orders
- TIN number and BIR certificate
- Seller type (sole proprietor, partnership, corporation)
- VAT registration status

**Performance Metrics:**
- Total orders fulfilled
- Monthly order count
- On-time delivery rate
- Return/RTS rate
- Customer complaint count
- Overall rating (1-5 stars)

### 4.2 Supplier Onboarding Workflow

```
                    ┌───────────────┐
                    │    DRAFT      │
                    │ (Initial reg) │
                    └───────┬───────┘
                            │ Submit Application
                            ▼
                    ┌───────────────┐
                    │  APPLICATION  │
                    │  (Submitted)  │
                    └───────┬───────┘
                            │ Staff picks up
                            ▼
                    ┌───────────────┐
              ┌─────│ DOC REVIEW    │─────┐
              │     │(Verify docs)  │     │
              │     └───────┬───────┘     │
              │             │             │
        Incomplete     All verified   Fraudulent
              │             │             │
              ▼             ▼             ▼
        ┌─────────┐   ┌───────────┐  ┌──────────┐
        │ Return  │   │  TESTING  │  │ REJECTED │
        │ to app  │   │ (10 orders)│  └──────────┘
        └─────────┘   └─────┬─────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         <80% pass     >=80% pass    Issues found
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐  ┌───────────┐  ┌───────────┐
        │ REJECTED │  │  PENDING  │  │ SUSPENDED │
        └──────────┘  │  APPROVAL │  │ (Review)  │
                      └─────┬─────┘  └───────────┘
                            │
                            │ Admin approves
                            ▼
                      ┌───────────┐
                      │  APPROVED │
                      │  (Active) │
                      └───────────┘
```

### 4.3 Onboarding Stages Explained

| Stage | Description | Actions Required |
|-------|-------------|------------------|
| **Draft** | Supplier starts registration | Complete business profile |
| **Application** | Submitted for review | Wait for staff review |
| **Document Review** | Staff verifying documents | TIN, BIR, address verification |
| **Testing** | Trial period with real orders | Complete 10 test orders successfully |
| **Pending Approval** | Testing complete, awaiting final approval | Admin review |
| **Approved** | Fully active supplier | Full dashboard access |
| **Rejected** | Application denied | Can re-apply with corrections |
| **Suspended** | Temporarily disabled | Resolve compliance issues |

### 4.4 Testing Phase Requirements

| Requirement | Value |
|-------------|-------|
| Minimum test orders | 10 |
| Minimum success rate | 80% |
| Maximum testing period | 30 days |
| Success criteria | On-time delivery, no complaints |

### 4.5 Supplier Performance Rating

Rating is calculated automatically based on:

| Metric | Impact on Rating |
|--------|------------------|
| On-time delivery < 95% | Deduct points |
| Return rate > 3% | Deduct points |
| Complaint rate > 1 per 100 orders | Deduct points |

**Rating Scale:**
- 5.0 - Excellent
- 4.0 - Good
- 3.0 - Average
- 2.0 - Below Average
- 1.0 - Poor

### 4.6 Supplier Performance Alerts

| Alert Type | Trigger | Severity |
|------------|---------|----------|
| High Return Rate | > 5% returns | Warning |
| Low On-Time Rate | < 90% on-time | Warning |
| High Complaints | > 3 per 100 orders | Critical |

---

## 5. Notification Center

### 5.1 Notification Channels

| Channel | Use Cases | Reaches User When... |
|---------|-----------|---------------------|
| **In-App** | All notifications, default channel | User is on dashboard |
| **Browser Push** | Real-time alerts, even when not on site | Browser is open (any tab) |
| **SMS** | Urgent alerts, follow-ups, reminders | Anytime (phone on) |
| **Email** | Detailed information, welcome messages, reports | User checks email |

### 5.2 Browser Push Notifications (Firebase Cloud Messaging)

**How It Works:**
1. User visits dashboard and sees opt-in prompt
2. User clicks "Allow" to enable notifications
3. Browser registers with Firebase and returns a unique token
4. Token is saved to user's profile
5. When events occur, TWCako sends notification via Firebase
6. User receives notification even if not on the website

**User Experience:**
```
┌────────────────────────────────────────┐
│  🔔 TWCako Dashboard                   │
│                                        │
│  "TWCako wants to send you            │
│   notifications"                       │
│                                        │
│   [Block]              [Allow]         │
│                                        │
└────────────────────────────────────────┘
         ↓ User clicks Allow
┌────────────────────────────────────────┐
│  ✅ Notifications enabled!             │
│                                        │
│  You'll receive alerts for:            │
│  • New sales and orders                │
│  • Team member activity                │
│  • Training reminders                  │
│  • Streak alerts                       │
│                                        │
│  [Manage Preferences]                  │
└────────────────────────────────────────┘
```

**Browser Support:**

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | ✅ Yes | ✅ Android |
| Firefox | ✅ Yes | ✅ Android |
| Edge | ✅ Yes | ✅ Android |
| Safari | ✅ macOS 13+ | ❌ iOS (not supported) |
| Samsung Internet | N/A | ✅ Yes |

**Important:** iOS Safari does NOT support web push notifications. For iOS users, SMS and Email remain the primary channels until a native mobile app is built.

**Safety & Privacy:**

| Concern | How We Handle It |
|---------|------------------|
| Spam prevention | User must opt-in, can opt-out anytime |
| Privacy | FCM tokens are device-specific, not personal data |
| Notification overload | Rate limiting + category preferences |
| Unsupported browsers | Automatic fallback to SMS/Email |
| Token expiration | Auto-refresh mechanism |

**Notification Appearance:**

```
Desktop (Windows/Mac):
┌──────────────────────────────────────────┐
│ 🔔 TWCako                           ✕   │
├──────────────────────────────────────────┤
│                                          │
│ 🎉 New Sale!                            │
│ Maria just purchased Barley Fusion      │
│ Order #12345 - ₱1,250                   │
│                                          │
│ [View Order]                             │
└──────────────────────────────────────────┘

Mobile (Android):
┌──────────────────────────────────────────┐
│ TWCako • now                             │
│ 🎉 New Sale! Maria purchased Barley...  │
└──────────────────────────────────────────┘
```

### 5.2 Notification Types

| Type | Icon | Purpose |
|------|------|---------|
| Information | ℹ️ | General updates, news |
| Action Required | ⚡ | Tasks needing attention |
| Alert | ⚠️ | Warnings, issues |
| Success | ✅ | Confirmations, achievements |
| Warning | 🔶 | Potential problems |

### 5.3 Notification Categories

- Training
- Sales
- Onboarding
- Supplier
- Finance
- Team
- System
- Marketing

### 5.4 Default Notification Templates

| Template | Title | Channels |
|----------|-------|----------|
| Welcome Member | Welcome to TWC! | In-app, Email |
| Training Reminder | ABC Day 1 Reminder | SMS, In-app |
| Training Missed | You missed training | SMS, In-app |
| Inactive 7 Days | We Miss You! | SMS |
| Inactive 14 Days | Action Needed | SMS, Email |
| First Sale | Congratulations! | SMS, In-app |
| New Team Member | New recruit joined! | In-app |
| Supplier Testing Started | Testing Phase Started | Email, In-app |
| Supplier Approved | Application Approved | Email, SMS |
| Supplier Alert | Performance issue | Email, In-app |

### 5.5 User Notification Preferences

Users can control:
- Enable/disable browser push notifications
- Enable/disable SMS notifications
- Enable/disable email notifications
- Per-category preferences (e.g., receive sales notifications but not marketing)
- Quiet hours (no SMS/push during specified times)

### 5.6 Push Notification Events (Comprehensive)

| Event | Notification | Priority |
|-------|--------------|----------|
| **Sales** | | |
| New sale completed | "🎉 New Sale! [Customer] purchased [Product]" | High |
| Sale above ₱5,000 | "💰 Big Sale! ₱[amount] order received" | High |
| Order shipped | "📦 Order #[id] is on its way" | Medium |
| Order delivered | "✅ Order #[id] delivered successfully" | Medium |
| **Team** | | |
| New recruit joined | "👥 [Name] joined your team!" | High |
| Recruit made first sale | "🌟 [Name] made their first sale!" | High |
| Recruit completed training | "🎓 [Name] completed ABC training" | Medium |
| **Training** | | |
| Training starting soon | "📚 ABC Day [X] starts in 1 hour" | High |
| Training reminder | "⏰ Don't forget ABC training today!" | Medium |
| Certificate earned | "🏆 You earned your [ABC/DBC] certificate!" | High |
| **Gamification** | | |
| Badge earned | "🏅 You earned the [Badge Name] badge!" | Medium |
| Rank up | "⬆️ Congratulations! You reached [Rank]!" | High |
| Streak milestone | "🔥 [X]-day streak! +[points] bonus points" | Medium |
| Leaderboard change | "📊 You moved up to #[position]!" | Low |
| Challenge completed | "🎯 Challenge complete! +[points] points" | High |
| **Finance** | | |
| Payment received | "💵 Payment of ₱[amount] confirmed" | High |
| Withdrawal approved | "✅ Withdrawal of ₱[amount] approved" | High |
| Commission earned | "💰 You earned ₱[amount] commission" | Medium |
| **Alerts** | | |
| Subscription expiring | "⚠️ Your subscription expires in [X] days" | High |
| At-risk alert | "👋 We miss you! Log in to continue your streak" | Medium |
| Action required | "📋 [Action] needs your attention" | High |

### 5.7 Notification Delivery Priority

The system will attempt delivery in this order based on urgency:

**High Priority (Real-time):**
1. Browser Push (if enabled and supported)
2. SMS (if enabled)
3. In-App (always)
4. Email

**Medium Priority (Can wait):**
1. In-App (always)
2. Browser Push (if enabled)
3. Email (batched daily digest option)

**Low Priority (Informational):**
1. In-App only
2. Email digest (optional)

---

## 6. Gamification System

### 6.1 Target Audience

**Important Distinction:**

| System | Target Users | Focus |
|--------|-------------|-------|
| **TWC Rewards** (Existing) | Distributors | Big milestones, eCash bonuses |
| **Gamification** (New) | Sellers/TAP Affiliates | Daily engagement, XP, badges |

### 6.2 Why Separate Systems?

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER TYPES                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
┌───────────────────────┐           ┌───────────────────────┐
│  SELLERS/AFFILIATES   │           │  DISTRIBUTORS         │
│  (TAP Users)          │           │  (Builders)           │
├───────────────────────┤           ├───────────────────────┤
│ • Need: Daily         │           │ • Need: Big milestone │
│   engagement          │           │   rewards             │
│ • Problem: High churn │           │ • Already have TWC    │
│ • Solution:           │           │   Rewards working     │
│   GAMIFICATION        │           │                       │
│   (XP, badges, ranks) │           │ • Keep: TWC Rewards   │
└───────────────────────┘           └───────────────────────┘
```

### 6.3 Gamification for Sellers

**Goal:** Increase seller retention through daily engagement rewards.

| Feature | Description |
|---------|-------------|
| **XP (Experience Points)** | Earned daily for login, sales, funnel activity |
| **Badges** | 20+ achievements to unlock |
| **Ranks** | 8 levels: Starter → Legend |
| **Streaks** | Bonus XP for consecutive days |
| **Leaderboards** | Weekly, monthly competition |

See full details in: `V4_GAMIFICATION_SELLERS_PLAN.md`

### 6.4 XP System (Sellers)

**Key XP Earning Activities:**

| Activity | XP | Notes |
|----------|-----|-------|
| Daily login | +5 | Once per day |
| Make a sale | +10 | Per sale |
| Sale above ₱1,000 | +25 | Replaces base |
| Sale above ₱5,000 | +50 | Replaces base |
| Complete ABC Day 1/2 | +50 each | Training |
| Complete ABC Day 3 | +100 | Most important |
| Refer new seller | +50 | Per referral |
| 7-day login streak | +25 bonus | Consistency |
| 30-day login streak | +100 bonus | Major milestone |

**Rewards (TBD):**
- XP to eCash conversion rate: To be discussed with team
- Leaderboard rewards: To be discussed with team

See full XP tables in: `V4_GAMIFICATION_SELLERS_PLAN.md`

### 6.5 Badge System (Sellers)

**Badge Rarity Levels:**

| Rarity | Color | Examples |
|--------|-------|----------|
| Common | Gray | First Steps, First Sale |
| Uncommon | Green | Sales Pro (25 sales), ABC Graduate |
| Rare | Blue | Sales Master (100 sales), Consistency King |
| Epic | Purple | Sales Legend (500 sales), Unstoppable Seller |
| Legendary | Gold | Early Adopter, Champion |

### 6.6 Rank System (Sellers)

| Level | Name | XP Required | XP Multiplier |
|-------|------|-------------|---------------|
| 1 | Starter | 0 | 1.0x |
| 2 | Bronze | 250 | 1.0x |
| 3 | Silver | 750 (total) | 1.0x |
| 4 | Gold | 1,750 (total) | 1.1x |
| 5 | Platinum | 3,750 (total) | 1.15x |
| 6 | Diamond | 7,250 (total) | 1.2x |
| 7 | Elite | 12,250 (total) | 1.25x |
| 8 | Legend | 22,250 (total) | 1.5x |

**Rank Benefits:** Higher multipliers = earn XP faster. Specific perks TBD.

### 6.7 Streak System (Sellers)

| Streak Type | Milestones | Bonus XP |
|-------------|------------|----------|
| **Login** | 7 / 30 / 90 / 365 days | +25 / +100 / +500 / +2,500 |
| **Sales** | 7 / 14 / 30 days | +75 / +150 / +500 |
| **Visitors** | 7 / 30 days | +50 / +200 |

**Rules:** Miss one day = streak resets. Best record is saved.

### 6.8 Leaderboards (Sellers)

| Leaderboard | Reset Period |
|-------------|--------------|
| Weekly XP | Every Monday |
| Monthly XP | 1st of month |
| Top Sellers | Weekly |
| All-Time XP | Never |

**Rewards:** TBD - To be discussed with team

### 6.9 Challenges (Future Phase)

Time-limited goals with special rewards. Examples:
- "New Month Kickstart" - 5 sales in 7 days
- "Training Sprint" - Complete ABC in 14 days
- "Flash Challenge" - 3 sales in 24 hours

### 6.10 Rewards & Redemption

**Current Status:** TBD for team discussion

Open questions:
1. XP to eCash conversion rate?
2. Leaderboard rewards (eCash? Badges only?)
3. Exclusive perks for higher ranks?

See full details and open questions in: `V4_GAMIFICATION_SELLERS_PLAN.md`

---

## 7. Dashboard Requirements

### 7.1 Member Monitoring Dashboard (For Diamond Coaches)

```
┌─────────────────────────────────────────────────────────────────┐
│  TEAM OVERVIEW                                        [Export]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Active  │ │ At Risk  │ │ Dormant  │ │ Churned  │           │
│  │    42    │ │    8     │ │    5     │ │    12    │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
│  FOLLOW-UP QUEUE                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Name          │ Stage    │ Days  │ Last Activity        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Juan Santos   │ At Risk  │ 16    │ Feb 1: Login         │   │
│  │ Maria Cruz    │ At Risk  │ 14    │ Feb 3: ABC Day 2     │   │
│  │ Pedro Garcia  │ Dormant  │ 35    │ Jan 10: Sale         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  TOP PERFORMERS THIS MONTH                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Ana Reyes      │ 15 sales │ ₱45,000  │ Score: 95    │   │
│  │ 2. Jose Lopez     │ 12 sales │ ₱38,000  │ Score: 88    │   │
│  │ 3. Rosa Martinez  │ 10 sales │ ₱32,000  │ Score: 82    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Supplier Admin Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  SUPPLIER MANAGEMENT                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PENDING ACTIONS                                                │
│  ┌──────────────────┐ ┌──────────────────┐                     │
│  │  New Applications │ │  Awaiting Approval│                    │
│  │        3          │ │        2          │                    │
│  └──────────────────┘ └──────────────────┘                     │
│                                                                 │
│  IN TESTING PHASE                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Supplier        │ Orders │ Success │ Days Left          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ABC Foods       │  7/10  │  100%   │ 12 days            │   │
│  │ XYZ Goods       │  4/10  │   75%   │ 20 days            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  PERFORMANCE ALERTS                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚠️ High Returns: Supplier DEF (8.5%)                    │   │
│  │ ⚠️ Low Rating: Supplier GHI (2.5 stars)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Notification Center

```
┌─────────────────────────────────────────────────────────────────┐
│  🔔 NOTIFICATIONS                        [Mark All Read]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TODAY                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🎉 Congratulations! Juan made his first sale!           │   │
│  │    10:30 AM                             [View Team]      │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ⚠️ 3 team members need follow-up                        │   │
│  │    9:00 AM                              [View Queue]     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  YESTERDAY                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ℹ️ New team member: Maria Cruz joined!                  │   │
│  │    3:45 PM                              [View Profile]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Member Gamification Profile

```
┌─────────────────────────────────────────────────────────────────┐
│  🎮 MY GAMIFICATION STATS                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │  ⭐ 2,450 Points    │  │  🏆 Level 4: Gold   │              │
│  │  +350 this week     │  │  Progress: 65%      │              │
│  │  [Redeem Points]    │  │  ████████░░ 3,250   │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                 │
│  🔥 STREAKS                                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Login: 12 days 🔥  │  Sales: 3 days   │  Training: 5 days│  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  🏅 RECENT BADGES                                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [🌟] Sales Pro  │ [📚] Quick Learner │ [🔥] On Fire     │  │
│  │     + 3 more    │                    │                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  📊 LEADERBOARD RANKING                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Weekly Points: #15 (↑3)  │  Monthly Sales: #8 (↓1)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.5 Leaderboard Page

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 LEADERBOARDS           [Daily] [Weekly] [Monthly] [All]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🏆 TOP EARNERS THIS WEEK                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ #  │ Member          │ Points │ Change │                 │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ 🥇 │ Ana Reyes       │ 1,250  │  ↑2    │ ████████████    │  │
│  │ 🥈 │ Jose Lopez      │ 1,100  │  ↑1    │ ██████████      │  │
│  │ 🥉 │ Maria Santos    │   980  │  ↓1    │ █████████       │  │
│  │ 4  │ Pedro Garcia    │   850  │  ─     │ ████████        │  │
│  │ 5  │ Rosa Martinez   │   720  │  ↑3    │ ███████         │  │
│  │ ...                                                      │  │
│  │ 15 │ YOU             │   450  │  ↑3    │ ████            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  💰 TOP SELLERS  │  👥 TOP RECRUITERS  │  📚 TRAINING CHAMPS   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Implementation Roadmap

### Phase Overview

| Phase | Duration | Focus Areas |
|-------|----------|-------------|
| **Phase 1** | Weeks 1-2 | Database foundation, core models |
| **Phase 2** | Week 3 | Data migration from existing records |
| **Phase 3** | Week 4 | Automated tasks and calculations |
| **Phase 4** | Week 5 | Notification service |
| **Phase 5** | Weeks 6-7 | Gamification system |
| **Phase 6** | Week 8 | Dashboard interfaces |
| **Phase 7** | Week 9 | Integration testing |
| **Phase 8** | Week 10 | Deployment |

### Detailed Phase Breakdown

**Phase 1: Foundation (Weeks 1-2)**
- Create Member Activity tracking
- Create Supplier Onboarding workflow
- Create Notification system
- Set up database tables

**Phase 2: Data Migration (Week 3)**
- Calculate existing member metrics from historical data
- Assign initial lifecycle stages
- Set up existing suppliers in new workflow
- Backfill engagement scores

**Phase 3: Automation (Week 4)**
- Daily KPI recalculation
- Inactive member detection
- Training reminders
- Supplier performance calculation
- Schedule automated tasks

**Phase 4: Notifications (Week 5)**
- Build notification service
- Create templates
- SMS integration
- Email integration
- Test delivery

**Phase 5: Gamification (Weeks 6-7)**
- Points system
- Badge definitions and unlock logic
- Rank progression
- Streak tracking
- Leaderboard calculation
- Rewards store

**Phase 6: Dashboard UI (Week 8)**
- Member monitoring dashboard
- Follow-up queue
- Supplier admin dashboard
- Notification center
- Gamification profile
- Leaderboards

**Phase 7: Testing (Week 9)**
- Integration testing
- Load testing
- User acceptance testing
- Bug fixes

**Phase 8: Deployment (Week 10)**
- Staging deployment
- Final QA
- Production deployment
- Monitoring

---

## Appendix A: Configuration Settings

### Member Monitoring Settings

| Setting | Value | Description |
|---------|-------|-------------|
| At-Risk Threshold | 14 days | Days inactive before "at_risk" |
| Dormant Threshold | 30 days | Days inactive before "dormant" |
| Churned Threshold | 60 days | Days inactive before "churned" |

### Supplier Settings

| Setting | Value | Description |
|---------|-------|-------------|
| Test Order Minimum | 10 | Orders required in testing phase |
| Test Success Rate | 80% | Minimum success rate to pass |
| Testing Max Days | 30 | Maximum days allowed for testing |

### Notification Settings

| Setting | Value | Description |
|---------|-------|-------------|
| SMS Enabled | Yes | Allow SMS notifications |
| Email Enabled | Yes | Allow email notifications |
| Quiet Hours Start | 10:00 PM | No SMS after this time |
| Quiet Hours End | 7:00 AM | No SMS before this time |

---

## Appendix B: Success Metrics

### Member Monitoring KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Active member rate | > 70% | Active / Total members |
| At-risk recovery rate | > 50% | Recovered / At-risk flagged |
| Training completion | > 80% | ABC completed / Total new members |
| Churn reduction | -20% | Compared to pre-implementation |

### Supplier Process KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Average onboarding time | < 14 days | Application to approval |
| Testing pass rate | > 70% | Passed / Total tested |
| Supplier satisfaction | > 4.0 | Average rating |
| Return rate | < 3% | Returns / Total orders |

### Gamification KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily active users | +30% | DAU increase |
| Points earned per user | > 100/week | Average weekly points |
| Challenge participation | > 40% | Participating / Total eligible |
| Reward redemption | > 60% | Members who redeemed / Total |

---

*Document Version: 1.1*
*Last Updated: 2026-02-14*
*This is the executive summary version without technical code.*
*For technical implementation details, see: V4_MEMBER_MONITORING_AND_SUPPLIER_SPEC.md*

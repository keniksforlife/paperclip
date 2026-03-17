# TWCako V4 Specification
## Member Monitoring System & Supplier Process

**Version:** 1.0
**Date:** 2026-02-14
**Author:** CTO Planning Session
**Status:** Draft for V4 Implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis (V3)](#2-current-state-analysis-v3)
3. [Member Monitoring System](#3-member-monitoring-system)
4. [Supplier/Merchant Process](#4-suppliermerchant-process)
5. [Notification Center](#5-notification-center)
6. [Database Schema](#6-database-schema)
7. [Celery Tasks & Automation](#7-celery-tasks--automation)
8. [API Endpoints](#8-api-endpoints)
9. [Dashboard UI Requirements](#9-dashboard-ui-requirements)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Testing Requirements](#11-testing-requirements)
12. [Gamification System](#12-gamification-system)

---

## 1. Executive Summary

### Objectives

1. **Automated Member Monitoring** - Track member KPIs, activities, training attendance, sales performance, and funnel analytics with automated follow-up notifications.

2. **Supplier Process Management** - Implement a structured onboarding workflow with testing phases, performance tracking, and compliance monitoring.

3. **Unified Notification Center** - Build a centralized notification system supporting in-app, SMS, and email channels.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SMS Control | System Automated | Consistent follow-ups without manual intervention |
| Supplier Testing | 10 orders minimum | Sufficient sample to assess quality/reliability |
| Notification System | Full Notification Center | Comprehensive multi-channel communication |

---

## 2. Current State Analysis (V3)

### What Currently Exists

#### Member Tracking
- `LiveTrainings` model tracks ABC/DBC bootcamp attendance
- `ProspectTAP`, `ProspectVCP` track funnel visits and video engagement
- `ECashEntry` tracks sales and commissions
- `VWOrder` tracks order history
- `TeamMember` tracks sponsor hierarchy

#### Supplier Management
- `Supplier` model with business details (TIN, BIR, address)
- `SupplierMobileList` for notification contacts
- Basic product inventory views
- Order transaction tracking

### Critical Gaps

| Area | Gap | Impact |
|------|-----|--------|
| Member Activity | No unified activity dashboard | Diamonds can't monitor team effectively |
| Lifecycle Tracking | No member stages (new/active/dormant) | No proactive retention |
| Last Login | Not tracked | Can't identify inactive members |
| Engagement Score | Not calculated | No way to prioritize follow-ups |
| Supplier Onboarding | No workflow stages | Manual, inconsistent process |
| Testing Phase | Not implemented | Quality issues after approval |
| Performance Metrics | Not tracked | Can't evaluate suppliers |

---

## 3. Member Monitoring System

### 3.1 New Models

#### MemberActivity (accounts/models.py)

```python
class MemberActivity(models.Model):
    """
    Aggregated KPIs for each member, updated daily via Celery task.
    One-to-one with User model.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='activity'
    )

    # === Engagement Metrics ===
    last_login = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time user logged into dashboard"
    )
    login_count_7d = models.PositiveIntegerField(
        default=0,
        help_text="Login count in last 7 days"
    )
    login_count_30d = models.PositiveIntegerField(
        default=0,
        help_text="Login count in last 30 days"
    )
    days_since_last_activity = models.PositiveIntegerField(
        default=0,
        help_text="Days since any tracked activity"
    )

    # === Sales KPIs ===
    total_sales_count = models.PositiveIntegerField(
        default=0,
        help_text="Lifetime number of sales"
    )
    total_sales_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Lifetime sales revenue"
    )
    sales_count_this_month = models.PositiveIntegerField(
        default=0
    )
    sales_amount_this_month = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    last_sale_date = models.DateTimeField(
        null=True,
        blank=True
    )
    average_order_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    # === Funnel & Link Sharing ===
    total_funnel_visitors = models.PositiveIntegerField(
        default=0,
        help_text="Total visitors to member's funnel pages"
    )
    visitors_this_month = models.PositiveIntegerField(default=0)
    total_prospects = models.PositiveIntegerField(
        default=0,
        help_text="Total prospects who opted in"
    )
    prospects_this_month = models.PositiveIntegerField(default=0)
    conversion_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Prospect to customer conversion rate %"
    )

    # === Team Building (for Distributors) ===
    direct_downlines = models.PositiveIntegerField(
        default=0,
        help_text="Number of direct recruits"
    )
    team_size = models.PositiveIntegerField(
        default=0,
        help_text="Total team size (all levels)"
    )
    active_team_members = models.PositiveIntegerField(
        default=0,
        help_text="Team members active in last 30 days"
    )

    # === Training Progress ===
    abc_day1_completed = models.BooleanField(default=False)
    abc_day2_completed = models.BooleanField(default=False)
    abc_day3_completed = models.BooleanField(default=False)
    abc_completed = models.BooleanField(default=False)
    abc_completed_date = models.DateTimeField(null=True, blank=True)

    dbc_day1_completed = models.BooleanField(default=False)
    dbc_day2_completed = models.BooleanField(default=False)
    dbc_day3_completed = models.BooleanField(default=False)
    dbc_day4_completed = models.BooleanField(default=False)
    dbc_completed = models.BooleanField(default=False)
    dbc_completed_date = models.DateTimeField(null=True, blank=True)

    # === Lifecycle Stage ===
    LIFECYCLE_STAGES = [
        ('new', 'New Member'),           # < 7 days since activation
        ('onboarding', 'Onboarding'),    # In training, hasn't completed ABC
        ('trained', 'Trained'),          # Completed ABC, no sales yet
        ('active', 'Active'),            # Making sales regularly
        ('at_risk', 'At Risk'),          # No activity 14-29 days
        ('dormant', 'Dormant'),          # No activity 30-59 days
        ('churned', 'Churned'),          # No activity 60+ days
    ]
    lifecycle_stage = models.CharField(
        max_length=20,
        choices=LIFECYCLE_STAGES,
        default='new',
        db_index=True
    )
    stage_changed_at = models.DateTimeField(auto_now_add=True)
    previous_stage = models.CharField(
        max_length=20,
        blank=True,
        help_text="For tracking stage transitions"
    )

    # === Engagement Score ===
    engagement_score = models.PositiveIntegerField(
        default=0,
        help_text="0-100 score based on activity factors"
    )

    # === Timestamps ===
    created_at = models.DateTimeField(auto_now_add=True)
    last_calculated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Member Activity"
        verbose_name_plural = "Member Activities"
        indexes = [
            models.Index(fields=['lifecycle_stage']),
            models.Index(fields=['last_login']),
            models.Index(fields=['engagement_score']),
            models.Index(fields=['last_sale_date']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.lifecycle_stage}"

    def calculate_engagement_score(self):
        """
        Calculate engagement score (0-100) based on:
        - Login frequency (25 points max)
        - Sales activity (25 points max)
        - Training completion (25 points max)
        - Funnel activity (25 points max)
        """
        score = 0

        # Login frequency (max 25)
        if self.login_count_7d >= 5:
            score += 25
        elif self.login_count_7d >= 3:
            score += 20
        elif self.login_count_7d >= 1:
            score += 10

        # Sales activity (max 25)
        if self.sales_count_this_month >= 10:
            score += 25
        elif self.sales_count_this_month >= 5:
            score += 20
        elif self.sales_count_this_month >= 1:
            score += 15
        elif self.last_sale_date and (timezone.now() - self.last_sale_date).days < 14:
            score += 10

        # Training (max 25)
        if self.dbc_completed:
            score += 25
        elif self.abc_completed:
            score += 15
        elif self.abc_day1_completed:
            score += 5

        # Funnel activity (max 25)
        if self.visitors_this_month >= 50:
            score += 25
        elif self.visitors_this_month >= 20:
            score += 20
        elif self.visitors_this_month >= 5:
            score += 10

        return min(score, 100)

    def determine_lifecycle_stage(self):
        """
        Determine lifecycle stage based on activity metrics.
        Returns tuple: (new_stage, reason)
        """
        days_active = self.days_since_last_activity

        # Check churn first
        if days_active >= 60:
            return ('churned', 'No activity for 60+ days')

        if days_active >= 30:
            return ('dormant', 'No activity for 30+ days')

        if days_active >= 14:
            return ('at_risk', 'No activity for 14+ days')

        # Active member making sales
        if self.sales_count_this_month > 0 or (
            self.last_sale_date and
            (timezone.now() - self.last_sale_date).days < 30
        ):
            return ('active', 'Recent sales activity')

        # Completed training but no sales
        if self.abc_completed:
            return ('trained', 'Completed ABC training')

        # In training
        if self.abc_day1_completed or self.user.livetrainings.abc_day1_attended:
            return ('onboarding', 'In ABC training')

        # New member
        if self.user.date_activated:
            days_since_activation = (timezone.now() - self.user.date_activated).days
            if days_since_activation <= 7:
                return ('new', 'Recently activated')

        return ('onboarding', 'Default - needs onboarding')


class MemberActivityLog(models.Model):
    """
    Event log for tracking member actions over time.
    Used for audit trail and detailed activity analysis.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='activity_logs'
    )

    EVENT_TYPES = [
        # Authentication
        ('login', 'Logged In'),
        ('logout', 'Logged Out'),

        # Training
        ('abc_day1', 'ABC Day 1 Attended'),
        ('abc_day2', 'ABC Day 2 Attended'),
        ('abc_day3', 'ABC Day 3 Attended'),
        ('abc_complete', 'ABC Completed'),
        ('dbc_day1', 'DBC Day 1 Attended'),
        ('dbc_day2', 'DBC Day 2 Attended'),
        ('dbc_day3', 'DBC Day 3 Attended'),
        ('dbc_day4', 'DBC Day 4 Attended'),
        ('dbc_complete', 'DBC Completed'),

        # Sales
        ('first_sale', 'First Sale Made'),
        ('sale', 'Sale Completed'),
        ('sale_cancelled', 'Sale Cancelled'),

        # Funnel
        ('funnel_visit', 'Funnel Page Visited'),
        ('prospect_added', 'New Prospect Added'),
        ('prospect_converted', 'Prospect Converted to Customer'),

        # Team
        ('recruit_added', 'New Recruit Joined'),
        ('recruit_activated', 'Recruit Activated'),

        # Lifecycle
        ('stage_change', 'Lifecycle Stage Changed'),

        # System
        ('notification_sent', 'Notification Sent'),
        ('followup_triggered', 'Follow-up Triggered'),
    ]
    event_type = models.CharField(
        max_length=30,
        choices=EVENT_TYPES,
        db_index=True
    )

    # Additional context stored as JSON
    event_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Additional event metadata"
    )
    # Examples:
    # - For sale: {"order_id": 123, "amount": 1500.00, "product": "Barley"}
    # - For stage_change: {"from": "onboarding", "to": "active", "reason": "First sale"}
    # - For notification: {"template": "inactive_7d", "channel": "sms"}

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    # Optional reference to related objects
    related_object_type = models.CharField(max_length=50, blank=True)
    related_object_id = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        verbose_name = "Member Activity Log"
        verbose_name_plural = "Member Activity Logs"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'event_type']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['event_type', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.event_type} @ {self.timestamp}"
```

### 3.2 Lifecycle Stage Definitions

| Stage | Days Inactive | Criteria | Action |
|-------|---------------|----------|--------|
| **new** | 0-7 | Recently activated | Welcome sequence |
| **onboarding** | Any | ABC not completed | Training reminders |
| **trained** | Any | ABC done, no sales | Sales coaching |
| **active** | 0-13 | Recent sales | Maintain engagement |
| **at_risk** | 14-29 | No activity | Urgent follow-up |
| **dormant** | 30-59 | No activity | Re-engagement campaign |
| **churned** | 60+ | No activity | Win-back or archive |

### 3.3 Engagement Score Calculation

```
Total Score = Login Score + Sales Score + Training Score + Funnel Score

Login Score (max 25):
  - 5+ logins/week = 25
  - 3-4 logins/week = 20
  - 1-2 logins/week = 10
  - 0 logins/week = 0

Sales Score (max 25):
  - 10+ sales this month = 25
  - 5-9 sales this month = 20
  - 1-4 sales this month = 15
  - Sale in last 14 days = 10
  - No recent sales = 0

Training Score (max 25):
  - DBC completed = 25
  - ABC completed = 15
  - ABC started = 5
  - Not started = 0

Funnel Score (max 25):
  - 50+ visitors this month = 25
  - 20-49 visitors = 20
  - 5-19 visitors = 10
  - < 5 visitors = 0
```

---

## 4. Supplier/Merchant Process

### 4.1 New Models

#### SupplierOnboarding (supplier/models.py)

```python
class SupplierOnboarding(models.Model):
    """
    Tracks supplier onboarding workflow and approval process.
    One-to-one with Supplier model.
    """
    supplier = models.OneToOneField(
        'accounts.Supplier',
        on_delete=models.CASCADE,
        related_name='onboarding'
    )

    # === Onboarding Stages ===
    STAGES = [
        ('draft', 'Draft'),                    # Initial creation
        ('application', 'Application Submitted'),
        ('document_review', 'Document Review'),
        ('testing', 'Testing Phase'),
        ('pending_approval', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    ]
    stage = models.CharField(
        max_length=20,
        choices=STAGES,
        default='draft',
        db_index=True
    )
    stage_history = models.JSONField(
        default=list,
        help_text="History of stage transitions with timestamps"
    )
    # Format: [{"stage": "application", "timestamp": "2026-02-14T10:00:00Z", "by": "user_id"}]

    # === Document Verification ===
    tin_verified = models.BooleanField(default=False)
    tin_verified_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='tin_verifications'
    )
    tin_verified_at = models.DateTimeField(null=True, blank=True)

    bir_verified = models.BooleanField(default=False)
    bir_verified_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='bir_verifications'
    )
    bir_verified_at = models.DateTimeField(null=True, blank=True)

    address_verified = models.BooleanField(default=False)
    address_verified_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='address_verifications'
    )
    address_verified_at = models.DateTimeField(null=True, blank=True)

    # === Testing Phase ===
    REQUIRED_TEST_ORDERS = 10  # Configurable

    testing_started_at = models.DateTimeField(null=True, blank=True)
    testing_ended_at = models.DateTimeField(null=True, blank=True)
    testing_order_count = models.PositiveIntegerField(default=0)
    testing_orders = models.JSONField(
        default=list,
        help_text="List of order IDs in testing phase"
    )
    testing_success_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Percentage of successful test orders"
    )
    testing_notes = models.TextField(
        blank=True,
        help_text="Notes from testing phase"
    )
    testing_passed = models.BooleanField(null=True)

    # === Approval ===
    reviewed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='supplier_reviews'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    approval_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)

    # === Timestamps ===
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Supplier Onboarding"
        verbose_name_plural = "Supplier Onboardings"

    def __str__(self):
        return f"{self.supplier.business_name} - {self.stage}"

    @property
    def documents_verified(self):
        """Check if all required documents are verified."""
        return all([
            self.tin_verified,
            self.bir_verified,
            self.address_verified
        ])

    @property
    def testing_complete(self):
        """Check if testing phase requirements are met."""
        return self.testing_order_count >= self.REQUIRED_TEST_ORDERS

    @property
    def can_approve(self):
        """Check if supplier can be approved."""
        return (
            self.documents_verified and
            self.testing_complete and
            self.testing_passed
        )

    def transition_to(self, new_stage, user=None):
        """
        Transition to a new stage with history tracking.
        """
        from django.utils import timezone

        old_stage = self.stage
        self.stage = new_stage

        history_entry = {
            'from_stage': old_stage,
            'to_stage': new_stage,
            'timestamp': timezone.now().isoformat(),
            'by': user.id if user else None
        }
        self.stage_history.append(history_entry)
        self.save()

        # Trigger notification
        # NotificationService.send_supplier_stage_change(self, old_stage, new_stage)

    def start_testing_phase(self, user=None):
        """Start the testing phase."""
        from django.utils import timezone

        if not self.documents_verified:
            raise ValueError("Documents must be verified before testing")

        self.testing_started_at = timezone.now()
        self.transition_to('testing', user)

    def record_test_order(self, order_id, success=True):
        """Record a test order result."""
        self.testing_orders.append({
            'order_id': order_id,
            'success': success,
            'timestamp': timezone.now().isoformat()
        })
        self.testing_order_count = len(self.testing_orders)

        # Calculate success rate
        successful = sum(1 for o in self.testing_orders if o.get('success'))
        self.testing_success_rate = (successful / self.testing_order_count) * 100

        self.save()

        # Check if testing complete
        if self.testing_complete:
            self.testing_passed = self.testing_success_rate >= 80  # 80% threshold
            self.transition_to('pending_approval')


class SupplierPerformance(models.Model):
    """
    Tracks ongoing supplier performance metrics.
    Updated daily via Celery task.
    """
    supplier = models.OneToOneField(
        'accounts.Supplier',
        on_delete=models.CASCADE,
        related_name='performance'
    )

    # === Order Metrics ===
    total_orders = models.PositiveIntegerField(default=0)
    orders_this_month = models.PositiveIntegerField(default=0)
    orders_last_month = models.PositiveIntegerField(default=0)
    order_growth_rate = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        help_text="Month-over-month growth %"
    )

    # === Fulfillment Quality ===
    orders_on_time = models.PositiveIntegerField(default=0)
    orders_late = models.PositiveIntegerField(default=0)
    on_time_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=100,
        help_text="Percentage of orders delivered on time"
    )

    orders_returned = models.PositiveIntegerField(default=0)
    return_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Return/RTS rate %"
    )

    # === Customer Satisfaction ===
    complaint_count = models.PositiveIntegerField(default=0)
    complaints_this_month = models.PositiveIntegerField(default=0)
    complaint_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Complaints per 100 orders"
    )

    # === Financial ===
    total_revenue = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0
    )
    revenue_this_month = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    revenue_last_month = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    pending_payout = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Amount pending disbursement"
    )
    average_order_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    # === Overall Rating ===
    RATING_CHOICES = [
        (5, 'Excellent'),
        (4, 'Good'),
        (3, 'Average'),
        (2, 'Below Average'),
        (1, 'Poor'),
    ]
    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        default=5.0
    )
    rating_reason = models.CharField(
        max_length=200,
        blank=True,
        help_text="Auto-generated rating explanation"
    )

    # === Alerts ===
    has_active_alerts = models.BooleanField(default=False)
    alerts = models.JSONField(
        default=list,
        help_text="Active performance alerts"
    )
    # Format: [{"type": "high_return_rate", "message": "Return rate > 5%", "created_at": "..."}]

    # === Timestamps ===
    created_at = models.DateTimeField(auto_now_add=True)
    last_calculated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Supplier Performance"
        verbose_name_plural = "Supplier Performances"

    def __str__(self):
        return f"{self.supplier.business_name} - Rating: {self.rating}"

    def calculate_rating(self):
        """
        Calculate overall rating based on performance metrics.
        """
        # Base score of 5.0
        score = 5.0
        reasons = []

        # Deduct for late deliveries
        if self.on_time_rate < 95:
            deduction = (95 - self.on_time_rate) / 10
            score -= deduction
            reasons.append(f"On-time rate: {self.on_time_rate}%")

        # Deduct for returns
        if self.return_rate > 3:
            deduction = (self.return_rate - 3) / 5
            score -= deduction
            reasons.append(f"Return rate: {self.return_rate}%")

        # Deduct for complaints
        if self.complaint_rate > 1:
            deduction = self.complaint_rate / 5
            score -= deduction
            reasons.append(f"Complaint rate: {self.complaint_rate}")

        # Ensure score is between 1.0 and 5.0
        self.rating = max(1.0, min(5.0, round(score, 1)))
        self.rating_reason = "; ".join(reasons) if reasons else "Good standing"

        return self.rating

    def check_alerts(self):
        """
        Check for performance issues and create alerts.
        """
        self.alerts = []

        if self.return_rate > 5:
            self.alerts.append({
                'type': 'high_return_rate',
                'severity': 'warning',
                'message': f'Return rate ({self.return_rate}%) exceeds 5%',
                'created_at': timezone.now().isoformat()
            })

        if self.on_time_rate < 90:
            self.alerts.append({
                'type': 'low_on_time',
                'severity': 'warning',
                'message': f'On-time delivery ({self.on_time_rate}%) below 90%',
                'created_at': timezone.now().isoformat()
            })

        if self.complaint_rate > 3:
            self.alerts.append({
                'type': 'high_complaints',
                'severity': 'critical',
                'message': f'High complaint rate ({self.complaint_rate} per 100 orders)',
                'created_at': timezone.now().isoformat()
            })

        self.has_active_alerts = len(self.alerts) > 0
        self.save()
```

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

### 4.3 Testing Phase Requirements

| Requirement | Value |
|-------------|-------|
| Minimum test orders | 10 |
| Minimum success rate | 80% |
| Maximum testing period | 30 days |
| Success criteria | On-time delivery, no complaints |

---

## 5. Notification Center

### 5.1 New App Structure

```
notifications/
├── __init__.py
├── admin.py
├── apps.py
├── models.py
├── services.py          # NotificationService class
├── tasks.py             # Celery tasks
├── signals.py           # Signal handlers
├── templates.py         # Default templates
├── views.py
├── api/
│   ├── __init__.py
│   ├── urls.py
│   ├── views.py         # DRF ViewSets
│   └── serializers.py
├── templates/
│   └── notifications/
│       ├── notification_center.html
│       ├── notification_list.html
│       └── email/
│           ├── base.html
│           └── default.html
└── migrations/
```

### 5.2 Notification Models

```python
# notifications/models.py

class Notification(models.Model):
    """
    Central notification model for all user notifications.
    Supports in-app, SMS, and email channels.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications'
    )

    # === Type & Category ===
    NOTIFICATION_TYPES = [
        ('info', 'Information'),
        ('action', 'Action Required'),
        ('alert', 'Alert'),
        ('success', 'Success'),
        ('warning', 'Warning'),
    ]
    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPES,
        default='info'
    )

    CATEGORIES = [
        ('training', 'Training'),
        ('sales', 'Sales'),
        ('onboarding', 'Onboarding'),
        ('supplier', 'Supplier'),
        ('finance', 'Finance'),
        ('team', 'Team'),
        ('system', 'System'),
        ('marketing', 'Marketing'),
    ]
    category = models.CharField(
        max_length=20,
        choices=CATEGORIES,
        default='system',
        db_index=True
    )

    # === Content ===
    title = models.CharField(max_length=200)
    message = models.TextField()
    action_url = models.CharField(
        max_length=500,
        blank=True,
        help_text="Relative URL for action button"
    )
    action_text = models.CharField(
        max_length=50,
        blank=True,
        default="View Details"
    )

    # === Delivery Channels ===
    send_inapp = models.BooleanField(default=True)
    send_sms = models.BooleanField(default=False)
    send_email = models.BooleanField(default=False)

    # === Status ===
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    inapp_delivered = models.BooleanField(default=True)  # Always true for in-app
    sms_delivered = models.BooleanField(default=False)
    sms_delivered_at = models.DateTimeField(null=True, blank=True)
    sms_error = models.TextField(blank=True)

    email_delivered = models.BooleanField(default=False)
    email_delivered_at = models.DateTimeField(null=True, blank=True)
    email_error = models.TextField(blank=True)

    # === Template Reference ===
    template = models.ForeignKey(
        'NotificationTemplate',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    template_context = models.JSONField(
        default=dict,
        help_text="Context data used to render template"
    )

    # === Metadata ===
    priority = models.PositiveSmallIntegerField(
        default=5,
        help_text="1=highest, 10=lowest"
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Auto-dismiss after this time"
    )

    # === Timestamps ===
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', 'category']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user.username}: {self.title}"

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class NotificationTemplate(models.Model):
    """
    Reusable notification templates with variable substitution.
    """
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # === Content Templates ===
    title_template = models.CharField(
        max_length=200,
        help_text="Use {variable} for substitution"
    )
    message_template = models.TextField(
        help_text="Use {variable} for substitution"
    )
    sms_template = models.CharField(
        max_length=160,
        blank=True,
        help_text="Short SMS version, max 160 chars"
    )
    email_subject_template = models.CharField(
        max_length=200,
        blank=True
    )
    email_body_template = models.TextField(
        blank=True,
        help_text="HTML email body"
    )

    # === Default Settings ===
    notification_type = models.CharField(
        max_length=20,
        choices=Notification.NOTIFICATION_TYPES,
        default='info'
    )
    category = models.CharField(
        max_length=20,
        choices=Notification.CATEGORIES,
        default='system'
    )
    default_inapp = models.BooleanField(default=True)
    default_sms = models.BooleanField(default=False)
    default_email = models.BooleanField(default=False)

    action_url_template = models.CharField(
        max_length=500,
        blank=True,
        help_text="URL template, use {variable}"
    )
    action_text = models.CharField(max_length=50, default="View Details")

    # === Status ===
    is_active = models.BooleanField(default=True)

    # === Timestamps ===
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Notification Template"
        verbose_name_plural = "Notification Templates"

    def __str__(self):
        return f"{self.slug}: {self.name}"

    def render(self, context):
        """
        Render template with context variables.
        Returns dict with rendered content.
        """
        from string import Template

        def safe_substitute(template_str, ctx):
            try:
                # Use Python's Template for safe substitution
                return Template(template_str).safe_substitute(ctx)
            except Exception:
                return template_str

        return {
            'title': safe_substitute(self.title_template, context),
            'message': safe_substitute(self.message_template, context),
            'sms': safe_substitute(self.sms_template, context) if self.sms_template else None,
            'email_subject': safe_substitute(self.email_subject_template, context) if self.email_subject_template else None,
            'email_body': safe_substitute(self.email_body_template, context) if self.email_body_template else None,
            'action_url': safe_substitute(self.action_url_template, context) if self.action_url_template else None,
        }


class NotificationPreference(models.Model):
    """
    User preferences for notifications by category.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )

    # Per-category preferences
    # Format: {"training": {"inapp": True, "push": True, "sms": True, "email": False}, ...}
    category_preferences = models.JSONField(default=dict)

    # Global settings
    push_enabled = models.BooleanField(default=False)  # Requires explicit opt-in
    sms_enabled = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=True)

    # Quiet hours (don't send SMS/push during these hours)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Notification Preference"
        verbose_name_plural = "Notification Preferences"


class PushSubscription(models.Model):
    """
    Stores FCM push notification tokens for each user device.
    Users can have multiple devices (phone, laptop, tablet).
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='push_subscriptions'
    )

    # Firebase Cloud Messaging token
    fcm_token = models.TextField(unique=True)

    # Device info for management
    device_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="e.g., 'Chrome on Windows', 'Firefox on Android'"
    )
    user_agent = models.TextField(blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    last_used = models.DateTimeField(auto_now=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Push Subscription"
        verbose_name_plural = "Push Subscriptions"

    def __str__(self):
        return f"{self.user.username} - {self.device_name or 'Unknown Device'}"
```

### 5.3 Notification Service

```python
# notifications/services.py

class NotificationService:
    """
    Central service for sending notifications across all channels.
    """

    @classmethod
    def send(
        cls,
        user,
        title,
        message,
        notification_type='info',
        category='system',
        send_inapp=True,
        send_sms=False,
        send_email=False,
        action_url='',
        action_text='View Details',
        priority=5,
        template_slug=None,
        context=None
    ):
        """
        Send a notification to a user.

        Args:
            user: User instance
            title: Notification title
            message: Notification message
            notification_type: info|action|alert|success|warning
            category: training|sales|onboarding|supplier|finance|team|system
            send_inapp: Show in notification center
            send_sms: Send SMS
            send_email: Send email
            action_url: URL for action button
            action_text: Text for action button
            priority: 1-10 (1=highest)
            template_slug: Use predefined template
            context: Dict for template substitution

        Returns:
            Notification instance
        """
        from .models import Notification, NotificationTemplate

        template = None
        if template_slug:
            try:
                template = NotificationTemplate.objects.get(
                    slug=template_slug,
                    is_active=True
                )
                rendered = template.render(context or {})
                title = rendered['title']
                message = rendered['message']
                action_url = rendered['action_url'] or action_url
                notification_type = template.notification_type
                category = template.category
                send_inapp = template.default_inapp if send_inapp is None else send_inapp
                send_sms = template.default_sms if send_sms is None else send_sms
                send_email = template.default_email if send_email is None else send_email
            except NotificationTemplate.DoesNotExist:
                pass

        # Check user preferences
        prefs = cls._get_user_preferences(user, category)
        send_sms = send_sms and prefs.get('sms', True)
        send_email = send_email and prefs.get('email', True)

        # Create notification
        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            category=category,
            send_inapp=send_inapp,
            send_sms=send_sms,
            send_email=send_email,
            action_url=action_url,
            action_text=action_text,
            priority=priority,
            template=template,
            template_context=context or {}
        )

        # Queue async delivery
        if send_sms:
            from .tasks import send_sms_notification
            send_sms_notification.delay(notification.id)

        if send_email:
            from .tasks import send_email_notification
            send_email_notification.delay(notification.id)

        return notification

    @classmethod
    def send_from_template(cls, user, template_slug, context=None, **overrides):
        """
        Send notification using a predefined template.
        """
        return cls.send(
            user=user,
            title='',  # Will be overridden by template
            message='',  # Will be overridden by template
            template_slug=template_slug,
            context=context,
            **overrides
        )

    @classmethod
    def send_bulk(cls, users, **kwargs):
        """
        Send same notification to multiple users.
        """
        notifications = []
        for user in users:
            notifications.append(cls.send(user=user, **kwargs))
        return notifications

    @classmethod
    def _get_user_preferences(cls, user, category):
        """
        Get user's notification preferences for a category.
        """
        try:
            prefs = user.notification_preferences
            category_prefs = prefs.category_preferences.get(category, {})
            return {
                'inapp': category_prefs.get('inapp', True),
                'sms': prefs.sms_enabled and category_prefs.get('sms', True),
                'email': prefs.email_enabled and category_prefs.get('email', True),
            }
        except Exception:
            return {'inapp': True, 'sms': True, 'email': True}

    # === Convenience Methods ===

    @classmethod
    def notify_training_reminder(cls, user, training_day):
        """Send training reminder."""
        return cls.send_from_template(
            user=user,
            template_slug=f'training_reminder_{training_day}',
            context={'day': training_day, 'name': user.first_name}
        )

    @classmethod
    def notify_inactive_member(cls, user, days_inactive):
        """Send inactive member follow-up."""
        template = 'inactive_7d' if days_inactive < 14 else 'inactive_14d'
        return cls.send_from_template(
            user=user,
            template_slug=template,
            context={'days': days_inactive, 'name': user.first_name},
            send_sms=True
        )

    @classmethod
    def notify_supplier_stage_change(cls, supplier, old_stage, new_stage):
        """Notify supplier of onboarding stage change."""
        return cls.send_from_template(
            user=supplier.user,
            template_slug=f'supplier_{new_stage}',
            context={
                'business_name': supplier.business_name,
                'old_stage': old_stage,
                'new_stage': new_stage
            },
            send_email=True
        )

    @classmethod
    def notify_first_sale(cls, user, order):
        """Congratulate member on first sale."""
        return cls.send_from_template(
            user=user,
            template_slug='first_sale',
            context={
                'name': user.first_name,
                'amount': str(order.total_amount),
                'product': order.product_name
            },
            send_sms=True
        )
```

### 5.4 Default Notification Templates

| Slug | Title | Message | Channels |
|------|-------|---------|----------|
| `welcome_member` | Welcome to TWC! | Hi {name}, welcome to the TWC family! | In-app, Email |
| `training_reminder_abc1` | ABC Day 1 Reminder | Don't forget ABC Day 1 training today! | SMS, In-app |
| `training_missed` | Training Missed | You missed {day} training. Watch the replay! | SMS, In-app |
| `inactive_7d` | We Miss You! | Hi {name}, it's been 7 days. Let's get active! | SMS |
| `inactive_14d` | Action Needed | Hi {name}, your account needs attention. | SMS, Email |
| `first_sale` | Congratulations! | You made your first sale: {amount}! | SMS, In-app |
| `team_new_recruit` | New Team Member | {recruit_name} joined your team! | In-app |
| `supplier_testing` | Testing Phase Started | Your testing phase has started. | Email, In-app |
| `supplier_approved` | Application Approved | Congratulations! You're now an approved supplier. | Email, SMS |
| `supplier_alert_returns` | High Return Rate | Your return rate ({rate}%) needs attention. | Email, In-app |

### 5.5 Browser Push Notifications (Firebase Cloud Messaging)

Browser push notifications allow reaching users even when they're not on the dashboard website.

**Setup Requirements:**
1. Firebase project with Cloud Messaging enabled
2. VAPID keys for web push
3. Service Worker for handling push events
4. HTTPS (required for Service Workers)

**Implementation Flow:**

```
1. User Opt-In:
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │ User visits  │───▶│ Show opt-in  │───▶│ User clicks  │
   │  dashboard   │    │   prompt     │    │   "Allow"    │
   └──────────────┘    └──────────────┘    └──────────────┘

2. Registration:
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │ Service      │───▶│ Firebase     │───▶│ Save token   │
   │ Worker init  │    │ returns token│    │ to database  │
   └──────────────┘    └──────────────┘    └──────────────┘

3. Sending:
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │ Event occurs │───▶│ Send via FCM │───▶│ User sees    │
   │ in TWCako    │    │ to all tokens│    │ notification │
   └──────────────┘    └──────────────┘    └──────────────┘
```

**Service Worker (Frontend):**
```javascript
// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  projectId: "twcako-prod",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, click_action } = payload.notification;

  self.registration.showNotification(title, {
    body: body,
    icon: icon || '/static/images/twc-icon.png',
    badge: '/static/images/twc-badge.png',
    data: { url: click_action }
  });
});
```

**Django Celery Task for Push:**
```python
# notifications/tasks.py

import firebase_admin
from firebase_admin import messaging
from celery import shared_task

@shared_task
def send_push_notification(notification_id):
    """Send push notification via Firebase Cloud Messaging."""
    from .models import Notification, PushSubscription

    notification = Notification.objects.get(id=notification_id)
    user = notification.user

    # Get all active push subscriptions for user
    subscriptions = PushSubscription.objects.filter(
        user=user,
        is_active=True
    )

    if not subscriptions.exists():
        return

    tokens = list(subscriptions.values_list('fcm_token', flat=True))

    # Build FCM message
    message = messaging.MulticastMessage(
        notification=messaging.Notification(
            title=notification.title,
            body=notification.message,
            image=None  # Optional image URL
        ),
        data={
            'notification_id': str(notification.id),
            'category': notification.category,
            'action_url': notification.action_url or '',
        },
        tokens=tokens,
        webpush=messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                icon='/static/images/twc-icon.png',
                badge='/static/images/twc-badge.png',
            ),
            fcm_options=messaging.WebpushFCMOptions(
                link=f"https://dashboard.twcako.com{notification.action_url}"
            )
        )
    )

    # Send and handle failures
    response = messaging.send_multicast(message)

    # Mark failed tokens as inactive
    if response.failure_count > 0:
        for idx, send_response in enumerate(response.responses):
            if not send_response.success:
                PushSubscription.objects.filter(
                    fcm_token=tokens[idx]
                ).update(is_active=False)

    notification.push_delivered = True
    notification.push_delivered_at = timezone.now()
    notification.save()
```

**API Endpoints for Push:**
```
POST /api/v1/notifications/push/subscribe/
     - Register FCM token for current user
     - Body: {"token": "fcm_token_here", "device_name": "Chrome on Windows"}

DELETE /api/v1/notifications/push/unsubscribe/
     - Remove FCM token
     - Body: {"token": "fcm_token_here"}

GET /api/v1/notifications/push/status/
     - Check if push is enabled for user
     - Returns: {"enabled": true, "devices": [...]}
```

**Browser Support:**
| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome | ✅ | ✅ Android | Full support |
| Firefox | ✅ | ✅ Android | Full support |
| Edge | ✅ | ✅ Android | Full support |
| Safari | ✅ macOS 13+ | ❌ iOS | Requires separate APNs setup |
| Samsung | N/A | ✅ | Uses FCM |

**Fallback Strategy:**
- If push not supported/enabled → use SMS for high priority
- If token fails → mark inactive, notify user to re-enable
- iOS users → SMS/Email only (until native app)

---

## 6. Database Schema

### 6.1 ER Diagram (New Models)

```
┌─────────────────┐     ┌─────────────────────┐
│     User        │────<│  MemberActivity     │
└─────────────────┘  1:1└─────────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────────┐
│ MemberActivityLog   │
└─────────────────────┘

┌─────────────────┐     ┌─────────────────────┐
│    Supplier     │────<│ SupplierOnboarding  │
└─────────────────┘  1:1└─────────────────────┘
        │
        │ 1:1
        ▼
┌─────────────────────┐
│ SupplierPerformance │
└─────────────────────┘

┌─────────────────┐     ┌─────────────────┐
│      User       │────<│  Notification   │
└─────────────────┘  1:N└─────────────────┘
                               │
                               │ N:1
                               ▼
                        ┌─────────────────────┐
                        │ NotificationTemplate│
                        └─────────────────────┘

┌─────────────────┐     ┌─────────────────────────┐
│      User       │────<│ NotificationPreference  │
└─────────────────┘  1:1└─────────────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────────┐
│  PushSubscription   │  (FCM tokens per device)
└─────────────────────┘
```

### 6.2 Migration Order

1. `notifications` app (independent)
2. `accounts/MemberActivity` (depends on User)
3. `accounts/MemberActivityLog` (depends on User)
4. `supplier/SupplierOnboarding` (depends on Supplier)
5. `supplier/SupplierPerformance` (depends on Supplier)

---

## 7. Celery Tasks & Automation

### 7.1 Task Definitions

```python
# accounts/tasks.py

@shared_task(name='accounts.calculate_member_kpis')
def calculate_member_kpis():
    """
    Daily task to recalculate all member KPIs.
    Runs at 2:00 AM Manila time.
    """
    from accounts.models import User, MemberActivity
    from django.db.models import Count, Sum
    from django.utils import timezone

    today = timezone.now()
    month_start = today.replace(day=1, hour=0, minute=0, second=0)

    for user in User.objects.filter(is_active=True).iterator():
        activity, created = MemberActivity.objects.get_or_create(user=user)

        # Calculate sales metrics
        sales = user.ecashentry_set.filter(
            e_type__in=['retail_commission', 'merchant_sale', 'distributor_sale'],
            timestamp__gte=month_start
        ).aggregate(
            count=Count('id'),
            total=Sum('amount')
        )
        activity.sales_count_this_month = sales['count'] or 0
        activity.sales_amount_this_month = sales['total'] or 0

        # Calculate funnel visitors
        visitors = user.prospecttap_set.filter(
            created_at__gte=month_start
        ).count()
        activity.visitors_this_month = visitors

        # Sync training progress
        if hasattr(user, 'livetrainings'):
            lt = user.livetrainings
            activity.abc_day1_completed = lt.abc_day1_attended
            activity.abc_day2_completed = lt.abc_day2_attended
            activity.abc_day3_completed = lt.abc_day3_attended
            activity.abc_completed = lt.abc_certificate_done
            activity.dbc_completed = lt.dbc_certificate_done

        # Calculate engagement score
        activity.engagement_score = activity.calculate_engagement_score()

        # Determine lifecycle stage
        new_stage, reason = activity.determine_lifecycle_stage()
        if new_stage != activity.lifecycle_stage:
            activity.previous_stage = activity.lifecycle_stage
            activity.lifecycle_stage = new_stage
            activity.stage_changed_at = timezone.now()

            # Log stage change
            MemberActivityLog.objects.create(
                user=user,
                event_type='stage_change',
                event_data={'from': activity.previous_stage, 'to': new_stage, 'reason': reason}
            )

        activity.save()


@shared_task(name='accounts.check_inactive_members')
def check_inactive_members():
    """
    Daily task to identify and notify inactive members.
    Runs at 9:00 AM Manila time.
    """
    from accounts.models import MemberActivity
    from notifications.services import NotificationService

    # At-risk members (14-29 days inactive)
    at_risk = MemberActivity.objects.filter(
        lifecycle_stage='at_risk',
        stage_changed_at__date=timezone.now().date() - timedelta(days=1)  # Just changed yesterday
    )

    for activity in at_risk:
        NotificationService.notify_inactive_member(
            user=activity.user,
            days_inactive=activity.days_since_last_activity
        )

    # Dormant members (30-59 days inactive)
    dormant = MemberActivity.objects.filter(
        lifecycle_stage='dormant',
        stage_changed_at__date=timezone.now().date() - timedelta(days=1)
    )

    for activity in dormant:
        NotificationService.notify_inactive_member(
            user=activity.user,
            days_inactive=activity.days_since_last_activity
        )


@shared_task(name='accounts.send_training_reminders')
def send_training_reminders():
    """
    Daily task to send training reminders.
    Runs at 8:00 AM Manila time.
    """
    from accounts.models import User
    from notifications.services import NotificationService
    from django.utils import timezone

    # Members who haven't started ABC (activated > 3 days ago)
    threshold = timezone.now() - timedelta(days=3)

    new_members = User.objects.filter(
        date_activated__lte=threshold,
        livetrainings__abc_day1_attended=False,
        is_active=True
    ).exclude(
        activity__lifecycle_stage='churned'
    )

    for user in new_members:
        NotificationService.send_from_template(
            user=user,
            template_slug='training_reminder_abc1',
            context={'name': user.first_name},
            send_sms=True
        )


# supplier/tasks.py

@shared_task(name='supplier.calculate_performance')
def calculate_supplier_performance():
    """
    Daily task to recalculate supplier performance metrics.
    Runs at 3:00 AM Manila time.
    """
    from accounts.models import Supplier
    from supplier.models import SupplierPerformance
    from orders.models import ProductOrder
    from django.db.models import Count, Sum, Avg
    from django.utils import timezone

    today = timezone.now()
    month_start = today.replace(day=1, hour=0, minute=0, second=0)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)

    for supplier in Supplier.objects.filter(user__is_active=True).iterator():
        perf, created = SupplierPerformance.objects.get_or_create(supplier=supplier)

        # Get orders
        orders = ProductOrder.objects.filter(supplier=supplier)
        orders_this_month = orders.filter(purchase_date__gte=month_start)
        orders_last_month = orders.filter(
            purchase_date__gte=last_month_start,
            purchase_date__lt=month_start
        )

        # Order counts
        perf.total_orders = orders.count()
        perf.orders_this_month = orders_this_month.count()
        perf.orders_last_month = orders_last_month.count()

        # Growth rate
        if perf.orders_last_month > 0:
            perf.order_growth_rate = (
                (perf.orders_this_month - perf.orders_last_month)
                / perf.orders_last_month * 100
            )

        # Fulfillment metrics
        delivered = orders.filter(order_status='delivered')
        returned = orders.filter(order_status__in=['returned', 'rts'])

        if delivered.count() > 0:
            # Calculate on-time rate (delivered within expected timeframe)
            on_time = delivered.filter(
                delivered_date__lte=F('expected_delivery_date')
            ).count()
            perf.on_time_rate = (on_time / delivered.count()) * 100

        perf.orders_returned = returned.count()
        if perf.total_orders > 0:
            perf.return_rate = (returned.count() / perf.total_orders) * 100

        # Revenue
        revenue = orders.filter(
            order_status='delivered'
        ).aggregate(total=Sum('total_amount'))
        perf.total_revenue = revenue['total'] or 0

        revenue_this_month = orders_this_month.filter(
            order_status='delivered'
        ).aggregate(total=Sum('total_amount'))
        perf.revenue_this_month = revenue_this_month['total'] or 0

        # Calculate rating and check alerts
        perf.calculate_rating()
        perf.check_alerts()

        perf.save()


@shared_task(name='supplier.check_testing_deadlines')
def check_testing_deadlines():
    """
    Daily task to check supplier testing phase deadlines.
    """
    from supplier.models import SupplierOnboarding
    from notifications.services import NotificationService

    # Testing suppliers approaching 30-day deadline
    deadline_threshold = timezone.now() - timedelta(days=25)

    approaching_deadline = SupplierOnboarding.objects.filter(
        stage='testing',
        testing_started_at__lte=deadline_threshold
    )

    for onboarding in approaching_deadline:
        days_remaining = 30 - (timezone.now() - onboarding.testing_started_at).days

        if days_remaining <= 5:
            NotificationService.send_from_template(
                user=onboarding.supplier.user,
                template_slug='supplier_testing_deadline',
                context={
                    'days_remaining': days_remaining,
                    'orders_completed': onboarding.testing_order_count,
                    'orders_required': onboarding.REQUIRED_TEST_ORDERS
                },
                send_email=True
            )
```

### 7.2 Celery Beat Schedule

```python
# twcako/celery.py

app.conf.beat_schedule = {
    # Member Monitoring
    'calculate-member-kpis-daily': {
        'task': 'accounts.calculate_member_kpis',
        'schedule': crontab(hour=2, minute=0),  # 2:00 AM
    },
    'check-inactive-members-daily': {
        'task': 'accounts.check_inactive_members',
        'schedule': crontab(hour=9, minute=0),  # 9:00 AM
    },
    'send-training-reminders-daily': {
        'task': 'accounts.send_training_reminders',
        'schedule': crontab(hour=8, minute=0),  # 8:00 AM
    },

    # Supplier Performance
    'calculate-supplier-performance-daily': {
        'task': 'supplier.calculate_performance',
        'schedule': crontab(hour=3, minute=0),  # 3:00 AM
    },
    'check-testing-deadlines-daily': {
        'task': 'supplier.check_testing_deadlines',
        'schedule': crontab(hour=10, minute=0),  # 10:00 AM
    },

    # Notifications
    'process-notification-queue': {
        'task': 'notifications.process_queue',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
}
```

---

## 8. API Endpoints

### 8.1 Member Monitoring API

```
GET  /api/v1/members/activity/
     - List all members with activity metrics
     - Filters: lifecycle_stage, engagement_score__gte, last_login__lte
     - Diamond coaches see only their team

GET  /api/v1/members/{user_id}/activity/
     - Get specific member's activity details

GET  /api/v1/members/{user_id}/activity/logs/
     - Get member's activity event log

GET  /api/v1/members/dashboard/
     - Aggregated dashboard stats:
       - Total members by stage
       - Active this week/month
       - Training completion rates
       - Top performers

GET  /api/v1/members/follow-up-queue/
     - Members needing follow-up
     - Sorted by priority
```

### 8.2 Supplier API

```
GET  /api/v1/suppliers/
     - List all suppliers (admin only)
     - Filters: stage, rating__gte

GET  /api/v1/suppliers/{id}/
     - Get supplier details

GET  /api/v1/suppliers/{id}/onboarding/
     - Get onboarding status and history

POST /api/v1/suppliers/{id}/onboarding/verify-document/
     - Verify a document (admin)
     - Body: {"document": "tin|bir|address", "verified": true}

POST /api/v1/suppliers/{id}/onboarding/start-testing/
     - Start testing phase (admin)

POST /api/v1/suppliers/{id}/onboarding/record-test-order/
     - Record test order result
     - Body: {"order_id": 123, "success": true}

POST /api/v1/suppliers/{id}/onboarding/approve/
     - Approve supplier (admin)

POST /api/v1/suppliers/{id}/onboarding/reject/
     - Reject supplier (admin)
     - Body: {"reason": "..."}

GET  /api/v1/suppliers/{id}/performance/
     - Get performance metrics

GET  /api/v1/suppliers/dashboard/
     - Admin dashboard:
       - Pending applications
       - In testing
       - Performance alerts
```

### 8.3 Notifications API

```
GET  /api/v1/notifications/
     - List user's notifications
     - Filters: is_read, category
     - Pagination supported

GET  /api/v1/notifications/unread-count/
     - Get count of unread notifications

POST /api/v1/notifications/{id}/read/
     - Mark notification as read

POST /api/v1/notifications/mark-all-read/
     - Mark all notifications as read

GET  /api/v1/notifications/preferences/
     - Get notification preferences

PUT  /api/v1/notifications/preferences/
     - Update notification preferences
```

---

## 9. Dashboard UI Requirements

### 9.1 Member Monitoring Dashboard

**For Diamond Coaches:**
```
┌─────────────────────────────────────────────────────────────┐
│  TEAM OVERVIEW                                    [Export]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Active  │ │ At Risk  │ │ Dormant  │ │ Churned  │       │
│  │    42    │ │    8     │ │    5     │ │    12    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│  FOLLOW-UP QUEUE                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Name          │ Stage    │ Days  │ Last Activity    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Juan Santos   │ At Risk  │ 16    │ Feb 1: Login    │   │
│  │ Maria Cruz    │ At Risk  │ 14    │ Feb 3: ABC Day2 │   │
│  │ Pedro Garcia  │ Dormant  │ 35    │ Jan 10: Sale    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  TOP PERFORMERS THIS MONTH                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Ana Reyes      │ 15 sales │ ₱45,000  │ Score: 95│   │
│  │ 2. Jose Lopez     │ 12 sales │ ₱38,000  │ Score: 88│   │
│  │ 3. Rosa Martinez  │ 10 sales │ ₱32,000  │ Score: 82│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Supplier Admin Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  SUPPLIER MANAGEMENT                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PENDING ACTIONS                                            │
│  ┌──────────────────┐ ┌──────────────────┐                 │
│  │  New Applications │ │  Awaiting Approval│                │
│  │        3         │ │        2          │                 │
│  └──────────────────┘ └──────────────────┘                 │
│                                                             │
│  IN TESTING PHASE                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Supplier        │ Orders │ Success │ Days Left      │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ABC Foods       │  7/10  │  100%   │ 12 days       │   │
│  │ XYZ Goods       │  4/10  │   75%   │ 20 days       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  PERFORMANCE ALERTS                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️ High Returns: Supplier DEF (8.5%)               │   │
│  │ ⚠️ Low Rating: Supplier GHI (2.5 stars)           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 Notification Center

```
┌─────────────────────────────────────────────────────────────┐
│  🔔 NOTIFICATIONS                    [Mark All Read]        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TODAY                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🎉 Congratulations! Juan made his first sale!      │   │
│  │    10:30 AM                            [View Team]  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ⚠️ 3 team members need follow-up                   │   │
│  │    9:00 AM                          [View Queue]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  YESTERDAY                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ℹ️ New team member: Maria Cruz joined!             │   │
│  │    3:45 PM                          [View Profile]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Create `notifications` app with models
- [ ] Create `MemberActivity` and `MemberActivityLog` models
- [ ] Create `SupplierOnboarding` and `SupplierPerformance` models
- [ ] Write and run migrations
- [ ] Create Django signals for activity logging

### Phase 2: Data Population (Week 3)
- [ ] Create management command to backfill `MemberActivity` from existing data
- [ ] Create management command to backfill `SupplierOnboarding` for existing suppliers
- [ ] Sync training progress from `LiveTrainings`
- [ ] Calculate initial engagement scores and lifecycle stages

### Phase 3: Celery Tasks (Week 4)
- [ ] Implement `calculate_member_kpis` task
- [ ] Implement `check_inactive_members` task
- [ ] Implement `send_training_reminders` task
- [ ] Implement `calculate_supplier_performance` task
- [ ] Configure Celery Beat schedule
- [ ] Test task execution

### Phase 4: Notification Service (Week 5)
- [ ] Implement `NotificationService` class
- [ ] Create notification templates
- [ ] Integrate with existing SMS system
- [ ] Set up email delivery (SendGrid integration)
- [ ] Test notification delivery

### Phase 5: API Endpoints (Week 6)
- [ ] Implement member monitoring API
- [ ] Implement supplier management API
- [ ] Implement notifications API
- [ ] Write API documentation
- [ ] Test endpoints

### Phase 6: Dashboard UI (Weeks 7-8)
- [ ] Build member monitoring dashboard (for Diamonds)
- [ ] Build follow-up queue view
- [ ] Build supplier admin dashboard
- [ ] Build notification center component
- [ ] Mobile-responsive design

### Phase 7: Integration & Testing (Week 9)
- [ ] Integration testing with production-like data
- [ ] Load testing Celery tasks
- [ ] SMS delivery testing
- [ ] User acceptance testing with Diamond coaches
- [ ] Bug fixes

### Phase 8: Deployment (Week 10)
- [ ] Deploy to staging environment
- [ ] Final QA
- [ ] Production deployment
- [ ] Monitor and iterate

---

## 11. Testing Requirements

### 11.1 Unit Tests

```python
# accounts/tests/test_member_activity.py

class MemberActivityTestCase(TestCase):
    def test_engagement_score_calculation(self):
        """Test engagement score is calculated correctly."""

    def test_lifecycle_stage_determination(self):
        """Test lifecycle stage is determined correctly."""

    def test_stage_transition_logging(self):
        """Test stage changes are logged."""


# supplier/tests/test_onboarding.py

class SupplierOnboardingTestCase(TestCase):
    def test_document_verification(self):
        """Test document verification workflow."""

    def test_testing_phase_progression(self):
        """Test testing phase order recording."""

    def test_approval_criteria(self):
        """Test can_approve property logic."""


# notifications/tests/test_service.py

class NotificationServiceTestCase(TestCase):
    def test_send_notification(self):
        """Test basic notification sending."""

    def test_template_rendering(self):
        """Test template variable substitution."""

    def test_user_preferences(self):
        """Test notification preferences are respected."""
```

### 11.2 Integration Tests

- Test full member lifecycle flow (new → active → churned)
- Test supplier onboarding end-to-end
- Test notification delivery across all channels
- Test Celery task execution and scheduling

### 11.3 Load Tests

- Calculate KPIs for 10,000+ members
- Send bulk notifications (1,000+ recipients)
- Concurrent API requests

---

## Appendix A: Configuration Variables

```python
# settings/base.py additions

# Member Monitoring
MEMBER_INACTIVE_THRESHOLD_DAYS = 14  # Days before "at_risk"
MEMBER_DORMANT_THRESHOLD_DAYS = 30   # Days before "dormant"
MEMBER_CHURNED_THRESHOLD_DAYS = 60   # Days before "churned"

# Supplier Testing
SUPPLIER_TEST_ORDER_MINIMUM = 10
SUPPLIER_TEST_SUCCESS_RATE_MINIMUM = 80  # Percentage
SUPPLIER_TESTING_MAX_DAYS = 30

# Notifications
NOTIFICATION_SMS_ENABLED = True
NOTIFICATION_EMAIL_ENABLED = True
NOTIFICATION_QUIET_HOURS_START = "22:00"
NOTIFICATION_QUIET_HOURS_END = "07:00"
```

---

## Appendix B: Migration from V3 to V4

### Data Migration Checklist

1. **MemberActivity**
   - Backfill from `ECashEntry` for sales data
   - Backfill from `ProspectTAP` for funnel data
   - Sync from `LiveTrainings` for training data
   - Calculate initial engagement scores

2. **SupplierOnboarding**
   - Existing approved suppliers → stage='approved'
   - Set `submitted_at` from `Supplier.timestamp`
   - Mark documents as verified for existing suppliers

3. **Notifications**
   - No historical data needed
   - Create default templates

---

## 12. Gamification System

### 12.1 Overview

The gamification system is designed to increase member engagement across all activities: **sales**, **training**, and **recruitment**. It uses a hybrid reward model combining eCash credits with exclusive perks, and features individual rankings/leaderboards to drive competitive performance.

**IMPORTANT: Integration with Existing TWC Rewards**

TWCako already has a rewards system (`twc_reward` app) with:
- `TWCRewardClaims` - Tracks reward claims
- `TWCRewardMonitoring` - Monitors user progress
- Existing programs: Sponsoring Bonus, Builder Moneyback, RankUp Bonus, etc.
- Direct integration with eCash

Our gamification system will **extend** this existing infrastructure rather than replace it.

### 12.2 Integrated Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER ACTIVITY                                │
│  (Login, Sale, Training, Recruitment, Funnel Activity)          │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
┌───────────────────────┐           ┌───────────────────────┐
│  NEW: GAMIFICATION    │           │  EXISTING: TWC REWARDS│
│  (Engagement Layer)   │           │  (Financial Layer)    │
├───────────────────────┤           ├───────────────────────┤
│ • Points (daily)      │           │ • Sponsoring Bonus    │
│ • Badges              │           │ • Builder Moneyback   │
│ • Streaks             │           │ • RankUp Bonus        │
│ • Leaderboards        │           │ • Travel Incentive    │
│ • Challenges          │           │ • Techno Gadget Promo │
│ • Ranks               │           │ • Leaders Assembly    │
└───────────┬───────────┘           └───────────┬───────────┘
            │                                   │
            │   Points convert to eCash         │
            │   via TWCRewardClaims             │
            └─────────────┬─────────────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │     eCASH       │
                 │  (Unified)      │
                 └─────────────────┘
```

### 12.3 Extended App Structure (twc_reward)

Instead of creating a new `gamification/` app, we extend the existing `twc_reward/` app:

```
twc_reward/
├── models.py             # ADD: TWCGamification, TWCRank, TWCBadge, etc.
├── services.py           # ADD: GamificationService class
├── tasks.py              # ADD: Celery tasks for points
├── signals.py            # ADD: Signal handlers for events
├── views.py              # EXTEND: Add gamification views
├── api.py                # EXTEND: Add gamification endpoints
├── templates/
│   └── twc_reward/
│       ├── (existing templates)
│       ├── gamification/           # NEW
│       │   ├── profile_badges.html
│       │   ├── leaderboard.html
│       │   ├── achievements.html
│       │   └── rewards_store.html
│       └── ...
└── migrations/
```

**Rationale for extending vs new app:**
- Leverages existing `TWCRewardClaims` for point redemption
- Shares `TWCRewardMonitoring` for unified user tracking
- Maintains single eCash integration point
- Reduces code duplication

### 12.4 Database Models

**Note:** These models extend the existing `twc_reward` app, not a new app.

```python
# twc_reward/models.py - EXTENDED

from django.db import models
from django.conf import settings
from django.utils import timezone

# ============================================================
# EXISTING MODELS (Keep as-is)
# ============================================================

PROGRAM_CHOICES = (
    # Existing
    ('distributor_moneyback', 'Distributor Moneyback Program'),
    ('builder_moneyback', 'Builder Moneyback Program'),
    ('subscription_bonus', 'Subscription Bonus'),
    ('sponsoring_bonus', 'Sponsoring Bonus'),
    ('rankup_bonus', 'RankUp Bonus'),
    ('rankup_express', 'RankUp Express'),
    ('travel_incentive', 'Travel Incentive'),
    ('retail_cashback', 'Retail CashBack'),
    ('techno_gadget_promo', 'Techno Gadget Promo'),
    ('travel_allowance_promo', 'Travel Allowance Promo'),

    # NEW - Gamification Programs
    ('points_redemption', 'Points Redemption'),
    ('rank_up_reward', 'Rank Up Reward'),
    ('badge_reward', 'Badge Reward'),
    ('challenge_reward', 'Challenge Reward'),
    ('streak_bonus', 'Streak Bonus'),
    ('leaderboard_reward', 'Leaderboard Reward'),
)

# TWCRewardClaims - Keep existing, used for point redemption
# TWCRewardMonitoring - Keep existing, extended below


# ============================================================
# NEW GAMIFICATION MODELS
# ============================================================

class TWCGamification(models.Model):
    """
    Gamification tracking for each user.
    Works alongside TWCRewardMonitoring.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='gamification'
    )
    monitoring = models.OneToOneField(
        'TWCRewardMonitoring',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='gamification'
    )

    # Points
    points_balance = models.IntegerField(default=0)
    points_lifetime = models.IntegerField(default=0)
    points_spent = models.IntegerField(default=0)
    points_this_month = models.IntegerField(default=0)

    # Breakdown
    points_from_sales = models.IntegerField(default=0)
    points_from_training = models.IntegerField(default=0)
    points_from_recruitment = models.IntegerField(default=0)
    points_from_engagement = models.IntegerField(default=0)
    points_from_streaks = models.IntegerField(default=0)

    # Rank
    rank = models.ForeignKey('TWCRank', on_delete=models.PROTECT, null=True)
    rank_achieved_at = models.DateTimeField(null=True)

    # Streaks
    login_streak = models.IntegerField(default=0)
    login_streak_best = models.IntegerField(default=0)
    login_last_date = models.DateField(null=True)

    sales_streak = models.IntegerField(default=0)
    sales_streak_best = models.IntegerField(default=0)
    sales_last_date = models.DateField(null=True)

    # Engagement
    engagement_score = models.IntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "TWC Gamification"


class TWCPointTransaction(models.Model):
    """
    Records all point transactions (earning and spending).
    Links to TWCRewardClaims for redemptions.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='point_transactions'
    )

    # === Transaction Type ===
    TRANSACTION_TYPES = [
        ('earn', 'Earned'),
        ('spend', 'Spent'),
        ('convert', 'Converted to eCash'),
        ('bonus', 'Bonus'),
        ('adjust', 'Adjustment'),
    ]
    transaction_type = models.CharField(
        max_length=10,
        choices=TRANSACTION_TYPES
    )

    # === Point Categories ===
    CATEGORIES = [
        ('sales', 'Sales Activity'),
        ('training', 'Training Completion'),
        ('recruitment', 'Team Building'),
        ('engagement', 'Engagement'),
        ('streak', 'Streak Bonus'),
        ('challenge', 'Challenge Reward'),
        ('referral', 'Referral Bonus'),
        ('redemption', 'Reward Redemption'),
        ('system', 'System Adjustment'),
    ]
    category = models.CharField(
        max_length=20,
        choices=CATEGORIES,
        db_index=True
    )

    # === Points ===
    points = models.IntegerField(
        help_text="Positive for earning, negative for spending"
    )
    balance_after = models.IntegerField(
        help_text="User's point balance after transaction"
    )

    # === Description ===
    description = models.CharField(max_length=255)

    # === Reference (for audit trail) ===
    reference_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="Model name of related object"
    )
    reference_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="ID of related object"
    )

    # === Timestamps ===
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When these points expire (if applicable)"
    )

    class Meta:
        verbose_name = "Point Transaction"
        verbose_name_plural = "Point Transactions"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'category']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        sign = '+' if self.points > 0 else ''
        return f"{self.user.username}: {sign}{self.points} ({self.category})"


class MemberPoints(models.Model):
    """
    Aggregated point balance for each member.
    Updated via signals when PointTransaction is created.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='gamification_points'
    )

    # === Current Balance ===
    total_points = models.IntegerField(
        default=0,
        help_text="Current available point balance"
    )
    lifetime_earned = models.IntegerField(
        default=0,
        help_text="Total points ever earned"
    )
    lifetime_spent = models.IntegerField(
        default=0,
        help_text="Total points ever spent"
    )

    # === Category Breakdown (for analytics) ===
    points_from_sales = models.IntegerField(default=0)
    points_from_training = models.IntegerField(default=0)
    points_from_recruitment = models.IntegerField(default=0)
    points_from_engagement = models.IntegerField(default=0)
    points_from_streaks = models.IntegerField(default=0)
    points_from_challenges = models.IntegerField(default=0)

    # === This Period (for leaderboards) ===
    points_this_week = models.IntegerField(default=0)
    points_this_month = models.IntegerField(default=0)

    # === Timestamps ===
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Member Points"
        verbose_name_plural = "Member Points"

    def __str__(self):
        return f"{self.user.username}: {self.total_points} points"

    def add_points(self, points, category, description, reference=None, expires_at=None):
        """
        Add points to user's balance.
        Creates transaction and updates aggregates.
        """
        self.total_points += points
        self.lifetime_earned += points

        # Update category breakdown
        category_field = f'points_from_{category}'
        if hasattr(self, category_field):
            setattr(self, category_field, getattr(self, category_field) + points)

        self.save()

        # Create transaction record
        transaction = PointTransaction.objects.create(
            user=self.user,
            transaction_type='earn',
            category=category,
            points=points,
            balance_after=self.total_points,
            description=description,
            reference_type=reference.__class__.__name__ if reference else '',
            reference_id=reference.id if reference else None,
            expires_at=expires_at
        )

        return transaction

    def spend_points(self, points, category, description, reference=None):
        """
        Spend points from user's balance.
        Returns False if insufficient balance.
        """
        if self.total_points < points:
            return False

        self.total_points -= points
        self.lifetime_spent += points
        self.save()

        # Create transaction record
        transaction = PointTransaction.objects.create(
            user=self.user,
            transaction_type='spend',
            category=category,
            points=-points,
            balance_after=self.total_points,
            description=description,
            reference_type=reference.__class__.__name__ if reference else '',
            reference_id=reference.id if reference else None
        )

        return transaction


class Badge(models.Model):
    """
    Badge definitions - achievements members can unlock.
    """
    # === Identification ===
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()

    # === Visual ===
    icon = models.CharField(
        max_length=50,
        help_text="Icon class or emoji"
    )
    color = models.CharField(
        max_length=20,
        default='#FFD700',
        help_text="Badge color (hex)"
    )
    image = models.ImageField(
        upload_to='gamification/badges/',
        null=True,
        blank=True
    )

    # === Rarity ===
    RARITY_LEVELS = [
        ('common', 'Common'),
        ('uncommon', 'Uncommon'),
        ('rare', 'Rare'),
        ('epic', 'Epic'),
        ('legendary', 'Legendary'),
    ]
    rarity = models.CharField(
        max_length=15,
        choices=RARITY_LEVELS,
        default='common'
    )

    # === Category ===
    BADGE_CATEGORIES = [
        ('sales', 'Sales Achievement'),
        ('training', 'Training Milestone'),
        ('recruitment', 'Team Building'),
        ('engagement', 'Engagement'),
        ('special', 'Special Event'),
    ]
    category = models.CharField(
        max_length=20,
        choices=BADGE_CATEGORIES
    )

    # === Unlock Criteria ===
    criteria_type = models.CharField(
        max_length=50,
        help_text="Type of criteria: sales_count, training_complete, etc."
    )
    criteria_value = models.IntegerField(
        default=1,
        help_text="Value required to unlock"
    )
    criteria_json = models.JSONField(
        default=dict,
        blank=True,
        help_text="Complex criteria as JSON"
    )

    # === Rewards ===
    points_reward = models.IntegerField(
        default=0,
        help_text="Points awarded when badge is earned"
    )

    # === Status ===
    is_active = models.BooleanField(default=True)
    is_secret = models.BooleanField(
        default=False,
        help_text="Hidden until earned"
    )

    # === Display ===
    display_order = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Badge"
        verbose_name_plural = "Badges"
        ordering = ['category', 'display_order']

    def __str__(self):
        return f"{self.name} ({self.rarity})"


class MemberBadge(models.Model):
    """
    Tracks which badges each member has earned.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='earned_badges'
    )
    badge = models.ForeignKey(
        Badge,
        on_delete=models.CASCADE,
        related_name='earned_by'
    )

    # === Earned Info ===
    earned_at = models.DateTimeField(auto_now_add=True)
    earned_reason = models.CharField(
        max_length=255,
        blank=True,
        help_text="Specific reason/context for earning"
    )

    # === Display ===
    is_featured = models.BooleanField(
        default=False,
        help_text="Featured on profile"
    )
    is_notified = models.BooleanField(
        default=False,
        help_text="User has been notified"
    )

    class Meta:
        verbose_name = "Member Badge"
        verbose_name_plural = "Member Badges"
        unique_together = ['user', 'badge']
        ordering = ['-earned_at']

    def __str__(self):
        return f"{self.user.username} - {self.badge.name}"


class Rank(models.Model):
    """
    Rank/Level definitions for member progression.
    """
    # === Identification ===
    level = models.PositiveIntegerField(unique=True)
    name = models.CharField(max_length=50)
    title = models.CharField(
        max_length=100,
        help_text="Display title for the rank"
    )

    # === Visual ===
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=20, default='#808080')
    image = models.ImageField(
        upload_to='gamification/ranks/',
        null=True,
        blank=True
    )

    # === Requirements ===
    points_required = models.IntegerField(
        help_text="Lifetime points required"
    )
    badges_required = models.ManyToManyField(
        Badge,
        blank=True,
        help_text="Badges that must be earned"
    )
    additional_criteria = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional criteria as JSON"
    )

    # === Benefits ===
    point_multiplier = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=1.00,
        help_text="Multiplier for points earned"
    )
    perks_description = models.TextField(
        blank=True,
        help_text="Description of rank perks"
    )
    ecash_bonus = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="One-time eCash bonus on reaching rank"
    )

    class Meta:
        verbose_name = "Rank"
        verbose_name_plural = "Ranks"
        ordering = ['level']

    def __str__(self):
        return f"Level {self.level}: {self.name}"


class MemberRank(models.Model):
    """
    Tracks member's current rank and progression.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='gamification_rank'
    )

    # === Current Rank ===
    current_rank = models.ForeignKey(
        Rank,
        on_delete=models.PROTECT,
        related_name='members'
    )
    rank_achieved_at = models.DateTimeField(auto_now_add=True)

    # === Progress to Next ===
    progress_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Progress to next rank (0-100)"
    )

    # === History ===
    rank_history = models.JSONField(
        default=list,
        help_text="History of rank changes"
    )
    # Format: [{"rank_id": 1, "achieved_at": "2026-01-01T00:00:00Z"}, ...]

    class Meta:
        verbose_name = "Member Rank"
        verbose_name_plural = "Member Ranks"

    def __str__(self):
        return f"{self.user.username}: {self.current_rank.name}"

    def check_rank_up(self):
        """
        Check if member qualifies for next rank.
        Returns new rank if qualified, None otherwise.
        """
        next_rank = Rank.objects.filter(
            level=self.current_rank.level + 1
        ).first()

        if not next_rank:
            return None

        # Check points requirement
        member_points = self.user.gamification_points
        if member_points.lifetime_earned < next_rank.points_required:
            return None

        # Check badge requirements
        required_badges = next_rank.badges_required.all()
        earned_badges = self.user.earned_badges.values_list('badge_id', flat=True)
        if not all(b.id in earned_badges for b in required_badges):
            return None

        return next_rank

    def promote_to(self, new_rank):
        """
        Promote member to a new rank.
        """
        old_rank = self.current_rank
        self.current_rank = new_rank
        self.rank_achieved_at = timezone.now()

        # Update history
        self.rank_history.append({
            'rank_id': new_rank.id,
            'rank_name': new_rank.name,
            'achieved_at': timezone.now().isoformat()
        })

        self.save()

        # Award eCash bonus if applicable
        if new_rank.ecash_bonus > 0:
            from ecash.services import ECashService
            ECashService.credit_user(
                user=self.user,
                amount=new_rank.ecash_bonus,
                description=f"Rank up bonus: {new_rank.name}",
                e_type='rank_bonus'
            )

        return old_rank, new_rank


class Streak(models.Model):
    """
    Tracks member activity streaks.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='streaks'
    )

    # === Streak Type ===
    STREAK_TYPES = [
        ('login', 'Daily Login'),
        ('sale', 'Daily Sale'),
        ('training', 'Daily Training'),
        ('activity', 'Daily Activity'),
    ]
    streak_type = models.CharField(
        max_length=20,
        choices=STREAK_TYPES
    )

    # === Current Streak ===
    current_count = models.IntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)

    # === Best Streak ===
    best_count = models.IntegerField(default=0)
    best_achieved_at = models.DateTimeField(null=True, blank=True)

    # === Timestamps ===
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Streak"
        verbose_name_plural = "Streaks"
        unique_together = ['user', 'streak_type']

    def __str__(self):
        return f"{self.user.username}: {self.streak_type} - {self.current_count} days"

    def record_activity(self):
        """
        Record today's activity for this streak.
        Returns points earned (if milestone hit).
        """
        today = timezone.now().date()

        if self.last_activity_date == today:
            # Already recorded today
            return 0

        if self.last_activity_date == today - timezone.timedelta(days=1):
            # Continuing streak
            self.current_count += 1
        else:
            # Streak broken, start new
            self.current_count = 1

        self.last_activity_date = today

        # Update best if applicable
        if self.current_count > self.best_count:
            self.best_count = self.current_count
            self.best_achieved_at = timezone.now()

        self.save()

        # Calculate milestone bonus
        return self._get_milestone_bonus()

    def _get_milestone_bonus(self):
        """
        Get bonus points for streak milestones.
        """
        milestones = {
            7: 50,      # 1 week
            14: 100,    # 2 weeks
            30: 250,    # 1 month
            60: 500,    # 2 months
            90: 1000,   # 3 months
            180: 2500,  # 6 months
            365: 10000, # 1 year
        }
        return milestones.get(self.current_count, 0)


class Challenge(models.Model):
    """
    Time-limited challenges with specific goals and rewards.
    """
    # === Identification ===
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    instructions = models.TextField(blank=True)

    # === Visual ===
    image = models.ImageField(
        upload_to='gamification/challenges/',
        null=True,
        blank=True
    )
    icon = models.CharField(max_length=50, blank=True)

    # === Challenge Type ===
    CHALLENGE_TYPES = [
        ('individual', 'Individual'),
        ('team', 'Team Challenge'),
        ('global', 'Global Challenge'),
    ]
    challenge_type = models.CharField(
        max_length=15,
        choices=CHALLENGE_TYPES,
        default='individual'
    )

    # === Duration ===
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()

    # === Goals ===
    goal_type = models.CharField(
        max_length=50,
        help_text="Type of goal: sales_count, sales_amount, recruits, etc."
    )
    goal_value = models.IntegerField(
        help_text="Target value to complete challenge"
    )
    goal_description = models.CharField(max_length=255)

    # === Rewards ===
    points_reward = models.IntegerField(default=0)
    ecash_reward = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    badge_reward = models.ForeignKey(
        Badge,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    additional_rewards = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional rewards as JSON"
    )

    # === Participation ===
    max_participants = models.IntegerField(
        null=True,
        blank=True,
        help_text="Limit participants (null = unlimited)"
    )
    eligibility_criteria = models.JSONField(
        default=dict,
        blank=True,
        help_text="Who can participate"
    )

    # === Status ===
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Challenge"
        verbose_name_plural = "Challenges"
        ordering = ['-start_date']

    def __str__(self):
        return self.name

    @property
    def is_ongoing(self):
        now = timezone.now()
        return self.start_date <= now <= self.end_date

    @property
    def time_remaining(self):
        if not self.is_ongoing:
            return None
        return self.end_date - timezone.now()


class ChallengeParticipation(models.Model):
    """
    Tracks member participation in challenges.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='challenge_participations'
    )
    challenge = models.ForeignKey(
        Challenge,
        on_delete=models.CASCADE,
        related_name='participations'
    )

    # === Progress ===
    current_progress = models.IntegerField(default=0)
    progress_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0
    )

    # === Status ===
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('withdrawn', 'Withdrawn'),
    ]
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='active'
    )

    # === Completion ===
    completed_at = models.DateTimeField(null=True, blank=True)
    rewards_claimed = models.BooleanField(default=False)
    rewards_claimed_at = models.DateTimeField(null=True, blank=True)

    # === Timestamps ===
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Challenge Participation"
        verbose_name_plural = "Challenge Participations"
        unique_together = ['user', 'challenge']

    def __str__(self):
        return f"{self.user.username} - {self.challenge.name}"

    def update_progress(self, new_value):
        """
        Update progress towards challenge goal.
        """
        self.current_progress = new_value
        self.progress_percentage = min(
            (new_value / self.challenge.goal_value) * 100,
            100
        )

        if self.current_progress >= self.challenge.goal_value:
            self.status = 'completed'
            self.completed_at = timezone.now()

        self.save()


class Leaderboard(models.Model):
    """
    Leaderboard definitions for different time periods and categories.
    """
    # === Identification ===
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # === Type ===
    LEADERBOARD_TYPES = [
        ('points', 'Total Points'),
        ('sales_count', 'Sales Count'),
        ('sales_amount', 'Sales Amount'),
        ('recruits', 'Team Recruits'),
        ('training', 'Training Progress'),
    ]
    leaderboard_type = models.CharField(
        max_length=20,
        choices=LEADERBOARD_TYPES
    )

    # === Period ===
    PERIOD_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
        ('all_time', 'All Time'),
    ]
    period = models.CharField(
        max_length=15,
        choices=PERIOD_CHOICES
    )

    # === Rewards ===
    rewards_config = models.JSONField(
        default=dict,
        help_text="Rewards per position: {1: 1000, 2: 500, 3: 250}"
    )

    # === Display ===
    max_display = models.IntegerField(
        default=100,
        help_text="Max entries to show"
    )
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Leaderboard"
        verbose_name_plural = "Leaderboards"
        unique_together = ['leaderboard_type', 'period']

    def __str__(self):
        return f"{self.name} ({self.period})"


class LeaderboardEntry(models.Model):
    """
    Cached leaderboard entries for quick retrieval.
    """
    leaderboard = models.ForeignKey(
        Leaderboard,
        on_delete=models.CASCADE,
        related_name='entries'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    # === Ranking ===
    rank = models.PositiveIntegerField()
    score = models.DecimalField(max_digits=15, decimal_places=2)
    previous_rank = models.PositiveIntegerField(null=True, blank=True)

    # === Period ===
    period_start = models.DateField()
    period_end = models.DateField()

    # === Timestamps ===
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Leaderboard Entry"
        verbose_name_plural = "Leaderboard Entries"
        ordering = ['leaderboard', 'rank']
        unique_together = ['leaderboard', 'user', 'period_start']

    def __str__(self):
        return f"{self.leaderboard.name} #{self.rank}: {self.user.username}"


class Reward(models.Model):
    """
    Redeemable rewards in the rewards store.
    """
    # === Identification ===
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()

    # === Visual ===
    image = models.ImageField(
        upload_to='gamification/rewards/',
        null=True,
        blank=True
    )
    icon = models.CharField(max_length=50, blank=True)

    # === Type ===
    REWARD_TYPES = [
        ('ecash', 'eCash Credit'),
        ('discount', 'Discount Code'),
        ('product', 'Physical Product'),
        ('perk', 'Exclusive Perk'),
        ('badge', 'Special Badge'),
        ('rank_boost', 'Rank XP Boost'),
    ]
    reward_type = models.CharField(
        max_length=15,
        choices=REWARD_TYPES
    )

    # === Cost ===
    points_cost = models.IntegerField()

    # === Value ===
    ecash_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="eCash value if type is ecash"
    )
    reward_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional reward data"
    )

    # === Availability ===
    is_active = models.BooleanField(default=True)
    stock = models.IntegerField(
        null=True,
        blank=True,
        help_text="Available stock (null = unlimited)"
    )
    max_per_user = models.IntegerField(
        null=True,
        blank=True,
        help_text="Max redemptions per user"
    )

    # === Requirements ===
    min_rank = models.ForeignKey(
        Rank,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        help_text="Minimum rank required"
    )
    required_badges = models.ManyToManyField(
        Badge,
        blank=True,
        help_text="Badges required to redeem"
    )

    # === Display ===
    display_order = models.IntegerField(default=0)
    is_featured = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Reward"
        verbose_name_plural = "Rewards"
        ordering = ['display_order', 'points_cost']

    def __str__(self):
        return f"{self.name} ({self.points_cost} pts)"


class RewardRedemption(models.Model):
    """
    Tracks reward redemptions by members.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reward_redemptions'
    )
    reward = models.ForeignKey(
        Reward,
        on_delete=models.CASCADE,
        related_name='redemptions'
    )

    # === Transaction ===
    points_spent = models.IntegerField()
    point_transaction = models.ForeignKey(
        PointTransaction,
        on_delete=models.SET_NULL,
        null=True
    )

    # === Status ===
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='pending'
    )

    # === Fulfillment ===
    fulfilled_at = models.DateTimeField(null=True, blank=True)
    fulfillment_notes = models.TextField(blank=True)

    # === Timestamps ===
    redeemed_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Reward Redemption"
        verbose_name_plural = "Reward Redemptions"
        ordering = ['-redeemed_at']

    def __str__(self):
        return f"{self.user.username} - {self.reward.name}"
```

### 12.5 Point Values Configuration

| Activity | Points | Category |
|----------|--------|----------|
| **Sales** | | |
| Complete a sale | 10 | sales |
| Sale above ₱1,000 | 25 | sales |
| Sale above ₱5,000 | 50 | sales |
| First sale of the day | 5 bonus | sales |
| **Training** | | |
| Complete ABC Day 1 | 50 | training |
| Complete ABC Day 2 | 50 | training |
| Complete ABC Day 3 | 100 | training |
| Complete full ABC | 100 bonus | training |
| Complete DBC | 200 | training |
| Watch training video | 5 | training |
| **Recruitment** | | |
| Recruit new member | 100 | recruitment |
| Recruit makes first sale | 50 bonus | recruitment |
| Recruit completes ABC | 50 bonus | recruitment |
| **Engagement** | | |
| Daily login | 5 | engagement |
| Update profile | 10 (once) | engagement |
| Share funnel link | 2 | engagement |
| Prospect opt-in | 5 | engagement |
| **Streaks** | | |
| 7-day login streak | 50 | streak |
| 14-day login streak | 100 | streak |
| 30-day login streak | 250 | streak |
| 7-day sales streak | 100 | streak |

### 12.6 Rank Progression

| Level | Name | Title | Points Required | eCash Bonus |
|-------|------|-------|-----------------|-------------|
| 1 | Starter | New Member | 0 | ₱0 |
| 2 | Bronze | Rising Star | 500 | ₱50 |
| 3 | Silver | Go-Getter | 2,000 | ₱100 |
| 4 | Gold | Achiever | 5,000 | ₱250 |
| 5 | Platinum | Leader | 10,000 | ₱500 |
| 6 | Diamond | Top Performer | 25,000 | ₱1,000 |
| 7 | Elite | Master | 50,000 | ₱2,500 |
| 8 | Legend | TWC Legend | 100,000 | ₱5,000 |

### 12.7 Badge Examples

| Badge | Category | Criteria | Rarity | Points |
|-------|----------|----------|--------|--------|
| **First Steps** | engagement | Complete profile | Common | 10 |
| **Quick Learner** | training | Complete ABC in 7 days | Uncommon | 50 |
| **Sales Rookie** | sales | First sale | Common | 25 |
| **Sales Pro** | sales | 10 sales | Uncommon | 100 |
| **Sales Master** | sales | 100 sales | Rare | 500 |
| **Team Builder** | recruitment | 5 recruits | Uncommon | 200 |
| **Dynasty Builder** | recruitment | 25 recruits | Epic | 1,000 |
| **On Fire** | streak | 30-day login streak | Rare | 300 |
| **Unstoppable** | streak | 7-day sales streak | Rare | 500 |
| **Early Bird** | special | Joined in first month | Legendary | 1,000 |

### 12.8 Sample Challenges

| Challenge | Duration | Goal | Reward |
|-----------|----------|------|--------|
| **New Month Kickstart** | 7 days | 5 sales | 500 points + badge |
| **Training Champion** | 14 days | Complete all ABC + DBC | 1,000 points + ₱200 eCash |
| **Recruitment Rally** | 30 days | 3 new recruits | 1,500 points + exclusive badge |
| **Flash Sale Friday** | 24 hours | 3 sales | 300 points |
| **Top Seller Challenge** | Monthly | Top 10 in sales | 2,500 points + feature |

### 12.9 Leaderboards

| Leaderboard | Period | Metric | Top 3 Rewards |
|-------------|--------|--------|---------------|
| **Points Leaders** | Weekly | Total points earned | 500/300/200 pts |
| **Points Leaders** | Monthly | Total points earned | 2,000/1,000/500 pts |
| **Sales Champions** | Weekly | Sales count | 750/400/200 pts |
| **Sales Champions** | Monthly | Sales amount | 3,000/1,500/750 pts |
| **Rising Stars** | Monthly | New recruits | 1,500/750/400 pts |
| **Training All-Stars** | Monthly | Training completion | 1,000/500/250 pts |

### 12.10 Rewards Store

| Reward | Points Cost | Type |
|--------|-------------|------|
| ₱50 eCash Credit | 500 | eCash |
| ₱100 eCash Credit | 900 | eCash |
| ₱500 eCash Credit | 4,000 | eCash |
| 10% Discount Code | 300 | Discount |
| Free Shipping Voucher | 200 | Perk |
| Premium Profile Badge | 1,000 | Badge |
| Early Access to Features | 2,500 | Perk |
| VIP Event Invitation | 5,000 | Perk |
| TWC Merchandise | 3,000 | Product |
| 1-on-1 Coaching Session | 10,000 | Perk |

### 12.11 Gamification Service

```python
# gamification/services.py

class GamificationService:
    """
    Central service for all gamification operations.
    """

    # === Point Configuration ===
    POINT_VALUES = {
        'sale_complete': 10,
        'sale_above_1000': 25,
        'sale_above_5000': 50,
        'first_sale_of_day': 5,
        'abc_day1': 50,
        'abc_day2': 50,
        'abc_day3': 100,
        'abc_complete_bonus': 100,
        'dbc_complete': 200,
        'training_video': 5,
        'recruit_new': 100,
        'recruit_first_sale': 50,
        'recruit_abc_complete': 50,
        'daily_login': 5,
        'profile_complete': 10,
        'funnel_share': 2,
        'prospect_optin': 5,
    }

    @classmethod
    def award_points(cls, user, event_type, amount=None, reference=None, description=None):
        """
        Award points to user for an activity.
        """
        points = amount or cls.POINT_VALUES.get(event_type, 0)
        if points == 0:
            return None

        member_points, _ = MemberPoints.objects.get_or_create(user=user)

        # Apply rank multiplier
        if hasattr(user, 'gamification_rank'):
            multiplier = user.gamification_rank.current_rank.point_multiplier
            points = int(points * float(multiplier))

        category = cls._get_category(event_type)
        desc = description or cls._get_description(event_type)

        transaction = member_points.add_points(
            points=points,
            category=category,
            description=desc,
            reference=reference
        )

        # Check for badge unlocks
        cls.check_badge_unlocks(user, event_type)

        # Check for rank up
        cls.check_rank_up(user)

        # Update streaks if applicable
        cls.update_streaks(user, event_type)

        # Update challenge progress
        cls.update_challenge_progress(user, event_type)

        return transaction

    @classmethod
    def check_badge_unlocks(cls, user, event_type=None):
        """
        Check if user qualifies for any new badges.
        """
        earned_badge_ids = user.earned_badges.values_list('badge_id', flat=True)
        available_badges = Badge.objects.filter(
            is_active=True
        ).exclude(id__in=earned_badge_ids)

        for badge in available_badges:
            if cls._check_badge_criteria(user, badge):
                cls._award_badge(user, badge)

    @classmethod
    def _award_badge(cls, user, badge):
        """
        Award a badge to user.
        """
        member_badge = MemberBadge.objects.create(
            user=user,
            badge=badge
        )

        # Award badge points
        if badge.points_reward > 0:
            member_points = user.gamification_points
            member_points.add_points(
                points=badge.points_reward,
                category='badge',
                description=f"Badge earned: {badge.name}",
                reference=member_badge
            )

        # Send notification
        from notifications.services import NotificationService
        NotificationService.send_from_template(
            user=user,
            template_slug='badge_earned',
            context={
                'badge_name': badge.name,
                'badge_icon': badge.icon,
                'points': badge.points_reward
            }
        )

        return member_badge

    @classmethod
    def check_rank_up(cls, user):
        """
        Check if user qualifies for rank promotion.
        """
        if not hasattr(user, 'gamification_rank'):
            # Initialize at rank 1
            first_rank = Rank.objects.filter(level=1).first()
            if first_rank:
                MemberRank.objects.create(user=user, current_rank=first_rank)
            return

        member_rank = user.gamification_rank
        new_rank = member_rank.check_rank_up()

        if new_rank:
            old_rank, new_rank = member_rank.promote_to(new_rank)

            # Send notification
            from notifications.services import NotificationService
            NotificationService.send_from_template(
                user=user,
                template_slug='rank_up',
                context={
                    'old_rank': old_rank.name,
                    'new_rank': new_rank.name,
                    'ecash_bonus': new_rank.ecash_bonus
                },
                send_sms=True
            )

    @classmethod
    def update_streaks(cls, user, event_type):
        """
        Update relevant streaks based on activity.
        """
        streak_mapping = {
            'daily_login': 'login',
            'sale_complete': 'sale',
            'abc_day1': 'training',
            'abc_day2': 'training',
            'abc_day3': 'training',
            'dbc_complete': 'training',
            'training_video': 'training',
        }

        streak_type = streak_mapping.get(event_type)
        if not streak_type:
            return

        streak, _ = Streak.objects.get_or_create(
            user=user,
            streak_type=streak_type
        )

        bonus_points = streak.record_activity()

        if bonus_points > 0:
            member_points = user.gamification_points
            member_points.add_points(
                points=bonus_points,
                category='streak',
                description=f"{streak.current_count}-day {streak_type} streak!",
                reference=streak
            )

            # Send milestone notification
            from notifications.services import NotificationService
            NotificationService.send_from_template(
                user=user,
                template_slug='streak_milestone',
                context={
                    'streak_type': streak_type,
                    'days': streak.current_count,
                    'points': bonus_points
                }
            )

    @classmethod
    def update_challenge_progress(cls, user, event_type):
        """
        Update progress for active challenges.
        """
        active_participations = ChallengeParticipation.objects.filter(
            user=user,
            status='active',
            challenge__is_active=True,
            challenge__start_date__lte=timezone.now(),
            challenge__end_date__gte=timezone.now()
        )

        for participation in active_participations:
            challenge = participation.challenge
            if cls._matches_challenge_goal(event_type, challenge.goal_type):
                new_progress = participation.current_progress + 1
                participation.update_progress(new_progress)

                if participation.status == 'completed':
                    cls._complete_challenge(participation)

    @classmethod
    def _complete_challenge(cls, participation):
        """
        Handle challenge completion.
        """
        challenge = participation.challenge
        user = participation.user

        # Award points
        if challenge.points_reward > 0:
            member_points = user.gamification_points
            member_points.add_points(
                points=challenge.points_reward,
                category='challenge',
                description=f"Challenge completed: {challenge.name}",
                reference=participation
            )

        # Award eCash
        if challenge.ecash_reward > 0:
            from ecash.services import ECashService
            ECashService.credit_user(
                user=user,
                amount=challenge.ecash_reward,
                description=f"Challenge reward: {challenge.name}",
                e_type='challenge_reward'
            )

        # Award badge
        if challenge.badge_reward:
            cls._award_badge(user, challenge.badge_reward)

        participation.rewards_claimed = True
        participation.rewards_claimed_at = timezone.now()
        participation.save()

        # Send notification
        from notifications.services import NotificationService
        NotificationService.send_from_template(
            user=user,
            template_slug='challenge_completed',
            context={
                'challenge_name': challenge.name,
                'points': challenge.points_reward,
                'ecash': challenge.ecash_reward
            },
            send_sms=True
        )

    @classmethod
    def get_leaderboard(cls, leaderboard_slug, limit=100):
        """
        Get current leaderboard rankings.
        """
        leaderboard = Leaderboard.objects.get(slug=leaderboard_slug)

        entries = LeaderboardEntry.objects.filter(
            leaderboard=leaderboard
        ).select_related('user')[:limit]

        return entries

    @classmethod
    def calculate_leaderboards(cls):
        """
        Recalculate all leaderboard rankings.
        Called daily via Celery task.
        """
        # Implementation depends on leaderboard type
        # Aggregate points/sales/recruits and update LeaderboardEntry
        pass

    # === Helper Methods ===

    @classmethod
    def _get_category(cls, event_type):
        """Map event type to category."""
        mapping = {
            'sale_': 'sales',
            'abc_': 'training',
            'dbc_': 'training',
            'training_': 'training',
            'recruit_': 'recruitment',
            'daily_': 'engagement',
            'profile_': 'engagement',
            'funnel_': 'engagement',
            'prospect_': 'engagement',
        }
        for prefix, category in mapping.items():
            if event_type.startswith(prefix):
                return category
        return 'engagement'

    @classmethod
    def _get_description(cls, event_type):
        """Get human-readable description for event type."""
        descriptions = {
            'sale_complete': 'Completed a sale',
            'sale_above_1000': 'Sale above ₱1,000',
            'daily_login': 'Daily login bonus',
            'abc_day1': 'Completed ABC Day 1',
            # ... etc
        }
        return descriptions.get(event_type, event_type.replace('_', ' ').title())

    @classmethod
    def _check_badge_criteria(cls, user, badge):
        """Check if user meets badge criteria."""
        # Implementation varies by criteria_type
        criteria = badge.criteria_type
        value = badge.criteria_value

        if criteria == 'sales_count':
            return user.gamification_points.points_from_sales >= value * 10
        elif criteria == 'training_complete':
            return user.livetrainings.abc_certificate_done
        elif criteria == 'recruits_count':
            return user.teammember_set.count() >= value
        # ... more criteria types

        return False

    @classmethod
    def _matches_challenge_goal(cls, event_type, goal_type):
        """Check if event contributes to challenge goal."""
        mapping = {
            'sales_count': ['sale_complete', 'sale_above_1000', 'sale_above_5000'],
            'training_complete': ['abc_day1', 'abc_day2', 'abc_day3', 'dbc_complete'],
            'recruits': ['recruit_new'],
        }
        return event_type in mapping.get(goal_type, [])
```

### 12.12 Dashboard UI - Gamification

**Member Profile Gamification Section:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🎮 MY GAMIFICATION STATS                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │  ⭐ 2,450 Points    │  │  🏆 Level 4: Gold   │               │
│  │  +350 this week     │  │  Progress: 65%      │               │
│  │  [Redeem Points]    │  │  ████████░░ 3,250   │               │
│  └─────────────────────┘  └─────────────────────┘               │
│                                                                  │
│  🔥 STREAKS                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Login: 12 days 🔥  │  Sales: 3 days   │  Training: 5 days│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  🏅 RECENT BADGES                                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [🌟] Sales Pro  │ [📚] Quick Learner │ [🔥] On Fire    │   │
│  │     + 3 more    │                    │                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  📊 LEADERBOARD RANKING                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Weekly Points: #15 (↑3)  │  Monthly Sales: #8 (↓1)      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Leaderboard Page:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📊 LEADERBOARDS           [Daily] [Weekly] [Monthly] [All]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🏆 TOP EARNERS THIS WEEK                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ #  │ Member          │ Points │ Change │                 │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ 🥇 │ Ana Reyes       │ 1,250  │  ↑2    │ ████████████   │   │
│  │ 🥈 │ Jose Lopez      │ 1,100  │  ↑1    │ ██████████     │   │
│  │ 🥉 │ Maria Santos    │   980  │  ↓1    │ █████████      │   │
│  │ 4  │ Pedro Garcia    │   850  │  ─     │ ████████       │   │
│  │ 5  │ Rosa Martinez   │   720  │  ↑3    │ ███████        │   │
│  │ ...                                                      │   │
│  │ 15 │ YOU             │   450  │  ↑3    │ ████           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  💰 TOP SELLERS  │  👥 TOP RECRUITERS  │  📚 TRAINING CHAMPS   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 12.13 Implementation Additions

Add to the existing roadmap:

**Phase 5b: Gamification (Weeks 6-7)**
- [ ] Create `gamification` app with all models
- [ ] Implement `GamificationService` class
- [ ] Create Django signals for point awarding
- [ ] Implement streak tracking
- [ ] Build badge unlock system
- [ ] Create Celery tasks for leaderboard calculation
- [ ] Build rewards store API

**Phase 6b: Gamification UI (Week 8)**
- [ ] Member gamification profile section
- [ ] Leaderboard pages
- [ ] Badge showcase
- [ ] Rewards store
- [ ] Challenge participation UI

### 12.14 Gamification Migration Checklist

1. **Initial Setup**
   - Create all gamification models
   - Seed Rank data (levels 1-8)
   - Seed initial Badge definitions
   - Create default Leaderboard configurations

2. **Backfill Existing Users**
   - Calculate lifetime points from ECashEntry
   - Award badges based on existing achievements
   - Determine initial ranks
   - Set up initial streaks

3. **Testing**
   - Unit tests for point calculations
   - Integration tests for badge unlocks
   - Load test leaderboard queries

---

*Document Version: 1.1*
*Last Updated: 2026-02-14*
*Added: Gamification System (Section 12)*

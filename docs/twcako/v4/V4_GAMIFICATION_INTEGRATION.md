# TWCako V4 Gamification Integration
## Integrating with Existing TWC Rewards System

**Created:** 2026-02-15
**Status:** Superseded

> **⚠️ IMPORTANT NOTE:**
> This document was an early planning doc exploring integration with TWC Rewards (for Distributors).
>
> **Final Decision:** Gamification will be a SEPARATE system for **Sellers/Affiliates ONLY**.
> Distributors already have TWC Rewards and don't need gamification.
>
> **See:** `V4_GAMIFICATION_SELLERS_PLAN.md` for the final gamification design.
>
> This document is kept for reference on technical integration patterns only.

---

## Executive Summary

TWCako already has a robust rewards system (`twc_reward` app) that:
- Tracks milestone-based rewards (Sponsoring Bonus, Builder Moneyback, etc.)
- Integrates tightly with eCash for financial rewards
- Monitors user progress via `TWCRewardMonitoring`

Our new gamification system should **complement** this existing infrastructure, not replace it.

---

## Existing TWC Rewards Structure

### Current Models

```
TWCRewardClaims
├── user (FK)
├── program (choices: distributor_moneyback, builder_moneyback, etc.)
├── description
├── is_claimed
├── claim_date
└── timestamp

TWCRewardMonitoring (OneToOne with User)
├── rankup_start_date
├── rankup_seller_counter
├── rankup_max_seller
└── distributor_counter (resets monthly)
```

### Current Reward Programs

| Program | Type | Threshold | Reward |
|---------|------|-----------|--------|
| Sponsoring Bonus | Recruitment | 10/20/30 distributors | ₱2K/4K/10K eCash |
| Builder Moneyback | Sales | 30/60/100/150 sellers | ₱6K/6K/8K/10K eCash |
| RankUp Bonus | Sales | Seller milestones | eCash |
| Techno Gadget Promo | Sales | 50/100 sellers | Gadget |
| Travel Incentive | Sales | High performers | Travel package |
| Leaders Assembly | Earnings | Top 25 earners | Event qualification |

### eCash Integration

All rewards flow through eCash:
```python
# Existing flow in finance/views/ecash.py
TWCRewardClaims.objects.create(user=user, program='sponsoring_bonus')
create_sponsoring_bonus_ecash(user, amount)  # Creates ECash entries
```

---

## Integration Strategy

### Principle: Complement, Don't Replace

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER ACTIVITY                                │
│  (Login, Sale, Training, Recruitment, Funnel Activity)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌───────────────────┐                    ┌───────────────────┐
│   GAMIFICATION    │                    │   TWC REWARDS     │
│   (Engagement)    │                    │   (Financial)     │
├───────────────────┤                    ├───────────────────┤
│ • Points          │                    │ • Sponsoring Bonus│
│ • Badges          │                    │ • Builder Moneyback│
│ • Streaks         │                    │ • RankUp Bonus    │
│ • Leaderboards    │                    │ • Travel Incentive│
│ • Challenges      │                    │ • Techno Gadget   │
└─────────┬─────────┘                    └─────────┬─────────┘
          │                                        │
          │    Points can convert to eCash         │
          └────────────────┬───────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │     eCASH       │
                  │   (Unified)     │
                  └─────────────────┘
```

---

## New Models (Extend twc_reward app)

### Option 1: Extend TWCRewardMonitoring (Recommended)

Add gamification fields to existing model:

```python
# twc_reward/models.py - EXTENDED

class TWCRewardMonitoring(models.Model):
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE)

    # === EXISTING FIELDS (Keep as-is) ===
    rankup_start_date = models.DateTimeField(null=True, blank=True)
    rankup_seller_counter = models.IntegerField(default=0)
    rankup_max_seller = models.IntegerField(default=20)
    distributor_counter = models.IntegerField(default=0)

    # === NEW GAMIFICATION FIELDS ===

    # Points
    points_balance = models.IntegerField(default=0)
    points_lifetime = models.IntegerField(default=0)
    points_this_month = models.IntegerField(default=0)

    # Rank (1-8: Starter to Legend)
    rank_level = models.IntegerField(default=1)
    rank_points_progress = models.IntegerField(default=0)

    # Streaks
    login_streak_current = models.IntegerField(default=0)
    login_streak_best = models.IntegerField(default=0)
    login_streak_last_date = models.DateField(null=True, blank=True)

    sales_streak_current = models.IntegerField(default=0)
    sales_streak_best = models.IntegerField(default=0)
    sales_streak_last_date = models.DateField(null=True, blank=True)

    # Engagement
    engagement_score = models.IntegerField(default=0)  # 0-100
    last_activity_date = models.DateTimeField(null=True, blank=True)

    # Timestamps
    gamification_updated = models.DateTimeField(auto_now=True)
```

### Option 2: Create Separate Model (Alternative)

```python
# twc_reward/models.py - NEW MODEL

class TWCGamification(models.Model):
    """
    Gamification layer that works alongside TWCRewardMonitoring.
    Handles engagement points, badges, streaks, and leaderboards.
    """
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE)
    monitoring = models.OneToOneField(
        TWCRewardMonitoring,
        on_delete=models.CASCADE,
        null=True, blank=True
    )

    # Points
    points_balance = models.IntegerField(default=0)
    points_lifetime = models.IntegerField(default=0)
    points_spent = models.IntegerField(default=0)
    points_this_month = models.IntegerField(default=0)

    # Breakdown by category
    points_from_sales = models.IntegerField(default=0)
    points_from_training = models.IntegerField(default=0)
    points_from_recruitment = models.IntegerField(default=0)
    points_from_engagement = models.IntegerField(default=0)
    points_from_streaks = models.IntegerField(default=0)
    points_from_challenges = models.IntegerField(default=0)

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

    training_streak = models.IntegerField(default=0)
    training_last_date = models.DateField(null=True)

    # Engagement
    engagement_score = models.IntegerField(default=0)
    last_activity = models.DateTimeField(null=True)

    # Badges (separate model for many-to-many)
    # See TWCBadgeEarned below

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

---

## New Supporting Models

### TWCRank (Rank Definitions)

```python
class TWCRank(models.Model):
    """Rank level definitions"""
    level = models.IntegerField(unique=True)  # 1-8
    name = models.CharField(max_length=50)     # Starter, Bronze, etc.
    title = models.CharField(max_length=100)   # Display title

    points_required = models.IntegerField()
    point_multiplier = models.DecimalField(max_digits=3, decimal_places=2, default=1.00)

    ecash_bonus = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    perks_description = models.TextField(blank=True)

    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=20, default='#808080')

    class Meta:
        ordering = ['level']
```

**Seed Data:**

| Level | Name | Points Required | eCash Bonus | Multiplier |
|-------|------|-----------------|-------------|------------|
| 1 | Starter | 0 | ₱0 | 1.00x |
| 2 | Bronze | 500 | ₱50 | 1.05x |
| 3 | Silver | 2,000 | ₱100 | 1.10x |
| 4 | Gold | 5,000 | ₱250 | 1.15x |
| 5 | Platinum | 10,000 | ₱500 | 1.20x |
| 6 | Diamond | 25,000 | ₱1,000 | 1.25x |
| 7 | Elite | 50,000 | ₱2,500 | 1.30x |
| 8 | Legend | 100,000 | ₱5,000 | 1.50x |

### TWCBadge (Badge Definitions)

```python
class TWCBadge(models.Model):
    """Badge definitions"""
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()

    RARITY_CHOICES = [
        ('common', 'Common'),
        ('uncommon', 'Uncommon'),
        ('rare', 'Rare'),
        ('epic', 'Epic'),
        ('legendary', 'Legendary'),
    ]
    rarity = models.CharField(max_length=15, choices=RARITY_CHOICES)

    CATEGORY_CHOICES = [
        ('sales', 'Sales'),
        ('training', 'Training'),
        ('recruitment', 'Recruitment'),
        ('engagement', 'Engagement'),
        ('special', 'Special'),
    ]
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)

    # Unlock criteria
    criteria_type = models.CharField(max_length=50)
    criteria_value = models.IntegerField(default=1)

    # Rewards
    points_reward = models.IntegerField(default=0)

    # Visual
    icon = models.CharField(max_length=50)
    color = models.CharField(max_length=20, default='#FFD700')
    image = models.ImageField(upload_to='badges/', null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_secret = models.BooleanField(default=False)

    class Meta:
        ordering = ['category', 'rarity']
```

### TWCBadgeEarned (User's Badges)

```python
class TWCBadgeEarned(models.Model):
    """Tracks which badges users have earned"""
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='badges_earned')
    badge = models.ForeignKey(TWCBadge, on_delete=models.CASCADE)

    earned_at = models.DateTimeField(auto_now_add=True)
    earned_reason = models.CharField(max_length=255, blank=True)

    is_featured = models.BooleanField(default=False)  # Show on profile
    is_notified = models.BooleanField(default=False)  # User notified

    class Meta:
        unique_together = ['user', 'badge']
        ordering = ['-earned_at']
```

### TWCPointTransaction (Points Audit Trail)

```python
class TWCPointTransaction(models.Model):
    """Audit trail for all point transactions"""
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)

    TRANSACTION_TYPES = [
        ('earn', 'Earned'),
        ('spend', 'Spent'),
        ('convert', 'Converted to eCash'),
        ('bonus', 'Bonus'),
        ('adjust', 'Adjustment'),
    ]
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)

    CATEGORIES = [
        ('sales', 'Sales Activity'),
        ('training', 'Training'),
        ('recruitment', 'Recruitment'),
        ('engagement', 'Engagement'),
        ('streak', 'Streak Bonus'),
        ('challenge', 'Challenge'),
        ('redemption', 'Redemption'),
        ('rank_up', 'Rank Up Bonus'),
    ]
    category = models.CharField(max_length=20, choices=CATEGORIES)

    points = models.IntegerField()  # Positive for earn, negative for spend
    balance_after = models.IntegerField()
    description = models.CharField(max_length=255)

    # Link to related TWC Reward if applicable
    twc_reward_claim = models.ForeignKey(
        'TWCRewardClaims',
        null=True, blank=True,
        on_delete=models.SET_NULL
    )

    # Link to eCash if converted
    ecash_entry = models.ForeignKey(
        'ecash.ECash',
        null=True, blank=True,
        on_delete=models.SET_NULL
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
```

---

## Point-to-eCash Conversion

### Conversion Rate

| Points | eCash Value | Discount |
|--------|-------------|----------|
| 500 | ₱50 | - |
| 900 | ₱100 | 10% bonus |
| 4,000 | ₱500 | 20% bonus |

### Conversion Flow

```python
def convert_points_to_ecash(user, points):
    """
    Convert gamification points to eCash.
    Integrates with existing TWC Rewards flow.
    """
    # 1. Validate points balance
    gamification = user.twcgamification
    if gamification.points_balance < points:
        raise InsufficientPoints()

    # 2. Calculate eCash value
    ecash_value = calculate_ecash_value(points)

    # 3. Create TWCRewardClaims (integrates with existing system)
    claim = TWCRewardClaims.objects.create(
        user=user,
        program='points_redemption',  # New program type
        description=f'Redeemed {points} points for ₱{ecash_value}',
        is_claimed=True,
        claim_date=timezone.now()
    )

    # 4. Create eCash entry (uses existing function)
    from finance.views.ecash import create_points_redemption_ecash
    create_points_redemption_ecash(user, ecash_value, claim)

    # 5. Deduct points
    gamification.points_balance -= points
    gamification.save()

    # 6. Log transaction
    TWCPointTransaction.objects.create(
        user=user,
        transaction_type='convert',
        category='redemption',
        points=-points,
        balance_after=gamification.points_balance,
        description=f'Converted to ₱{ecash_value} eCash',
        twc_reward_claim=claim
    )

    return claim
```

---

## Integration with Existing Programs

### Sponsoring Bonus → Points

When user earns Sponsoring Bonus, also award points:

```python
# Extend existing sponsoring bonus logic
def award_sponsoring_bonus(user, distributor_count):
    # Existing eCash logic (keep as-is)
    if distributor_count >= 10:
        create_sponsoring_bonus_ecash(user, 2000)

    # NEW: Also award gamification points
    if distributor_count >= 10:
        award_points(user, 500, 'recruitment', 'Recruited 10 distributors')
    if distributor_count >= 20:
        award_points(user, 750, 'recruitment', 'Recruited 20 distributors')
    if distributor_count >= 30:
        award_points(user, 1000, 'recruitment', 'Recruited 30 distributors')
        unlock_badge(user, 'master_recruiter')
```

### Builder Moneyback → Points + Badge

```python
def award_builder_moneyback(user, seller_count):
    # Existing eCash logic (keep as-is)
    create_builder_moneyback_reward_ecash(user, seller_count)

    # NEW: Also award gamification
    points = {30: 300, 60: 500, 100: 750, 150: 1000}
    badges = {30: 'sales_starter', 100: 'sales_pro', 150: 'sales_master'}

    if seller_count in points:
        award_points(user, points[seller_count], 'sales', f'{seller_count} sellers milestone')

    if seller_count in badges:
        unlock_badge(user, badges[seller_count])
```

---

## Unified Leaderboards

Combine TWC Rewards earnings with Gamification points:

### Leaders Assembly Enhancement

```python
def get_leaders_assembly_rankings():
    """
    Enhanced leaderboard combining:
    - TWC Rewards earnings (existing)
    - Gamification points (new)
    """
    return User.objects.annotate(
        # Existing eCash earnings
        total_ecash=Sum('ecash__amount', filter=Q(
            ecash__e_type__in=[
                'affiliate_commission',
                'rank_up_bonus',
                'twc_reward',
                'sales_profit'
            ]
        )),
        # New gamification points
        total_points=F('twcgamification__points_lifetime'),
        # Combined score
        combined_score=F('total_ecash') + (F('total_points') * 0.1)  # Weighted
    ).order_by('-combined_score')[:25]
```

---

## Migration Plan

### Phase 1: Extend Models (Week 7)
1. Add gamification fields to `TWCRewardMonitoring` OR create `TWCGamification`
2. Create `TWCRank`, `TWCBadge`, `TWCBadgeEarned`, `TWCPointTransaction`
3. Run migrations

### Phase 2: Seed Data (Week 7)
1. Create rank definitions (8 ranks)
2. Create badge definitions (20+ badges)
3. Backfill existing users with starting points based on activity

### Phase 3: Integration (Week 8)
1. Add point awarding to existing reward functions
2. Connect badge unlocking to milestone achievements
3. Test integration with existing programs

### Phase 4: UI (Week 9-10)
1. Add gamification section to dashboard
2. Create leaderboard pages
3. Add badge showcase
4. Create rewards store (point redemption)

---

## Benefits of Integration

| Benefit | Description |
|---------|-------------|
| **Unified Experience** | Single rewards ecosystem for users |
| **Leverages Existing Code** | Uses proven eCash integration |
| **Incremental Engagement** | Points for small actions, eCash for big milestones |
| **Clear Value** | Points convert to real eCash |
| **Reduced Complexity** | One `twc_reward` app, not separate systems |

---

## Updated PROGRAM_CHOICES

Add to existing choices:

```python
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

    # NEW - Gamification
    ('points_redemption', 'Points Redemption'),
    ('rank_up_reward', 'Rank Up Reward'),
    ('badge_reward', 'Badge Reward'),
    ('challenge_reward', 'Challenge Reward'),
    ('streak_bonus', 'Streak Bonus'),
    ('leaderboard_reward', 'Leaderboard Reward'),
)
```

---

## Summary

Instead of building a separate gamification system, we:

1. **Extend** `twc_reward` app with new models
2. **Integrate** point awarding into existing reward functions
3. **Connect** to eCash for real value
4. **Leverage** existing infrastructure (monitoring, claims, eCash)

This approach:
- Reduces development time
- Maintains data consistency
- Provides unified user experience
- Leverages proven code

---

*Document Version: 1.0*
*Created: 2026-02-15*

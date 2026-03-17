# TWCako V1 (Fresh Start) Migration Strategy
## User & Data Migration Process

**Version:** 1.0
**Date:** 2026-02-15
**Author:** CTO Planning Session
**Status:** Draft - Requires Team Discussion

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Migration Philosophy](#2-migration-philosophy)
3. [First-Time Login Migration Flow](#3-first-time-login-migration-flow)
4. [Data Migration Decisions](#4-data-migration-decisions)
5. [Technical Implementation](#5-technical-implementation)
6. [Database Design](#6-database-design)
7. [Migration API Endpoints](#7-migration-api-endpoints)
8. [UI/UX Flow](#8-uiux-flow)
9. [Rollout Strategy](#9-rollout-strategy)
10. [Risk Mitigation](#10-risk-mitigation)

---

## 1. Executive Summary

### The Situation

We are creating a fundamentally new company/platform that builds on TWCako V3. Instead of calling it "V4", we're treating this as a fresh start - **V1 of the new platform**.

### The Challenge

- We have existing users with valuable data (eCash balances, team structures, history)
- We want them to feel like they're starting fresh with the new company
- We need to migrate their essential data without losing value
- Some historical data may not need to carry forward

### The Solution: First-Time Login Migration

When existing users log in for the first time on the new platform:
1. System detects they have legacy data
2. They go through a "Welcome to [New Company]" onboarding flow
3. Their essential data is migrated during this process
4. They start fresh with a new profile while retaining valuable assets

---

## 2. Migration Philosophy

### Treat as New Registration + Asset Transfer

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MIGRATION PHILOSOPHY                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  FRESH START                        RETAINED VALUE                       │
│  ────────────                       ──────────────                       │
│  • New company identity             • eCash balance                      │
│  • New dashboard/UI                 • Team structure (sponsor/downline)  │
│  • New profile setup                • Rank/Membership type               │
│  • Clean activity history           • Training certifications            │
│  • New gamification stats           • (Optional) Order history           │
│                                                                          │
│  RESET/NOT CARRIED                  DECISIONS NEEDED                     │
│  ─────────────────                  ────────────────                     │
│  • Old engagement scores            • Prospect/Lead history              │
│  • Old lifecycle stages             • Funnel visitor stats               │
│  • Old notification preferences     • Historical commission data         │
│  • Old login history                • Supplier relationships             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Principles

1. **Preserve Value** - Never lose money (eCash) or relationships (team)
2. **Fresh Experience** - Everything feels new, not upgraded
3. **User Choice** - Let users confirm what they want to bring
4. **Clean Slate Option** - Allow users to start completely fresh if preferred
5. **Transparent Process** - Clear communication about what's happening

---

## 3. First-Time Login Migration Flow

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FIRST-TIME LOGIN FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

     User enters credentials (same username/password)
                         │
                         ▼
     ┌──────────────────────────────────────┐
     │  System checks: is_migrated = False? │
     └────────────────┬─────────────────────┘
                      │
           ┌──────────┴──────────┐
           │                     │
      is_migrated=True      is_migrated=False
           │                     │
           ▼                     ▼
    ┌──────────────┐    ┌───────────────────┐
    │ Normal Login │    │ MIGRATION WIZARD  │
    │  Dashboard   │    │                   │
    └──────────────┘    └─────────┬─────────┘
                                  │
                                  ▼
                        ┌─────────────────────────┐
                        │ Step 1: Welcome Screen  │
                        │ "Welcome to [NewCo]!"   │
                        │ Explain what's changing │
                        └───────────┬─────────────┘
                                    │
                                    ▼
                        ┌─────────────────────────┐
                        │ Step 2: Review Profile  │
                        │ Update name, email,     │
                        │ mobile, profile pic     │
                        └───────────┬─────────────┘
                                    │
                                    ▼
                        ┌─────────────────────────┐
                        │ Step 3: Review Assets   │
                        │ Show eCash balance      │
                        │ Show team structure     │
                        │ Show rank/membership    │
                        └───────────┬─────────────┘
                                    │
                                    ▼
                        ┌─────────────────────────┐
                        │ Step 4: Data Transfer   │
                        │ Choose what to migrate: │
                        │ ☑ eCash (required)      │
                        │ ☑ Team (required)       │
                        │ ☐ Prospect history      │
                        │ ☐ Order history         │
                        └───────────┬─────────────┘
                                    │
                                    ▼
                        ┌─────────────────────────┐
                        │ Step 5: Accept Terms    │
                        │ New T&C for new company │
                        │ Privacy policy          │
                        │ Data consent            │
                        └───────────┬─────────────┘
                                    │
                                    ▼
                        ┌─────────────────────────┐
                        │ Step 6: Confirmation    │
                        │ "Welcome aboard!"       │
                        │ Show what was migrated  │
                        │ Start new journey       │
                        └───────────┬─────────────┘
                                    │
                                    ▼
                        ┌─────────────────────────┐
                        │ Set is_migrated = True  │
                        │ Redirect to Dashboard   │
                        └─────────────────────────┘
```

---

## 4. Data Migration Decisions

### 4.1 MUST Migrate (Critical Assets)

| Data Type | Reason | Migration Method |
|-----------|--------|------------------|
| **eCash Balance** | This is real money | Copy current balance to new ECash record |
| **Team Structure** | Sponsor/downline relationships are core to MLM | Preserve TeamMember links |
| **Rank/Membership Type** | Earned status must be honored | Copy rank field |
| **Training Certifications** | ABC/DBC completion is an achievement | Copy certification flags |
| **Username** | Identity continuity | Same username |
| **Basic Profile** | Name, email, mobile | Copy (user can update) |

### 4.2 SHOULD Migrate (Business Context)

| Data Type | Pros | Cons | Recommendation |
|-----------|------|------|----------------|
| **Order History** | Reference for disputes, trust | Large data, old records irrelevant | Migrate last 12 months only |
| **Commission History** | Proof of earnings | Very large dataset | Migrate summary only (totals) |
| **Bank/Payment Methods** | Convenience | Security concern | Ask user to re-enter |

### 4.3 DECISION NEEDED - Prospects/Leads History

This requires team discussion. Options:

**Option A: Do NOT Migrate**
- Fresh start philosophy
- Old prospects may be stale
- Users build new pipeline
- Cleaner database

**Option B: Migrate All**
- Users don't lose potential sales
- Historical context preserved
- May have compliance value

**Option C: User's Choice**
- Ask during migration wizard
- Let user decide what's valuable
- More complexity in UI

**Recommendation:** Option C (User's Choice) with default to NOT migrate

### 4.4 DO NOT Migrate (Clean Slate)

| Data Type | Reason |
|-----------|--------|
| Old engagement scores | Start fresh with new scoring |
| Old lifecycle stages | Everyone starts as "new" |
| Old notification preferences | New notification system |
| Old login history | Fresh activity log |
| Old gamification (if any) | New gamification system |
| Device tokens | Need new FCM registration |

---

## 5. Technical Implementation

### 5.1 New Models Required

#### LegacyUserMapping

Links old V3 user to new V1 user record.

```python
class LegacyUserMapping(models.Model):
    """
    Maps legacy TWCako V3 users to new V1 users.
    Created during first-time login migration.
    """
    # New V1 user
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='legacy_mapping'
    )

    # Legacy V3 identifier
    legacy_user_id = models.PositiveIntegerField(
        db_index=True,
        unique=True,
        help_text="User ID from V3 database"
    )
    legacy_username = models.CharField(
        max_length=150,
        db_index=True
    )

    # Migration tracking
    migration_date = models.DateTimeField(auto_now_add=True)
    migration_version = models.CharField(
        max_length=20,
        default="1.0"
    )

    # What was migrated
    ecash_migrated = models.BooleanField(default=False)
    ecash_amount_migrated = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    team_migrated = models.BooleanField(default=False)
    team_size_at_migration = models.PositiveIntegerField(default=0)

    prospects_migrated = models.BooleanField(default=False)
    prospects_count_migrated = models.PositiveIntegerField(default=0)

    orders_migrated = models.BooleanField(default=False)
    orders_count_migrated = models.PositiveIntegerField(default=0)

    # Legacy data snapshot (JSON) for reference
    legacy_profile_snapshot = models.JSONField(
        null=True,
        blank=True,
        help_text="Snapshot of V3 profile at migration time"
    )

    # Migration choices made by user
    user_choices = models.JSONField(
        default=dict,
        help_text="Choices made during migration wizard"
    )

    class Meta:
        verbose_name = "Legacy User Mapping"
        verbose_name_plural = "Legacy User Mappings"
        indexes = [
            models.Index(fields=['legacy_user_id']),
            models.Index(fields=['migration_date']),
        ]
```

#### MigrationECashTransfer

Records the eCash balance transfer from V3 to V1.

```python
class MigrationECashTransfer(models.Model):
    """
    Audit record for eCash migration from V3 to V1.
    This is separate from regular ECashEntry for clarity.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='migration_ecash_transfers'
    )

    # V3 balance snapshot
    v3_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Balance in V3 at migration time"
    )

    # V1 opening balance (should match)
    v1_opening_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Opening balance in V1"
    )

    # Transfer details
    transfer_date = models.DateTimeField(auto_now_add=True)
    verified_by = models.CharField(
        max_length=100,
        default="system",
        help_text="Who verified the transfer"
    )

    # V3 ECash account reference
    v3_ecash_id = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    # Audit notes
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "Migration eCash Transfer"
        verbose_name_plural = "Migration eCash Transfers"
```

### 5.2 User Model Additions

Add these fields to the User model:

```python
# Add to User model
is_migrated = models.BooleanField(
    default=False,
    help_text="True if user completed V3→V1 migration"
)
migration_completed_at = models.DateTimeField(
    null=True,
    blank=True,
    help_text="When migration was completed"
)
is_legacy_user = models.BooleanField(
    default=False,
    help_text="True if this user existed in V3"
)
```

### 5.3 Migration Service

```python
# migration/services.py

class UserMigrationService:
    """
    Handles the migration of a V3 user to V1.
    """

    def __init__(self, legacy_user_id: int):
        self.legacy_user_id = legacy_user_id
        self.v3_user = None
        self.v1_user = None

    def start_migration(self):
        """
        Step 1: Load V3 user data and prepare for migration.
        Returns data for the migration wizard UI.
        """
        self.v3_user = self._load_v3_user()

        return {
            'profile': {
                'username': self.v3_user.username,
                'first_name': self.v3_user.first_name,
                'last_name': self.v3_user.last_name,
                'email': self.v3_user.email,
                'mobile': self.v3_user.mobile,
                'membership_type': self.v3_user.membership_type,
                'is_diamond': self.v3_user.is_diamond,
            },
            'assets': {
                'ecash_balance': self._get_ecash_balance(),
                'team_size': self._get_team_size(),
                'direct_downlines': self._get_direct_downlines_count(),
                'sponsor': self._get_sponsor_info(),
            },
            'training': {
                'abc_completed': self._get_abc_status(),
                'dbc_completed': self._get_dbc_status(),
            },
            'optional_data': {
                'prospects_count': self._get_prospects_count(),
                'orders_count': self._get_orders_count(months=12),
            }
        }

    def execute_migration(self, user_choices: dict):
        """
        Step 2: Execute the migration based on user choices.
        """
        # Create/update V1 user
        self.v1_user = self._create_or_update_v1_user()

        # Always migrate these
        self._migrate_ecash()
        self._migrate_team_structure()
        self._migrate_training_status()

        # Optional migrations based on user choice
        if user_choices.get('migrate_prospects', False):
            self._migrate_prospects()

        if user_choices.get('migrate_orders', False):
            self._migrate_orders()

        # Create mapping record
        self._create_mapping_record(user_choices)

        # Mark as migrated
        self.v1_user.is_migrated = True
        self.v1_user.migration_completed_at = timezone.now()
        self.v1_user.save()

        return self.v1_user

    def _migrate_ecash(self):
        """Transfer eCash balance from V3 to V1."""
        v3_balance = self._get_ecash_balance()

        if v3_balance > 0:
            # Create opening balance entry in V1
            ECashEntry.objects.create(
                user=self.v1_user,
                entry_type='migration_credit',
                amount=v3_balance,
                description=f"Migration from TWCako V3 - Opening Balance",
                reference_id=f"V3_MIGRATION_{self.legacy_user_id}",
                status='approved'
            )

            # Create audit record
            MigrationECashTransfer.objects.create(
                user=self.v1_user,
                v3_balance=v3_balance,
                v1_opening_balance=v3_balance,
                v3_ecash_id=self.legacy_user_id
            )

    def _migrate_team_structure(self):
        """
        Migrate sponsor/downline relationships.
        This is complex because we need to handle the order of migrations.
        """
        # Get V3 TeamMember record
        v3_team_member = self._get_v3_team_member()

        if v3_team_member and v3_team_member.sponsor:
            # Check if sponsor has already migrated
            sponsor_mapping = LegacyUserMapping.objects.filter(
                legacy_user_id=v3_team_member.sponsor_id
            ).first()

            if sponsor_mapping:
                # Sponsor already in V1, link to them
                v1_team_member, _ = TeamMember.objects.get_or_create(
                    user=self.v1_user
                )
                v1_team_member.sponsor = sponsor_mapping.user
                v1_team_member.save()
            else:
                # Sponsor not yet migrated, create placeholder
                # Will be linked when sponsor migrates
                v1_team_member, _ = TeamMember.objects.get_or_create(
                    user=self.v1_user,
                    defaults={'legacy_sponsor_id': v3_team_member.sponsor_id}
                )

    def _migrate_prospects(self):
        """Migrate prospect/lead data if user chose to."""
        # Implementation depends on ProspectTAP/ProspectVCP structure
        pass

    def _migrate_orders(self):
        """Migrate order history (last 12 months) if user chose to."""
        # Implementation depends on order model structure
        pass
```

---

## 6. Database Design

### 6.1 Database Strategy Options

**Option A: Same Database, New Tables**
- V3 and V1 tables coexist in same database
- Easy to reference V3 data during migration
- Risk: Schema conflicts

**Option B: Separate Database**
- Clean V1 database
- Read-only connection to V3 for migration
- Cleaner separation
- More complex deployment

**Option C: Shadow Tables**
- V1 tables are new
- V3 tables are archived/read-only
- Migration reads from V3, writes to V1

**Recommendation:** Option C (Shadow Tables) - cleanest for "fresh start" feel

### 6.2 V3 Tables to Archive (Read-Only)

```
accounts_user              → v3_archive_user
accounts_teammember        → v3_archive_teammember
ecash_ecash               → v3_archive_ecash
ecash_ecashentry          → v3_archive_ecashentry
accounts_prospecttap      → v3_archive_prospecttap
accounts_prospectvcp      → v3_archive_prospectvcp
orders_productorder       → v3_archive_productorder
...
```

### 6.3 V1 Tables (Fresh)

```
accounts_user              (new records, same schema + migration fields)
accounts_teammember        (new records)
ecash_ecash               (new records)
ecash_ecashentry          (new records, starting from migration)
migration_legacyusermapping (new)
migration_migrationecashtransfer (new)
```

---

## 7. Migration API Endpoints

### 7.1 Authentication

```
POST /api/v1/auth/login/
```

Modified behavior:
- If credentials valid AND `is_migrated = False` → return `requires_migration: true`
- Frontend redirects to migration wizard

### 7.2 Migration Wizard APIs

```
GET /api/v1/migration/start/
```
Returns V3 data summary for the current user.

```
POST /api/v1/migration/update-profile/
```
Updates profile info (step 2 of wizard).

```
GET /api/v1/migration/review-assets/
```
Returns eCash, team, training data.

```
POST /api/v1/migration/execute/
Body: {
    "migrate_prospects": true/false,
    "migrate_orders": true/false,
    "accept_terms": true,
    "accept_privacy": true
}
```
Executes the migration.

```
GET /api/v1/migration/status/
```
Returns current migration status (for resume if interrupted).

---

## 8. UI/UX Flow

### 8.1 Welcome Screen (Step 1)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                          🎉 Welcome to [NewCo]!                         │
│                                                                          │
│     We're excited to have you join us on this new journey.              │
│                                                                          │
│     As a valued member of our community, we're transferring             │
│     your account and assets to our new platform.                        │
│                                                                          │
│     This quick setup will help us:                                       │
│     ✓ Verify your profile information                                   │
│     ✓ Transfer your eCash balance                                       │
│     ✓ Preserve your team structure                                      │
│     ✓ Set up your fresh new dashboard                                   │
│                                                                          │
│     It only takes a few minutes!                                        │
│                                                                          │
│                     [ Let's Get Started → ]                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Profile Review (Step 2)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Step 2 of 6                          Review Your Profile                │
│  ━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                                          │
│     Please verify your information is correct:                          │
│                                                                          │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │ Username: juan.santos (cannot be changed)                     │    │
│     ├──────────────────────────────────────────────────────────────┤    │
│     │ First Name:    [Juan                    ]                     │    │
│     │ Last Name:     [Santos                  ]                     │    │
│     │ Email:         [juan.santos@email.com   ]                     │    │
│     │ Mobile:        [09171234567             ]                     │    │
│     │ Profile Photo: [📷 Upload New]          Current: [👤]         │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                                                          │
│     [ ← Back ]                               [ Continue → ]             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Review Assets (Step 3)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Step 3 of 6                          Your Assets                        │
│  ━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                                          │
│     The following will be transferred to your new account:              │
│                                                                          │
│     💰 eCash Balance                                                     │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │  ₱ 15,432.50                                                  │    │
│     │  This amount will be available in your new account.          │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                                                          │
│     👥 Your Team                                                         │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │  Sponsor: Maria Cruz (@mariacruz)                            │    │
│     │  Direct Downlines: 8                                          │    │
│     │  Total Team Size: 23                                          │    │
│     │  These relationships will be preserved.                       │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                                                          │
│     🏆 Your Status                                                       │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │  Membership: Global Distributor                               │    │
│     │  Rank: Diamond                                                 │    │
│     │  ABC Training: ✅ Completed                                   │    │
│     │  DBC Training: ✅ Completed                                   │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                                                          │
│     [ ← Back ]                               [ Continue → ]             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.4 Optional Data Transfer (Step 4)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Step 4 of 6                     Additional Data                         │
│  ━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                                          │
│     Would you like to transfer any additional data?                     │
│                                                                          │
│     These are optional - you can start fresh without them:              │
│                                                                          │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │ ☐ Prospect/Lead History                                       │    │
│     │   You have 156 prospects from your funnels.                   │    │
│     │   ⚠️ Note: Some contacts may be outdated.                     │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                                                          │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │ ☐ Order History (Last 12 months)                              │    │
│     │   You have 47 orders in this period.                          │    │
│     │   ℹ️ Useful for reference and customer support.               │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                                                          │
│     💡 Starting fresh? Leave these unchecked for a clean slate!        │
│                                                                          │
│     [ ← Back ]                               [ Continue → ]             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.5 Terms & Conditions (Step 5)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Step 5 of 6                     Terms & Conditions                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                                          │
│     Please review and accept our terms:                                 │
│                                                                          │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │ ☐ I accept the [Terms and Conditions] of [NewCo]             │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                                                          │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │ ☐ I accept the [Privacy Policy] and consent to data         │    │
│     │   processing as described.                                    │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                                                          │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │ ☐ I understand that my eCash balance and team structure      │    │
│     │   are being transferred to [NewCo] and I confirm this        │    │
│     │   is correct.                                                 │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                                                          │
│     [ ← Back ]                               [ Complete Setup → ]       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.6 Confirmation (Step 6)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●       │
│                                                                          │
│                           🎉 You're All Set!                            │
│                                                                          │
│     Welcome to [NewCo], Juan!                                           │
│                                                                          │
│     Here's what we've set up for you:                                   │
│                                                                          │
│     ✅ Profile updated                                                   │
│     ✅ ₱15,432.50 eCash transferred                                     │
│     ✅ Team structure preserved (8 direct, 23 total)                    │
│     ✅ Diamond rank retained                                            │
│     ✅ ABC & DBC certifications retained                                │
│                                                                          │
│     🆕 What's New:                                                       │
│     • Fresh new dashboard                                                │
│     • Gamification & rewards (coming soon!)                             │
│     • Better notification system                                         │
│     • Mobile app (coming Q2!)                                           │
│                                                                          │
│                      [ Go to My Dashboard → ]                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Rollout Strategy

### 9.1 Phased Rollout

| Phase | Users | Duration | Purpose |
|-------|-------|----------|---------|
| **Phase 0** | Internal team | 1 week | Test migration flow |
| **Phase 1** | Diamond coaches (10-20) | 1 week | Real user feedback |
| **Phase 2** | All Distributors | 2 weeks | Core user base |
| **Phase 3** | All Affiliates | 2 weeks | Larger volume |
| **Phase 4** | All remaining users | 2 weeks | Full rollout |

### 9.2 Communication Plan

**Pre-Launch (1 week before)**
- Email announcement to all users
- SMS to active users
- In-app banner on V3 dashboard

**Launch Day**
- Login redirects to migration wizard
- Support team on standby
- Monitoring dashboards active

**Post-Launch**
- Daily migration status reports
- Support for stuck users
- FAQ and help documentation

### 9.3 Fallback Plan

If migration fails for a user:
1. Log the error with full context
2. Revert any partial changes
3. Flag user for manual migration
4. Allow user to continue on V3 temporarily
5. Support team reaches out within 24h

---

## 10. Risk Mitigation

### 10.1 Data Loss Prevention

| Risk | Mitigation |
|------|------------|
| eCash discrepancy | Full audit trail, reconciliation report |
| Team structure broken | Validate sponsor links, manual repair queue |
| Migration interrupted | Resume capability, idempotent operations |
| Duplicate migrations | Unique constraint on legacy_user_id |

### 10.2 User Experience Risks

| Risk | Mitigation |
|------|------------|
| Confusion about changes | Clear welcome messaging |
| Lost trust | Transparent asset display |
| Friction in process | Streamlined wizard, <5 min completion |
| Support overload | Comprehensive FAQ, self-service tools |

### 10.3 Technical Risks

| Risk | Mitigation |
|------|------------|
| Database connection issues | Retry logic, circuit breaker |
| High concurrent migrations | Rate limiting, queue system |
| V3 data corruption | Read-only mode for V3 data |
| Performance degradation | Caching, async processing |

---

## Appendix A: Open Questions for Team Discussion

1. **New Company Name** - What is the new brand name?
2. **Prospect Migration** - Default behavior (migrate or not)?
3. **Historical Commission Data** - Summary only or detailed?
4. **Subscription Status** - How to handle active subscriptions?
5. **Supplier Accounts** - Separate migration process needed?
6. **Verification Requirements** - Any KYC needed during migration?
7. **Referral Links** - Do old links still work?
8. **Email/SMS Templates** - New branding requirements?

---

## Appendix B: Timeline Estimate

| Phase | Task | Duration |
|-------|------|----------|
| Planning | Finalize decisions | 1 week |
| Development | Migration models & service | 1 week |
| Development | Migration wizard UI | 1 week |
| Development | API endpoints | 3 days |
| Testing | Internal testing | 1 week |
| Rollout | Phased rollout | 6 weeks |

**Total: ~10-11 weeks from decision to full migration**

---

*Document Version: 1.0*
*Created: 2026-02-15*
*Status: Draft - Pending Team Discussion*

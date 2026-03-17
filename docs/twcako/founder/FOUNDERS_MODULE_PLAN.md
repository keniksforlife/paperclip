# Founders Module — Central Hub Implementation Plan

> **Status:** Planning Phase
> **Created:** 2026-03-08
> **Goal:** Build the Founders Module as the central command hub for the entire TWCako platform — enabling system-wide management, staff/user module assignment, granular permissions, and operational oversight.

---

## Table of Contents
1. [Current State Analysis](#1-current-state-analysis)
2. [Gap Analysis & Improvements](#2-gap-analysis--improvements)
3. [New Permission System Design](#3-new-permission-system-design)
4. [Founders Hub Pages](#4-founders-hub-pages)
5. [API Endpoint Plan](#5-api-endpoint-plan)
6. [Implementation Phases](#6-implementation-phases)
7. [Data Models](#7-data-models)
8. [Migration Strategy](#8-migration-strategy)

---

## 1. Current State Analysis

### V3 Founder Features (Django)
| Feature | File | Status |
|---------|------|--------|
| Home Dashboard | `founder/views/index.py` — top sponsors, dropshippers, earners | Basic |
| Member Management | `founder/views/members.py` — DataTable with AJAX | Functional |
| E-Code Inventory | `founder/views/virtual_warehouse.py` — AJAX add/order | Functional |
| Freebie Inventory | Same file — freebie add/order, SNS confirmation | Functional |

### V4 Founder Features (Next.js)
| Feature | Files | Status |
|---------|-------|--------|
| Founder Home | `FounderHomeClient.tsx` — Hero + 5 module cards | Done (4 "Coming Soon") |
| Supplier Management | 6 pages — list, detail, features, routing, KPIs, onboard | Fully Built |
| Member Oversight | `/founder/members` | Placeholder |
| Finance Overview | `/founder/finance` | Placeholder |
| Operations Hub | `/founder/operations` | Placeholder |
| Platform Settings | `/founder/settings` | Placeholder |

### Current Permission System
```
User model boolean flags:
├── is_founder    → Super-admin (access to everything)
├── is_admin      → Django superuser
├── is_staff      → Django staff
├── is_finance    → Finance module only
├── is_logistic   → Logistics module only
├── is_cyra       → CYRA module only
├── is_live4more  → Live4More fulfillment only
├── is_supplier   → Supplier module only
└── is_diamond    → Diamond coach (legacy)
```

### Existing Founder API (10 endpoints — all supplier-focused)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/founders/suppliers/` | GET/POST | List/create suppliers |
| `/api/founders/suppliers/{id}/` | GET/PUT | Supplier detail |
| `/api/founders/suppliers/{id}/branches/` | GET/POST | Branch management |
| `/api/founders/suppliers/{id}/features/` | PUT | Toggle branch features |
| `/api/founders/suppliers/{id}/kpi-rollup/` | GET | Branch KPI aggregation |
| `/api/founders/routing-rules/` | GET/POST | Routing rules CRUD |
| `/api/founders/routing-rules/{id}/` | PUT/DELETE | Routing rule detail |
| `/api/founders/routing/test/` | POST | Test routing logic |
| `/api/founders/branches/onboard/` | POST | Onboard new branch |

---

## 2. Gap Analysis & Improvements

### What's Missing
| Gap | Impact | Priority |
|-----|--------|----------|
| **No granular permissions** | Can't do "view-only finance" or "supplier manager for branch X" | Critical |
| **No staff management UI** | Must manually set boolean flags in Django admin | Critical |
| **No audit trail** | No record of who changed what, when | High |
| **No member oversight** | Founders can't see members from V4 dashboard | High |
| **No finance overview** | Must switch to Finance module for any financial data | Medium |
| **No operations monitoring** | No visibility into system health, Celery queues | Medium |
| **No platform settings** | Feature flags, announcements require code changes | Medium |
| **No role templates** | Every user configured individually | Medium |
| **No invitation system** | Must create users manually, then assign flags | Low |

### What Needs Improvement
| Current Feature | Improvement |
|----------------|-------------|
| Home Dashboard (top sponsors only) | Live KPIs, alerts, quick actions, recent activity |
| Member DataTable (V3 AJAX) | Modern V4 page with search, filters, analytics, detail view |
| Boolean permission flags | Role-based + module-scoped permission system |
| Manual user creation | Staff invitation flow with pre-configured roles |
| No change tracking | Full audit log with change diffs |

---

## 3. New Permission System Design

### Permission Levels
| Level | Description | Example |
|-------|-------------|---------|
| `view` | Read-only access to module data | Finance Viewer — can see reports but not edit |
| `edit` | Can create and modify records | Finance Editor — can create expenses, edit entries |
| `manage` | Full CRUD + workflow actions | Finance Manager — can approve, reconcile, close periods |
| `admin` | Module admin including settings | Finance Admin — can configure accounts, manage budgets |

### Module Definitions
```python
MODULE_CHOICES = [
    ('founder', 'Founder Suite'),
    ('finance', 'Finance'),
    ('supplier', 'Supplier'),
    ('logistics', 'Logistics'),
    ('coaches', 'TWC Coaches'),
    ('media_library', 'Media Library'),
    ('members', 'Member Management'),
    ('operations', 'Operations'),
]
```

### How It Works
1. **StaffRole** — Named templates (e.g., "Finance Manager") with default module permissions
2. **StaffAssignment** — Links user → module → permission level (optionally scoped to supplier/branch)
3. **Access Check Flow:**
   ```
   Request comes in → Check StaffAssignment for user + module
   ├── Found → Check permission_level >= required level
   ├── Not found → Fall back to boolean flag (backward compat)
   └── is_founder=True → Always grant (super-admin override)
   ```

### Backward Compatibility
During migration, boolean flags become computed:
```python
@property
def is_finance(self):
    # New system first, then fall back to boolean field
    return self._has_module_access('finance') or self._is_finance_flag
```

---

## 4. Founders Hub Pages

### Page 1: Home Dashboard (Redesign)
**Current:** Top sponsors, dropshippers, earners (V3 only)
**New Design:**
- **KPI Strip (5 cards):** Total Users | Active Members | Monthly Revenue | Open Orders | System Health %
- **Quick Actions Grid:** Add Staff, Create Supplier, View Reports, System Settings
- **Alerts Panel:** Low stock, pending approvals, expiring memberships, failed tasks
- **Module Cards (5):** Each showing live count/metric from its module
- **Recent Activity Feed:** Last 10 audit log entries across all modules

### Page 2: Staff Management *(NEW)*
- **Staff Directory:** Table of all staff with role, modules, last active, status
- **Role Templates:** Create/edit named roles with preset permission JSON
- **Invite Staff:** Send email invitation with role + module selection
- **Permission Matrix:** Visual grid: rows = users, columns = modules, cells = permission level
- **Bulk Actions:** Assign role to multiple users, revoke access, deactivate

### Page 3: Member Oversight *(NEW)*
- **Member Directory:** Paginated list with search, type filter, status filter, date range
- **Member Detail Dialog:** Profile, orders, earnings, genealogy tree, activity timeline
- **Analytics Tab:** Member growth chart, churn rate, activation rate, revenue per member
- **Bulk Actions:** Mass status change, send notification, export
- **Export:** CSV download of filtered member data

### Page 4: Finance Overview *(NEW)*
- **Revenue KPIs:** Total revenue, expenses, net profit, cash balance
- **Budget Utilization:** Progress bars for each department budget
- **Pending Approvals:** List of expenses/disbursements awaiting approval (with approve action)
- **Revenue Breakdown Chart:** Pie chart — supplier commissions, membership fees, product sales
- **Quick Links:** Jump to specific Finance module pages

### Page 5: Operations Hub *(NEW)*
- **System Health:** Uptime %, response time, error rate (last 24h)
- **Celery Dashboard:** Active workers, pending tasks, failed tasks, retry queue
- **Background Jobs:** List of running/recent Celery tasks with status
- **Recent Deployments:** Last deploy timestamp, commit hash, status
- **Alert Feed:** Failed tasks, high error rates, disk usage warnings

### Page 6: Platform Settings *(NEW)*
- **Feature Flags:** Toggle features on/off platform-wide (table with switches)
- **Announcement Banner:** Create/edit system-wide banner messages
- **Maintenance Mode:** Toggle with estimated duration
- **System Config:** Default commission rates, membership prices, order thresholds
- **API Keys:** View/rotate third-party API keys (masked display)

### Page 7: Audit Log *(NEW)*
- **Log Table:** Paginated, filterable by user, module, action, date range
- **Entry Detail:** Expandable row showing full change diff (old → new)
- **Stats Cards:** Total actions today, most active user, most changed module
- **Export:** CSV download for compliance

---

## 5. API Endpoint Plan

### Staff Management (8 endpoints)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/founders/staff/` | GET | List all staff with module assignments |
| `/api/founders/staff/` | POST | Create staff user + assign modules |
| `/api/founders/staff/{id}/` | GET | Staff detail with full permissions |
| `/api/founders/staff/{id}/` | PUT | Update staff permissions/role |
| `/api/founders/staff/{id}/` | DELETE | Revoke all module access |
| `/api/founders/roles/` | GET/POST | List / create role templates |
| `/api/founders/roles/{id}/` | PUT/DELETE | Update / delete role template |
| `/api/founders/invitations/` | GET/POST | List / send staff invitations |

### Member Oversight (6 endpoints)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/founders/members/` | GET | List all members (paginated, filterable) |
| `/api/founders/members/{id}/` | GET | Member detail + activity |
| `/api/founders/members/analytics/` | GET | Growth, churn, activation analytics |
| `/api/founders/members/export/` | GET | CSV export |
| `/api/founders/members/{id}/status/` | PUT | Change member status |
| `/api/founders/members/bulk/` | POST | Bulk actions |

### Finance Overview (3 endpoints)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/founders/finance/overview/` | GET | Cross-module financial KPIs |
| `/api/founders/finance/budgets/` | GET | Budget utilization summary |
| `/api/founders/finance/approvals/` | GET | Pending approvals list |

### Operations (4 endpoints)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/founders/ops/health/` | GET | System health metrics |
| `/api/founders/ops/celery/` | GET | Celery queue status |
| `/api/founders/ops/tasks/` | GET | Recent background tasks |
| `/api/founders/ops/alerts/` | GET | Active system alerts |

### Settings (5 endpoints)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/founders/settings/` | GET/PUT | Global platform config |
| `/api/founders/settings/features/` | GET/PUT | Feature flags |
| `/api/founders/settings/announcements/` | GET/POST/DELETE | Announcements |
| `/api/founders/settings/maintenance/` | PUT | Maintenance mode |

### Audit Log (2 endpoints)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/founders/audit/` | GET | Searchable audit log |
| `/api/founders/audit/export/` | GET | CSV export |

**Total: ~28 new API endpoints** (on top of existing 10 supplier endpoints)

---

## 6. Implementation Phases

### Milestone A: Permission System Foundation ✅ COMPLETE (2026-03-09)
- [x] 5 Django models: `StaffRole`, `StaffAssignment`, `StaffInvitation`, `AuditEntry`, `PlatformSettings` → `founder/models.py`
- [x] Migration `0001_staff_permissions_audit.py` + data migration `0002_seed_system_roles.py`
- [x] `user_has_module_access()` helper with boolean flag fallback
- [x] 10 API endpoints (staff CRUD, roles CRUD, invitations, audit log, CSV export, choices) → `api/views/founders_staff.py`
- [x] 9 URL routes → `api/urls.py`
- [x] Django admin registration → `founder/admin.py`
- **Deferred:** Access mixin updates (backward compat works now via dual-read in `user_has_module_access`)

### Milestone B: Staff Management + Audit Log Frontend ✅ COMPLETE (2026-03-09)
- [x] Staff Management page (3 tabs: Staff Directory, Role Templates, Invitations) → `founder/staff/StaffManagementClient.tsx`
- [x] Audit Log page (search, filters, expandable rows, pagination, CSV export) → `founder/audit/AuditLogClient.tsx`
- [x] 9 API proxy routes → `app/api/founders/{staff,roles,invitations,audit,choices}/`
- [x] 6 SWR hooks → `hooks/useFoundersStaff.ts`
- [x] TypeScript types (190+ lines) → `types/domain/foundersStaff.ts`
- [x] Founder Home updated: Staff & Audit cards marked ready
- [x] Menu items updated: Suppliers, Staff & Permissions, Audit Log in nav
- [x] Playwright verified: Desktop 1440px + Mobile 375px

### Milestone C: Member Oversight (Week 3-4)
- [ ] Member Oversight API (6 endpoints)
- [ ] V4 Member Directory page (search, filter, paginate)
- [ ] V4 Member Detail dialog (profile, orders, earnings, activity)
- [ ] Member Analytics tab (growth chart, churn, activation)
- [ ] Bulk actions + CSV export
- [ ] SWR hooks: `useFounderMembers`
- [ ] TypeScript types for member oversight

### Milestone D: Finance Overview + Operations Hub (Week 4-5)
- [ ] Finance Overview API (3 endpoints — aggregate from existing Finance models)
- [ ] Operations Hub API (4 endpoints — Celery inspect, system health)
- [ ] V4 Finance Overview page (KPIs, budgets, approvals, revenue chart)
- [ ] V4 Operations Hub page (health, Celery, tasks, alerts)
- [ ] SWR hooks: `useFounderFinance`, `useFounderOps`

### Milestone E: Platform Settings + Home Redesign (Week 5-6)
- [ ] Settings API (5 endpoints)
- [ ] `PlatformSettings` model (singleton config)
- [ ] V4 Platform Settings page (feature flags, announcements, maintenance)
- [ ] Redesign Founder Home Dashboard (live KPIs, alerts, quick actions, activity feed)
- [ ] Update module cards with live stats from each module
- [ ] Update founder menu items in `menuItems.ts`

### Milestone F: Polish & Deployment (Week 6-7)
- [ ] Test all existing modules still work with new permission system
- [ ] Verify boolean flag backward compatibility
- [ ] Deploy backend + run migrations
- [ ] Deploy frontend
- [ ] Update documentation
- [ ] Update MEMORY.md

---

## 7. Data Models

### StaffRole
```python
class StaffRole(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=dict)
    # Example: {"finance": "manage", "supplier": "view", "members": "edit"}
    is_system_role = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
```

**System Roles (seeded):**
| Role | Permissions |
|------|-------------|
| Founder | All modules: admin |
| Finance Manager | finance: manage |
| Finance Viewer | finance: view |
| Supplier Manager | supplier: manage |
| Logistics Staff | logistics: edit |
| Member Support | members: edit |

### StaffAssignment
```python
class StaffAssignment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='staff_assignments')
    role = models.ForeignKey(StaffRole, on_delete=models.SET_NULL, null=True, blank=True)
    module = models.CharField(max_length=50, choices=MODULE_CHOICES)
    permission_level = models.CharField(max_length=20, choices=PERMISSION_CHOICES)
    scope = models.JSONField(default=dict, blank=True)
    # Example scope: {"supplier_id": 5} — access only to supplier #5
    granted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='granted_assignments')
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'module')
        ordering = ['user', 'module']
```

### StaffInvitation
```python
class StaffInvitation(models.Model):
    email = models.EmailField()
    role = models.ForeignKey(StaffRole, on_delete=models.SET_NULL, null=True, blank=True)
    modules = models.JSONField(default=list)
    # Example: [{"module": "finance", "level": "edit"}, {"module": "supplier", "level": "view"}]
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    accepted_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='accepted_invitations')

    class Meta:
        ordering = ['-created_at']
```

### AuditEntry
```python
class AuditEntry(models.Model):
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('permission_grant', 'Permission Granted'),
        ('permission_revoke', 'Permission Revoked'),
        ('status_change', 'Status Change'),
        ('bulk_action', 'Bulk Action'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    module = models.CharField(max_length=50, blank=True)
    target_type = models.CharField(max_length=100, blank=True)  # e.g., 'Supplier', 'JournalEntry'
    target_id = models.IntegerField(null=True, blank=True)
    target_label = models.CharField(max_length=255, blank=True)  # Human-readable label
    changes = models.JSONField(default=dict, blank=True)
    # Example: {"name": {"old": "Sante", "new": "Sante PH"}}
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['module', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['-timestamp']),
        ]
        verbose_name_plural = 'Audit entries'
```

### PlatformSettings (Singleton)
```python
class PlatformSettings(models.Model):
    # Feature Flags
    feature_flags = models.JSONField(default=dict)
    # Example: {"media_library_ai": true, "brand_storefronts": false, "gamification": false}

    # Announcement
    announcement_text = models.TextField(blank=True)
    announcement_type = models.CharField(max_length=20, default='info', choices=[
        ('info', 'Info'), ('warning', 'Warning'), ('error', 'Error'), ('success', 'Success')
    ])
    announcement_active = models.BooleanField(default=False)

    # Maintenance
    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(blank=True)

    # System Config
    default_commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    default_membership_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Platform settings'

    def save(self, *args, **kwargs):
        self.pk = 1  # Singleton
        super().save(*args, **kwargs)
```

---

## 8. Migration Strategy

### Phase 1: Add New Models (Non-Breaking)
1. Create `StaffRole`, `StaffAssignment`, `StaffInvitation`, `AuditEntry`, `PlatformSettings`
2. Run migrations — no existing code affected

### Phase 2: Data Migration
1. For each user with `is_finance=True`, create `StaffAssignment(module='finance', level='manage')`
2. For each user with `is_logistic=True`, create `StaffAssignment(module='logistics', level='manage')`
3. For each user with `is_founder=True`, create `StaffAssignment(module='founder', level='admin')`
4. Same for `is_cyra`, `is_live4more`, `is_supplier`
5. Create system roles: Founder, Finance Manager, Supplier Manager, etc.

### Phase 3: Update Access Checks (Dual-Read)
```python
# In access mixins, change from:
class FinanceAccessMixin:
    def test_func(self):
        return self.request.user.is_finance or self.request.user.is_founder

# To:
class FinanceAccessMixin:
    def test_func(self):
        user = self.request.user
        # New system first
        if user.has_module_access('finance'):
            return True
        # Backward compat
        return getattr(user, 'is_finance', False) or getattr(user, 'is_founder', False)
```

### Phase 4: Deprecate Boolean Flags
After confirming new system works, mark boolean fields as deprecated (but don't remove them yet).

---

## File Locations

| Type | Path |
|------|------|
| This plan | `docs/founder/FOUNDERS_MODULE_PLAN.md` |
| V3 Views | `founder/views/` |
| V3 URLs | `founder/urls.py` |
| V4 Pages | `TWCAKOV4/src/app/(dashboards)/founder/` |
| V4 API Routes | `TWCAKOV4/src/app/api/founders/` |
| V4 Hooks | `TWCAKOV4/src/hooks/useFoundersSuppliers.ts` |
| V4 Types | `TWCAKOV4/src/types/domain/foundersSuppliers.ts` |
| Module Registry | `TWCAKOV4/src/config/moduleRegistry.ts` |
| Access Mixins | `accounts/mixin.py` |
| API Permissions | `api/permissions.py` |
| User Model | `accounts/models.py` |

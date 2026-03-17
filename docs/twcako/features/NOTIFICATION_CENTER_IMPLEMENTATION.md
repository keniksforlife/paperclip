# Notification Center Implementation

**Version:** V3 (to be migrated to V4)
**Implemented:** 2026-02-15
**Status:** Complete

## Overview

Multi-channel notification system for TWCako with support for:
- **In-App** - Notifications shown in dashboard
- **Push** - Browser push notifications via Firebase Cloud Messaging (FCM)
- **SMS** - Text messages for high-priority alerts
- **Email** - Detailed notifications via email

## Architecture

### Strategy Pattern for Channels

The notification system uses the Strategy pattern, allowing easy addition of new channels without modifying existing code.

```
notifications/channels/
├── __init__.py        # ChannelRegistry - factory for channels
├── base.py            # BaseNotificationChannel (abstract)
├── in_app.py          # InAppChannel
├── sms.py             # SMSChannel (reuses sms/utils.py)
├── email.py           # EmailChannel
└── push.py            # PushChannel (Firebase FCM)
```

### Priority-Based Delivery

| Priority | Channels Used |
|----------|---------------|
| `low` | In-App only |
| `medium` | In-App + Push |
| `high` | In-App + Push + SMS |

---

## Files Created

### App Structure

| File | Description |
|------|-------------|
| `notifications/__init__.py` | App initialization |
| `notifications/apps.py` | Django app config |
| `notifications/models.py` | 5 models (see below) |
| `notifications/admin.py` | Admin registration |

### Models

| Model | Purpose |
|-------|---------|
| `NotificationTemplate` | Reusable templates with `{{ variable }}` substitution |
| `Notification` | Core notification record per user per event |
| `NotificationDeliveryLog` | Audit trail per channel delivery attempt |
| `UserNotificationPreference` | User opt-out preferences (default: enabled) |
| `FCMToken` | Browser push notification tokens |

### Channels

| File | Description |
|------|-------------|
| `notifications/channels/base.py` | Abstract base class |
| `notifications/channels/in_app.py` | Stores in DB (instant) |
| `notifications/channels/sms.py` | Reuses `sms/utils.py` |
| `notifications/channels/email.py` | Django email backend |
| `notifications/channels/push.py` | Firebase Cloud Messaging |

### Celery Tasks

| File | Tasks |
|------|-------|
| `notifications/tasks.py` | `send_notification_task`, `create_and_send_notification`, `send_notification_to_user`, `retry_failed_notifications`, `cleanup_old_notifications`, `mark_notifications_read` |

### API

| File | Description |
|------|-------------|
| `notifications/serializers.py` | DRF serializers |
| `notifications/views.py` | API views (ViewSet + APIViews) |
| `notifications/urls.py` | API URL routing |

### Dashboard

| File | Description |
|------|-------------|
| `notifications/context_processors.py` | `notification_unread_count` for templates |
| `notifications/dashboard_views.py` | List and preferences page views |
| `notifications/dashboard_urls.py` | Dashboard URL routing |

### Templates

| File | Description |
|------|-------------|
| `notifications/templates/notifications/list.html` | Full notification list page |
| `notifications/templates/notifications/preferences.html` | User preferences page |
| `notifications/templates/notifications/email/default.html` | Default email template |

### Management Commands

| Command | Description |
|---------|-------------|
| `python manage.py seed_notification_templates` | Seeds 18 default templates |

---

## Files Modified

### Settings (`twcako/settings/base.py`)

```python
# Added to INSTALLED_APPS
'notifications',

# Added to context_processors
'notifications.context_processors.notification_context',

# Added Firebase setting
FIREBASE_CREDENTIALS_PATH = os.environ.get("FIREBASE_CREDENTIALS_PATH")
```

### Celery (`twcako/celery.py`)

```python
# Added to beat_schedule
'daily-cleanup-old-notifications': {
    'task': 'notifications.tasks.cleanup_old_notifications',
    'schedule': crontab(hour=1, minute=0),  # 1:00 AM
},
'retry-failed-notifications': {
    'task': 'notifications.tasks.retry_failed_notifications',
    'schedule': crontab(minute='*/15'),  # Every 15 minutes
},
```

### Dashboard URLs (`twcako/urls/dashboard.py`)

```python
# Added routes
path('notifications/', include('notifications.dashboard_urls', namespace='notifications')),
path('api/notifications/', include('notifications.urls')),
```

### Navbar (`dashboard/templates/dashboard/base/navbar.html`)

- Added notification bell icon with badge
- Added dropdown for recent notifications
- Added JavaScript for loading/marking notifications as read

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications/` | GET | List notifications (paginated) |
| `/api/notifications/{id}/` | GET | Get notification detail (auto marks as read) |
| `/api/notifications/mark-read/` | POST | Bulk mark as read |
| `/api/notifications/unread-count/` | GET | Get unread count |
| `/api/notifications/preferences/` | GET | List all preferences |
| `/api/notifications/preferences/` | POST | Update a preference |
| `/api/notifications/fcm-token/` | POST | Register FCM token |
| `/api/notifications/fcm-token/` | DELETE | Unregister FCM token |

### Query Parameters (List)

| Param | Description |
|-------|-------------|
| `category` | Filter by category (order, payment, team, etc.) |
| `is_read` | Filter by read status (true/false) |

---

## Dashboard Pages

| URL | Description |
|-----|-------------|
| `/notifications/` | Full notification list with filters |
| `/notifications/preferences/` | Toggle channels per category |

---

## Usage

### Send Notification Using Template

```python
from notifications.tasks import create_and_send_notification

# Async (recommended)
create_and_send_notification.delay(
    user_id=user.id,
    template_slug='order_placed',
    context={
        'order_number': 'ORD-2026-0001',
        'total': '2,450.00',
        'order_id': order.id
    },
    related_object_type='order',
    related_object_id=order.id
)
```

### Send Notification Without Template

```python
from notifications.tasks import send_notification_to_user

send_notification_to_user.delay(
    user_id=user.id,
    title='Custom Notification',
    body='This is a custom notification without a template.',
    category='system',
    priority='medium',
    action_url='/dashboard/'
)
```

### Create Notification Synchronously

```python
from notifications.models import Notification, NotificationTemplate

template = NotificationTemplate.objects.get(slug='welcome')
context = {'first_name': user.first_name}

notification = Notification.objects.create(
    user=user,
    template=template,
    title=template.render_title(context),
    body=template.render_body(context),
    action_url=template.render_action_url(context),
    category=template.category,
    priority=template.priority,
    context_data=context
)

# Then send via channels
from notifications.tasks import send_notification_task
send_notification_task.delay(notification.id)
```

### Check User Preference

```python
from notifications.models import UserNotificationPreference

# Returns True if no preference exists (default: enabled)
enabled = UserNotificationPreference.is_channel_enabled(
    user=user,
    category='order',
    channel='sms'
)
```

---

## Default Templates

| Slug | Category | Priority |
|------|----------|----------|
| `order_placed` | order | medium |
| `order_shipped` | order | medium |
| `order_delivered` | order | low |
| `ecash_received` | payment | medium |
| `ecash_withdrawal_approved` | payment | high |
| `ecash_withdrawal_completed` | payment | high |
| `new_team_member` | team | medium |
| `team_member_first_sale` | team | medium |
| `bootcamp_reminder` | training | high |
| `training_completed` | training | low |
| `funnel_signup` | funnel | medium |
| `funnel_conversion` | funnel | medium |
| `reward_earned` | reward | medium |
| `rank_achieved` | reward | high |
| `welcome` | system | low |
| `password_changed` | system | high |
| `profile_updated` | system | low |
| `promo_announcement` | promo | medium |

---

## Categories

| Code | Display Name |
|------|--------------|
| `order` | Order Updates |
| `payment` | Payment & eCash |
| `team` | Team Activity |
| `training` | Training & Bootcamp |
| `funnel` | Funnel Activity |
| `reward` | Rewards & Achievements |
| `system` | System Notifications |
| `promo` | Promotions |

---

## Firebase Setup (for Push Notifications)

1. Create a Firebase project at https://console.firebase.google.com
2. Go to Project Settings > Service Accounts
3. Generate new private key (JSON file)
4. Set environment variable:
   ```bash
   export FIREBASE_CREDENTIALS_PATH=/path/to/firebase-credentials.json
   ```
5. Install firebase-admin:
   ```bash
   pip install firebase-admin
   ```

---

## V4 Migration Notes

When migrating to V4, copy the entire `notifications/` app directory and update:

### Files to Copy
```
notifications/
├── __init__.py
├── apps.py
├── models.py
├── admin.py
├── tasks.py
├── serializers.py
├── views.py
├── urls.py
├── context_processors.py
├── dashboard_views.py
├── dashboard_urls.py
├── channels/
│   ├── __init__.py
│   ├── base.py
│   ├── in_app.py
│   ├── sms.py
│   ├── email.py
│   └── push.py
├── management/
│   └── commands/
│       └── seed_notification_templates.py
├── templates/
│   └── notifications/
│       ├── list.html
│       ├── preferences.html
│       └── email/
│           └── default.html
└── migrations/
    └── 0001_initial.py
```

### Settings Updates Needed

```python
# Add to INSTALLED_APPS
'notifications',

# Add to context_processors
'notifications.context_processors.notification_context',

# Add Firebase config
FIREBASE_CREDENTIALS_PATH = os.environ.get("FIREBASE_CREDENTIALS_PATH")
```

### Celery Updates Needed

```python
# Add to beat_schedule
'daily-cleanup-old-notifications': {
    'task': 'notifications.tasks.cleanup_old_notifications',
    'schedule': crontab(hour=1, minute=0),
},
'retry-failed-notifications': {
    'task': 'notifications.tasks.retry_failed_notifications',
    'schedule': crontab(minute='*/15'),
},
```

### URL Updates Needed

```python
# In dashboard URLs
path('notifications/', include('notifications.dashboard_urls', namespace='notifications')),
path('api/notifications/', include('notifications.urls')),
```

### Navbar Updates Needed

Copy the notification bell HTML and JS from `dashboard/templates/dashboard/base/navbar.html`.

### Dependencies

Ensure these are in requirements.txt:
- `firebase-admin` (for push notifications)
- `celery` (already present)
- `djangorestframework` (already present)

### Migration Commands

```bash
python manage.py migrate notifications
python manage.py seed_notification_templates
```

---

## Troubleshooting

### Notifications not showing in bell
- Check `notification_unread_count` is in context (context processor added to settings)
- Verify user has unread notifications in DB
- Check browser console for JavaScript errors

### SMS not sending
- Verify user has valid Philippine mobile number
- Check `sms/utils.py` API credentials
- Review `NotificationDeliveryLog` for errors

### Push not working
- Verify `FIREBASE_CREDENTIALS_PATH` is set
- Check `firebase-admin` is installed
- Ensure user has registered FCM token
- Check browser supports notifications

### Email not sending
- Check Django email settings
- Verify email template exists
- Review `NotificationDeliveryLog` for errors

---

## Database Schema

```sql
-- NotificationTemplate
CREATE TABLE notifications_notificationtemplate (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE,
    name VARCHAR(200),
    category VARCHAR(50),
    priority VARCHAR(20),
    title VARCHAR(200),
    body TEXT,
    sms_body VARCHAR(160),
    email_subject VARCHAR(200),
    email_template VARCHAR(200),
    action_url VARCHAR(500),
    channels JSONB,
    active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Notification
CREATE TABLE notifications_notification (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES accounts_user(id),
    template_id BIGINT REFERENCES notifications_notificationtemplate(id),
    title VARCHAR(200),
    body TEXT,
    action_url VARCHAR(500),
    category VARCHAR(50),
    priority VARCHAR(20),
    context_data JSONB,
    related_object_type VARCHAR(100),
    related_object_id INTEGER,
    status VARCHAR(20),
    is_read BOOLEAN,
    read_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- NotificationDeliveryLog
CREATE TABLE notifications_notificationdeliverylog (
    id BIGSERIAL PRIMARY KEY,
    notification_id BIGINT REFERENCES notifications_notification(id),
    channel VARCHAR(20),
    status VARCHAR(20),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    provider_response JSONB,
    error_message TEXT,
    retry_count SMALLINT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(notification_id, channel)
);

-- UserNotificationPreference
CREATE TABLE notifications_usernotificationpreference (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES accounts_user(id),
    category VARCHAR(50),
    channel VARCHAR(20),
    enabled BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(user_id, category, channel)
);

-- FCMToken
CREATE TABLE notifications_fcmtoken (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES accounts_user(id),
    token TEXT UNIQUE,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    is_active BOOLEAN,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP
);
```

---

## V4 Frontend Implementation

### Files Created in V4

```
TWCAKOV4/src/
├── types/domain/notifications.ts           # TypeScript interfaces
├── hooks/useNotifications.ts               # SWR hooks for data fetching
├── app/
│   ├── api/user/notifications/
│   │   ├── route.ts                        # List notifications proxy
│   │   ├── mark-read/route.ts              # Mark as read proxy
│   │   ├── unread-count/route.ts           # Unread count proxy
│   │   └── preferences/route.ts            # Preferences proxy
│   └── (dashboards)/notifications/
│       ├── page.tsx                        # Server component
│       ├── NotificationsClient.tsx         # Main client component
│       ├── _components/
│       │   └── NotificationList.tsx        # Notification list component
│       └── preferences/
│           ├── page.tsx                    # Preferences page
│           └── PreferencesClient.tsx       # Preferences client component
└── components/navbar/
    └── NotificationBell.tsx                # Navbar bell with dropdown
```

### Files Modified in V4

- `src/components/navbar/ResponsiveAppBar.tsx` - Added NotificationBell component

### Access V4 Notification Pages

- **List**: `http://localhost:3000/notifications`
- **Preferences**: `http://localhost:3000/notifications/preferences`

---

## Changelog

### 2026-02-15 - Initial Implementation
- Created notifications app with 5 models
- Implemented Strategy pattern for channels (in_app, sms, email, push)
- Added Celery tasks for async sending and retry
- Added API endpoints for CRUD and preferences
- Added dashboard pages (list, preferences)
- Added notification bell to navbar
- Seeded 18 default templates

### 2026-02-15 - V4 Frontend Implementation
- Created TypeScript types and interfaces
- Created SWR hooks for notifications
- Created Next.js API routes (proxy to Django)
- Created notification list and preferences pages
- Created NotificationBell navbar component with dropdown

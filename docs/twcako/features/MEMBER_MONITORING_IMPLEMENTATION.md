# Member Monitoring System - Implementation Guide

This document provides a complete guide to replicate the Member Monitoring feature in the V4 codebase.

**Created:** 2026-02-15
**Updated:** 2026-02-22 (Added Analytics & Historical Trending)
**Status:** Working in V3+V4 hybrid setup
**Purpose:** Track team member engagement, lifecycle stages, and automate follow-ups

---

## Table of Contents

1. [Overview](#1-overview)
2. [Backend Implementation (Django)](#2-backend-implementation-django)
3. [Frontend Implementation (Next.js V4)](#3-frontend-implementation-nextjs-v4)
4. [API Endpoints](#4-api-endpoints)
5. [Database Schema](#5-database-schema)
6. [Celery Tasks](#6-celery-tasks)
7. [File Structure](#7-file-structure)
8. [Step-by-Step Replication Guide](#8-step-by-step-replication-guide)
9. [Data Population & Testing](#9-data-population--testing)
10. [Analytics & Historical Trending](#10-analytics--historical-trending-added-2026-02-22)

---

## 1. Overview

### What It Does
- Tracks member engagement through login frequency, sales activity, training completion
- Assigns lifecycle stages: `new` → `onboarding` → `trained` → `active` → `at_risk` → `dormant` → `churned`
- Calculates engagement scores (0-100)
- Provides follow-up queue for sponsors/coaches
- Automates notifications for inactive members

### Key Features
- **Dashboard metrics**: Total members, active count, at-risk count, avg engagement
- **Lifecycle distribution chart**: Visual breakdown of team by stage
- **Follow-up queue**: Priority-sorted list of members needing attention
- **Team activity table**: Sortable, filterable list of all team members

---

## 2. Backend Implementation (Django)

### 2.1 Models

**File:** `accounts/models.py`

```python
class MemberActivity(models.Model):
    """
    Tracks member engagement metrics and lifecycle stage.
    One record per user, updated daily by Celery task.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='member_activity'
    )

    # Lifecycle Stage
    LIFECYCLE_STAGES = [
        ('new', 'New Member'),           # < 7 days since activation
        ('onboarding', 'Onboarding'),    # In training, ABC not completed
        ('trained', 'Trained'),          # ABC completed, no sales yet
        ('active', 'Active'),            # Making sales regularly
        ('at_risk', 'At Risk'),          # 14-29 days inactive
        ('dormant', 'Dormant'),          # 30-59 days inactive
        ('churned', 'Churned'),          # 60+ days inactive
    ]
    lifecycle_stage = models.CharField(
        max_length=20,
        choices=LIFECYCLE_STAGES,
        default='new',
        db_index=True
    )
    previous_stage = models.CharField(max_length=20, blank=True, null=True)
    stage_changed_at = models.DateTimeField(blank=True, null=True)

    # Engagement Score (0-100)
    engagement_score = models.PositiveIntegerField(default=0)

    # Login Metrics
    last_login = models.DateTimeField(blank=True, null=True)
    login_count_7d = models.PositiveIntegerField(default=0)
    login_count_30d = models.PositiveIntegerField(default=0)
    days_since_last_activity = models.PositiveIntegerField(default=0)

    # Sales Metrics
    total_sales_count = models.PositiveIntegerField(default=0)
    total_sales_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sales_count_this_month = models.PositiveIntegerField(default=0)
    sales_amount_this_month = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    last_sale_date = models.DateField(blank=True, null=True)
    average_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Funnel Metrics
    total_funnel_visitors = models.PositiveIntegerField(default=0)
    visitors_this_month = models.PositiveIntegerField(default=0)
    total_prospects = models.PositiveIntegerField(default=0)
    prospects_this_month = models.PositiveIntegerField(default=0)
    conversion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Team Metrics
    direct_downlines = models.PositiveIntegerField(default=0)
    team_size = models.PositiveIntegerField(default=0)
    active_team_members = models.PositiveIntegerField(default=0)

    # Training Metrics
    abc_completed = models.BooleanField(default=False)
    dbc_completed = models.BooleanField(default=False)
    abc_day1_completed = models.BooleanField(default=False)
    abc_day2_completed = models.BooleanField(default=False)
    abc_day3_completed = models.BooleanField(default=False)

    # Timestamps
    last_calculated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Member Activity'
        verbose_name_plural = 'Member Activities'
        indexes = [
            models.Index(fields=['lifecycle_stage', 'engagement_score']),
            models.Index(fields=['days_since_last_activity']),
        ]

    def calculate_engagement_score(self):
        """Calculate engagement score based on weighted factors."""
        score = 0

        # Login frequency (max 25 points)
        if self.login_count_7d >= 5:
            score += 25
        elif self.login_count_7d >= 3:
            score += 20
        elif self.login_count_7d >= 1:
            score += 10

        # Sales activity (max 30 points)
        if self.sales_count_this_month >= 5:
            score += 30
        elif self.sales_count_this_month >= 3:
            score += 20
        elif self.sales_count_this_month >= 1:
            score += 10

        # Training completion (max 20 points)
        if self.abc_completed:
            score += 15
        if self.dbc_completed:
            score += 5

        # Funnel activity (max 15 points)
        if self.prospects_this_month >= 10:
            score += 15
        elif self.prospects_this_month >= 5:
            score += 10
        elif self.prospects_this_month >= 1:
            score += 5

        # Recency bonus (max 10 points)
        if self.days_since_last_activity <= 1:
            score += 10
        elif self.days_since_last_activity <= 3:
            score += 7
        elif self.days_since_last_activity <= 7:
            score += 3

        self.engagement_score = min(score, 100)
        return self.engagement_score

    def determine_lifecycle_stage(self):
        """Determine lifecycle stage based on activity metrics."""
        old_stage = self.lifecycle_stage

        # Churned: 60+ days inactive
        if self.days_since_last_activity >= 60:
            self.lifecycle_stage = 'churned'
        # Dormant: 30-59 days inactive
        elif self.days_since_last_activity >= 30:
            self.lifecycle_stage = 'dormant'
        # At Risk: 14-29 days inactive
        elif self.days_since_last_activity >= 14:
            self.lifecycle_stage = 'at_risk'
        # Active: Has recent sales
        elif self.sales_count_this_month > 0 and self.abc_completed:
            self.lifecycle_stage = 'active'
        # Trained: ABC completed but no sales yet
        elif self.abc_completed:
            self.lifecycle_stage = 'trained'
        # Onboarding: Started but not completed training
        elif self.abc_day1_completed:
            self.lifecycle_stage = 'onboarding'
        # New: Fresh member
        else:
            self.lifecycle_stage = 'new'

        # Track stage changes
        if old_stage != self.lifecycle_stage:
            self.previous_stage = old_stage
            self.stage_changed_at = timezone.now()

        return self.lifecycle_stage


class MemberActivityLog(models.Model):
    """
    Event log for member activities.
    Used for tracking specific events and stage transitions.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='activity_logs'
    )

    EVENT_TYPES = [
        ('login', 'Logged In'),
        ('logout', 'Logged Out'),
        ('sale', 'Sale Completed'),
        ('training_started', 'Training Started'),
        ('training_completed', 'Training Completed'),
        ('prospect_added', 'Prospect Added'),
        ('stage_change', 'Lifecycle Stage Changed'),
        ('follow_up', 'Follow-up Completed'),
        ('note_added', 'Note Added'),
    ]
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES, db_index=True)
    event_data = models.JSONField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    # Optional: Link to related object
    related_object_type = models.CharField(max_length=50, blank=True, null=True)
    related_object_id = models.PositiveIntegerField(blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'event_type', 'timestamp']),
        ]
```

### 2.2 Signals for Login Tracking

**File:** `accounts/signals.py`

```python
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from django.utils import timezone
from .models import MemberActivity, MemberActivityLog

@receiver(user_logged_in)
def track_user_login(sender, request, user, **kwargs):
    """Track user login and update MemberActivity."""
    activity, created = MemberActivity.objects.get_or_create(user=user)
    activity.last_login = timezone.now()
    activity.save(update_fields=['last_login'])

    # Log the event
    MemberActivityLog.objects.create(
        user=user,
        event_type='login',
        event_data={
            'ip_address': get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200],
        }
    )

@receiver(user_logged_out)
def track_user_logout(sender, request, user, **kwargs):
    """Track user logout."""
    if user:
        MemberActivityLog.objects.create(
            user=user,
            event_type='logout',
            event_data={}
        )

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')
```

### 2.3 API Views

**File:** `api/views/member_monitoring.py`

```python
"""
Member Monitoring API Views

Endpoints:
- GET /member-activity/ - User's own activity
- GET /member-activity/logs/ - User's activity logs
- GET /member-activity/team/ - Team member activities (for sponsors)
- GET /member-activity/follow-up-queue/ - Members needing follow-up
- GET /member-activity/dashboard/ - Aggregated dashboard metrics
- GET /member-activity/lifecycle-stages/ - Available stage choices
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg, Q
from django.utils import timezone
from datetime import timedelta

from accounts.models import User, MemberActivity, MemberActivityLog, TeamMember


class MemberMonitoringDashboardAPIView(APIView):
    """
    GET /api/member-activity/dashboard/
    Returns aggregated statistics for dashboard.
    """
    permission_classes = [IsAuthenticated]

    STAGE_CONFIG = {
        'new': {'label': 'New Member', 'color': '#4CAF50'},
        'onboarding': {'label': 'Onboarding', 'color': '#2196F3'},
        'trained': {'label': 'Trained', 'color': '#9C27B0'},
        'active': {'label': 'Active', 'color': '#00BCD4'},
        'at_risk': {'label': 'At Risk', 'color': '#FF9800'},
        'dormant': {'label': 'Dormant', 'color': '#795548'},
        'churned': {'label': 'Churned', 'color': '#F44336'},
    }

    def get(self, request):
        user = request.user

        # Get team member IDs
        team_member_ids = TeamMember.objects.filter(
            sponsor=user
        ).values_list('user_id', flat=True)

        team_size = len(team_member_ids)

        if not team_member_ids:
            return Response({
                'metrics': {
                    'total_team_members': 0,
                    'active_members': 0,
                    'at_risk_members': 0,
                    'avg_engagement_score': 0,
                    'lifecycle_distribution': [],
                    'recent_stage_changes': [],
                }
            })

        # Stage distribution
        stage_counts = MemberActivity.objects.filter(
            user_id__in=team_member_ids
        ).values('lifecycle_stage').annotate(count=Count('id'))

        stages = {item['lifecycle_stage']: item['count'] for item in stage_counts}
        total_with_activity = sum(stages.values())

        # Build lifecycle_distribution array
        lifecycle_distribution = []
        for stage_key, config in self.STAGE_CONFIG.items():
            count = stages.get(stage_key, 0)
            percentage = (count / total_with_activity * 100) if total_with_activity > 0 else 0
            lifecycle_distribution.append({
                'stage': stage_key,
                'label': config['label'],
                'count': count,
                'percentage': round(percentage, 1),
                'color': config['color'],
            })

        # Engagement stats
        engagement_stats = MemberActivity.objects.filter(
            user_id__in=team_member_ids
        ).aggregate(
            avg_score=Avg('engagement_score'),
            active_7d=Count('id', filter=Q(login_count_7d__gt=0)),
        )

        active_members = stages.get('active', 0) + engagement_stats['active_7d']
        at_risk_members = stages.get('at_risk', 0) + stages.get('dormant', 0)

        # Recent stage changes
        recent_changes = MemberActivityLog.objects.filter(
            user_id__in=team_member_ids,
            event_type='stage_change',
            timestamp__gte=timezone.now() - timedelta(days=7)
        ).select_related('user').order_by('-timestamp')[:10]

        recent_stage_changes = []
        for log in recent_changes:
            event_data = log.event_data or {}
            recent_stage_changes.append({
                'user_id': log.user.id,
                'username': log.user.username,
                'from_stage': event_data.get('from_stage', 'unknown'),
                'to_stage': event_data.get('to_stage', 'unknown'),
                'changed_at': log.timestamp.isoformat(),
            })

        return Response({
            'metrics': {
                'total_team_members': team_size,
                'active_members': active_members,
                'at_risk_members': at_risk_members,
                'avg_engagement_score': round(engagement_stats['avg_score'] or 0, 1),
                'lifecycle_distribution': lifecycle_distribution,
                'recent_stage_changes': recent_stage_changes,
            }
        })


class TeamMemberActivityAPIView(APIView):
    """
    GET /api/member-activity/team/
    Returns team member activity list.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        team_members = TeamMember.objects.filter(
            sponsor=user
        ).select_related('user', 'user__member_activity')

        if not team_members.exists():
            return Response({'team_members': [], 'total_count': 0})

        results = []
        for tm in team_members:
            member_user = tm.user
            try:
                activity = member_user.member_activity
                results.append({
                    'user_id': member_user.id,
                    'username': member_user.username,
                    'full_name': member_user.get_full_name() or member_user.username,
                    'email': member_user.email,
                    'lifecycle_stage': activity.lifecycle_stage,
                    'engagement_score': activity.engagement_score,
                    'last_login': activity.last_login.isoformat() if activity.last_login else None,
                    'days_since_last_activity': activity.days_since_last_activity,
                    'sales_count_this_month': activity.sales_count_this_month,
                    'training_completed': activity.abc_completed,
                })
            except MemberActivity.DoesNotExist:
                results.append({
                    'user_id': member_user.id,
                    'username': member_user.username,
                    'full_name': member_user.get_full_name() or member_user.username,
                    'email': member_user.email,
                    'lifecycle_stage': 'new',
                    'engagement_score': 0,
                    'last_login': None,
                    'days_since_last_activity': 0,
                    'sales_count_this_month': 0,
                    'training_completed': False,
                })

        return Response({
            'team_members': results,
            'total_count': len(results),
        })


class FollowUpQueueAPIView(APIView):
    """
    GET /api/member-activity/follow-up-queue/
    Returns prioritized follow-up queue.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        team_member_ids = TeamMember.objects.filter(
            sponsor=user
        ).values_list('user_id', flat=True)

        if not team_member_ids:
            return Response({'queue': [], 'total_count': 0})

        # Dormant (highest priority)
        dormant = MemberActivity.objects.filter(
            user_id__in=team_member_ids,
            lifecycle_stage='dormant'
        ).select_related('user').order_by('-days_since_last_activity')

        # At-risk (medium priority)
        at_risk = MemberActivity.objects.filter(
            user_id__in=team_member_ids,
            lifecycle_stage='at_risk'
        ).select_related('user').order_by('-days_since_last_activity')

        # Needs training (lower priority)
        needs_training = MemberActivity.objects.filter(
            user_id__in=team_member_ids,
            lifecycle_stage='onboarding',
            abc_completed=False
        ).select_related('user')

        def serialize(activity, priority, action):
            return {
                'user_id': activity.user.id,
                'username': activity.user.username,
                'full_name': activity.user.get_full_name() or activity.user.username,
                'email': activity.user.email or '',
                'mobile': activity.user.mobile or '',
                'lifecycle_stage': activity.lifecycle_stage,
                'engagement_score': activity.engagement_score,
                'days_inactive': activity.days_since_last_activity,
                'last_login': activity.last_login.isoformat() if activity.last_login else None,
                'suggested_action': action,
                'priority': priority,
            }

        queue = []
        for a in dormant:
            queue.append(serialize(a, 'high', 'Re-engagement call needed - inactive 30+ days'))
        for a in at_risk:
            queue.append(serialize(a, 'medium', 'Check-in recommended - showing signs of disengagement'))
        for a in needs_training:
            queue.append(serialize(a, 'low', 'Training follow-up - ABC not completed'))

        return Response({'queue': queue, 'total_count': len(queue)})
```

### 2.4 URL Registration

**File:** `api/urls.py`

```python
from api.views.member_monitoring import (
    MemberActivityAPIView,
    MemberActivityLogsAPIView,
    TeamMemberActivityAPIView,
    FollowUpQueueAPIView,
    MemberMonitoringDashboardAPIView,
    LifecycleStageChoicesAPIView,
)

urlpatterns = [
    # ... existing urls ...

    # Member Monitoring
    path('member-activity/', MemberActivityAPIView.as_view(), name='member-activity'),
    path('member-activity/logs/', MemberActivityLogsAPIView.as_view(), name='member-activity-logs'),
    path('member-activity/team/', TeamMemberActivityAPIView.as_view(), name='member-activity-team'),
    path('member-activity/follow-up-queue/', FollowUpQueueAPIView.as_view(), name='member-activity-followup'),
    path('member-activity/dashboard/', MemberMonitoringDashboardAPIView.as_view(), name='member-activity-dashboard'),
    path('member-activity/lifecycle-stages/', LifecycleStageChoicesAPIView.as_view(), name='lifecycle-stages'),
]
```

---

## 3. Frontend Implementation (Next.js V4)

### 3.1 TypeScript Types

**File:** `src/types/domain/memberMonitoring.ts`

```typescript
export type LifecycleStage =
  | 'new'
  | 'onboarding'
  | 'trained'
  | 'active'
  | 'at_risk'
  | 'dormant'
  | 'churned';

export interface LifecycleStageInfo {
  value: LifecycleStage;
  label: string;
  color: string;
}

export const LIFECYCLE_STAGES: LifecycleStageInfo[] = [
  { value: 'new', label: 'New Member', color: '#4CAF50' },
  { value: 'onboarding', label: 'Onboarding', color: '#2196F3' },
  { value: 'trained', label: 'Trained', color: '#9C27B0' },
  { value: 'active', label: 'Active', color: '#00BCD4' },
  { value: 'at_risk', label: 'At Risk', color: '#FF9800' },
  { value: 'dormant', label: 'Dormant', color: '#795548' },
  { value: 'churned', label: 'Churned', color: '#F44336' },
];

export interface TeamMemberActivity {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  lifecycle_stage: LifecycleStage;
  engagement_score: number;
  last_login: string | null;
  days_since_last_activity: number;
  sales_count_this_month: number;
  training_completed: boolean;
}

export interface FollowUpItem {
  user_id: number;
  username: string;
  full_name: string;
  lifecycle_stage: LifecycleStage;
  engagement_score: number;
  days_inactive: number;
  last_login: string | null;
  suggested_action: string;
  priority: 'high' | 'medium' | 'low';
  email: string;
  mobile: string;
}

export interface LifecycleDistribution {
  stage: LifecycleStage;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface DashboardMetrics {
  total_team_members: number;
  active_members: number;
  at_risk_members: number;
  avg_engagement_score: number;
  lifecycle_distribution: LifecycleDistribution[];
  recent_stage_changes: {
    user_id: number;
    username: string;
    from_stage: LifecycleStage;
    to_stage: LifecycleStage;
    changed_at: string;
  }[];
}

export interface DashboardResponse {
  metrics: DashboardMetrics;
}

export interface TeamActivityResponse {
  team_members: TeamMemberActivity[];
  total_count: number;
}

export interface FollowUpQueueResponse {
  queue: FollowUpItem[];
  total_count: number;
}
```

### 3.2 SWR Hooks

**File:** `src/hooks/useMemberMonitoring.ts`

```typescript
import useSWR from "swr";
import { authGetFetcher } from "@/lib/fetcher";
import type {
  DashboardResponse,
  TeamActivityResponse,
  FollowUpQueueResponse,
} from "@/types/domain/memberMonitoring";

export const MEMBER_MONITORING_DASHBOARD_KEY = "/api/user/monitoring/members";
export const MEMBER_MONITORING_TEAM_KEY = "/api/user/monitoring/team";
export const MEMBER_MONITORING_FOLLOWUP_KEY = "/api/user/monitoring/follow-up";

export function useMemberMonitoringDashboard() {
  const { data, error, isLoading, mutate } = useSWR<DashboardResponse>(
    MEMBER_MONITORING_DASHBOARD_KEY,
    (url) => authGetFetcher<DashboardResponse>(url) as Promise<DashboardResponse>,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  return {
    metrics: data?.metrics ?? null,
    isLoading,
    isError: !!error,
    error: error?.message ?? null,
    mutate,
  };
}

export function useTeamActivity() {
  const { data, error, isLoading, mutate } = useSWR<TeamActivityResponse>(
    MEMBER_MONITORING_TEAM_KEY,
    (url) => authGetFetcher<TeamActivityResponse>(url) as Promise<TeamActivityResponse>,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  return {
    teamMembers: data?.team_members ?? [],
    totalCount: data?.total_count ?? 0,
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useFollowUpQueue() {
  const { data, error, isLoading, mutate } = useSWR<FollowUpQueueResponse>(
    MEMBER_MONITORING_FOLLOWUP_KEY,
    (url) => authGetFetcher<FollowUpQueueResponse>(url) as Promise<FollowUpQueueResponse>,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  return {
    queue: data?.queue ?? [],
    totalCount: data?.total_count ?? 0,
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useMemberMonitoring() {
  const dashboard = useMemberMonitoringDashboard();
  const team = useTeamActivity();
  const followUp = useFollowUpQueue();

  return {
    metrics: dashboard.metrics,
    metricsLoading: dashboard.isLoading,
    teamMembers: team.teamMembers,
    teamCount: team.totalCount,
    teamLoading: team.isLoading,
    followUpQueue: followUp.queue,
    followUpCount: followUp.totalCount,
    followUpLoading: followUp.isLoading,
    isLoading: dashboard.isLoading || team.isLoading || followUp.isLoading,
    refreshAll: () => {
      dashboard.mutate();
      team.mutate();
      followUp.mutate();
    },
  };
}
```

### 3.3 API Routes (Proxy to Django)

**File:** `src/app/api/user/monitoring/members/route.ts`

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serverApi } from "@/lib/api/server";
import { withRouteError } from "@/lib/api/routeErrors";
import type { DashboardResponse } from "@/types/domain/memberMonitoring";

const DJANGO_BASE = process.env.DJANGO_API_BASE ?? "";

export const GET = withRouteError(async () => {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const dashboardUrl = `${DJANGO_BASE.replace(/\/+$/, "")}/member-activity/dashboard/`;

  const data = await serverApi<DashboardResponse>(dashboardUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
    nullOn404: true,
  });

  return NextResponse.json(data ?? { metrics: null }, { status: 200 });
});
```

**Similar files for:**
- `src/app/api/user/monitoring/team/route.ts` → proxies to `/member-activity/team/`
- `src/app/api/user/monitoring/follow-up/route.ts` → proxies to `/member-activity/follow-up-queue/`

### 3.4 Page Components

**File:** `src/app/(dashboards)/member-monitoring/page.tsx`

```typescript
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Box } from "@mui/material";
import MemberMonitoringClient from "./MemberMonitoringClient";

export default async function MemberMonitoringPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <Box component="main" sx={{ width: "100%", py: 2 }}>
      <MemberMonitoringClient initialUser={session.profile ?? null} />
    </Box>
  );
}
```

### 3.5 Client Component Structure

**File:** `src/app/(dashboards)/member-monitoring/MemberMonitoringClient.tsx`

Key components:
- `EngagementMetrics.tsx` - 4 summary cards
- `LifecycleChart.tsx` - Pie chart using recharts
- `FollowUpQueue.tsx` - Priority-sorted list
- `TeamActivityTable.tsx` - DataGrid table

### 3.6 Navigation Menu Item

**File:** `src/config/menuItems.ts`

Add to the default dashboard menu:

```typescript
isDistributor && {
  title: "Team Monitoring",
  icon: "users-group-two-rounded-outline",
  href: "/member-monitoring",
  bgcolor: "primary",
  chip: "New",
  chipColor: "success",
  selected: currentPathname.startsWith("/member-monitoring"),
},
```

### 3.7 Required Dependencies

```bash
npm install recharts
```

---

## 4. API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/member-activity/` | GET | Yes | User's own activity metrics |
| `/member-activity/logs/` | GET | Yes | User's activity event log |
| `/member-activity/team/` | GET | Yes | Team members' activity (for sponsors) |
| `/member-activity/follow-up-queue/` | GET | Yes | Prioritized follow-up queue |
| `/member-activity/dashboard/` | GET | Yes | Aggregated dashboard metrics |
| `/member-activity/lifecycle-stages/` | GET | Yes | Available stage choices |
| `/member-activity/<user_id>/` | GET | Yes | **Individual member detail** (sponsor only) |
| `/member-activity/<user_id>/trend/` | GET | Yes | **Member engagement trend** (7/30/90 days) |
| `/member-activity/analytics/team-trend/` | GET | Yes | **Team analytics trend** (historical) |
| `/member-activity/analytics/comparison/` | GET | Yes | **Period comparison** (week/month) |
| `/member-activity/analytics/top-performers/` | GET | Yes | **Top performers** leaderboard |

### 4.1 Member Detail Endpoint (Added 2026-02-22)

**Endpoint:** `GET /api/member-activity/<user_id>/`

Returns comprehensive activity data for a specific team member. Only accessible to the member's sponsor.

**Response Fields:**
- **Profile:** user_id, username, full_name, email, mobile, membership_type, date_activated, profile_image
- **Lifecycle:** lifecycle_stage, lifecycle_stage_display, lifecycle_stage_color, previous_stage, stage_changed_at
- **Engagement:** engagement_score, last_login, login_count_7d, login_count_30d, days_since_last_activity
- **Sales:** total_sales_count, total_sales_amount, sales_count_this_month, sales_amount_this_month, last_sale_date, average_order_value
- **Funnel:** total_funnel_visitors, visitors_this_month, total_prospects, prospects_this_month, conversion_rate
- **Team:** direct_downlines, team_size, active_team_members
- **Training:** training_progress (abc/dbc day-by-day progress, completion status)
- **Activity:** recent_activity (last 30 days of event logs)

---

## 5. Database Schema

### MemberActivity Table

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| user_id | INT FK | Links to User |
| lifecycle_stage | VARCHAR(20) | Current stage |
| engagement_score | INT | 0-100 score |
| last_login | DATETIME | Last login timestamp |
| login_count_7d | INT | Logins in last 7 days |
| login_count_30d | INT | Logins in last 30 days |
| days_since_last_activity | INT | Days since last activity |
| sales_count_this_month | INT | Sales this month |
| abc_completed | BOOL | Training completed |
| ... | ... | ... |

### MemberActivityLog Table

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| user_id | INT FK | Links to User |
| event_type | VARCHAR(30) | Type of event |
| event_data | JSON | Additional event data |
| timestamp | DATETIME | When event occurred |

---

## 6. Celery Tasks

**Status:** ✅ Fully Implemented (2026-02-22)

### 6.1 Scheduled Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| `accounts.calculate_member_kpis` | Daily 3:00 AM | Calculate all member KPIs, engagement scores, lifecycle stages |
| `accounts.check_at_risk_members` | Every 6 hours | Detect at-risk/dormant members, create follow-up alerts |
| `accounts.reset_monthly_metrics` | 1st of month | Reset monthly counters (sales, visitors, prospects) |

### 6.2 On-Demand Tasks

| Task | Trigger | Description |
|------|---------|-------------|
| `accounts.update_login_activity` | Login signal | Update last_login, log login event |
| `accounts.log_training_event` | Training completion | Log ABC/DBC day attendance |
| `accounts.log_sale_event` | Sale completed | Update sales metrics, log event |
| `accounts.generate_team_activity_report` | API request | Generate team report for sponsor |

### 6.3 Implementation Details

**File:** `accounts/tasks.py`

```python
@shared_task(name='accounts.calculate_member_kpis')
def calculate_member_kpis():
    """
    Daily KPI calculation for all active members.

    Updates:
    - Login counts (7d, 30d)
    - Sales metrics (count, amount, AOV)
    - Funnel metrics (visitors, prospects, conversion rate)
    - Team metrics (direct downlines, team size)
    - Days since last activity
    - Engagement score (0-100)
    - Lifecycle stage

    Performance: Uses bulk queries, processes ~1000 members/minute
    """

@shared_task(name='accounts.check_at_risk_members')
def check_at_risk_members():
    """
    Detect members becoming at-risk or dormant.
    Creates MemberActivityLog entries for follow-up queue.

    Detects:
    - Newly at-risk (14-16 days inactive)
    - Newly dormant (30-32 days inactive)
    - High-value at-risk (had sales but now inactive)
    """

@shared_task(name='accounts.update_login_activity')
def update_login_activity(user_id, ip_address=None, user_agent=None):
    """
    Called from login signal handler.
    Updates last_login and creates login event log.
    """

@shared_task(name='accounts.log_training_event')
def log_training_event(user_id, training_type, day_number, attended_date=None):
    """
    Log training day completion.
    Args:
        training_type: 'abc' or 'dbc'
        day_number: 1, 2, 3, or 4 (for DBC)
    """

@shared_task(name='accounts.log_sale_event')
def log_sale_event(user_id, amount, order_id=None, sale_type='sale'):
    """
    Log sale and update member sales metrics.
    Detects first sale for special event logging.
    """
```

### 6.4 Celery Beat Schedule

**File:** `twcako/celery.py`

```python
app.conf.beat_schedule = {
    # ... other tasks ...

    # MEMBER MONITORING TASKS
    'member-calculate-kpis': {
        'task': 'accounts.calculate_member_kpis',
        'schedule': crontab(hour=3, minute=0),
    },
    'member-check-at-risk': {
        'task': 'accounts.check_at_risk_members',
        'schedule': crontab(minute=15, hour='*/6'),  # Every 6 hours
    },
    'member-reset-monthly': {
        'task': 'accounts.reset_monthly_metrics',
        'schedule': crontab(hour=0, minute=1, day_of_month=1),
    },
}
```

### 6.5 Engagement Score Calculation

The engagement score (0-100) is calculated from multiple factors:

| Factor | Points | Calculation |
|--------|--------|-------------|
| Login frequency | 0-25 | `min(25, login_count_7d * 5)` |
| Sales activity | 0-30 | `min(30, sales_count_this_month * 6)` |
| Training completion | 0-20 | ABC=15, DBC=5 |
| Funnel activity | 0-15 | `min(15, prospects_this_month * 1.5)` |
| Recency bonus | 0-10 | Based on days_since_last_activity |

### 6.6 Lifecycle Stage Determination

| Stage | Condition |
|-------|-----------|
| `new` | < 7 days since activation |
| `onboarding` | Started training, ABC not completed |
| `trained` | ABC completed, no sales yet |
| `active` | Has recent sales activity |
| `at_risk` | 14-29 days inactive |
| `dormant` | 30-59 days inactive |
| `churned` | 60+ days inactive |

---

## 7. File Structure

### Backend (Django)

```
TWCako/
├── accounts/
│   ├── models.py                    # MemberActivity, MemberActivityLog
│   ├── signals.py                   # Login/logout tracking
│   ├── tasks.py                     # Celery tasks
│   ├── admin.py                     # Admin registration
│   └── management/commands/
│       ├── seed_monitoring_data.py  # Test data seeder
│       └── backfill_member_activity.py  # Backfill existing users
├── api/
│   ├── urls.py                      # URL registration
│   └── views/
│       ├── auth.py                  # V4 auth endpoints
│       └── member_monitoring.py     # Monitoring endpoints
└── twcako/
    └── celery.py                    # Beat schedule
```

### Frontend (Next.js V4)

```
TWCAKOV4/src/
├── types/domain/
│   └── memberMonitoring.ts          # TypeScript interfaces (includes analytics types)
├── hooks/
│   └── useMemberMonitoring.ts       # SWR hooks (includes analytics hooks)
├── app/
│   ├── api/user/monitoring/
│   │   ├── members/route.ts         # Dashboard proxy
│   │   ├── team/route.ts            # Team proxy
│   │   ├── follow-up/route.ts       # Follow-up proxy
│   │   ├── [userId]/
│   │   │   ├── route.ts             # Member detail proxy
│   │   │   └── trend/route.ts       # Member trend proxy (Added 2026-02-22)
│   │   └── analytics/               # Analytics endpoints (Added 2026-02-22)
│   │       ├── team-trend/route.ts
│   │       ├── comparison/route.ts
│   │       └── top-performers/route.ts
│   └── (dashboards)/member-monitoring/
│       ├── page.tsx                 # Server component
│       ├── MemberMonitoringClient.tsx  # Main client (with Analytics link)
│       ├── _components/
│       │   ├── EngagementMetrics.tsx
│       │   ├── LifecycleChart.tsx
│       │   ├── FollowUpQueue.tsx
│       │   └── TeamActivityTable.tsx
│       ├── analytics/               # Analytics Dashboard (Added 2026-02-22)
│       │   ├── page.tsx
│       │   ├── AnalyticsClient.tsx
│       │   └── _components/
│       │       ├── TeamTrendChart.tsx
│       │       ├── ComparisonCards.tsx
│       │       └── TopPerformersTable.tsx
│       └── [userId]/                # Member Detail Page
│           ├── page.tsx
│           ├── MemberDetailClient.tsx
│           └── _components/
│               ├── MemberProfileCard.tsx
│               ├── EngagementOverview.tsx
│               ├── SalesMetrics.tsx
│               ├── FunnelMetrics.tsx
│               ├── TrainingProgress.tsx
│               ├── RecentActivityLog.tsx
│               └── EngagementTrendChart.tsx  # (Added 2026-02-22)
└── config/
    └── menuItems.ts                 # Navigation menu
```

---

## 8. Step-by-Step Replication Guide

### Phase 1: Backend Setup

1. **Add Models** to your accounts app
2. **Create Migration**: `python manage.py makemigrations accounts`
3. **Apply Migration**: `python manage.py migrate`
4. **Add Signals** for login tracking
5. **Create API Views** in `api/views/member_monitoring.py`
6. **Register URLs** in `api/urls.py`
7. **Add Celery Tasks** and beat schedule
8. **Test with curl**:
   ```bash
   curl http://api.your-domain.com/member-activity/dashboard/ \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Phase 2: Frontend Setup

1. **Create Types** in `src/types/domain/memberMonitoring.ts`
2. **Create Hooks** in `src/hooks/useMemberMonitoring.ts`
3. **Create API Routes** to proxy to Django
4. **Create Page** at `src/app/(dashboards)/member-monitoring/`
5. **Create Components**:
   - EngagementMetrics (4 cards)
   - LifecycleChart (pie chart)
   - FollowUpQueue (list)
   - TeamActivityTable (DataGrid)
6. **Install recharts**: `npm install recharts`
7. **Add Navigation Link** in menuItems.ts

### Phase 3: Testing

1. **Seed Test Data**: `python manage.py seed_monitoring_data`
2. **Run Both Servers**:
   - Django: `python manage.py runserver 8000`
   - Next.js: `npm run dev`
3. **Verify Dashboard** at `/member-monitoring`

### Phase 4: Production

1. **Run migrations** on production DB
2. **Backfill existing users**: `python manage.py backfill_member_activity`
3. **Enable Celery Beat** for automated daily updates
4. **Configure notifications** for automated follow-ups

---

---

## 9. Data Population & Testing

### 9.1 Login Tracking Signal

Login events are automatically tracked via Django signals in `accounts/signals.py`:

```python
from django.contrib.auth.signals import user_logged_in, user_logged_out

@receiver(user_logged_in)
def track_user_login(sender, request, user, **kwargs):
    """Updates MemberActivity.last_login and creates activity log entry."""
    activity, created = MemberActivity.objects.get_or_create(user=user)
    activity.last_login = timezone.now()
    activity.save(update_fields=['last_login'])

    MemberActivityLog.objects.create(
        user=user,
        event_type='login',
        event_data={'ip_address': get_client_ip(request), ...}
    )
```

**Important:** After adding/modifying signals, restart the Django server for changes to take effect.

### 9.2 Manual KPI Update (Django Shell)

To manually update a user's KPIs for testing:

```bash
cd TWCako
USE_RAILWAY_DB=0 USE_POSTGRES=1 POSTGRES_PORT=5433 python3 manage.py shell
```

```python
from accounts.models import MemberActivity, User
from django.utils import timezone

user = User.objects.get(username='kentlucky')
activity, _ = MemberActivity.objects.get_or_create(user=user)

# Set values
activity.last_login = timezone.now()
activity.login_count_7d = 5
activity.login_count_30d = 12
activity.days_since_last_activity = 0
activity.total_sales_count = 25
activity.total_sales_amount = 45000
activity.sales_count_this_month = 8
activity.sales_amount_this_month = 15000
activity.average_order_value = 1800
activity.total_prospects = 50
activity.prospects_this_month = 15
activity.conversion_rate = 12.5
activity.abc_completed = True
activity.abc_day1_completed = True
activity.abc_day2_completed = True
activity.abc_day3_completed = True
activity.direct_downlines = 3
activity.team_size = 5
activity.active_team_members = 4

# Calculate score and stage
activity.calculate_engagement_score()
activity.determine_lifecycle_stage()
activity.save()

print(f'Engagement: {activity.engagement_score}, Stage: {activity.lifecycle_stage}')
```

### 9.3 Seeding Trend Data (For Charts)

To create historical snapshot data for the engagement trend chart:

```python
from accounts.models import MemberActivitySnapshot, User
from datetime import date, timedelta
import random

user = User.objects.get(username='kentlucky')

# Create 30 days of snapshot data
today = date.today()
for i in range(30):
    d = today - timedelta(days=29-i)
    base_score = 60 + i * 1.2  # Trending up
    score = min(100, int(base_score + random.randint(-5, 5)))

    MemberActivitySnapshot.objects.update_or_create(
        user=user,
        date=d,
        defaults={
            'engagement_score': score,
            'lifecycle_stage': 'active' if score > 70 else 'trained',
            'sales_count_mtd': random.randint(0, 3),
            'sales_amount_mtd': random.randint(0, 5000),
            'prospects_mtd': random.randint(0, 5),
            'days_since_last_activity': max(0, 30-i-random.randint(0,3)),
        }
    )

print(f'Created 30 days of trend data')
```

### 9.4 Celery Tasks for Production

In production, these Celery Beat tasks run automatically:

| Task | Schedule | Purpose |
|------|----------|---------|
| `accounts.calculate_member_kpis` | Daily 3:00 AM | Calculate all member KPIs, engagement scores, lifecycle stages |
| `accounts.check_at_risk_members` | Every 6 hours | Detect at-risk/dormant members, create follow-up alerts |
| `accounts.reset_monthly_metrics` | 1st of month | Reset monthly counters (sales, visitors, prospects) |
| `accounts.capture_daily_snapshots` | Daily 11:55 PM | Capture historical snapshots for trend charts |

To run KPI calculation manually:

```bash
# For all users (slow - 57k+ users)
python3 manage.py shell -c "from accounts.tasks import calculate_member_kpis; calculate_member_kpis()"

# Or trigger via Celery
celery -A twcako call accounts.calculate_member_kpis
```

### 9.5 Troubleshooting

**Stats showing zeros:**
1. Check if `MemberActivity` record exists for the user
2. Verify Celery tasks have run (check `last_calculated` field)
3. Run manual KPI update (see 9.2)

**Login not tracking:**
1. Restart Django server after signal changes
2. Check `MemberActivityLog` for login events:
   ```python
   MemberActivityLog.objects.filter(user=user, event_type='login').order_by('-timestamp')[:5]
   ```

**Trend chart empty:**
1. Check if `MemberActivitySnapshot` records exist:
   ```python
   MemberActivitySnapshot.objects.filter(user=user).count()
   ```
2. Run snapshot seeding script (see 9.3)
3. Verify the `capture_daily_snapshots` Celery task is scheduled

**Migrations not applied:**
```bash
python3 manage.py showmigrations accounts | grep -E "0328|0329|0330"
# Should show [X] for all three
python3 manage.py migrate accounts
```

---

## 10. Analytics & Historical Trending (Added 2026-02-22)

### 10.1 Overview

The analytics module provides historical trend data and team performance insights:
- **Member Engagement Trends** - Track individual member engagement over time
- **Team Analytics Trends** - Aggregate team performance trends
- **Period Comparison** - Week-over-week and month-over-month comparisons
- **Top Performers** - Leaderboards by engagement, sales, or prospects

### 10.2 Database Models

**File:** `accounts/models.py`

```python
class MemberActivitySnapshot(models.Model):
    """
    Daily snapshot of member activity metrics for historical trending.
    Created by Celery task: accounts.capture_daily_snapshots (runs at 11:55 PM)
    """
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='activity_snapshots')
    date = models.DateField(db_index=True)

    engagement_score = models.PositiveIntegerField(default=0)
    lifecycle_stage = models.CharField(max_length=20)
    login_count = models.PositiveIntegerField(default=0)
    days_since_last_activity = models.PositiveIntegerField(default=0)

    # Sales metrics (as of this date)
    total_sales_count = models.PositiveIntegerField(default=0)
    total_sales_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sales_count_mtd = models.PositiveIntegerField(default=0)
    sales_amount_mtd = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Funnel metrics
    total_prospects = models.PositiveIntegerField(default=0)
    prospects_mtd = models.PositiveIntegerField(default=0)
    conversion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        unique_together = ['user', 'date']
        ordering = ['-date']


class TeamAnalyticsSnapshot(models.Model):
    """
    Daily snapshot of team-level analytics for sponsors/coaches.
    """
    sponsor = models.ForeignKey('User', on_delete=models.CASCADE, related_name='team_snapshots')
    date = models.DateField(db_index=True)

    total_team_members = models.PositiveIntegerField(default=0)
    active_members = models.PositiveIntegerField(default=0)
    at_risk_members = models.PositiveIntegerField(default=0)
    dormant_members = models.PositiveIntegerField(default=0)

    avg_engagement_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    lifecycle_distribution = models.JSONField(default=dict)

    team_sales_mtd = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    members_with_sales = models.PositiveIntegerField(default=0)
    training_completion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        unique_together = ['sponsor', 'date']
        ordering = ['-date']
```

### 10.3 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/member-activity/<user_id>/trend/` | GET | Individual member engagement trend (7/30/90 days) |
| `/member-activity/analytics/team-trend/` | GET | Team-level analytics trend |
| `/member-activity/analytics/comparison/` | GET | Period-over-period comparison (week/month) |
| `/member-activity/analytics/top-performers/` | GET | Top performers by metric (engagement/sales/prospects) |

### 10.4 V4 API Routes

**File Structure:**
```
TWCAKOV4/src/app/api/user/monitoring/
├── [userId]/
│   ├── route.ts              # Member detail
│   └── trend/
│       └── route.ts          # Member engagement trend
└── analytics/
    ├── team-trend/
    │   └── route.ts          # Team analytics trend
    ├── comparison/
    │   └── route.ts          # Period comparison
    └── top-performers/
        └── route.ts          # Top performers leaderboard
```

### 10.5 TypeScript Types

**File:** `src/types/domain/memberMonitoring.ts` (additions)

```typescript
// Member Engagement Trend
export interface MemberEngagementTrendPoint {
  date: string;
  engagement_score: number;
  lifecycle_stage: LifecycleStage;
  sales_count_mtd: number;
  sales_amount_mtd: number;
  prospects_mtd: number;
  days_since_last_activity: number;
}

export interface MemberEngagementTrendResponse {
  user_id: number;
  days: number;
  data_points: number;
  trend_direction: 'up' | 'down' | 'stable';
  trend_change: number;
  trend: MemberEngagementTrendPoint[];
}

// Team Analytics Trend
export interface TeamAnalyticsTrendPoint {
  date: string;
  total_team_members: number;
  active_members: number;
  at_risk_members: number;
  dormant_members: number;
  avg_engagement_score: number;
  team_sales_mtd: number;
  members_with_sales: number;
  training_completion_rate: number;
  lifecycle_distribution: Record<LifecycleStage, number>;
}

export interface TeamAnalyticsTrendResponse {
  sponsor_id: number;
  days: number;
  data_points: number;
  trend: TeamAnalyticsTrendPoint[];
  summary: TeamAnalyticsTrendSummary | null;
}

// Period Comparison
export interface TeamComparisonResponse {
  period: 'week' | 'month';
  current_period: { start: string; end: string; data: TeamComparisonPeriodData | null };
  previous_period: { start: string; end: string; data: TeamComparisonPeriodData | null };
  changes: TeamComparisonChanges | null;
}

// Top Performers
export interface TopPerformerItem {
  rank: number;
  user_id: number;
  username: string;
  full_name: string;
  engagement_score: number;
  lifecycle_stage: LifecycleStage;
  sales_this_month: number;
  sales_count_this_month: number;
  prospects_this_month: number;
  abc_completed: boolean;
}

export interface TopPerformersResponse {
  metric: 'engagement' | 'sales' | 'prospects';
  limit: number;
  top_performers: TopPerformerItem[];
  total_team: number;
}
```

### 10.6 SWR Hooks

**File:** `src/hooks/useMemberMonitoring.ts` (additions)

```typescript
// Member engagement trend
export function useMemberEngagementTrend(userId: number | null, days: number = 30) {
  const { data, error, isLoading, mutate } = useSWR<MemberEngagementTrendResponse>(
    userId ? `/api/user/monitoring/${userId}/trend?days=${days}` : null,
    (url) => authGetFetcher(url),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  return { trend: data?.trend ?? [], trendDirection: data?.trend_direction, ... };
}

// Team analytics trend
export function useTeamAnalyticsTrend(days: number = 30) { ... }

// Period comparison
export function useTeamComparison(period: 'week' | 'month' = 'week') { ... }

// Top performers
export function useTopPerformers(metric: 'engagement' | 'sales' | 'prospects', limit: number) { ... }

// Combined analytics hook
export function useMemberAnalytics(days: number = 30) { ... }
```

### 10.7 UI Components

**Analytics Dashboard:** `src/app/(dashboards)/member-monitoring/analytics/`

| Component | Purpose |
|-----------|---------|
| `AnalyticsClient.tsx` | Main analytics page with period selector |
| `_components/TeamTrendChart.tsx` | Line chart showing engagement/active/at-risk over time |
| `_components/ComparisonCards.tsx` | 6 metric cards with week/month comparison |
| `_components/TopPerformersTable.tsx` | Ranked leaderboard with medals for top 3 |

**Member Detail Enhancement:** `src/app/(dashboards)/member-monitoring/[userId]/_components/`

| Component | Purpose |
|-----------|---------|
| `EngagementTrendChart.tsx` | Area chart showing individual member's engagement trend |

### 10.8 Navigation

Analytics page accessible from:
- Main monitoring dashboard header: **Analytics** button
- URL: `/member-monitoring/analytics`

### 10.9 Celery Tasks for Snapshots

**File:** `accounts/tasks.py`

```python
@shared_task(name='accounts.capture_daily_snapshots')
def capture_daily_snapshots():
    """
    Captures daily snapshots for all members and teams.
    Run via Celery Beat at 11:55 PM daily.
    """
    today = timezone.now().date()

    # Capture member snapshots
    for activity in MemberActivity.objects.select_related('user').all():
        MemberActivitySnapshot.objects.update_or_create(
            user=activity.user,
            date=today,
            defaults={
                'engagement_score': activity.engagement_score,
                'lifecycle_stage': activity.lifecycle_stage,
                # ... other fields
            }
        )

    # Capture team snapshots for sponsors
    for sponsor in User.objects.filter(is_diamond=True):
        # ... aggregate team metrics
        TeamAnalyticsSnapshot.objects.update_or_create(...)
```

**Celery Beat Schedule:**
```python
'member-capture-daily-snapshots': {
    'task': 'accounts.capture_daily_snapshots',
    'schedule': crontab(hour=23, minute=55),
},
```

---

## Related Documentation

- [V4 Frontend Integration Guide](./V4_FRONTEND_INTEGRATION.md)
- [V4 Member Monitoring Spec](./V4_MEMBER_MONITORING_AND_SUPPLIER_SPEC.md)
- [Notification Center Implementation](./NOTIFICATION_CENTER_IMPLEMENTATION.md)

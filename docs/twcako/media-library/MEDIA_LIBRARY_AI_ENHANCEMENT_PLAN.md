# Media Library Enhancement with AI Image Generation

## Overview

Enhance the TWCako Media Library with AI image generation capabilities, multi-provider support, tiered access control, and admin file uploads.

**Created:** 2026-03-03
**Status:** Planning
**Estimated Timeline:** 8 weeks

---

## Current State Analysis

### Existing Implementation (`media_library/`)

| Component | Location | Description |
|-----------|----------|-------------|
| Models | `media_library/models.py` | `MediaCategory`, `Media` - link-based storage |
| Serializers | `dashboard/serializers/serializer.py` | `MediaSerializer`, `MediaCategorySerializer` |
| API View | `dashboard/views/daily_grind.py` | `MediaCategoryListAPIView` |
| Template | `dashboard/templates/dashboard/daily_grind/media_library.html` | V3 template |
| Storage | `twcako/cdn/conf.py` | Linode S3 Object Storage |

### Current Limitations
- Admin-only content management (Django admin)
- Link-based storage (external URLs, not direct uploads)
- No user upload capability
- No V4 frontend
- No AI generation

---

## New Features

### 1. AI Image Generation
- **OpenAI DALL-E 3** - Primary provider, high quality
- **Stability AI (SDXL)** - Secondary provider, lower cost
- **Provider Abstraction** - Easy to add new providers (Midjourney, etc.)

### 2. Tiered Access Control

| Role | Generate | Upload | Publish | Admin |
|------|----------|--------|---------|-------|
| Founder | Unlimited | Yes | Yes | Yes |
| Admin | 20/day, 500/month | Yes | Yes | No |
| Member | No | No | No | No |

### 3. Admin File Uploads
- Drag-and-drop interface
- Image, video, document support
- Automatic thumbnail generation
- Category organization

### 4. V4 Frontend
- Media Library dashboard
- AI Image Generator page
- Gallery with filters/search
- Generation history
- Admin configuration pages

---

## Database Models

### New Models (`media_library/models.py`)

#### AIProviderConfig
```python
class AIProviderConfig(models.Model):
    provider = models.CharField(max_length=20, choices=AI_PROVIDER_CHOICES, unique=True)
    display_name = models.CharField(max_length=100)
    api_key = models.CharField(max_length=500)  # Encrypted
    api_endpoint = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    priority = models.PositiveSmallIntegerField(default=1)
    max_resolution = models.CharField(max_length=20, default='1024x1024')
    supported_styles = models.JSONField(default=list)
    cost_per_image = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### UserGenerationQuota
```python
class UserGenerationQuota(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    tier = models.CharField(max_length=20, choices=USER_TIER_CHOICES)
    daily_limit = models.PositiveIntegerField(default=5)
    daily_used = models.PositiveIntegerField(default=0)
    daily_reset_at = models.DateTimeField()
    monthly_limit = models.PositiveIntegerField(default=100)
    monthly_used = models.PositiveIntegerField(default=0)
    monthly_reset_at = models.DateTimeField()
    total_generated = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### AIGeneratedImage
```python
class AIGeneratedImage(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    provider = models.CharField(max_length=20, choices=AI_PROVIDER_CHOICES)
    prompt = models.TextField()
    negative_prompt = models.TextField(blank=True)
    style = models.CharField(max_length=30, choices=IMAGE_STYLE_CHOICES, default='natural')
    resolution = models.CharField(max_length=20, default='1024x1024')
    status = models.CharField(max_length=20, choices=GENERATION_STATUS_CHOICES, default='pending')
    image_url = models.URLField(blank=True)
    thumbnail_url = models.URLField(blank=True)
    original_response_url = models.URLField(blank=True)
    generation_time_seconds = models.DecimalField(max_digits=6, decimal_places=2, null=True)
    cost = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    error_message = models.TextField(blank=True)
    provider_metadata = models.JSONField(default=dict)
    category = models.ForeignKey(MediaCategory, on_delete=models.SET_NULL, null=True, blank=True)
    media_item = models.OneToOneField('Media', on_delete=models.SET_NULL, null=True, blank=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### GenerationHistory
```python
class GenerationHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    generated_image = models.ForeignKey(AIGeneratedImage, on_delete=models.CASCADE, null=True)
    action = models.CharField(max_length=30)  # 'generate', 'retry', 'publish', 'delete'
    provider = models.CharField(max_length=20)
    prompt = models.TextField()
    status = models.CharField(max_length=20)
    ip_address = models.GenericIPAddressField(null=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
```

#### MediaUpload
```python
class MediaUpload(models.Model):
    category = models.ForeignKey(MediaCategory, on_delete=models.CASCADE)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPE_CHOICES)
    file = models.FileField(upload_to=upload_media_file)
    file_size = models.PositiveIntegerField(default=0)
    mime_type = models.CharField(max_length=100, blank=True)
    thumbnail = models.ImageField(upload_to='media_library/thumbnails/', blank=True)
    is_active = models.BooleanField(default=True)
    download_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

---

## Provider Abstraction Architecture

### Directory Structure
```
media_library/providers/
├── __init__.py
├── base.py           # Abstract base class
├── factory.py        # Provider factory
├── openai_dalle.py   # OpenAI DALL-E 3
└── stability.py      # Stability AI SDXL
```

### Base Class Interface (`base.py`)
```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class GenerationResult:
    success: bool
    image_url: str | None
    error: str | None
    generation_time: float
    cost: float
    raw_response: dict

class AIImageProvider(ABC):
    def __init__(self, api_key: str, endpoint: str = None):
        self.api_key = api_key
        self.endpoint = endpoint

    @abstractmethod
    def generate(self, prompt: str, style: str, resolution: str,
                 negative_prompt: str = '', **kwargs) -> GenerationResult:
        pass

    @abstractmethod
    def get_supported_styles(self) -> list[str]:
        pass

    @abstractmethod
    def get_supported_resolutions(self) -> list[str]:
        pass

    @abstractmethod
    def estimate_cost(self, resolution: str) -> float:
        pass
```

### Provider Factory (`factory.py`)
```python
class ProviderFactory:
    PROVIDERS = {
        'openai': OpenAIDalleProvider,
        'stability': StabilityAIProvider,
    }

    @classmethod
    def get_provider(cls, provider_name: str) -> AIImageProvider:
        config = AIProviderConfig.objects.get(provider=provider_name, is_active=True)
        provider_class = cls.PROVIDERS.get(provider_name)
        return provider_class(api_key=config.api_key, endpoint=config.api_endpoint)

    @classmethod
    def get_available_providers(cls) -> list[dict]:
        providers = []
        for config in AIProviderConfig.objects.filter(is_active=True):
            provider = cls.get_provider(config.provider)
            providers.append({
                'id': config.provider,
                'name': config.display_name,
                'styles': provider.get_supported_styles(),
                'resolutions': provider.get_supported_resolutions(),
            })
        return providers
```

---

## API Endpoints

### New Views (`api/views/media_library.py`)

| Endpoint | Method | Description | Permission |
|----------|--------|-------------|------------|
| `/api/media/` | GET | List all media | Authenticated |
| `/api/media/categories/` | GET | List categories | Authenticated |
| `/api/media/providers/` | GET | Available AI providers | Authenticated |
| `/api/media/generate/` | POST | Generate AI image | Authenticated + HasQuota |
| `/api/media/generate/{id}/` | GET | Generation status | Authenticated |
| `/api/media/generate/{id}/retry/` | POST | Retry failed | Authenticated |
| `/api/media/generate/{id}/publish/` | POST | Publish to library | Founder/Admin |
| `/api/media/history/` | GET | User's history | Authenticated |
| `/api/media/quota/` | GET | Quota status | Authenticated |
| `/api/media/upload/` | POST | Upload file | Founder/Admin |
| `/api/media/uploads/` | GET | List uploads | Authenticated |
| `/api/media/uploads/{id}/` | GET/DELETE | Manage upload | Founder/Admin |
| `/api/media/admin/providers/` | GET | List providers | Founder |
| `/api/media/admin/providers/{id}/` | PUT | Update provider | Founder |
| `/api/media/admin/quotas/` | GET | List quotas | Founder |
| `/api/media/admin/quotas/{user_id}/` | PUT | Update quota | Founder |
| `/api/media/admin/analytics/` | GET | Usage analytics | Founder |

### Request/Response Examples

**Generate Image:**
```json
POST /api/media/generate/
{
    "prompt": "A professional business banner with gold accents",
    "provider": "openai",
    "style": "photorealistic",
    "resolution": "1024x1024",
    "negative_prompt": "text, watermark, low quality",
    "category_id": 5
}

Response:
{
    "id": 123,
    "status": "processing",
    "task_id": "celery-task-uuid",
    "estimated_time_seconds": 30,
    "quota_remaining": {"daily": 4, "monthly": 95}
}
```

---

## Celery Tasks

### Tasks (`media_library/tasks.py`)

| Task | Schedule | Purpose |
|------|----------|---------|
| `generate_ai_image` | On-demand | Async image generation |
| `retry_failed_generation` | On-demand | Retry with different provider |
| `reset_daily_quotas` | Daily 00:00 | Reset daily_used counters |
| `reset_monthly_quotas` | Monthly 1st | Reset monthly_used counters |
| `cleanup_temporary_images` | Weekly | Remove old unpublished |
| `generate_thumbnail` | On-demand | Create thumbnails |

---

## V4 Frontend Structure

### API Routes (`TWCAKOV4/src/app/api/media/`)
```
media/
├── route.ts                    # List media
├── categories/route.ts         # List categories
├── providers/route.ts          # Available providers
├── generate/
│   ├── route.ts                # POST: generate
│   └── [id]/
│       ├── route.ts            # GET: status
│       ├── retry/route.ts      # POST: retry
│       └── publish/route.ts    # POST: publish
├── history/route.ts            # Generation history
├── quota/route.ts              # Quota status
├── upload/route.ts             # POST: upload
└── uploads/
    ├── route.ts                # List uploads
    └── [id]/route.ts           # Manage upload
```

### Pages (`TWCAKOV4/src/app/(dashboards)/media-library/`)
```
media-library/
├── page.tsx                    # Dashboard
├── layout.tsx                  # Sidebar layout
├── generate/page.tsx           # AI Generator
├── gallery/page.tsx            # Browse media
├── history/page.tsx            # Generation history
├── uploads/page.tsx            # Admin uploads
└── admin/
    ├── providers/page.tsx      # Provider config
    └── quotas/page.tsx         # Quota management
```

### Hooks (`TWCAKOV4/src/hooks/useMediaLibrary.ts`)
```typescript
export function useMediaCategories()
export function useMediaList(filters?: MediaFilters)
export function useProviders()
export function useGenerationStatus(id: number)
export function useUserQuota()
export function useGenerationHistory(page?: number)
export function useGenerateImage()  // mutation
export function useUploadMedia()    // mutation
```

### Types (`TWCAKOV4/src/types/domain/mediaLibrary.ts`)
- ~150 lines covering all models and API shapes

---

## Storage Structure (Linode S3)

```
twcako-storage/media_library/
├── generated/
│   └── {year}/{month}/
│       ├── {timestamp}_{hash}.png
│       └── {timestamp}_{hash}_thumb.png
├── uploads/
│   └── {category_id}/
│       ├── {timestamp}_{random}.{ext}
│       └── {timestamp}_{random}_thumb.{ext}
└── thumbnails/
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create Django models + migrations
- [ ] Build provider abstraction layer
- [ ] Implement OpenAI DALL-E 3 provider
- [ ] Add quota management API
- [ ] Create V4 API routes + types + hooks

### Phase 2: AI Generation (Week 3-4)
- [ ] Implement `generate_ai_image` Celery task
- [ ] Add S3 upload for generated images
- [ ] Build AI Generator page (V4)
- [ ] Implement status polling
- [ ] Add generation preview component

### Phase 3: Gallery & History (Week 5)
- [ ] Build Gallery page with infinite scroll
- [ ] Add category filtering
- [ ] Implement search
- [ ] Create History page
- [ ] Add publish/unpublish flow

### Phase 4: Admin Uploads (Week 6)
- [ ] Implement MediaUpload model
- [ ] Create upload endpoint with validation
- [ ] Build drag-and-drop UI
- [ ] Add thumbnail generation

### Phase 5: Admin Tools (Week 7)
- [ ] Provider configuration page
- [ ] Quota management dashboard
- [ ] Usage analytics
- [ ] Add Stability AI provider

### Phase 6: Polish (Week 8)
- [ ] Loading skeletons
- [ ] Error handling
- [ ] Mobile responsiveness
- [ ] Documentation

---

## Environment Variables

```bash
# AI Providers
OPENAI_API_KEY=sk-...
STABILITY_API_KEY=sk-...

# Quotas
AI_GENERATION_DAILY_LIMIT_ADMIN=20
AI_GENERATION_MONTHLY_LIMIT_ADMIN=500
```

---

## Security Considerations

1. **API Keys** - Store encrypted, load from environment
2. **Rate Limiting** - Per-user limits beyond quota
3. **Input Validation** - Sanitize prompts, block inappropriate content
4. **File Validation** - Check MIME types, file sizes
5. **Access Control** - Strict founder/admin checks

---

## Related Documentation

- [V4 Frontend Integration](../V4_FRONTEND_INTEGRATION.md)
- [Railway Deployment Guide](../RAILWAY_DEPLOYMENT_GUIDE.md)
- [Supplier Module](../supplier/) - Similar implementation pattern

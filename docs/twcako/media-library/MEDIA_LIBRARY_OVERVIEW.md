# Media Library Enhancement — Overview

**Date:** March 2026
**Status:** Planned
**Timeline:** ~8 weeks

---

## What Is This?

The TWCako Media Library is getting a major upgrade. Right now, media content (images, videos, documents) can only be managed through the admin panel by manually adding links. The new version will allow **AI-powered image creation**, **direct file uploads**, and a **modern browsing experience** — all from the main dashboard.

---

## What's New

### 1. AI Image Generation

Create professional images instantly by describing what you want in plain text.

**How it works:**
- Type a description like *"A professional business banner with gold accents"*
- Choose a style (photorealistic, illustration, digital art, etc.)
- Pick a size (square, landscape, or portrait)
- The system generates a high-quality image in about 30 seconds

**Two AI providers are supported:**
| Provider | Strength | Best For |
|----------|----------|----------|
| **OpenAI DALL-E 3** | High quality, accurate | Marketing materials, product visuals |
| **Stability AI** | Cost-effective, fast | Bulk generation, variations |

The system automatically picks the best provider, but users can choose manually too.

### 2. Direct File Uploads

Founders and Admins can upload files directly — no more pasting external links.

- **Drag-and-drop** interface
- Supports **images, videos, and documents**
- Automatic **thumbnail generation** for previews
- Organized into **categories** for easy browsing

### 3. Modern Gallery

A clean, visual interface to browse all media content.

- **Search** by keyword or category
- **Filter** by type (image, video, document, AI-generated)
- **Infinite scroll** — no page numbers, just keep scrolling
- View full details, download, or share

### 4. Generation History

Track every AI image ever created.

- See what was generated, when, and by whom
- **Retry** failed generations
- **Publish** good results to the main library for everyone to see
- Review usage and costs

---

## Who Can Do What

| Action | Founder | Admin | Member |
|--------|---------|-------|--------|
| Browse media library | Yes | Yes | Yes |
| Generate AI images | Unlimited | 20/day, 500/month | No |
| Upload files | Yes | Yes | No |
| Publish AI images to library | Yes | Yes | No |
| Manage AI providers | Yes | No | No |
| Adjust user quotas | Yes | No | No |
| View usage analytics | Yes | No | No |

**Why are Members restricted?**
AI image generation has real costs (each image costs money to produce). Limiting generation to Founders and Admins keeps costs predictable while still allowing the team to create content for the entire platform.

---

## Pages in the Dashboard

| Page | What It Does |
|------|--------------|
| **Media Dashboard** | Overview with stats — total images, recent generations, quota usage |
| **AI Generator** | Create new images with text prompts, style/size options, and real-time preview |
| **Gallery** | Browse and search all media (uploaded + AI-generated) |
| **History** | View past generations with status, retry/publish options |
| **Uploads** | Upload new files directly (drag-and-drop) |
| **Provider Settings** *(Founder only)* | Configure AI providers, API keys, cost tracking |
| **Quota Management** *(Founder only)* | Adjust daily/monthly limits per user |

---

## How AI Generation Works (Step by Step)

1. **User opens the AI Generator page**
2. **Writes a text description** of the image they want
3. **Picks options** — style, size, provider (optional)
4. **Clicks "Generate"**
5. **System checks quota** — makes sure the user hasn't hit their daily/monthly limit
6. **Image is generated** in the background (takes ~15–30 seconds)
7. **Preview appears** on screen
8. **User reviews** — they can:
   - **Publish** it to the media library (visible to everyone)
   - **Retry** with a different prompt or provider
   - **Discard** if it's not what they wanted

---

## Storage & Costs

### Where are files stored?
All images and uploads are stored in **Linode S3 Object Storage** (cloud storage), the same service already used by TWCako. Generated images and thumbnails are automatically organized by date.

### What does it cost?

| Item | Estimated Cost |
|------|----------------|
| OpenAI DALL-E 3 (per image) | ~$0.04 – $0.08 |
| Stability AI (per image) | ~$0.01 – $0.03 |
| Storage (S3) | Negligible (existing plan) |

With 20 images/day per admin, monthly AI costs would be approximately **$25–50** depending on provider mix and usage.

---

## Security & Safety

- **API keys** are encrypted and stored securely (never visible in the dashboard)
- **Rate limiting** prevents abuse beyond quota limits
- **Content moderation** — prompts are checked to block inappropriate requests
- **File validation** — uploaded files are scanned for correct type and size limits
- **Access control** — only authorized roles can generate, upload, or manage settings

---

## Implementation Timeline

| Phase | Weeks | What Gets Built |
|-------|-------|-----------------|
| **Foundation** | 1–2 | Database setup, AI provider connections, quota system |
| **AI Generation** | 3–4 | Image creation flow, background processing, preview UI |
| **Gallery & History** | 5 | Browsing interface, search/filter, history tracking |
| **File Uploads** | 6 | Drag-and-drop uploads, thumbnail creation |
| **Admin Tools** | 7 | Provider settings, quota management, usage analytics |
| **Polish** | 8 | Mobile support, loading states, error handling, testing |

---

## Summary

This upgrade transforms the Media Library from a basic link list into a full-featured content creation and management tool. The AI generation capability allows the team to produce professional visuals on demand without needing design skills or external tools, while the upload system and gallery make it easy to organize and share all media across the platform.

# Cloudflare R2 Object Storage — TWCako

> Migration from Linode Object Storage to Cloudflare R2.
> Date: 2026-03-12

---

## Why Cloudflare R2?

| Factor | Linode (Previous) | Cloudflare R2 (New) | AWS S3 |
|--------|-------------------|---------------------|--------|
| **Egress fees** | $0.005/GB | **$0 (free)** | $0.09/GB |
| **Storage cost** | $0.02/GB/mo | $0.015/GB/mo | $0.023/GB/mo |
| **Free tier** | 250GB storage | 10GB + 10M reads/mo | 5GB (12mo only) |
| **CDN** | None built-in | Cloudflare edge (300+ PoPs) | CloudFront (extra $) |
| **S3 compatible** | Yes | Yes (drop-in) | Native |
| **Philippines PoP** | Singapore | **Manila** | Singapore |
| **Custom domains** | Manual | Free (via Cloudflare DNS) | Extra cost |

**Key wins for TWCako:**
1. Zero egress = no surprise bills as user base grows (59K+ users, targeting 10K+ DAU)
2. Manila edge node = faster asset loading for PH users
3. Integrates with planned Cloudflare CDN/WAF/DDoS setup
4. Same `boto3`/`django-storages` — minimal code change

---

## Architecture

```
User (PH) → Cloudflare Edge (Manila) → R2 Bucket (twcako-storage)
                                      ↑
                Django Backend --------┘ (upload via S3 API)
                                      ↑
                Next.js V4 -----------┘ (serve via custom domain)
```

### URL Structure
```
Custom domain:  https://assets.twcako.com/static/...
                https://assets.twcako.com/media/...

R2.dev domain:  https://twcako-storage.<account-id>.r2.dev/static/...
                https://twcako-storage.<account-id>.r2.dev/media/...
```

---

## Environment Variables

### Required (Railway Production)

| Variable | Description | Example |
|----------|-------------|---------|
| `R2_ACCESS_KEY_ID` | R2 API token access key | `a1b2c3d4...` |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret key | `x9y8z7w6...` |
| `R2_BUCKET_NAME` | R2 bucket name | `twcako-storage` |
| `R2_ACCOUNT_ID` | Cloudflare account ID | `abc123def456` |
| `R2_CUSTOM_DOMAIN` | Custom domain (optional) | `assets.twcako.com` |

### Removed (Old Linode)

These env vars are no longer needed on Railway once migration is complete:
- `LINODE_BUCKET`
- `LINODE_BUCKET_REGION`
- `LINODE_BUCKET_ACCESS_KEY`
- `LINODE_BUCKET_SECRET_KEY`

---

## Setup Steps

### Step 1: Create Cloudflare R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **R2 Object Storage** in the left sidebar
3. Click **Create bucket**
4. Name: `twcako-storage`
5. Location hint: **Asia Pacific** (closest to PH users)
6. Click **Create bucket**

### Step 2: Enable Public Access

1. Open the `twcako-storage` bucket
2. Go to **Settings** tab
3. Under **Public access**, click **Allow Access**
4. Choose **Custom Domain** (recommended) or **R2.dev subdomain**

### Step 3: Set Up Custom Domain (Recommended)

1. In R2 bucket settings → **Custom Domains**
2. Click **Connect Domain**
3. Enter: `assets.twcako.com`
4. Cloudflare auto-creates the DNS CNAME record
5. SSL is automatic (Cloudflare Universal SSL)

### Step 4: Create R2 API Token

1. Go to **R2 Object Storage** → **Manage R2 API Tokens**
2. Click **Create API token**
3. Permissions: **Object Read & Write**
4. Specify bucket: `twcako-storage` (or all buckets)
5. TTL: No expiration (or set a rotation schedule)
6. Copy the **Access Key ID** and **Secret Access Key**

### Step 5: Set Railway Environment Variables

```bash
# In Railway dashboard → Django service → Variables tab
R2_ACCESS_KEY_ID=<your-access-key-id>
R2_SECRET_ACCESS_KEY=<your-secret-access-key>
R2_BUCKET_NAME=twcako-storage
R2_ACCOUNT_ID=<your-cloudflare-account-id>
R2_CUSTOM_DOMAIN=assets.twcako.com
```

### Step 6: Migrate Existing Files from Linode

Use `rclone` to copy files from Linode Object Storage to R2:

```bash
# Install rclone
brew install rclone  # macOS

# Configure Linode source
rclone config
# Name: linode
# Type: s3
# Provider: Other
# Endpoint: https://ap-south-1.linodeobjects.com
# Access key: <linode-access-key>
# Secret key: <linode-secret-key>
# Region: ap-south-1

# Configure R2 destination
# Name: r2
# Type: s3
# Provider: Cloudflare
# Endpoint: https://<account-id>.r2.cloudflarestorage.com
# Access key: <r2-access-key>
# Secret key: <r2-secret-key>
# Region: auto

# Dry run first
rclone copy linode:twcako-storage r2:twcako-storage --dry-run --progress

# Execute migration
rclone copy linode:twcako-storage r2:twcako-storage --progress --transfers=16

# Verify
rclone check linode:twcako-storage r2:twcako-storage
```

### Step 7: Collect Static Files

After Railway deploys with the new settings:

```bash
# Railway CLI or via Dockerfile
python manage.py collectstatic --noinput
```

### Step 8: Verify

```bash
# Test upload (Django shell on Railway)
python manage.py shell
>>> from django.core.files.storage import default_storage
>>> from django.core.files.base import ContentFile
>>> path = default_storage.save('test/hello.txt', ContentFile(b'R2 works!'))
>>> print(default_storage.url(path))
# Should return: https://assets.twcako.com/test/hello.txt

# Test read
>>> print(default_storage.open(path).read())
# Should return: b'R2 works!'

# Cleanup
>>> default_storage.delete(path)
```

---

## Django Settings Changes

### `production.py` (Updated)

The storage config now uses R2 env vars instead of Linode:

```python
R2_ACCESS_KEY_ID = os.environ.get('R2_ACCESS_KEY_ID')
R2_SECRET_ACCESS_KEY = os.environ.get('R2_SECRET_ACCESS_KEY')
R2_BUCKET_NAME = os.environ.get('R2_BUCKET_NAME', 'twcako-storage')
R2_ACCOUNT_ID = os.environ.get('R2_ACCOUNT_ID')
R2_CUSTOM_DOMAIN = os.environ.get('R2_CUSTOM_DOMAIN', '')

if R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and R2_ACCOUNT_ID:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_S3_ENDPOINT_URL = f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com'
    AWS_DEFAULT_ACL = None  # R2 does not support ACLs
    AWS_S3_SIGNATURE_VERSION = 's3v4'
    # ... (see full settings in twcako/settings/production.py)
```

### Key Differences from Linode

| Setting | Linode | R2 |
|---------|--------|----|
| `AWS_S3_ENDPOINT_URL` | `https://ap-south-1.linodeobjects.com` | `https://<account-id>.r2.cloudflarestorage.com` |
| `AWS_DEFAULT_ACL` | `"public-read"` | `None` (R2 uses bucket-level access) |
| `AWS_S3_REGION_NAME` | `ap-south-1` | `auto` |
| `AWS_S3_SIGNATURE_VERSION` | (default) | `s3v4` (required by R2) |

---

## R2 Limitations & Workarounds

| Limitation | Impact | Workaround |
|------------|--------|------------|
| No per-object ACLs | Can't set `public-read` per file | Use bucket-level public access or custom domain |
| No S3 Object Lock | N/A for TWCako | Not needed |
| No S3 Glacier | Can't archive old files to cold tier | Delete old files manually or keep in R2 (cheap) |
| 5 TB max object size | N/A (our files are small) | Not an issue |
| No S3 event notifications | Can't trigger Lambda on upload | Use Cloudflare Workers if needed |

---

## File Upload Paths (Unchanged)

All upload paths remain the same — only the storage backend changed:

| Function | Path Pattern | Used By |
|----------|-------------|---------|
| `upload_image_path_admin()` | `admin/{timestamp}_{rand}{ext}` | Media library, banners |
| `upload_image_path_finance()` | `finance/{timestamp}_{rand}{ext}` | Receipts, proofs |
| `upload_image_path()` | `{folder}/{year}/{month}/{rand}{ext}` | Generic uploads |
| `upload_profile_picture()` | `profile_picture/{year}/{month}/{rand}{ext}` | User avatars |
| `upload_proof_of_shipment()` | `proof_of_shipment/{year}/{month}/{rand}{ext}` | Logistics |
| `upload_payment_receipt()` | `payment_receipt/{year}/{month}/{rand}{ext}` | Payments |
| `upload_media_library_file()` | `media_library/uploads/{cat}/{ts}_{rand}{ext}` | Media library |
| `upload_generated_image()` | `media_library/generated/{year}/{month}/{ts}_{rand}{ext}` | AI images |

---

## Cost Projections

### Current (Linode)
- Storage: ~$0.02/GB/mo
- Egress: $0.005/GB (first 1TB free)
- Estimated monthly: $5-15/mo

### After Migration (R2)
- Storage: $0.015/GB/mo
- Egress: **$0**
- Free tier: 10GB storage + 10M Class B reads + 1M Class A writes/mo
- Estimated monthly: **$0-5/mo** (likely free tier for now)

### At Scale (10K+ DAU)
- Linode: $20-50/mo (egress grows with users)
- AWS S3: $50-200+/mo (egress is expensive)
- **R2: $5-15/mo** (storage only, zero egress)

---

## CORS Configuration

If needed, configure CORS on the R2 bucket via Cloudflare dashboard or API:

```json
[
  {
    "AllowedOrigins": [
      "https://dashboard.twcako.com",
      "https://*.twcako.com",
      "https://*.up.railway.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

---

## Rollback Plan

If R2 has issues, rollback is simple:

1. Remove R2 env vars from Railway (`R2_ACCESS_KEY_ID`, etc.)
2. Re-add Linode env vars (`LINODE_BUCKET_ACCESS_KEY`, etc.)
3. Redeploy — the fallback in `production.py` will use Linode URLs
4. Files are still in Linode bucket (don't delete until R2 is confirmed stable)

---

## Security Notes

### Legacy Credentials to Clean Up

| File | Issue | Action |
|------|-------|--------|
| `twcako/aws/conf.py` | **Hardcoded AWS credentials** (salveoworld account) | Rotate keys immediately, move to env vars or delete file |
| `twcako/cdn/conf.py` | DigitalOcean Spaces config (unused) | Safe to delete |
| `twcako/aws/utils.py` | Legacy storage backends (unused) | Safe to delete |
| `twcako/cdn/backends.py` | Legacy storage backends (unused) | Safe to delete |

### R2 Token Best Practices
- Create a dedicated API token scoped to `twcako-storage` bucket only
- Set IP access restrictions if possible (Railway's egress IPs)
- Rotate tokens quarterly
- Never commit tokens to git

---

## Migration Checklist

- [ ] Create R2 bucket (`twcako-storage`, Asia Pacific)
- [ ] Enable public access on bucket
- [ ] Set up custom domain (`assets.twcako.com`)
- [ ] Create R2 API token (Object Read & Write)
- [ ] Set env vars on Railway
- [ ] Migrate files from Linode using rclone
- [ ] Deploy updated `production.py`
- [ ] Run `collectstatic` on Railway
- [ ] Verify uploads work (Django shell test)
- [ ] Verify static files load on production
- [ ] Verify media files load (product images, profile pics)
- [ ] Configure CORS if needed
- [ ] Update V4 frontend env if any hardcoded asset URLs
- [ ] Monitor for 48 hours
- [ ] Remove old Linode env vars from Railway
- [ ] Delete legacy `twcako/aws/` and `twcako/cdn/` directories
- [ ] Rotate/revoke old Linode API keys
- [ ] Rotate/revoke hardcoded AWS keys in `aws/conf.py`

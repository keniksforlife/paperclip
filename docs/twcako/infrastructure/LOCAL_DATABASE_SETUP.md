# Local Database Setup Guide

**Created:** 2026-02-19
**Purpose:** Replicate Railway production database locally for safe development and migrations

---

## Overview

This document describes how to set up a local PostgreSQL database that mirrors the Railway production database. This allows safe testing of migrations and code changes without affecting production.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      PRODUCTION                              │
│  Railway PostgreSQL 17                                       │
│  Host: shuttle.proxy.rlwy.net:59228                         │
│  Database: railway                                           │
│  ⚠️  DO NOT USE FOR DEVELOPMENT                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ pg_dump (one-time sync)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      LOCAL (Docker)                          │
│  PostgreSQL 16 (Docker container)                           │
│  Host: localhost:5433                                        │
│  Database: twcako_local                                      │
│  ✅ SAFE FOR DEVELOPMENT & MIGRATIONS                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Local Database Credentials

| Setting | Value |
|---------|-------|
| Host | localhost |
| Port | **5433** (NOT 5432) |
| Database | twcako_local |
| Username | postgres |
| Password | YourStrong@Passw0rd |
| SSL Mode | DISABLED |

### Connection String
```
postgresql://postgres:YourStrong@Passw0rd@localhost:5433/twcako_local
```

### GUI Client Settings (TablePlus, pgAdmin, etc.)
- **Name:** TWC Local
- **Host/Socket:** localhost
- **Port:** 5433
- **User:** postgres
- **Password:** YourStrong@Passw0rd
- **Database:** twcako_local
- **SSL Mode:** DISABLED

---

## Railway Production Credentials (READ-ONLY REFERENCE)

⚠️ **WARNING: Only use Railway DB when specifically needed for production debugging**

| Setting | Value |
|---------|-------|
| Host | shuttle.proxy.rlwy.net |
| Port | 59228 |
| Database | railway |
| Username | postgres |
| Password | SEGsBRdAYlNsNtriaQVLgblqFSmXUyoI |
| SSL Mode | require |

### Connection String (Railway)
```
postgresql://postgres:SEGsBRdAYlNsNtriaQVLgblqFSmXUyoI@shuttle.proxy.rlwy.net:59228/railway?sslmode=require
```

---

## Initial Setup Process

### Prerequisites
- Docker installed and running
- PostgreSQL client tools (`psql`, `pg_dump`, `pg_restore`)
- Access to Railway credentials

### Step 1: Verify Docker PostgreSQL is Running

```bash
# Check for running PostgreSQL container
docker ps | grep postgres

# Expected output:
# 61d369c894f7  postgres:16-alpine  ...  127.0.0.1:5433->5432/tcp  babyperks-postgres
```

If not running, start it:
```bash
docker start babyperks-postgres
# Or create a new container:
# docker run -d --name twcako-postgres -e POSTGRES_PASSWORD=YourStrong@Passw0rd -p 5433:5432 postgres:16-alpine
```

### Step 2: Dump Railway Database

```bash
cd /Users/kentluckybuhawe/Lucky\ Keniks/2026/TWCako

# Dump Railway database (takes 10-15 minutes, ~200MB file)
pg_dump "postgresql://postgres:SEGsBRdAYlNsNtriaQVLgblqFSmXUyoI@shuttle.proxy.rlwy.net:59228/railway?sslmode=require" \
  --no-owner \
  --no-acl \
  -F c \
  -f railway_backup.dump

# Verify dump file
ls -lh railway_backup.dump
# Expected: ~197 MB
```

### Step 3: Create Local Database

```bash
# Connect to local PostgreSQL and create database
PGPASSWORD='YourStrong@Passw0rd' psql -h localhost -p 5433 -U postgres -c "
  DROP DATABASE IF EXISTS twcako_local;
  CREATE DATABASE twcako_local;
"
```

### Step 4: Restore Dump to Local

```bash
# Restore (takes 5-10 minutes)
PGPASSWORD='YourStrong@Passw0rd' pg_restore \
  -h localhost \
  -p 5433 \
  -U postgres \
  -d twcako_local \
  --no-owner \
  --no-acl \
  railway_backup.dump

# Note: You may see a warning about "transaction_timeout" - this is normal
# (PG17 feature not available in PG16)
```

### Step 5: Verify Restore

```bash
# Check table count and user count
PGPASSWORD='YourStrong@Passw0rd' psql -h localhost -p 5433 -U postgres -d twcako_local -c "
  SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema = 'public';
"

PGPASSWORD='YourStrong@Passw0rd' psql -h localhost -p 5433 -U postgres -d twcako_local -c "
  SELECT COUNT(*) as users FROM accounts_user;
"

# Expected:
# tables: 95
# users: 59518
```

---

## Django Configuration

### .env File Configuration

```bash
# File: /Users/kentluckybuhawe/Lucky Keniks/2026/TWCako/.env

DEBUG=1
DJANGO_ENV=local
DJANGO_SECRET_KEY=local-dev-secret-key-change-in-production

# =============================================================================
# LOCAL DATABASE (Docker PostgreSQL on port 5433)
# This is a replica of Railway production DB - safe for migrations/testing
# =============================================================================
POSTGRES_DB=twcako_local
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YourStrong@Passw0rd
POSTGRES_HOST=localhost
POSTGRES_PORT=5433

# Use local PostgreSQL (Docker) for development
USE_RAILWAY_DB=0
USE_POSTGRES=1

# =============================================================================
# RAILWAY DATABASE (PRODUCTION - DO NOT USE FOR DEVELOPMENT)
# Only enable this when you need to connect to production
# =============================================================================
# USE_RAILWAY_DB=1
# DATABASE_URL=postgresql://postgres:SEGsBRdAYlNsNtriaQVLgblqFSmXUyoI@shuttle.proxy.rlwy.net:59228/railway

# Redis
REDIS_SERVER_URL=redis://127.0.0.1:6379/0
```

### settings/local.py Database Logic

The `local.py` settings file handles database selection:

```python
# Priority order:
#   1. USE_RAILWAY_DB=1 → Railway PostgreSQL (remote, production)
#   2. USE_POSTGRES=1   → Local PostgreSQL (Docker)
#   3. Default          → SQLite (simplest local dev)

USE_RAILWAY_DB = os.environ.get("USE_RAILWAY_DB", "0") == "1"
USE_POSTGRES = os.environ.get("USE_POSTGRES", "0") == "1"

if USE_RAILWAY_DB:
    # Railway PostgreSQL - production database
    # Prints: 🚂 Using Railway PostgreSQL database
    ...
elif USE_POSTGRES:
    # Local PostgreSQL - Docker container
    # Prints: 🐘 Using local PostgreSQL database
    ...
else:
    # SQLite for simplest local development
    # Prints: 📦 Using SQLite database
    ...
```

---

## Switching Between Databases

### Use Local Database (Default for Development)
```bash
# In .env:
USE_RAILWAY_DB=0
USE_POSTGRES=1

# Restart Django server
# You'll see: 🐘 Using local PostgreSQL database
```

### Use Railway Database (Only When Needed)
```bash
# In .env:
USE_RAILWAY_DB=1
USE_POSTGRES=0

# Restart Django server
# You'll see: 🚂 Using Railway PostgreSQL database
# ⚠️ BE CAREFUL - This is production!
```

### Use SQLite (Quick Testing)
```bash
# In .env:
USE_RAILWAY_DB=0
USE_POSTGRES=0

# Restart Django server
# You'll see: 📦 Using SQLite database
```

---

## Running Migrations

### Safe Migration Workflow

1. **Always use local database for migrations:**
   ```bash
   # Verify you're on local DB
   grep USE_RAILWAY_DB .env
   # Should show: USE_RAILWAY_DB=0
   ```

2. **Run migrations locally:**
   ```bash
   python3 manage.py migrate
   ```

3. **Test thoroughly on local**

4. **Only after testing, apply to Railway:**
   ```bash
   # Temporarily switch to Railway
   # Edit .env: USE_RAILWAY_DB=1
   python3 manage.py migrate
   # Edit .env: USE_RAILWAY_DB=0 (switch back!)
   ```

---

## Re-syncing Local Database

If you need to refresh local data from Railway:

```bash
cd /Users/kentluckybuhawe/Lucky\ Keniks/2026/TWCako

# 1. Create fresh dump
pg_dump "postgresql://postgres:SEGsBRdAYlNsNtriaQVLgblqFSmXUyoI@shuttle.proxy.rlwy.net:59228/railway?sslmode=require" \
  --no-owner --no-acl -F c -f railway_backup_$(date +%Y%m%d).dump

# 2. Drop and recreate local database
PGPASSWORD='YourStrong@Passw0rd' psql -h localhost -p 5433 -U postgres -c "
  DROP DATABASE IF EXISTS twcako_local;
  CREATE DATABASE twcako_local;
"

# 3. Restore
PGPASSWORD='YourStrong@Passw0rd' pg_restore \
  -h localhost -p 5433 -U postgres -d twcako_local \
  --no-owner --no-acl railway_backup_$(date +%Y%m%d).dump

# 4. Re-run any local-only migrations
python3 manage.py migrate
```

---

## Troubleshooting

### "Connection refused" on port 5433
```bash
# Check if Docker container is running
docker ps | grep postgres

# Start it if stopped
docker start babyperks-postgres
```

### "Database does not exist"
```bash
# Create the database
PGPASSWORD='YourStrong@Passw0rd' psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE twcako_local;"
```

### "Password authentication failed"
- Verify password is exactly: `YourStrong@Passw0rd`
- Check you're connecting to port **5433** (not 5432)

### Django showing wrong database
- Check `.env` file for `USE_RAILWAY_DB` and `USE_POSTGRES` values
- Restart Django server after changing `.env`
- Look for the emoji indicator:
  - 🐘 = Local PostgreSQL (correct for dev)
  - 🚂 = Railway (production - be careful!)
  - 📦 = SQLite

---

## Database Statistics (As of 2026-02-19)

| Metric | Value |
|--------|-------|
| Total Tables | 95 |
| Total Users | 59,518 |
| Largest Table | accounts_prospectprofile (4.66M rows, 616 MB) |
| Total DB Size | ~1.3 GB |
| Dump File Size | ~197 MB (compressed) |

---

## Related Documentation

- `docs/DB_OPTIMIZATION_REPORT.md` - Database optimization recommendations
- `docs/V4_FRONTEND_INTEGRATION.md` - V4 frontend setup
- `docs/V1_MIGRATION_STRATEGY.md` - V1 migration planning

---

*Last updated: 2026-02-19*

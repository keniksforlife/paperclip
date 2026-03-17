# Database Sync Guide

Sync production Railway database to local development environment.

## Quick Sync (One Command)

```bash
# From TWCako directory
./scripts/sync_db.sh
```

## Manual Sync Steps

### 1. Backup Production Database

```bash
cd /path/to/TWCako

# Create backup from Railway production
PGPASSWORD=SEGsBRdAYlNsNtriaQVLgblqFSmXUyoI pg_dump \
  -h shuttle.proxy.rlwy.net \
  -p 59228 \
  -U postgres \
  -d railway \
  -Fc \
  -f railway_backup_$(date +%Y%m%d).dump
```

### 2. Restore to Local Database

```bash
# Drop and recreate local database
PGPASSWORD='YourStrong@Passw0rd' psql -h localhost -p 5433 -U postgres \
  -c "DROP DATABASE IF EXISTS twcako_local;"

PGPASSWORD='YourStrong@Passw0rd' psql -h localhost -p 5433 -U postgres \
  -c "CREATE DATABASE twcako_local;"

# Restore from backup
PGPASSWORD='YourStrong@Passw0rd' pg_restore \
  -h localhost \
  -p 5433 \
  -U postgres \
  -d twcako_local \
  --no-owner \
  --no-acl \
  railway_backup_$(date +%Y%m%d).dump
```

### 3. Verify Restore

```bash
PGPASSWORD='YourStrong@Passw0rd' psql -h localhost -p 5433 -U postgres -d twcako_local \
  -c "SELECT COUNT(*) as users FROM accounts_user;"
```

## Database Connections

| Environment | Host | Port | Database | User |
|-------------|------|------|----------|------|
| **Production (Railway)** | shuttle.proxy.rlwy.net | 59228 | railway | postgres |
| **Local (Docker)** | localhost | 5433 | twcako_local | postgres |

## Environment Variables

In `.env`:

```bash
# Local Development (default)
USE_RAILWAY_DB=0
USE_POSTGRES=1
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_DB=twcako_local
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YourStrong@Passw0rd

# Production (Railway) - uncomment to use
# USE_RAILWAY_DB=1
# DATABASE_URL=postgresql://postgres:SEGsBRdAYlNsNtriaQVLgblqFSmXUyoI@shuttle.proxy.rlwy.net:59228/railway
```

## Prerequisites

1. **PostgreSQL client tools** (pg_dump, pg_restore, psql)
   ```bash
   # macOS
   brew install postgresql
   ```

2. **Local PostgreSQL running** (Docker)
   ```bash
   docker-compose up -d postgres
   ```

3. **Network access to Railway** (no VPN blocking)

## Troubleshooting

### Error: `transaction_timeout`
This warning is safe to ignore. It's a newer PostgreSQL parameter not available in older versions.

### Error: Connection refused
Make sure local PostgreSQL Docker container is running:
```bash
docker ps | grep postgres
```

### Error: Database in use
Stop Django server before dropping database:
```bash
pkill -f "manage.py runserver"
```

## Backup Files

Backup files are stored in the project root:
- `railway_backup_YYYYMMDD.dump` - Date-stamped backups
- Keep only the last 3 backups to save space

## Notes

- **DO NOT** use production database for development (`USE_RAILWAY_DB=1`)
- Always sync before testing features that depend on real data
- Backup files are ~200MB, don't commit to git (already in .gitignore)

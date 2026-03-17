# GitHub Repository Setup Checklist

Complete these steps to enable the full CI/CD pipeline.

## 1. Branch Protection Rules

### `main` branch
Go to: **Settings → Branches → Add branch protection rule**

| Setting | Value |
|---------|-------|
| Branch name pattern | `main` |
| Require pull request before merging | **Yes** |
| Required approvals | **1** |
| Dismiss stale PR approvals | **Yes** |
| Require status checks to pass | **Yes** |
| Required checks | `lint`, `security`, `django-checks`, `build` |
| Require branches to be up to date | **Yes** |
| Require conversation resolution | **Yes** |
| Do not allow bypassing | **Yes** (even for admins) |

### `develop` branch
Same settings as `main`.

## 2. GitHub Secrets

Go to: **Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `RAILWAY_TOKEN` | Railway API token | Railway Dashboard → Account Settings → Tokens |
| `RAILWAY_STAGING_PROJECT_ID` | Staging project ID | Railway Dashboard → Project → Settings → Project ID |
| `RAILWAY_PRODUCTION_PROJECT_ID` | Production project ID | Railway Dashboard → Project → Settings → Project ID |
| `SLACK_WEBHOOK_URL` | (Optional) Slack notifications | Slack → Apps → Incoming Webhooks |

## 3. Railway Setup

### Create Staging Environment

1. Go to Railway Dashboard
2. Click **New Project** or duplicate existing
3. Name it: `twcako-staging`
4. Connect to GitHub repo
5. Set deploy branch: `develop`
6. Add environment variables (copy from production, update as needed)

### Configure Health Checks

In Railway project settings:

```
Health Check Path: /health/
Health Check Timeout: 60 seconds
```

### Environment Variables for Both Environments

```bash
# Required for both staging and production
DJANGO_SECRET_KEY=<unique-per-environment>
DATABASE_URL=<railway-provided>
REDIS_URL=<railway-provided>
DEBUG=0
ALLOWED_HOSTS=staging.twcako.com  # or production domain
```

## 4. GitHub Environments

Go to: **Settings → Environments**

### Create `staging` environment
- No protection rules needed
- Deploys automatically on `develop` merge

### Create `production` environment
- Add protection rule: **Required reviewers** (CTO or senior dev)
- This adds a manual approval step before production deploys

## 5. Enable PR Template

The PR template at `.github/PULL_REQUEST_TEMPLATE.md` will automatically be used.

## 6. Team Permissions

Go to: **Settings → Collaborators and teams**

| Role | Permissions |
|------|-------------|
| CTO | Admin |
| Senior Dev | Maintain |
| Junior Dev | Write |

## 7. Local Developer Setup

Each developer should run:

```bash
# Clone and setup
git clone git@github.com:your-org/twcako.git
cd twcako

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Setup pre-commit hooks (recommended)
pre-commit install

# Copy environment file
cp .env.example .env
# Edit .env with local settings
```

## 8. Verify Setup

Run these commands to verify everything works:

```bash
# Test lint
ruff check .

# Test pre-commit (if installed)
pre-commit run --all-files

# Test health endpoint locally
python manage.py runserver
curl http://localhost:8000/health/
```

## 9. First PR Workflow

Test the workflow with a small change:

1. Create feature branch: `git checkout -b feature/test-ci`
2. Make a small change
3. Commit: `git commit -m "chore: test CI pipeline"`
4. Push: `git push -u origin feature/test-ci`
5. Create PR targeting `develop`
6. Verify all CI checks pass
7. Get approval and merge
8. Verify staging deployment succeeds
9. Create PR from `develop` → `main`
10. Verify production deployment succeeds

---

## Quick Reference

### Branching
```bash
# New feature
git checkout develop && git pull
git checkout -b feature/my-feature

# Bug fix
git checkout develop && git pull
git checkout -b bugfix/issue-123

# Hotfix (emergency)
git checkout main && git pull
git checkout -b hotfix/critical-fix
```

### Commit Messages
```bash
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update documentation
refactor(scope): refactor code
test(scope): add tests
chore(scope): maintenance
```

### Useful Commands
```bash
# Lint and auto-fix
ruff check . --fix

# Run pre-commit on all files
pre-commit run --all-files

# Check for security issues
bandit -r . -x ./venv

# Run tests
pytest -v
```

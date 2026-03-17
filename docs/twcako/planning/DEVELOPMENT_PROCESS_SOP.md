# Development Process & CI/CD SOP

**Version:** 1.0
**Effective Date:** 2026-02-21
**Author:** CTO
**Last Updated:** 2026-02-21

---

## Table of Contents

1. [Overview](#overview)
2. [Git Branching Strategy](#git-branching-strategy)
3. [Commit Message Convention](#commit-message-convention)
4. [Pull Request Workflow](#pull-request-workflow)
5. [Code Review Guidelines](#code-review-guidelines)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Deployment Process](#deployment-process)
8. [Code Quality Standards](#code-quality-standards)
9. [Environment Setup](#environment-setup)
10. [Emergency Procedures](#emergency-procedures)

---

## Overview

This document outlines the standard operating procedures for the TWCako development team. All developers must follow these guidelines to ensure code quality, maintainability, and reliable deployments.

### Team Structure
- **Team Size:** 3 developers
- **Required Approvals:** 1 review per PR
- **Response Time:** 24 hours for PR reviews

### Tech Stack
- **Backend:** Django 3.2, PostgreSQL, Celery, Redis
- **Frontend:** Next.js 16 (V4)
- **Infrastructure:** Railway (Production + Staging)
- **CI/CD:** GitHub Actions

---

## Git Branching Strategy

### Branch Types

| Branch | Purpose | Protection | Auto-Deploy |
|--------|---------|------------|-------------|
| `main` | Production code | Protected | Railway Production |
| `develop` | Integration branch | Protected | Railway Staging |
| `feature/*` | New features | - | - |
| `bugfix/*` | Bug fixes | - | - |
| `hotfix/*` | Emergency fixes | Fast-track | - |

### Branch Naming Convention

```
feature/short-description    # New feature
bugfix/issue-123-fix-login   # Bug fix with issue reference
hotfix/critical-payment-fix  # Emergency production fix
```

### Workflow Diagram

```
feature/xyz ──┬──> develop ──────> main
              │         ↑            │
bugfix/abc ───┘         │            │
                        │            ↓
              staging (Railway)  production (Railway)

hotfix/critical ─────────────────> main
                                    │
                        (backport to develop)
```

### Branch Rules

1. **Never commit directly to `main` or `develop`**
2. **Always create a PR for changes**
3. **Delete branches after merge**
4. **Keep branches short-lived** (max 1 week)

---

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add two-factor authentication` |
| `fix` | Bug fix | `fix(ecash): resolve race condition on withdrawal` |
| `docs` | Documentation | `docs(readme): update installation steps` |
| `style` | Code style (formatting) | `style(api): fix linting errors` |
| `refactor` | Code refactoring | `refactor(models): simplify user queries` |
| `perf` | Performance improvement | `perf(db): add indexes to ecash tables` |
| `test` | Adding tests | `test(finance): add approval queue tests` |
| `chore` | Maintenance tasks | `chore(deps): update Django to 3.2.25` |
| `ci` | CI/CD changes | `ci: add staging deployment workflow` |

### Examples

```bash
# Good
feat(notifications): add push notification support
fix(ecash): prevent double-spend on concurrent withdrawals
docs(api): document member monitoring endpoints

# Bad
update stuff
fixed bug
WIP
```

---

## Pull Request Workflow

### Creating a PR

1. **Create feature branch from `develop`**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

3. **Push and create PR**
   ```bash
   git push -u origin feature/my-feature
   # Then create PR on GitHub targeting `develop`
   ```

### PR Requirements

- [ ] Descriptive title following commit convention
- [ ] Description explaining WHAT and WHY
- [ ] Link to related issue (if applicable)
- [ ] All CI checks passing
- [ ] At least 1 approval from team member
- [ ] No merge conflicts

### PR Size Guidelines

| Size | Lines Changed | Review Time |
|------|---------------|-------------|
| Small | < 100 | Same day |
| Medium | 100-500 | 1-2 days |
| Large | 500+ | Split if possible |

**Rule:** If a PR is too large to review in 30 minutes, split it into smaller PRs.

---

## Code Review Guidelines

### For Authors

1. **Self-review first** - Review your own diff before requesting review
2. **Write clear PR descriptions** - Explain the context and changes
3. **Respond to feedback promptly** - Within 24 hours
4. **Keep PRs focused** - One feature/fix per PR

### For Reviewers

1. **Review within 24 hours** - Unblock teammates
2. **Be constructive** - Suggest improvements, not just point out issues
3. **Approve when ready** - Don't block on minor style issues
4. **Use suggestions** - GitHub's suggestion feature for small fixes

### Review Checklist

- [ ] Code follows project conventions
- [ ] No security vulnerabilities introduced
- [ ] Tests cover the changes (if applicable)
- [ ] No N+1 queries or performance issues
- [ ] Error handling is appropriate
- [ ] No hardcoded secrets or credentials

---

## CI/CD Pipeline

### Pipeline Overview

```
┌─────────────────────────────────────────────────────────────┐
│  PR Opened/Updated (ci.yml)                                 │
├─────────────────────────────────────────────────────────────┤
│  1. Lint Check (ruff)                    ← Blocks if fails  │
│  2. Security Scan (bandit)               ← Blocks if fails  │
│  3. Run Tests (pytest)                   ← Blocks if fails  │
│  4. Migration Check (--check)            ← Blocks if fails  │
│  5. Django Check (--deploy)              ← Blocks if fails  │
└─────────────────────────────────────────────────────────────┘
                           ↓ All pass + Approved
┌─────────────────────────────────────────────────────────────┐
│  Merge to develop (deploy-staging.yml)                      │
├─────────────────────────────────────────────────────────────┤
│  1. Trigger Railway staging deployment                      │
│  2. Wait for deployment to complete                         │
│  3. Run health check on staging                             │
│  4. Notify team via Slack (optional)                        │
└─────────────────────────────────────────────────────────────┘
                           ↓ QA Testing
┌─────────────────────────────────────────────────────────────┐
│  PR develop → main (deploy-production.yml)                  │
├─────────────────────────────────────────────────────────────┤
│  1. Require manual approval (protection rule)               │
│  2. Trigger Railway production deployment                   │
│  3. Zero-downtime deploy (Railway handles this)             │
│  4. Post-deploy health check                                │
│  5. Notify team of deployment                               │
│  6. Auto-rollback if health check fails                     │
└─────────────────────────────────────────────────────────────┘
```

### CI Checks Explained

| Check | Tool | Purpose | Blocks PR? |
|-------|------|---------|------------|
| Lint | ruff | Code style & errors | Yes |
| Security | bandit | Security vulnerabilities | Yes (critical) |
| Tests | pytest | Unit/integration tests | Yes |
| Migrations | Django | Migration consistency | Yes |
| Deploy Check | Django | Production readiness | Yes |

### Running CI Locally

Before pushing, run the same checks locally:

```bash
# Install dev dependencies
pip install ruff bandit pytest pytest-django

# Run lint
ruff check .

# Run security scan
bandit -r . -x ./venv,./tests

# Run tests
pytest

# Check migrations
python manage.py makemigrations --check --dry-run

# Django deploy check
python manage.py check --deploy
```

---

## Deployment Process

### Environment URLs

| Environment | URL | Branch | Auto-Deploy |
|-------------|-----|--------|-------------|
| Production | `https://dashboard.twcako.com` | `main` | Yes |
| Staging | `https://staging.twcako.com` | `develop` | Yes |

### Zero-Downtime Deployment (Railway)

Railway handles zero-downtime automatically:

1. **New instance spins up** alongside existing
2. **Health check runs** on new instance (`/health/`)
3. **Traffic routes** to new instance only after health passes
4. **Old instance terminates** gracefully

### Health Check Endpoint

We expose `/health/` endpoint that checks:
- Database connectivity
- Redis connectivity
- Celery worker status (optional)

```json
// Healthy response (200 OK)
{
  "status": "healthy",
  "database": "ok",
  "redis": "ok",
  "celery": "ok",
  "timestamp": "2026-02-21T10:30:00Z"
}

// Unhealthy response (503 Service Unavailable)
{
  "status": "unhealthy",
  "database": "ok",
  "redis": "error",
  "celery": "ok",
  "error": "Redis connection failed"
}
```

### Deployment Checklist

Before merging to `main`:

- [ ] All tests passing on `develop`
- [ ] Staging tested and verified
- [ ] Database migrations reviewed (if any)
- [ ] No breaking API changes (or communicated)
- [ ] Rollback plan in place

### Rollback Procedure

If production deployment fails:

1. **Automatic:** Railway auto-rollbacks if health check fails
2. **Manual:**
   ```bash
   # Revert the merge commit
   git revert <merge-commit-hash>
   git push origin main

   # Or use Railway dashboard to rollback to previous deployment
   ```

---

## Code Quality Standards

### Linting with Ruff

We use [ruff](https://github.com/astral-sh/ruff) - a fast Python linter that replaces flake8, isort, and more.

Configuration in `pyproject.toml`:

```toml
[tool.ruff]
line-length = 120
target-version = "py310"

[tool.ruff.lint]
select = ["E", "F", "I", "B", "C4", "UP"]
ignore = ["E501"]  # Line too long (handled by formatter)
```

### Code Style Rules

1. **Line length:** 120 characters max
2. **Imports:** Sorted by ruff (isort compatible)
3. **Quotes:** Double quotes for strings
4. **Docstrings:** Required for public functions/classes
5. **Type hints:** Encouraged but not enforced (yet)

### Security Standards

1. **No hardcoded secrets** - Use environment variables
2. **Validate all input** - Especially user-provided data
3. **Use parameterized queries** - Django ORM handles this
4. **HTTPS only** - Enforced in production
5. **CSRF protection** - Enabled by default

---

## Environment Setup

### Local Development

```bash
# Clone repository
git clone git@github.com:your-org/twcako.git
cd twcako

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Dev dependencies

# Copy environment variables
cp .env.example .env
# Edit .env with your local settings

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

### Required Environment Variables

```bash
# .env (minimum required)
DEBUG=1
DJANGO_SECRET_KEY=your-secret-key
DATABASE_URL=postgres://user:pass@localhost:5433/twcako_local
REDIS_URL=redis://localhost:6379/0
```

### Pre-commit Hooks (Optional but Recommended)

```bash
# Install pre-commit
pip install pre-commit
pre-commit install

# Now ruff will run automatically before each commit
```

---

## Emergency Procedures

### Hotfix Process

For critical production bugs:

1. **Create hotfix branch from `main`**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-fix
   ```

2. **Make minimal fix**
   - Fix only the critical issue
   - Add test to prevent regression

3. **Fast-track PR to `main`**
   - Mark as "URGENT" in PR title
   - Request immediate review
   - Skip staging if truly critical

4. **Backport to `develop`**
   ```bash
   git checkout develop
   git cherry-pick <hotfix-commit>
   git push origin develop
   ```

### Production Incident Response

1. **Assess severity** - Is the site down? Data at risk?
2. **Communicate** - Notify team in Slack
3. **Rollback if needed** - Use Railway dashboard
4. **Investigate** - Check logs, identify root cause
5. **Fix** - Create hotfix PR
6. **Post-mortem** - Document what happened and how to prevent

### Contact for Emergencies

- **CTO:** [Your contact]
- **DevOps:** [DevOps contact]
- **Railway Support:** support@railway.app

---

## Appendix

### Useful Commands

```bash
# Lint and auto-fix
ruff check . --fix

# Run specific test
pytest tests/test_ecash.py -v

# Create migration
python manage.py makemigrations

# Check migration SQL
python manage.py sqlmigrate app_name 0001

# Django shell
python manage.py shell_plus  # requires django-extensions

# Celery worker (local)
celery -A twcako worker -l info

# View Railway logs
railway logs
```

### Resources

- [Django Documentation](https://docs.djangoproject.com/en/3.2/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Railway Documentation](https://docs.railway.app/)
- [Ruff Documentation](https://docs.astral.sh/ruff/)

---

**Document Revision History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-21 | CTO | Initial SOP |

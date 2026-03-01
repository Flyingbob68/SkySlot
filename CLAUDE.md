# CLAUDE.md - SkySlot Aeroclub Management System

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**SkySlot** is a modern web application for aeroclub management: aircraft booking, member management, instructor scheduling, qualification tracking, and club administration. It is a full rewrite of the legacy PHP application OpenFlyers, built with a modern stack.

### Stack

| Layer | Technology |
|-------|-----------|
| Backend | Express + TypeScript + Zod validation |
| ORM | Prisma |
| Database | PostgreSQL |
| Frontend | React 19 + Vite 7 + TypeScript |
| Auth | JWT + OAuth (Google) |
| Testing | Vitest + Playwright |
| Deploy | PM2 + nginx + systemd (Linux) |

### Architecture

- **Monorepo** with npm workspaces: `backend/` and `frontend/`
- **API-first**: Backend serves REST JSON API, frontend is a SPA
- **Repository pattern**: Data access abstracted behind interfaces
- **Immutable patterns**: Never mutate objects, always return new copies
- **Consistent API envelope**: `{ success, data, error, meta? }`

## Critical Rules

### Code Organization
- Many small files (200-400 lines typical, 800 max)
- Functions under 50 lines
- No deep nesting (max 4 levels)
- Organize by feature/domain, not by type

### Immutability (MANDATORY)
```typescript
// WRONG
user.name = newName;

// CORRECT
const updated = { ...user, name: newName };
```

### Error Handling
- Handle errors explicitly at every level
- Use `AppError` class for operational errors
- Never silently swallow errors
- Never leak internal details in production responses

### Input Validation
- Validate ALL user input with Zod schemas
- Validate at API boundary (controllers/routes)
- Fail fast with clear error messages

### Security (NON-NEGOTIABLE)
- No hardcoded secrets - always use environment variables
- Parameterized queries only (Prisma handles this)
- bcrypt/argon2 for password hashing (NEVER MD5)
- CSRF protection on state-changing endpoints
- Rate limiting on all public endpoints
- Sanitize all user content before rendering

## Project Structure

```
SkySlot/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Seed data
│   ├── src/
│   │   ├── config/            # Environment, app config
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/         # Auth, error handling, logging
│   │   ├── models/            # Prisma types, DTOs
│   │   ├── repositories/      # Data access layer
│   │   ├── routes/            # Express route definitions
│   │   ├── services/          # Business logic
│   │   ├── utils/             # Shared utilities
│   │   └── index.ts           # Entry point
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Route-level components
│   │   ├── services/          # API client functions
│   │   ├── stores/            # State management
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Frontend utilities
│   └── tests/
├── deploy/                    # Linux deployment configs
├── docs/specs/                # Specifications
└── CLAUDE.md                  # This file
```

## Key Commands

```bash
# Development
npm run dev:backend          # Start backend dev server
npm run dev:frontend         # Start frontend dev server (Vite)

# Build
npm run build                # Build both workspaces
npm run build:backend        # Build backend only
npm run build:frontend       # Build frontend only

# Testing
npm run test                 # Run all tests
npm run test:backend         # Backend tests only
npm run test:frontend        # Frontend tests only

# Database
npm run db:migrate           # Run Prisma migrations
npm run db:seed              # Seed database

# Linting
npm run lint                 # Lint all code
```

## API Response Format

ALL API endpoints must return this envelope:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}
```

## Domain Concepts

- **Member**: A registered user of the aeroclub (pilot)
- **Instructor**: A member with instructor qualifications
- **Aircraft**: A plane in the fleet, with type, callsign, costs
- **Booking**: A time slot reservation on an aircraft
- **Qualification**: A license/certification (PPL, SEP, etc.)
- **Profile/Role**: Permission set assigned to members
- **Availability**: Instructor's weekly schedule + exceptions

## Git Workflow

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Small, focused commits
- Test locally before committing

## Agent Delegation

Use specialized agents proactively:

| Agent | When |
|-------|------|
| planner | Complex features, multi-step implementation |
| code-reviewer | After writing/modifying code |
| tdd-guide | New features, bug fixes |
| security-reviewer | Auth code, user input, API endpoints |
| build-error-resolver | Build/type errors |
| database-reviewer | Schema changes, migrations |
| architect | Architectural decisions |

## Testing Requirements

- TDD: Write tests first (RED), implement (GREEN), refactor (IMPROVE)
- Minimum 80% coverage
- Unit + Integration + E2E for critical flows
- Use Vitest for unit/integration, Playwright for E2E

## Development Workflow

1. Plan first (use planner agent for complex features)
2. Write tests first (TDD)
3. Implement to pass tests
4. Code review (use code-reviewer agent)
5. Security check (use security-reviewer for sensitive code)
6. Commit with conventional format

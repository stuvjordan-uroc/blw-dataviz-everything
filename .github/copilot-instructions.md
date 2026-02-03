# BLW DataViz Architecture

## Project Overview

This is a monorepo for a live polling and data visualization system. It consists of multiple packages including APIs, shared libraries, and client utilities for real-time polling sessions with interactive visualizations.

## Three-Schema Database Design

The system uses **three separate PostgreSQL schemas** with distinct purposes. You can find the table definitions (constructed using Drizzle) in the shared-schemas package

### questions schema (source of truth)

- **Purpose**: Stores the master question catalog
- **Tables**:
  - `questions.batteries` - Question battery definitions
  - `questions.sub_batteries` - Sub-battery groupings
  - `questions.questions` - Full question data with composite primary key (varName, batteryName, subBattery)
    - Contains: text, responses[] array
- **Used by**: Both Admin and Public APIs for querying full question details

### polls schema (session-specific data)

- **Purpose**: Stores session data and responses
- **Tables**:
  - `polls.sessions` - Session metadata with JSONB config containing Question[] keys only
  - `polls.questions` - Links questions to sessions (sessionId + question keys + orderingIndex)
  - `polls.respondents` - Participant tracking
  - `polls.responses` - Individual response data
  - `polls.session_visualizations` - Pre-computed visualization state

### admin schema

- **Purpose**: Admin user authentication
- **Tables**:
  - `admin.users` - Admin credentials (bcrypt hashed passwords)

## Type System

Core types are are shared across the DB, api, and frontends are in the shared-types package. Note that there are both types and zod schemas exported by this package. If you are a bot and you are reading this. Do not do anything until you read ALL the source files in shared-types.

## API

There are two core API packages -- api-polls-admin and api-polls-public. api-polls-unified just wraps these two packages to make depolyment of both apis on a single machine/container easier.

## Frontends

All frontends are supported by **polls-participant-utils**, which provides classes and hooks for maintaining a connection to streaming visualization updates, and react components that mount canvases that render real-time visualizations.

**ui-shared** provides uniform styling (specified using Vanilla Extract).

**ui-participant** is the main front end for poll participants.

**ui-facilitator** is not yet created, but will be the main front end for poll session facilitators.

At some point in the future, we may develop a frontend that facilitates admins creating and configuring polling sessions.

## Package Structure

- **shared-types**: Core TypeScript types and API contracts (no dependencies)
- **shared-schemas**: Drizzle ORM database schemas
- **shared-auth**: NestJS authentication guards and decorators
- **shared-computation**: Visualization calculation logic
- **db**: Database migrations and seed scripts
- **api-polls-admin**: Admin API for session management (NestJS)
- **api-polls-public**: Public API for participants (NestJS)
- **api-polls-unified**: Unified API combining admin/public (NestJS)
- **api-polls-client**: Type-safe API client library
- **polls-participant-utils**: React hooks and utilities for participant UI
- **ui-shared**: Shared UI components and styling (Vanilla Extract)
- **ui-participant**: Participant polling interface (React + Vite)
- **dev-scripts**: Development scripts for local testing and seeding
- **integration-tests**: E2E tests across all services

## Deployment

**Production (Railway):**

- PostgreSQL database with all schemas
- Unified API (api-polls-unified) deployed as Docker container
- Database seeding service (runs on-demand)

**Local Development:**

- API runs locally via Docker Compose, connects to Railway DB
- UI runs via Vite dev server (port 3000), proxies to local API (port 3003)
- Dev scripts create test sessions and simulate responses

See [DEV_WORKFLOW.md](../DEV_WORKFLOW.md) for complete local development setup.

## Visualization System

Sessions include pre-configured visualizations that update in real-time as responses arrive:

- **Initialization**: Admin API calls `initializeSplitsWithSegments()` to create initial empty visualization state
- **Storage**: Visualization state stored in `polls.session_visualizations` with viewMaps for O(1) view switching
- **Updates**: Public API processes responses and emits incremental diffs via SSE stream
- **Lookup Maps**: Pre-computed at session creation for O(1) response → split mapping

The computation functions that construct and update visualization structures are defined in shared-computation.

If you are a bot and reading this, do not do anything without first reading the `initializeSplitsWithSegments` function at shared-computation/src/segmentViz/initializeSplitsWithSegments.ts. By reading this function, you can see the basic structure of a visualization (defined in an abstract coordinate space) which is computed/populated/updated on the backend.

## Development Workflow for UI

To work on the UI and see live polling behavior:

1. **Start local API**: `docker compose -f docker-compose.dev.yml up`
2. **Create test session**: `npm run dev:create-session` (outputs session slug)
3. **Start UI**: `cd packages/ui-participant && npm run dev`
4. **Simulate responses**: `npm run dev:simulate {slug} 20 --interval 2000`

This workflow ensures:

- Visualization structures are properly initialized via API endpoints
- SSE streaming works correctly
- UI updates in real-time as "participants" submit responses
- No database seeding required - everything goes through proper API flow

## Code Quality Rules

1. **NEVER use `any` type** - Always use proper TypeScript types. If you cannot find the correct type, ask for guidance rather than casting to `any`.
2. **Type safety is non-negotiable** - All type assertions must be justified and documented

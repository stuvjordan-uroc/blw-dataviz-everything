# BLW DataViz Architecture

## Project Overview

This is a monorepo for a live polling and data visualization system. It consists of multiple packages including APIs, shared libraries, and client utilities for real-time polling sessions with interactive visualizations.

## Two-Schema Database Design

The system uses **two separate PostgreSQL schemas** with distinct purposes:

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

## Question Storage Pattern

**CRITICAL ARCHITECTURAL RULE**: Question text and response options are NEVER duplicated into the polls schema.

### How it works:

1. **Admin API creates session**:
   - Receives `CreateSessionDto` with `sessionConfig.questionOrder: Question[]` (keys only)
   - Stores those Question[] keys directly in `polls.sessions.session_config` JSONB
   - Also inserts question keys into `polls.questions` table for relational queries
   - **Does NOT expand** questions to include text/responses before storage

2. **Public API serves session**:
   - Reads `session.sessionConfig.questionOrder` from DB (contains Question[] keys)
   - Calls `getFullQuestionDetails()` to query `questions.questions` schema
   - Expands Question[] to QuestionWithDetails[] with text and responses
   - Returns `SessionResponse` with full question details to client

### Why this design?

- Single source of truth for question text/responses
- Easy to update questions globally without touching session data
- Smaller session storage (JSONB contains only keys)
- Clear separation between session structure and question content

## Type System

### Core Types (shared-types package)

- **`Question`** - Just the composite key: `{varName, batteryName, subBattery}`
- **`QuestionWithDetails`** - Extends Question with: `{text, responses[]}`

### API Contract Types

- **`CreateSessionDto`** (Admin API input):
  - `sessionConfig.questionOrder: Question[]` - Keys only for storage
  
- **`SessionConfig`** (Public API response):
  - `questionOrder: QuestionWithDetails[]` - Full details for client rendering

- **`Session`** (Admin API response):
  - `sessionConfig: SessionConfig | null` - Type annotation matches API response format

### Important Note

The database schema type annotation for `polls.sessions.session_config` uses `SessionConfig` type, but the actual stored JSONB data has the structure of `CreateSessionDto.sessionConfig` (with Question[] not QuestionWithDetails[]). This is intentional - the type annotation represents what the API returns, not what's physically stored.

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
- **integration-tests**: E2E tests across all services

## Visualization System

Sessions include pre-configured visualizations that update in real-time as responses arrive:

- **Initialization**: Admin API calls `initializeSplitsWithSegments()` to create initial empty visualization state
- **Storage**: Visualization state stored in `polls.session_visualizations` with viewMaps for O(1) view switching
- **Updates**: Public API processes responses and emits incremental diffs via SSE stream
- **Lookup Maps**: Pre-computed at session creation for O(1) response → split mapping

## Development Workflow

- **Monorepo**: Uses npm workspaces
- **TypeScript**: All packages written in TypeScript
- **Build**: `npm run build` from root builds all packages
- **Lint**: `npm run lint` from root lints all packages
- **Database**: Docker compose for PostgreSQL (test and dev environments)

## Common Gotchas

1. **Never expand questions in Admin API** - It only stores keys
2. **Always expand questions in Public API** - Before sending to clients
3. **Question keys are composite** - All three fields (varName, batteryName, subBattery) required
4. **subBattery is NOT NULL** - Use empty string `''` for questions without sub-battery
5. **Visualization IDs** - Generated server-side, clients reference by ID

## Code Quality Rules

1. **NEVER use `any` type** - Always use proper TypeScript types. If you cannot find the correct type, ask for guidance rather than casting to `any`.
2. **Type safety is non-negotiable** - All type assertions must be justified and documented

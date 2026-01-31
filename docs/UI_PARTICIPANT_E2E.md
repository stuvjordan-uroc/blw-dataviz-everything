# UI Participant E2E Testing Guide

This guide walks through end-to-end testing of the **ui-participant** frontend against a live test environment.

## Overview

The E2E test environment consists of:

- **PostgreSQL test database** (port 5433) - Isolated from development
- **api-polls-unified** (port 3006) - Combined admin + public API
- **ui-participant** (port 5173) - Vite dev server (local)

```
┌─────────────────────────────────────────────────┐
│            Docker Test Environment              │
│                                                 │
│  ┌──────────────┐    ┌────────────────────────┐│
│  │  PostgreSQL  │◄───┤ api-polls-unified-test ││
│  │  (5433)      │    │      (3006)            ││
│  │              │    │                        ││
│  │ • Questions  │    │ Admin + Public APIs:   ││
│  │ • Session    │    │ • GET /api/sessions/:slug  ││
│  │ • Responses  │    │ • POST /api/responses  ││
│  └──────────────┘    │ • SSE /visualizations  ││
│                      └──────▲─────────────────┘│
└─────────────────────────────┼──────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  ui-participant   │
                    │  Vite Dev (5173)  │
                    │                   │
                    │  Browser testing  │
                    └───────────────────┘
```

## Quick Start

### One-Command Setup

```bash
# From repository root
npm run test:ui-participant:setup
```

This will:

1. Start test containers (PostgreSQL + api-polls-unified)
2. Run schema migrations
3. Populate database with questions from S3
4. Seed test session with ~20 responses

### Start UI Participant Dev Server

```bash
cd packages/ui-participant
npm run dev -- --mode e2e
```

Or manually with env var:

```bash
VITE_API_URL=http://localhost:3006 npm run dev
```

### Open in Browser

```
http://localhost:5173/sessions/ui-participant-e2e-test
```

## Manual Step-by-Step Setup

If you want more control:

### 1. Generate Latest Schema Migration

```bash
npm run db:generate --workspace=db
```

### 2. Start Test Containers

```bash
npm run test
```

This starts:

- `postgres-test` - PostgreSQL 15 on port 5433
- `db-migrate-test` - Runs schema migrations
- `api-polls-unified-test` - Unified API on port 3006

### 3. Populate Database with Questions

```bash
npm run test:db-populate
```

This requires AWS authentication for S3 access. Follow the prompts.

### 4. Seed Test Session and Responses

```bash
npm run test:ui-participant:seed
```

Creates:

- Session slug: `ui-participant-e2e-test`
- ~20 participant responses with realistic data
- Visualizations configured for available questions

### 5. Start ui-participant

```bash
cd packages/ui-participant
npm run dev -- --mode e2e
```

### 6. Test in Browser

Visit: `http://localhost:5173/sessions/ui-participant-e2e-test`

You should see:

- Pre-seeded responses in visualizations
- Real-time SSE connection status
- Responsive canvas sizing (resize browser to test breakpoints)

## Testing Workflow

### Submit Additional Responses

1. Open session in browser
2. If already submitted, clear localStorage or open incognito
3. Answer poll questions
4. Submit
5. Watch visualization update in real-time via SSE

### Test Multiple Participants

Open multiple browser windows/tabs to simulate concurrent participants.

### Inspect Logs

```bash
# All services
npm run test:logs

# Just API
docker logs -f blw-api-polls-unified-test

# Just database
docker logs -f blw-postgres-test
```

### Reset Test Data

To start fresh:

```bash
# Stop containers and remove volumes
docker compose -f docker-compose.test.yml down -v

# Restart and re-seed
npm run test:ui-participant:setup
```

## Environment Configuration

### ui-participant Test Environment

File: `packages/ui-participant/.env.e2e`

```env
VITE_API_URL=http://localhost:3006
```

### Test Database Connection

```
Host: localhost
Port: 5433
Database: blw_dataviz_test
User: postgres
Password: password
```

Connection string:

```
postgresql://postgres:password@localhost:5433/blw_dataviz_test
```

## Port Mapping

| Service                | Container Port | Host Port | Purpose         |
| ---------------------- | -------------- | --------- | --------------- |
| postgres-test          | 5432           | 5433      | Test database   |
| api-polls-unified-test | 3000           | 3006      | Unified API     |
| ui-participant         | 5173           | 5173      | Vite dev server |

## Troubleshooting

### Container Won't Start

```bash
# Check if ports are in use
lsof -i :5433  # PostgreSQL
lsof -i :3006  # API

# Force cleanup
docker compose -f docker-compose.test.yml down -v
docker system prune -f
```

### No Questions in Database

```bash
# Re-run S3 data migration
npm run test:db-populate
```

### API Not Responding

```bash
# Check API logs
docker logs blw-api-polls-unified-test

# Restart API
docker restart blw-api-polls-unified-test
```

### UI Can't Connect to API

1. Verify API is running: `curl http://localhost:3006/health`
2. Check `.env.e2e` has correct URL
3. Restart Vite with `--mode e2e` flag
4. Check browser console for CORS errors

### SSE Connection Failing

1. Check API logs for SSE endpoint errors
2. Verify session exists: `curl http://localhost:3006/api/sessions/ui-participant-e2e-test`
3. Check network tab in browser DevTools

## Cleanup

### Stop Test Environment

```bash
npm run test:teardown
```

### Remove Test Data (Keeps Containers)

```bash
docker compose -f docker-compose.test.yml down -v
```

## Next Steps

Once ui-participant E2E is working:

1. Test responsive breakpoints (mobile → tablet → desktop → wide)
2. Test concurrent participants (multiple browser windows)
3. Test SSE reconnection (stop/start API container)
4. Measure performance with 50+ responses
5. Create similar E2E setups for ui-facilitator and ui-admin

## Related Documentation

- [Database Setup](../../DATABASE_SETUP.md)
- [API Polls Unified README](../api-polls-unified/README.md)
- [UI Participant README](../ui-participant/README.md)

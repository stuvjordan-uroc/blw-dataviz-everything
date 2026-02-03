# Local Development Workflow

This guide explains how to run the BLW DataViz system locally for UI development and testing.

## Architecture Overview

The system consists of:

- **PostgreSQL Database**: Hosted on Railway (production)
- **Unified API**: Runs locally in Docker, connects to Railway DB
- **UI (Frontend)**: Runs locally via Vite dev server, proxies to local API
- **Dev Scripts**: Create test sessions and simulate poll responses

## Prerequisites

1. **Docker Desktop** installed and running
2. **Node.js 20+** installed
3. **Railway Database Credentials** (from Railway dashboard)

## Setup (One-Time)

### 1. Configure Environment

Ensure your `.env` file has the correct Railway credentials:

- `DATABASE_URL`: Get from Railway → PostgreSQL service → Connect → Connection String
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: IAM user credentials for S3 access
- Other variables should match production (see `.env.example` for reference)

**Important**: Never commit `.env` - it contains production credentials! It's already in `.gitignore`.

### 2. Install Dependencies

From the repository root:

```bash
npm install
```

This installs all dependencies for all packages in the monorepo.

## Development Workflow

### Step 1: Start the Local API

Run the API in Docker, connecting to the Railway database:

```bash
docker compose -f docker-compose.dev.yml up
```

This will:

- Build the unified API container
- Connect to Railway PostgreSQL database
- Expose the API at `http://localhost:3003`
- Enable real-time SSE streams for visualization updates

**Verify it's running**: Open `http://localhost:3003` (should return 404 - that's expected!)

### Step 2: Create a Test Session

Create a polling session with pre-configured questions:

```bash
npm run dev:create-session
```

This will output a session slug like: `abc123xyz`

**What happens**:

1. Authenticates as admin user
2. Creates a session with democratic characteristics questions
3. Initializes visualization structures via `initializeSplitsWithSegments()`
4. Returns the session slug for accessing the poll

### Step 3: Start the UI Dev Server

In a new terminal, start the participant UI:

```bash
cd packages/ui-participant
npm run dev
```

The UI will:

- Start at `http://localhost:3000`
- Automatically proxy `/api/*` requests to `http://localhost:3003`
- Open in your browser

**Access your test session**: Navigate to `http://localhost:3000/polls/{slug}`

### Step 4: Simulate Poll Responses

Watch the UI update in real-time as fake participants answer:

```bash
# 10 instant responses
npm run dev:simulate abc123xyz 10

# 20 responses with 2-second delays (watch them arrive!)
npm run dev:simulate abc123xyz 20 --interval 2000
```

**What happens**:

1. Script generates random responses for all questions
2. POSTs to `/api/responses` endpoint
3. API processes responses and updates visualizations
4. API broadcasts updates via SSE
5. UI receives updates and animates points in real-time

## How It Works: The Full Flow

```
┌─────────────────┐
│ dev-scripts     │
│ simulate-       │
│ responses.ts    │
└────────┬────────┘
         │ POST /api/responses
         │
         ▼
┌─────────────────────────────────┐
│ API (localhost:3003)            │
│                                 │
│ 1. ResponsesService             │
│    - Validates session          │
│    - Creates respondent         │
│    - Persists to Railway DB ────┼──► Railway
│    - Queues for batch update    │   PostgreSQL
│                                 │
│ 2. BatchUpdateScheduler         │
│    - Collects responses         │
│    - Updates visualizations     │
│    - Broadcasts via SSE         │
└────────┬────────────────────────┘
         │ SSE: visualization.updated
         │
         ▼
┌─────────────────────────────────┐
│ UI (localhost:3000)             │
│                                 │
│ useSessionViz hook              │
│  ├─ Connects to SSE stream      │
│  ├─ Receives updates            │
│  └─ Updates VizStateManager     │
│                                 │
│ SingleSplitViz component        │
│  └─ Animates canvas smoothly    │
└─────────────────────────────────┘
```

## Common Tasks

### Resetting the Test Session

Delete the session and create a new one:

```bash
# Delete via admin API (TODO: add script)
# OR just create a new session
npm run dev:create-session
```

### Changing the Test Data

Edit `packages/dev-scripts/src/create-test-session.ts` to:

- Add/remove questions
- Change visualization config
- Modify session description

### Debugging the API

View API logs in real-time:

```bash
docker compose -f docker-compose.dev.yml logs -f api
```

Stop and rebuild after code changes:

```bash
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up --build
```

### Testing with Production API

To test against the deployed Railway API instead of local:

1. Update `packages/ui-participant/vite.config.ts`:

   ```typescript
   proxy: {
     '/api': {
       target: 'https://your-api.railway.app',
       changeOrigin: true,
     },
   },
   ```

2. Update `packages/dev-scripts/src/create-test-session.ts`:
   ```typescript
   const API_BASE_URL = "https://your-api.railway.app";
   ```

## Troubleshooting

### API won't start

- Check Docker Desktop is running
- Verify `.env.local` has correct `DATABASE_URL`
- Check Railway database is accessible: `psql $DATABASE_URL`

### UI shows "Failed to load session"

- Verify API is running: `curl http://localhost:3003/api/health`
- Check session slug is correct
- Review API logs for errors

### SSE not connecting

- Check browser console for connection errors
- Verify API SSE endpoint: `curl http://localhost:3003/api/sessions/{slug}/visualizations/stream`
- Check CORS settings if using different origins

### Database connection errors

- Verify Railway database URL is correct
- Check Railway database isn't paused (free tier limitation)
- Test connection: `psql $DATABASE_URL -c "SELECT 1"`

## Next Steps

- **Add more questions**: Modify `create-test-session.ts`
- **Test different visualizations**: Add grouping questions
- **Develop UI features**: The entire system is running locally!
- **Profile performance**: Use Chrome DevTools with real-time updates

# Dev Scripts

Development scripts for creating test sessions and simulating poll responses.

## Prerequisites

1. Local API running via Docker Compose:

   ```bash
   docker compose -f docker-compose.dev.yml up
   ```

2. API available at `http://localhost:3003`

## Usage

### Create a Test Session

Creates a new polling session with democratic characteristics questions:

```bash
npm run create-session
```

This will:

- Authenticate as admin user
- Create a session with pre-configured questions
- Output the session slug for use with other scripts
- Session will be accessible at `http://localhost:3000/polls/{slug}`

### Simulate Responses

Simulate multiple respondents answering the poll:

```bash
# Simulate 10 respondents instantly
npm run simulate {session-slug} 10

# Simulate 20 respondents with 2-second delay between each
npm run simulate {session-slug} 20 --interval 2000
```

Arguments:

- `session-slug`: The slug from create-session output
- `count`: Number of fake respondents to create
- `--interval`: Optional delay in milliseconds between responses (default: 0)

## How It Works

1. **create-test-session.ts**: Uses the admin API client to POST a new session
2. **simulate-responses.ts**: Generates random responses and POSTs them to the public API
3. All requests go through proper API endpoints, triggering visualization updates and SSE broadcasts

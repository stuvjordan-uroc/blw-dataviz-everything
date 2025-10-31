# API Architecture

## Real-time Polling System

```
Responses Come In          Real-time Updates Go Out
     ↓                              ↑
┌─────────────┐              ┌─────────────┐
│  Process 1  │              │  Process 2  │
│  (API)      │              │ (WebSocket) │
└─────────────┘              └─────────────┘
     ↓                              ↑
     ↓ writes                 reads ↑
     ↓                              ↑
┌──────────────────────────────────────┐
│      session_statistics table        │
│  (single source of truth per session)│
└──────────────────────────────────────┘
```

**See packages/db/schemas/polls/schema.ts for data structures passed between the api and db**

## Process 1: Response Ingestion

Handles incoming poll responses and updates database:

- Inserts responses into `responses` table
- Triggers debounced statistics computation
- Upserts computed statistics into `session_statistics` table

## Process 2: Real-time Distribution

Pushes updates to connected clients:

- Watches `session_statistics` table for changes
- Detects updates (via polling, triggers, or LISTEN/NOTIFY)
- Broadcasts to WebSocket/SSE clients watching each session

## Key Benefits

- **Independent deployment**: Update response handler without touching WebSocket server
- **Independent scaling**: More WebSocket servers for more viewers, independent of write load
- **Simple testing**: Test statistics computation separate from real-time distribution
- **Fault tolerance**: If WebSocket server crashes, statistics still update correctly
- **Database as contract**: The table schema is the API between the two processes

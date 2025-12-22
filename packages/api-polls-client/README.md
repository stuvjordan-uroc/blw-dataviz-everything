# API Polls Client

Client library for communicating with the polling APIs. Framework-agnostic, works in any browser environment.

## Features

- ✅ Fetch session information by slug
- ✅ Subscribe to real-time visualization updates via Server-Sent Events (SSE)
- ⏳ Submit poll responses (coming soon)

## Installation

```bash
npm install api-polls-client
```

## Usage

### Basic Example

```typescript
import { PollsApiClient } from "api-polls-client";

// Create client instance
const client = new PollsApiClient("http://localhost:3005");

// Get session information
const session = await client.getSession("my-poll-abc123");
console.log("Session:", session);

// Connect to real-time updates
const stream = client.createVisualizationStream(session.id);

stream.addEventListener("visualization.snapshot", (event) => {
  const snapshot = JSON.parse(event.data);
  console.log("Initial visualization state:", snapshot);
});

stream.addEventListener("visualization.updated", (event) => {
  const update = JSON.parse(event.data);
  console.log("Visualization updated:", update);
});

stream.addEventListener("session.statusChanged", (event) => {
  const statusChange = JSON.parse(event.data);
  if (statusChange.isOpen) {
    console.log("Session opened - enable response form");
  } else {
    console.log("Session closed - disable response form");
  }
});

// Clean up when done
stream.close();
```

### React Integration Example

```typescript
import { useEffect, useState } from "react";
import { PollsApiClient } from "api-polls-client";

function SessionView({ slug }: { slug: string }) {
  const [session, setSession] = useState(null);
  const [vizState, setVizState] = useState(null);

  useEffect(() => {
    const client = new PollsApiClient("http://localhost:3005");

    // Load session
    client.getSession(slug).then(setSession);
  }, [slug]);

  useEffect(() => {
    if (!session) return;

    const client = new PollsApiClient("http://localhost:3005");
    const stream = client.createVisualizationStream(session.id);

    stream.addEventListener("visualization.snapshot", (event) => {
      setVizState(JSON.parse(event.data));
    });

    stream.addEventListener("visualization.updated", (event) => {
      setVizState(JSON.parse(event.data));
    });

    return () => stream.close();
  }, [session]);

  return <div>{/* Render session and visualization */}</div>;
}
```

## API Reference

### `PollsApiClient`

Main client class for interacting with the polling API.

#### Constructor

```typescript
new PollsApiClient(baseUrl: string)
```

**Parameters:**

- `baseUrl` - Base URL of the polling API (e.g., `'http://localhost:3005'`)

#### Methods

##### `getSession(slug: string): Promise<SessionResponse>`

Fetches complete session information by slug.

**Returns:** Session metadata, configuration, current visualization state, and API endpoints.

**Throws:** Error if session not found or network error occurs.

##### `createVisualizationStream(sessionId: number): EventSource`

Creates an SSE connection for real-time visualization updates.

**Returns:** EventSource instance that emits:

- `visualization.snapshot` - Initial state
- `visualization.updated` - Incremental updates
- `session.statusChanged` - Session open/close events

## Development

```bash
# Build
npm run build

# Watch mode
npm run watch

# Lint
npm run lint
```

## Design Philosophy

This package is intentionally minimal and framework-agnostic:

- ❌ No React/Vue/framework dependencies
- ❌ No DOM manipulation
- ❌ No state management
- ✅ Pure HTTP/SSE communication
- ✅ Works with any framework or vanilla JS
- ✅ Easy to test

State management and rendering are separate concerns handled by other packages.

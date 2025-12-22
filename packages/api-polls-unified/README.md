# API Polls Unified

This package combines the admin and public polling APIs into a single unified application. The two APIs share an EventEmitter instance, enabling real-time communication between them.

## Architecture

- **Admin API** (`/admin/*` routes) - Session management, requires authentication
- **Public API** (root routes) - Response submission, visualization streaming, no authentication required
- **Shared EventEmitter** - Enables admin API to notify public API of state changes

## Key Features

### Cross-API Communication

When admin changes session state (e.g., opening/closing a session), the public API is notified immediately via shared EventEmitter:

```typescript
// Admin API emits event
eventEmitter.emit('session.statusChanged', { sessionId, isOpen, timestamp });

// Public API listens and broadcasts to SSE clients
@OnEvent('session.statusChanged')
handleStatusChange(event) { ... }
```

### Route Separation

- Admin routes are prefixed with `/admin`
- Public routes have no prefix
- Both APIs maintain their own authentication/authorization logic

## Running

### Development

```bash
npm run start:dev
# or with auto-reload
npm run start:dev:watch
```

### Production

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t api-polls-unified .
docker run -p 3005:3005 api-polls-unified
```

## Environment Variables

- `POLLING_UNIFIED_PORT` - Port for the unified API (default: 3005)
- All environment variables from `api-polls-admin` and `api-polls-public`

## Dependencies

- `api-polls-admin` - Admin API package
- `api-polls-public` - Public API package
- `@nestjs/event-emitter` - For cross-module event communication

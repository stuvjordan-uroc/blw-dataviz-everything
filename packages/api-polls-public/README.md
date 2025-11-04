# API Polls Public

Public-facing API for the polling application. This API provides read-only access to poll sessions and questions.

## Overview

This NestJS API serves as the public interface for poll sessions, allowing clients to retrieve questions for active polling sessions.

## Endpoints

### GET /sessions/:sessionId/questions

Retrieves all questions for a given session.

**Parameters:**

- `sessionId` (number, required) - The ID of the poll session

**Response:**

- `200 OK` - Returns an array of questions
- `404 Not Found` - If the session doesn't exist

**Example Request:**

```bash
GET http://localhost:3004/sessions/1/questions
```

**Example Response:**

```json
[
  {
    "id": 1,
    "sessionId": 1,
    "varName": "q1",
    "batteryName": "main",
    "subBattery": ""
  },
  {
    "id": 2,
    "sessionId": 1,
    "varName": "q2",
    "batteryName": "main",
    "subBattery": ""
  }
]
```

## Setup

### Prerequisites

- Node.js (v20+)
- PostgreSQL database (configured via `DATABASE_URL` environment variable)
- Shared schemas package built

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root of the monorepo with:

```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
POLLING_PUBLIC_PORT=3004  # Optional, defaults to 3004
```

### Build

```bash
npm run build
```

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run build
npm start
```

## Architecture

- **QuestionsModule**: Handles question retrieval logic
  - **QuestionsController**: HTTP endpoint handlers
  - **QuestionsService**: Business logic for querying questions
- **DatabaseModule**: Global database connection provider

## Dependencies

- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` - NestJS framework
- `drizzle-orm` - ORM for database queries
- `postgres` - PostgreSQL client
- `shared-schemas` - Shared database schema definitions

# API Polls Admin

Admin API for managing poll sessions in the BLW polling application.

## Purpose

This API provides administrators with the ability to:

- Create, read, update, and delete poll sessions
- Configure which questions from the questions schema are included in each session
- Browse available questions for session configuration

## Tech Stack

- **NestJS**: Web framework
- **Drizzle ORM**: Database access layer
- **Zod**: Runtime validation
- **PostgreSQL**: Database (via the shared `db` package)

## Setup

1. Copy `.env.example` to `.env` and configure your database connection
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Run in development mode: `npm run start:dev`
5. Run in production mode: `npm run build && npm start`

## API Endpoints

### Sessions

- `POST /sessions` - Create a new poll session
- `GET /sessions` - List all sessions
- `GET /sessions/:id` - Get a specific session
- `PUT /sessions/:id` - Update a session
- `DELETE /sessions/:id` - Delete a session

### Questions

- `GET /questions` - Browse available questions
- `GET /questions/batteries` - List question batteries

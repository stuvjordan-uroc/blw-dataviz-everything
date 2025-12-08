# worker-polls

A dedicated compute worker that consumes responses from Redis Streams and maintains per-session Statistics and SegmentViz instances.

Environment

- `REDIS_URL` - connection string for Redis
- `DATABASE_URL` - Postgres connection string (optional, used to persist session_statistics)

Run locally (build + start):

```bash
cd packages/worker-polls
npm install
npm run build
npm start
```

Docker:

```bash
# build image from repo root (adjust workspace/build pipeline as needed)
docker build -t worker-polls -f packages/worker-polls/Dockerfile .
```

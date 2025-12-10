# create new session

upon valid requestion for new session, sessions.service.ts (all inside a DB tx)...

- adds the session to the polls.sessions table
- adds each question in the session config to the polls.questions table
- writes a session.created event to polls.outbox (note...uses event types defined in shared-broker)

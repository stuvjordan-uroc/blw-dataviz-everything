import Redis from 'ioredis';

export const RESPONSES_STREAM = 'responses_stream';
export const SESSIONS_STREAM = 'sessions_stream';
export const COMPUTE_GROUP = 'compute-workers';

export type ResponseSubmittedEvent = {
  sessionId: number;
  respondentId: number;
  responses: Array<{ questionSessionId: number; response: any }>;
  createdAt: string;
};

export type SessionCreatedEvent = {
  sessionId: number;
  sessionConfig: any;
  createdAt: string;
};

export function createRedisClient(): Redis {
  const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  return new Redis(url);
}

export function payloadFieldKey(): 'payload' {
  return 'payload';
}

export * from './events';

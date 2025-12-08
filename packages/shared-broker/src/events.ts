import { z } from 'zod';
import { sessionConfigSchema } from 'shared-schemas';

// Event payload schemas for worker consumption

export const sessionCreatedSchema = z.object({
  sessionId: z.number(),
  sessionConfig: sessionConfigSchema,
  createdAt: z.string(),
});

export const sessionStatusChangedSchema = z.object({
  sessionId: z.number(),
  isOpen: z.boolean(),
  changedAt: z.string(),
  lastRespondentId: z.number().nullable().optional(),
});

export const sessionRemovedSchema = z.object({
  sessionId: z.number(),
  removedAt: z.string(),
  respondentCount: z.number().optional(),
  questionCount: z.number().optional(),
});

export const responseSubmittedSchema = z.object({
  sessionId: z.number(),
  respondentId: z.number(),
  createdAt: z.string(),
});

export const eventSchemas = {
  'session.created': sessionCreatedSchema,
  'session.status.changed': sessionStatusChangedSchema,
  'session.removed': sessionRemovedSchema,
  'response.submitted': responseSubmittedSchema,
};

export type SessionCreated = z.infer<typeof sessionCreatedSchema>;
export type SessionStatusChanged = z.infer<typeof sessionStatusChangedSchema>;
export type SessionRemoved = z.infer<typeof sessionRemovedSchema>;
export type ResponseSubmitted = z.infer<typeof responseSubmittedSchema>;

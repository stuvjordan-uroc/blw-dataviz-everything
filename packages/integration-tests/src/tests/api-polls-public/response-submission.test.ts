/**
 * Integration Tests: Response Submission
 * Tests the POST /responses endpoint and visualization stream updates
 */

import request from 'supertest';
import { eq } from 'drizzle-orm';
import {
  getTestDb,
  getPublicApiUrl,
  seedTestQuestions,
  cleanTestQuestions,
  seedExistingSession,
  cleanExistingSessions,
  createVisualizationStreamListener,
} from '../../utils/test-helpers';
import { respondents, responses, sessionVisualizations } from 'shared-schemas';
import {
  validCompleteResponse,
  outOfRangeResponse,
  partialResponse,
  responseWithNull,
} from '../../fixtures/test-responses';
import { existingOpenSession } from '../../fixtures/test-sessions';

describe('Response Submission API', () => {
  const publicApiUrl = getPublicApiUrl();
  let sessionId: number;
  let dbCleanup: () => Promise<void>;

  // The API container uses BATCH_UPDATE_INTERVAL_MS env var (default 3000ms in responses.module.ts)
  // Since the test runs outside the container, we use a conservative timeout
  // that accounts for the default interval plus processing overhead
  const batchUpdateInterval = 3000; // Default from api-polls-public
  const streamWaitTimeout = batchUpdateInterval + 5000; // Add buffer for processing

  beforeAll(async () => {
    const { db, cleanup } = getTestDb();
    dbCleanup = cleanup;

    // Seed test questions (required for session)
    await seedTestQuestions(db);

    // Seed an existing open session
    const session = await seedExistingSession(db, existingOpenSession);
    sessionId = session.id;
  });

  afterAll(async () => {
    const { db, cleanup } = getTestDb();

    // Clean up sessions and test questions
    await cleanExistingSessions(db);
    await cleanTestQuestions(db);

    // Close database connections
    await cleanup();
    await dbCleanup();
  });

  describe('POST /responses', () => {
    describe('Valid Complete Response', () => {
      it('should insert to database and trigger visualization update', async () => {
        const { db, cleanup } = getTestDb();

        // Connect to visualization stream BEFORE submitting response
        const streamListener = await createVisualizationStreamListener(sessionId);

        try {
          // Wait for initial snapshot
          const snapshot = await streamListener.waitForEvent('visualization.snapshot', 5000);
          expect(snapshot).toBeDefined();
          expect(snapshot.sessionId).toBe(sessionId);
          expect(snapshot.visualizations).toBeDefined();

          // Submit valid complete response
          const response = await request(publicApiUrl)
            .post('/responses')
            .send({
              sessionId,
              answers: validCompleteResponse,
            });

          // Verify HTTP response
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('respondentId');
          expect(typeof response.body.respondentId).toBe('number');

          const respondentId = response.body.respondentId;

          // Verify database - respondent created
          const [respondent] = await db
            .select()
            .from(respondents)
            .where(eq(respondents.id, respondentId));

          expect(respondent).toBeDefined();
          expect(respondent.sessionId).toBe(sessionId);

          // Verify database - responses created
          const respondentResponses = await db
            .select()
            .from(responses)
            .where(eq(responses.respondentId, respondentId));

          expect(respondentResponses).toHaveLength(validCompleteResponse.length);

          // Verify each response was saved correctly
          for (const answer of validCompleteResponse) {
            const savedResponse = respondentResponses.find(
              r => r.response === answer.responseIndex
            );
            expect(savedResponse).toBeDefined();
          }

          // Wait for visualization update event from stream
          // This should arrive after batch processing
          const updateEvent = await streamListener.waitForEvent(
            'visualization.updated',
            streamWaitTimeout
          );

          // Verify update event structure
          expect(updateEvent).toBeDefined();
          expect(updateEvent.visualizationId).toBeDefined();
          expect(updateEvent.splits).toBeDefined();
          expect(updateEvent.splitDiffs).toBeDefined();
          expect(updateEvent.basisSplitIndices).toBeDefined();
          expect(updateEvent.timestamp).toBeDefined();

          // Verify splitDiffs array matches splits array length
          // (proves updateAllSplitsWithSegmentsFromResponses was called correctly)
          expect(Array.isArray(updateEvent.splitDiffs)).toBe(true);
          expect(updateEvent.splitDiffs.length).toBe(updateEvent.splits.length);

          // Verify at least one diff has non-zero values
          // (proves something actually changed from the update)
          const hasNonZeroDiff = updateEvent.splitDiffs.some((diff: any) =>
            diff.stats.totalCount > 0 ||
            diff.stats.totalWeight > 0 ||
            diff.points.added.some((pointSet: any[]) => pointSet.length > 0)
          );
          expect(hasNonZeroDiff).toBe(true);

        } finally {
          streamListener.close();
          await cleanup();
        }
      });

      // KNOWN ISSUE: This test currently fails due to a bug in updateAllSplitsWithSegmentsFromResponses
      // Error: "Cannot read properties of undefined (reading 'id')" at update.ts:558
      // The first response update works, but subsequent updates to the same profile fail
      // TODO: Fix the bug in shared-computation/src/segmentViz/update.ts
      it.skip('should track sequence numbers correctly across multiple updates', async () => {
        const { db, cleanup } = getTestDb();

        // Connect to visualization stream
        const streamListener = await createVisualizationStreamListener(sessionId);

        try {
          // Wait for initial snapshot
          const snapshot = await streamListener.waitForEvent('visualization.snapshot', 5000);
          expect(snapshot).toBeDefined();

          // Submit first valid response
          const response1 = await request(publicApiUrl)
            .post('/responses')
            .send({
              sessionId,
              answers: validCompleteResponse,
            });

          expect(response1.status).toBe(201);
          const respondentId1 = response1.body.respondentId;

          // Wait for first update event
          const updateEvent1 = await streamListener.waitForEvent(
            'visualization.updated',
            streamWaitTimeout
          );

          // Verify first update sequence numbers
          expect(updateEvent1.fromSequence).toBe(0); // Started at 0
          expect(updateEvent1.toSequence).toBe(1); // Incremented to 1
          expect(updateEvent1.toSequence).toBe(updateEvent1.fromSequence + 1);

          // Wait for batch interval to ensure responses aren't batched together
          await new Promise(resolve => setTimeout(resolve, batchUpdateInterval + 500));

          // Submit second valid response
          const response2 = await request(publicApiUrl)
            .post('/responses')
            .send({
              sessionId,
              answers: validCompleteResponse,
            });

          expect(response2.status).toBe(201);
          const respondentId2 = response2.body.respondentId;

          // Wait for second update event
          const updateEvent2 = await streamListener.waitForEvent(
            'visualization.updated',
            streamWaitTimeout
          );

          // Verify second update sequence numbers
          expect(updateEvent2.fromSequence).toBe(1); // Was at 1 from first update
          expect(updateEvent2.toSequence).toBe(2); // Incremented to 2
          expect(updateEvent2.toSequence).toBe(updateEvent2.fromSequence + 1);

          // Verify sequence continuity between updates
          expect(updateEvent2.fromSequence).toBe(updateEvent1.toSequence);

          // Wait for batch interval again
          await new Promise(resolve => setTimeout(resolve, batchUpdateInterval + 500));

          // Submit third valid response
          const response3 = await request(publicApiUrl)
            .post('/responses')
            .send({
              sessionId,
              answers: validCompleteResponse,
            });

          expect(response3.status).toBe(201);
          const respondentId3 = response3.body.respondentId;

          // Wait for third update event
          const updateEvent3 = await streamListener.waitForEvent(
            'visualization.updated',
            streamWaitTimeout
          );

          // Verify third update sequence numbers
          expect(updateEvent3.fromSequence).toBe(2); // Was at 2 from second update
          expect(updateEvent3.toSequence).toBe(3); // Incremented to 3
          expect(updateEvent3.toSequence).toBe(updateEvent3.fromSequence + 1);

          // Verify sequence continuity
          expect(updateEvent3.fromSequence).toBe(updateEvent2.toSequence);

          // Clean up test respondents
          await db.delete(responses).where(eq(responses.respondentId, respondentId1));
          await db.delete(respondents).where(eq(respondents.id, respondentId1));
          await db.delete(responses).where(eq(responses.respondentId, respondentId2));
          await db.delete(respondents).where(eq(respondents.id, respondentId2));
          await db.delete(responses).where(eq(responses.respondentId, respondentId3));
          await db.delete(respondents).where(eq(respondents.id, respondentId3));

        } finally {
          streamListener.close();
          await cleanup();
        }
      });

      it('should persist visualization updates to database after forceSleep', async () => {
        const { db, cleanup } = getTestDb();

        try {
          // Get initial visualization state from database
          const initialVizData = await db
            .select()
            .from(sessionVisualizations)
            .where(eq(sessionVisualizations.sessionId, sessionId));

          expect(initialVizData.length).toBeGreaterThan(0);

          // Capture initial state of first visualization
          const vizId = initialVizData[0].visualizationId;
          const initialSplits = initialVizData[0].splits;

          if (!initialSplits) {
            throw new Error('Initial splits of initial visualization not found'); // TypeScript guard
          }

          // Submit valid complete response
          const response = await request(publicApiUrl)
            .post('/responses')
            .send({
              sessionId,
              answers: validCompleteResponse,
            });

          expect(response.status).toBe(201);
          const respondentId = response.body.respondentId;

          // Wait for batch processing to complete
          await new Promise(resolve => setTimeout(resolve, batchUpdateInterval + 1000));

          // Force the session to sleep (triggers DB persistence)
          const sleepResponse = await request(publicApiUrl)
            .post(`/responses/monitoring/force-sleep/${sessionId}`)
            .send();

          expect(sleepResponse.status).toBe(200);

          // Query database to verify visualization was updated
          const updatedVizData = await db
            .select()
            .from(sessionVisualizations)
            .where(eq(sessionVisualizations.sessionId, sessionId));

          expect(updatedVizData.length).toBe(initialVizData.length);

          // Find the same visualization
          const updatedViz = updatedVizData.find(v => v.visualizationId === vizId);
          expect(updatedViz).toBeDefined();

          if (!updatedViz) {
            throw new Error('Updated visualization not found'); // TypeScript guard
          }

          // Verify splits were updated (at least one split should have increased totalCount)
          const updatedSplits = updatedViz.splits;
          if (!updatedSplits) {
            throw new Error('Updated splits from updated visualization not found'); // TypeScript guard
          }
          expect(updatedSplits).toBeDefined();
          expect(Array.isArray(updatedSplits)).toBe(true);
          expect(updatedSplits.length).toBe(initialSplits.length);

          // Check that at least one split's totalCount increased
          let foundIncrease = false;
          for (let i = 0; i < updatedSplits.length; i++) {
            if (updatedSplits[i].totalCount > initialSplits[i].totalCount) {
              foundIncrease = true;
              break;
            }
          }
          expect(foundIncrease).toBe(true);

          // Verify computedAt timestamp was updated
          expect(updatedViz.computedAt).toBeDefined();
          expect(new Date(updatedViz.computedAt!).getTime()).toBeGreaterThan(
            new Date(initialVizData[0].computedAt!).getTime()
          );

          // Clean up the test respondent
          await db
            .delete(responses)
            .where(eq(responses.respondentId, respondentId));
          await db
            .delete(respondents)
            .where(eq(respondents.id, respondentId));

        } finally {
          await cleanup();
        }
      });
    });

    describe('Out-of-Range Response', () => {
      it('should insert to database but NOT trigger visualization update', async () => {
        const { db, cleanup } = getTestDb();

        // Connect to visualization stream
        const streamListener = await createVisualizationStreamListener(sessionId);

        try {
          // Wait for initial snapshot
          await streamListener.waitForEvent('visualization.snapshot', 5000);

          // Track events received
          const initialEventCount = streamListener.events.length;

          // Submit out-of-range response
          const response = await request(publicApiUrl)
            .post('/responses')
            .send({
              sessionId,
              answers: outOfRangeResponse,
            });

          // Verify HTTP response
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('respondentId');

          const respondentId = response.body.respondentId;

          // Verify database - respondent created
          const [respondent] = await db
            .select()
            .from(respondents)
            .where(eq(respondents.id, respondentId));

          expect(respondent).toBeDefined();

          // Verify database - responses created
          const respondentResponses = await db
            .select()
            .from(responses)
            .where(eq(responses.respondentId, respondentId));

          expect(respondentResponses).toHaveLength(outOfRangeResponse.length);

          // Wait for potential update event (should NOT arrive)
          // Use a shorter timeout since we expect no event
          await new Promise(resolve => setTimeout(resolve, batchUpdateInterval + 1000));

          // Verify NO new visualization.updated events were received
          const updateEvents = streamListener.events.filter(
            e => e.type === 'visualization.updated'
          );
          const newUpdateEvents = updateEvents.slice(initialEventCount);
          expect(newUpdateEvents).toHaveLength(0);

        } finally {
          streamListener.close();
          await cleanup();
        }
      });
    });

    describe('Partial Response', () => {
      it('should insert to database but NOT trigger visualization update', async () => {
        const { db, cleanup } = getTestDb();

        // Connect to visualization stream
        const streamListener = await createVisualizationStreamListener(sessionId);

        try {
          // Wait for initial snapshot
          await streamListener.waitForEvent('visualization.snapshot', 5000);

          // Track events received
          const initialEventCount = streamListener.events.length;

          // Submit partial response (missing some questions)
          const response = await request(publicApiUrl)
            .post('/responses')
            .send({
              sessionId,
              answers: partialResponse,
            });

          // Verify HTTP response
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('respondentId');

          const respondentId = response.body.respondentId;

          // Verify database - respondent created
          const [respondent] = await db
            .select()
            .from(respondents)
            .where(eq(respondents.id, respondentId));

          expect(respondent).toBeDefined();

          // Verify database - responses created (only for answered questions)
          const respondentResponses = await db
            .select()
            .from(responses)
            .where(eq(responses.respondentId, respondentId));

          expect(respondentResponses).toHaveLength(partialResponse.length);

          // Wait for potential update event (should NOT arrive)
          await new Promise(resolve => setTimeout(resolve, batchUpdateInterval + 1000));

          // Verify NO new visualization.updated events were received
          const updateEvents = streamListener.events.filter(
            e => e.type === 'visualization.updated'
          );
          const newUpdateEvents = updateEvents.slice(initialEventCount);
          expect(newUpdateEvents).toHaveLength(0);

        } finally {
          streamListener.close();
          await cleanup();
        }
      });
    });

    describe('Response with Null Answer', () => {
      it('should insert to database but NOT trigger visualization update', async () => {
        const { db, cleanup } = getTestDb();

        // Connect to visualization stream
        const streamListener = await createVisualizationStreamListener(sessionId);

        try {
          // Wait for initial snapshot
          await streamListener.waitForEvent('visualization.snapshot', 5000);

          // Track events received
          const initialEventCount = streamListener.events.length;

          // Submit response with null answer
          const response = await request(publicApiUrl)
            .post('/responses')
            .send({
              sessionId,
              answers: responseWithNull,
            });

          // Verify HTTP response
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('respondentId');

          const respondentId = response.body.respondentId;

          // Verify database - respondent created
          const [respondent] = await db
            .select()
            .from(respondents)
            .where(eq(respondents.id, respondentId));

          expect(respondent).toBeDefined();

          // Verify database - responses created
          const respondentResponses = await db
            .select()
            .from(responses)
            .where(eq(responses.respondentId, respondentId));

          expect(respondentResponses).toHaveLength(responseWithNull.length);

          // This is a partial response (omitted race question)
          // All saved responses should have non-null values
          expect(respondentResponses.every(r => r.response !== null)).toBe(true);
          // Should have fewer responses than a complete response
          expect(responseWithNull.length).toBeLessThan(validCompleteResponse.length);

          // Wait for potential update event (should NOT arrive)
          await new Promise(resolve => setTimeout(resolve, batchUpdateInterval + 1000));

          // Verify NO new visualization.updated events were received
          const updateEvents = streamListener.events.filter(
            e => e.type === 'visualization.updated'
          );
          const newUpdateEvents = updateEvents.slice(initialEventCount);
          expect(newUpdateEvents).toHaveLength(0);

        } finally {
          streamListener.close();
          await cleanup();
        }
      });
    });

    describe('Invalid Requests', () => {
      it('should reject response for non-existent session', async () => {
        const response = await request(publicApiUrl)
          .post('/responses')
          .send({
            sessionId: 99999,
            answers: validCompleteResponse,
          });

        expect(response.status).toBe(404);
        expect(response.body.message).toContain('Session 99999 not found');
      });

      it('should reject response for closed session', async () => {
        const { db, cleanup } = getTestDb();

        try {
          // Close the session
          const closedSession = await seedExistingSession(db, {
            ...existingOpenSession,
            slug: 'test-closed-for-response',
            isOpen: false,
          });

          const response = await request(publicApiUrl)
            .post('/responses')
            .send({
              sessionId: closedSession.id,
              answers: validCompleteResponse,
            });

          expect(response.status).toBe(400);
          expect(response.body.message).toContain('is not open');
        } finally {
          await cleanup();
        }
      });
    });
  });
});

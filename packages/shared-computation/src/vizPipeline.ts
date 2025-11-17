/*
VizPipeline design scaffold

This file intentionally contains only documentation/comments describing the
planned VizPipeline class and how it will operate. The goal is to capture the
architecture, method signatures, persistence and eventing contracts, and
operational notes before implementing code.

Key responsibilities
- Maintain an in-memory `Statistics` instance representing the canonical splits
  for a session.
- Accept streaming respondent batches and update the `Statistics` incrementally.
- Compute coordinate diffs (or replacements) for affected responseQuestions and
  splits using `computeSegmentCoordinates` from `viz.ts`.
- Persist updated splits (either as a full replacement or partial deltas) to
  durable storage (e.g., `session_statistics` table) and include metadata like
  `lastProcessedRespondentId` and `version` for concurrency control.
- Emit events for downstream consumers (DB writers, APIs, other visualizations)
  describing changed splits and a compact coordinate diff so listeners can
  update their state without reprocessing everything.

Proposed class API (sketch)

class VizPipeline {
  constructor(params: {
    sessionId: number;
    sessionConfig: SessionConfig; // config describing grouping & response questions
    vizConfig: VizConfigLocal;     // viz layout options
    persistence: {
      // Persistence adapter: implement these methods for DB integration
      readSplits(sessionId: number): Promise<{ splits: Split[]; version: number; lastProcessedRespondentId?: number }>;
      writeSplits(sessionId: number, splits: Split[], meta: { version?: number; lastProcessedRespondentId?: number }): Promise<void>;
      writePartial?: (sessionId: number, changedSplits: { key: string; split: Split }[], meta: any) => Promise<void>;
    };
    emitter?: { emit(event: string, payload: any): void };
    options?: {
      strict?: boolean; // strict validation
      maxCombinations?: number; // guard for very large grouping cartesian
      epsilon?: number; // numeric tolerance for change detection
      persistMode?: 'full' | 'partial';
    };
  })

  // Process a batch of respondent records. Returns a CoordinateDiff describing
  // which questions/splits changed and the new point arrays for those targets.
  async processBatch(respondents: RespondentData[]): Promise<CoordinateDiff>;

  // Return the current in-memory splits (canonical state)
  getSplits(): Split[];

  // Force a synchronous persist of the current splits to durable storage.
  async persistSplits(): Promise<void>;

  // Reload splits from persistent store, rehydrate the in-memory Statistics
  async syncFromStore(): Promise<void>;
}

CoordinateDiff format (practical initial choice)
- Simple, resilient shape to start with:
  {
    sessionId: number;
    version: number; // new version after applying batch
    lastProcessedRespondentId?: number;
    changed: Array<{
      questionVarName: string;
      splitKey: string; // canonical key for grouping combination
      points: Point[];  // full replacement of point coordinates for this split/question
    }>;
  }

Rationale for "full replacement per affected (question,split)" vs fine-grained diffs
- Full replacement is simpler to implement, less error-prone, and easier for
  consumers to apply. It does transfer more data but is acceptable initially.
- Fine-grained add/remove/move deltas can be added later if bandwidth or
  animation fidelity becomes important.

Persistence & concurrency
- Use `lastProcessedRespondentId` and an incrementing `version` to detect and
  resolve concurrent updates.
- Implement optimistic concurrency: writeSplits should be called with an
  expected `version` and the update should only succeed if the stored version
  matches; on failure the pipeline should reload and reapply any pending
  batches (bounded retries).
- For scale, implement `writePartial` to perform per-split updates in the DB
  (e.g., jsonb set or a per-split table). This avoids rewriting large JSON blobs
  for every small update.

Change detection
- When updating Statistics for a batch, determine which splits changed by
  comparing previous `totalWeight`/`proportion` for each question-group and
  detecting deltas beyond an `epsilon`.
- Only recompute coordinates for the affected (question,split) pairs.

Testing
- Unit tests for `processBatch` with small synthetic data covering:
  - single-split sessions
  - multiple grouping questions
  - idempotency (reprocessing same batch produces no change)
  - concurrent update handling (simulate version mismatch)

Security & reliability
- Validate incoming respondent batches (schema, types) before processing.
- Provide configurable `maxCombinations` to avoid OOM when grouping cartesian
  is huge.

This file is intentionally a design-only scaffold. When you want, I can
implement the class and accompanying tests in `packages/shared-computation/src/`.
*/

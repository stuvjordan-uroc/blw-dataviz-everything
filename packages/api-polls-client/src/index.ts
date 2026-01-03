import type {
  SessionResponse,
  VisualizationSnapshotEvent,
  VisualizationUpdateEvent,
  SessionStatusChangedEvent,
  RespondentAnswer,
  SubmitResponsesResponse,
} from "shared-types";

/**
 * Client library for communicating with polling APIs
 * 
 * The client side javascript for a public user instantiates
 * this class when the client points her browser to the url
 * for a given polling session.
 * 
 * The instance provides the following methods:
 * 
 * + getSession.  Gets the session config, current visualizations for the session,
 * and the endpoints for submitting responses on the session and subscribing to 
 * visualization updates.
 * 
 * + createVisualizationStream.  Returns an EventSource to receive and process
 * events from a visualization stream.  Can attach event listeners to this EventSource
 * that can (for instance) trigger updates to client state that tracks the positions of
 * points-on-the-canvas.
 * 
 * + submitResponses. (TODO) submit responses to a given session.
 * 
 * 
 * Designed to be framework-agnostic and work in any browser environment.
 */
export class PollsApiClient {
  /**
   * @param baseUrl - Base URL of the polling API (e.g., 'http://localhost:3005')
   */
  constructor(private baseUrl: string) { }

  /**
   * Get complete session information by slug
   * 
   * This is the main entry point for clients. Returns everything needed:
   * - Session metadata
   * - Configuration (questions, visualizations)
   * - Current visualization state
   * - API endpoints
   * 
   * @param slug - The session's unique slug
   * @returns Promise resolving to session data
   * @throws Error if session not found or network error
   */
  async getSession(slug: string): Promise<SessionResponse> {
    const response = await fetch(`${this.baseUrl}/sessions/${slug}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Session '${slug}' not found`);
      }
      throw new Error(`Failed to fetch session: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a Server-Sent Events connection for real-time visualization updates
   * 
   * The stream will emit three types of events:
   * - 'visualization.snapshot' - Initial state (sent immediately on connect)
   * - 'visualization.updated' - Incremental updates (sent when responses processed)
   * - 'session.statusChanged' - When session opens/closes
   * 
   * For closed sessions, the connection will close after sending the snapshot.
   * 
   * @param sessionId - The session ID (from getSession response)
   * @returns EventSource instance for SSE connection
   * 
   * @example
   * const stream = client.createVisualizationStream(123);
   * 
   * stream.addEventListener('visualization.snapshot', (event) => {
   *   const snapshot = JSON.parse(event.data);
   *   console.log('Initial state:', snapshot);
   * });
   * 
   * stream.addEventListener('visualization.updated', (event) => {
   *   const update = JSON.parse(event.data);
   *   console.log('Update:', update);
   * });
   * 
   * stream.addEventListener('session.statusChanged', (event) => {
   *   const statusChange = JSON.parse(event.data);
   *   console.log('Session status:', statusChange.isOpen ? 'OPEN' : 'CLOSED');
   * });
   * 
   * // Clean up when done
   * stream.close();
   */
  createVisualizationStream(sessionId: number): EventSource {
    return new EventSource(
      `${this.baseUrl}/visualizations/session/${sessionId}/stream`
    );
  }

  /**
   * Submit responses to a polling session
   * 
   * Submits a respondent's answers to questions in the session.
   * Users may skip questions, so the answers array may have fewer
   * entries than the total number of questions in the session.
   * 
   * Each submission creates a new respondent - there is no authentication
   * or tracking of individual users across submissions.
   * 
   * @param sessionId - The session ID to submit responses to
   * @param answers - Array of answers to questions (may be partial - users can skip questions)
   * @returns Promise resolving to the created respondent ID
   * @throws Error if session not found, closed, or validation fails
   * 
   * @example
   * const client = new PollsApiClient('http://localhost:3005');
   * const session = await client.getSession('my-poll-slug');
   * 
   * // Submit answers (user may skip some questions)
   * const result = await client.submitResponses(session.id, [
   *   {
   *     varName: 'q1',
   *     batteryName: 'survey',
   *     subBattery: '',
   *     responseIndex: 2  // User selected option 2
   *   },
   *   {
   *     varName: 'q2',
   *     batteryName: 'survey',
   *     subBattery: '',
   *     responseIndex: 0  // User selected option 0
   *   }
   *   // Note: User may have skipped other questions
   * ]);
   * 
   * console.log('Submitted as respondent:', result.respondentId);
   */
  async submitResponses(
    sessionId: number,
    answers: RespondentAnswer[]
  ): Promise<SubmitResponsesResponse> {
    const response = await fetch(`${this.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        answers,
      }),
    });

    if (!response.ok) {
      // Try to extract error message from response
      let errorMessage = `Failed to submit responses: ${response.status} ${response.statusText}`;

      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Ignore JSON parse errors
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }
}

/**
 * Re-export all types for convenience
 */
export type {
  SessionResponse,
  VisualizationSnapshotEvent,
  VisualizationUpdateEvent,
  SessionStatusChangedEvent,
  RespondentAnswer,
  SubmitResponsesResponse,
};

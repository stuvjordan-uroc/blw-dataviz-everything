/**
 * Tests for SessionVizClient
 * 
 * Focus: Testing that callbacks registered via subscribeToXXX methods
 * are invoked when corresponding events are received from the stream.
 */

import { SessionVizClient } from '../src/SessionVizClient/SessionVizClient';
import { PollsApiClient } from 'api-polls-client';
import type { SessionResponse, VisualizationUpdateEvent, VisualizationSnapshotEvent, SessionStatusChangedEvent } from 'shared-types';

// Mock EventSource
class MockEventSource {
  url: string;
  listeners: Map<string, Array<(event: MessageEvent) => void>> = new Map();
  readyState: number = 1; // 0 = CONNECTING, 1 = OPEN, 2 = CLOSED

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  close() {
    this.listeners.clear();
  }

  // Helper method to simulate receiving an event
  simulateEvent(type: string, data: any) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const event = new MessageEvent(type, { data: JSON.stringify(data) });
      listeners.forEach(listener => listener(event));
    }
  }
}

// Replace global EventSource with mock
(global as any).EventSource = MockEventSource;

describe('SessionVizClient', () => {
  let sessionVizClient: SessionVizClient;
  let mockPollsApiClient: jest.Mocked<PollsApiClient>;
  let mockEventSource: MockEventSource;

  const mockSessionData: SessionResponse = {
    id: 1,
    slug: 'test-slug',
    isOpen: true,
    description: 'Test session description',
    createdAt: '2026-01-06T00:00:00Z',
    config: {
      questionOrder: [
        { varName: 'testVar', batteryName: 'testBattery', subBattery: '' }
      ],
      visualizations: [
        {
          id: 'viz-1',
          responseQuestion: {
            question: { varName: 'testVar', batteryName: 'testBattery', subBattery: '' },
            responseGroups: {
              expanded: [{ label: 'Option A', values: [0] }],
              collapsed: [{ label: 'Option A', values: [0] }]
            }
          },
          groupingQuestions: {
            x: [],
            y: []
          },
          minGroupAvailableWidth: 100,
          minGroupHeight: 100,
          groupGapX: 10,
          groupGapY: 10,
          responseGap: 5,
          baseSegmentWidth: 50,
          images: {
            circleRadius: 10,
            baseColorRange: ['#ff0000', '#0000ff'],
            groupColorOverrides: []
          }
        }
      ]
    },
    visualizations: [
      {
        visualizationId: 'viz-1',
        vizWidth: 800,
        vizHeight: 600,
        sequenceNumber: 1,
        lastUpdated: '2026-01-06T00:00:00Z',
        splits: [],
        basisSplitIndices: [0],
        viewMaps: {},
        config: {
          responseQuestion: {
            question: { varName: 'testVar', batteryName: 'testBattery', subBattery: '' },
            responseGroups: {
              expanded: [{ label: 'Option A', values: [0] }],
              collapsed: [{ label: 'Option A', values: [0] }]
            }
          },
          groupingQuestions: {
            x: [],
            y: []
          },
          minGroupAvailableWidth: 100,
          minGroupHeight: 100,
          groupGapX: 10,
          groupGapY: 10,
          responseGap: 5,
          baseSegmentWidth: 50,
          images: {
            circleRadius: 10,
            baseColorRange: ['#ff0000', '#0000ff'],
            groupColorOverrides: []
          }
        }
      }
    ],
    endpoints: {
      submitResponse: '/api/sessions/test-slug/responses',
      visualizationStream: '/api/sessions/test-slug/visualizations/stream'
    }
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a MockEventSource instance for this test
    mockEventSource = new MockEventSource('http://test-stream-url');

    // Setup PollsApiClient mock
    mockPollsApiClient = new PollsApiClient('http://test-api') as jest.Mocked<PollsApiClient>;
    mockPollsApiClient.getSession = jest.fn().mockResolvedValue(mockSessionData);
    mockPollsApiClient.createVisualizationStream = jest.fn().mockReturnValue(mockEventSource);

    // Mock PollsApiClient constructor
    (PollsApiClient as jest.MockedClass<typeof PollsApiClient>).mockImplementation(() => mockPollsApiClient);

    sessionVizClient = new SessionVizClient('http://test-api');
  });

  afterEach(() => {
    if (mockEventSource) {
      mockEventSource.close();
    }
  });

  describe('subscribeToConnectionStatus', () => {
    it('should invoke callback when connection status changes', async () => {
      const callback = jest.fn();

      // Connect first
      await sessionVizClient.connect('test-slug');

      // Subscribe after connection
      sessionVizClient.subscribeToConnectionStatus(callback);

      // Simulate error event to change status to reconnecting
      const errorEvent = new Event('error');
      // Set readyState to CONNECTING to trigger 'reconnecting' status
      mockEventSource.readyState = MockEventSource.CONNECTING;
      const errorListeners = mockEventSource.listeners.get('error');
      if (errorListeners) {
        errorListeners.forEach(listener => listener(errorEvent as any));
      }

      // Callback should have been invoked with 'reconnecting' status
      expect(callback).toHaveBeenCalledWith('reconnecting');
    });
  });

  describe('subscribeToSessionStatus', () => {
    it('should invoke callback when session.statusChanged event is received', async () => {
      const callback = jest.fn();

      await sessionVizClient.connect('test-slug');

      sessionVizClient.subscribeToSessionStatus(callback);

      // Simulate session status changed event
      const statusEvent: SessionStatusChangedEvent = {
        isOpen: false,
        timestamp: '2026-01-06T00:01:00Z'
      };

      mockEventSource.simulateEvent('session.statusChanged', statusEvent);

      expect(callback).toHaveBeenCalledWith(false);
    });
  });

  describe('subscribeToVizUpdate', () => {
    it('should invoke callback immediately with buffered snapshot data', async () => {
      const callback = jest.fn();

      await sessionVizClient.connect('test-slug');

      // Simulate snapshot event
      const snapshotEvent: VisualizationSnapshotEvent = {
        sessionId: mockSessionData.id,
        isOpen: mockSessionData.isOpen,
        visualizations: mockSessionData.visualizations,
        timestamp: '2026-01-06T00:00:00Z'
      };
      mockEventSource.simulateEvent('visualization.snapshot', snapshotEvent);

      // Subscribe - should immediately invoke with buffered state
      sessionVizClient.subscribeToVizUpdate(callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining<VisualizationUpdateEvent>({
          visualizationId: 'viz-1',
          fromSequence: 0,
          toSequence: 1,
          splits: [],
          basisSplitIndices: [0],
          timestamp: expect.any(String)
        })
      );
    });

    it('should invoke callback when visualization.updated event is received', async () => {
      const callback = jest.fn();

      await sessionVizClient.connect('test-slug');

      // Simulate snapshot first
      const snapshotEvent: VisualizationSnapshotEvent = {
        sessionId: mockSessionData.id,
        isOpen: mockSessionData.isOpen,
        visualizations: mockSessionData.visualizations,
        timestamp: '2026-01-06T00:00:00Z'
      };
      mockEventSource.simulateEvent('visualization.snapshot', snapshotEvent);

      sessionVizClient.subscribeToVizUpdate(callback);
      callback.mockClear(); // Clear the immediate invocation

      // Simulate update event
      const updateEvent: VisualizationUpdateEvent = {
        visualizationId: 'viz-1',
        toSequence: 2,
        fromSequence: 1,
        timestamp: '2026-01-06T00:01:00Z',
        splits: [],
        basisSplitIndices: [0]
      };

      mockEventSource.simulateEvent('visualization.updated', updateEvent);

      expect(callback).toHaveBeenCalledWith(updateEvent);
    });

    it('should update buffered state when visualization.updated is received', async () => {
      const callback = jest.fn();

      await sessionVizClient.connect('test-slug');

      // Simulate snapshot
      const snapshotEvent: VisualizationSnapshotEvent = {
        sessionId: mockSessionData.id,
        isOpen: mockSessionData.isOpen,
        visualizations: mockSessionData.visualizations,
        timestamp: '2026-01-06T00:00:00Z'
      };
      mockEventSource.simulateEvent('visualization.snapshot', snapshotEvent);

      // Simulate update
      const updateEvent: VisualizationUpdateEvent = {
        visualizationId: 'viz-1',
        toSequence: 5,
        fromSequence: 1,
        timestamp: '2026-01-06T00:05:00Z',
        splits: [], // Empty splits for this test - we're just testing buffered state update
        basisSplitIndices: [0]
      };
      mockEventSource.simulateEvent('visualization.updated', updateEvent);

      // New subscription should get updated buffered state
      sessionVizClient.subscribeToVizUpdate(callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          visualizationId: 'viz-1',
          toSequence: 5, // Updated sequence number
          basisSplitIndices: [0]
        })
      );
    });
  });

  describe('unsubscribe behavior', () => {
    it('should stop invoking callback after unsubscribe is called', async () => {
      const callback = jest.fn();

      await sessionVizClient.connect('test-slug');

      const unsubscribe = sessionVizClient.subscribeToVizUpdate(callback);
      callback.mockClear();

      // Unsubscribe
      unsubscribe();

      // Simulate event - should not invoke callback
      const updateEvent: VisualizationUpdateEvent = {
        visualizationId: 'viz-1',
        toSequence: 2,
        fromSequence: 1,
        timestamp: '2026-01-06T00:01:00Z',
        splits: [],
        basisSplitIndices: []
      };
      mockEventSource.simulateEvent('visualization.updated', updateEvent);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});

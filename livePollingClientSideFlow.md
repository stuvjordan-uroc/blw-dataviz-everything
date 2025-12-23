```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Live Polling Client Flow                            │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐                                     ┌──────────────────┐
    │ Browser │                                     │ Frontend Server  │
    └────┬────┘                                     └────────┬─────────┘
         │                                                   │
         │  1. GET /session?slug=abc123                      │
         ├──────────────────────────────────────────────────>
         │                                                   │
         │  2. Response:                                     │
         │     • JavaScript packages:                        │
         │       - PollsAPIClient                            │
         │       - VizStateController                        │
         │       - UI rendering code                         │
         │       - Canvas drawing function                   │
         │       - main.js                                   │
         │     • Data: sessions endpoint URL                 │
         <───────────────────────────────────────────────────┤
         │                                                   │
         │                                                   │
    ┌────▼────┐                                              │
    │ main.js │                                              │
    │ executes│                                              │
    └────┬────┘                                              │
         │                                                   │
         │  3. Construct PollsAPIClient(sessionsEndpointURL) │
         │     & call getSession(sessionSlug)                │
         │                                                   │
         │                                        ┌──────────▼─────────┐
         │                                        │  Public API        │
         │  4. GET /sessions/:slug                │  Sessions Endpoint │
         ├────────────────────────────────────────>                    │
         │                                        └──────────┬─────────┘
         │  Response:                                        │
         │    • Session metadata (id, slug, isOpen)          │
         │    • Session config (questions, vizconfig)        │
         │    • ViewMaps (viewId → splitIndices)             │
         │    • Current viz state (splits, basisSplitIndices)│
         │    • API endpoints (submit, SSE stream)           │
         <────────────────────────────────────────┤          │
         │                                                   │
    ┌────▼────────────────────────────────────┐              │
    │ 5. main.js continues:                   │              │
    │                                         │              │
    │  a. Render client UI                    │              │
    │     ↓                                   │              │
    │  b. Construct VizStateController        │              │
    │     (splits, basisSplitIndices,         │              │
    │      viewMaps, initial view state)      │              │
    │     ↓                                   │              │
    │  c. Get visible points & draw canvas    │              │
    │     ↓                                   │              │
    │  d. Call createVisualizationStream()    │              │
    │     → EventSource connects to SSE       │              │
    │     ↓                                   │    ┌─────────▼──────────┐
    │  e. Set EventSource listener:           │    │ Visualization SSE  │
    │     On update:                          │    │ Stream Endpoint    │
    │       • applyServerUpdate()             ├───>                     │
    │       • get new visible points          │    └─────────┬──────────┘
    │       • redraw canvas                   │              │
    └─────────────────────────────────────────┘              │
         ▲                                                   │
         │        SSE: visualization.updated                 │
         │        (splits, splitDiffs, sequence)             │
         <──────────────────────────────────────────────────┤
         │                                                   │
         │        (continuous stream of updates)             │
         <──────────────────────────────────────────────────┤
         │                                                   │
```

1. Browser pointed at url for frontend server, with sessionSlug included as a parameter.

2. Frontend server response with...
   a. Javascript package, including:

   - PollsAPIClient class (see api-polls-client)
   - VizStateController class (see viz-state-controller)
   - Client UI rendering code (TODO)
   - Segment viz canvas drawing function (TODO)
   - client main.js script (TODO)
     d. Data package, including:
   - sessions endpoint url

3. Browser executes main.js, which...
   a. constructs an instance of PollsAPIClient (passing sessions endpoint url)
   b. invokes PollsAPIClient.getSession(sessionSlug)

4. Sessions endpoint (see sessions.service.ts in api-polls-public) responds with:
   a. session metadata (id, slug, isOpen, etc.)
   b. session config (questions in order, vizconfig, view-to-split lookup map)
   c. current visualization state (including the ViewMap, which is static throughout a session)
   d. api endpoints for...

   - submitting poll responses
   - subscribing to visualization updates

5. main.js:
   a. renders client UI
   b. constructs an instance of VizStateController, passing the current viz state, with client-state defaults
   c. passes resulting local viz state to segmentViz canvas drawing function, which draws viz on canvas rendered in part (a).
   d. invokes PollsAPIClient.createVisualizationStream(), which connects to visualization update stream, and returns and EventSource that emits server-side updates to visualization.
   e. sets a listener on the EventSource, to trigger updates to local viz state (via VizStateController) and re-drawing of canvas whenever local viz state changes.

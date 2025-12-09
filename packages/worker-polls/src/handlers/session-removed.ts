import type { SessionRemoved } from "shared-broker";
import { sessionRegistry } from "../session-registry";
import type { HandlerArgs } from "../types";

export async function handleSessionRemoved(args: HandlerArgs) {
  const { sessionId } = args.payload as SessionRemoved;

  if (sessionRegistry.has(sessionId)) {
    sessionRegistry.delete(sessionId);
    console.log(`Session ${sessionId} removed from registry`);
  } else {
    console.log(`Session ${sessionId} not in registry (already removed or never loaded)`);
  }
}

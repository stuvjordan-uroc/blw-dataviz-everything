/**
 * Test responses for updating basis splits.
 * Each response has an expandedResponseGroupIndex (0-3 corresponding to erg0-erg3)
 * and a weight.
 * 
 * This fixture contains:
 * - 2 responses to erg0 (weights: 1.0, 1.5) - maps to crg0
 * - 1 response to erg1 (weight: 2.0) - maps to crg0
 * - 3 responses to erg2 (weights: 1.0, 1.0, 0.5) - maps to crg1
 * - 1 response to erg3 (weight: 1.0) - maps to crg1
 * 
 * Total: 7 responses
 * Total weight: 8.0
 */
export const testResponses: { expandedResponseGroupIndex: number, weight: number }[] = [
  { expandedResponseGroupIndex: 0, weight: 1.0 },
  { expandedResponseGroupIndex: 0, weight: 1.5 },
  { expandedResponseGroupIndex: 1, weight: 2.0 },
  { expandedResponseGroupIndex: 2, weight: 1.0 },
  { expandedResponseGroupIndex: 2, weight: 1.0 },
  { expandedResponseGroupIndex: 2, weight: 0.5 },
  { expandedResponseGroupIndex: 3, weight: 1.0 }
];

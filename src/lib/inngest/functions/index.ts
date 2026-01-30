// Export all Inngest functions for registration
export { discoveryAgent } from './discovery';
export { enrichmentAgent } from './enrichment';
export { scoringAgent } from './scoring';
export { contentAgent } from './content';

// Re-export all functions as an array for easy registration
import { discoveryAgent } from './discovery';
import { enrichmentAgent } from './enrichment';
import { scoringAgent } from './scoring';
import { contentAgent } from './content';

export const allFunctions = [
  discoveryAgent,
  enrichmentAgent,
  scoringAgent,
  contentAgent,
];

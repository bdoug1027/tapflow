import { Inngest } from 'inngest';
import type { TapflowEvents } from '@/types';

// Create the Inngest client
export const inngest = new Inngest({
  id: 'tapflow',
  schemas: new Map() as any, // Type workaround for events
});

// Event sender helper with proper typing
export async function sendEvent<K extends keyof TapflowEvents>(
  name: K,
  data: TapflowEvents[K]['data']
) {
  return inngest.send({ name, data });
}

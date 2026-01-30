import { router } from './trpc';
import { campaignsRouter } from './routers/campaigns';
import { leadsRouter } from './routers/leads';
import { outreachRouter } from './routers/outreach';

export const appRouter = router({
  campaigns: campaignsRouter,
  leads: leadsRouter,
  outreach: outreachRouter,
});

export type AppRouter = typeof appRouter;

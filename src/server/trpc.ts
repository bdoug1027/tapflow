import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface Context {
  supabase: SupabaseClient;
  user: { id: string; email: string; orgId: string } | null;
}

export async function createContext(): Promise<Context> {
  const supabase = createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  let contextUser = null;
  
  if (user) {
    // Get org_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();
    
    contextUser = {
      id: user.id,
      email: user.email!,
      orgId: profile?.org_id || '',
    };
  }
  
  return {
    supabase,
    user: contextUser,
  };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

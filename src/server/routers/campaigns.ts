import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const campaignsRouter = router({
  // List all campaigns for the org
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('campaigns')
      .select(`
        *,
        prospects:prospects(count)
      `)
      .eq('org_id', ctx.user.orgId)
      .order('created_at', { ascending: false });

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data;
  }),

  // Get single campaign with stats
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('campaigns')
        .select(`
          *,
          prospects(
            id,
            status,
            lead_scores(tier)
          )
        `)
        .eq('id', input.id)
        .eq('org_id', ctx.user.orgId)
        .single();

      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      
      // Calculate stats
      const stats = {
        total_prospects: data.prospects?.length || 0,
        by_tier: { A: 0, B: 0, C: 0 },
        by_status: {} as Record<string, number>,
      };
      
      data.prospects?.forEach((p: any) => {
        // Count by tier
        if (p.lead_scores?.tier) {
          stats.by_tier[p.lead_scores.tier as 'A' | 'B' | 'C']++;
        }
        // Count by status
        stats.by_status[p.status] = (stats.by_status[p.status] || 0) + 1;
      });

      return { ...data, stats };
    }),

  // Create new campaign
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      business_type: z.string().min(1),
      target_location: z.string().min(1),
      search_radius_miles: z.number().min(1).max(100).optional(),
      ideal_customer_profile: z.object({
        min_employees: z.number().optional(),
        max_employees: z.number().optional(),
        industries: z.array(z.string()).optional(),
        keywords: z.array(z.string()).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('campaigns')
        .insert({
          org_id: ctx.user.orgId,
          name: input.name,
          business_type: input.business_type,
          target_location: input.target_location,
          search_radius_miles: input.search_radius_miles || 25,
          ideal_customer_profile: input.ideal_customer_profile,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      
      // TODO: Trigger Inngest discovery event
      // await inngest.send({ name: 'campaign/created', data: { campaign_id: data.id, org_id: ctx.user.orgId } });
      
      return data;
    }),

  // Update campaign
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      status: z.enum(['active', 'paused', 'completed', 'draft']).optional(),
      business_type: z.string().optional(),
      target_location: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      
      const { data, error } = await ctx.supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .eq('org_id', ctx.user.orgId)
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  // Delete campaign
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('campaigns')
        .delete()
        .eq('id', input.id)
        .eq('org_id', ctx.user.orgId);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),
});

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const leadsRouter = router({
  // List prospects for a campaign
  list: protectedProcedure
    .input(z.object({
      campaign_id: z.string().uuid(),
      status: z.enum(['new', 'enriched', 'scored', 'contacted', 'replied', 'converted', 'disqualified']).optional(),
      tier: z.enum(['A', 'B', 'C']).optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(25),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('prospects')
        .select(`
          *,
          contacts(*),
          lead_scores(*)
        `, { count: 'exact' })
        .eq('campaign_id', input.campaign_id);

      if (input.status) {
        query = query.eq('status', input.status);
      }

      // Apply pagination
      const from = (input.page - 1) * input.limit;
      const to = from + input.limit - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      // Filter by tier if specified (need to do this in JS since tier is in related table)
      let filteredData = data;
      if (input.tier) {
        filteredData = data?.filter((p: any) => p.lead_scores?.tier === input.tier);
      }

      return {
        prospects: filteredData,
        total: count || 0,
        page: input.page,
        totalPages: Math.ceil((count || 0) / input.limit),
      };
    }),

  // Get single prospect with all details
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('prospects')
        .select(`
          *,
          contacts(*),
          lead_scores(*),
          outreach_messages:contacts(
            outreach_messages(*)
          ),
          campaign:campaigns(name, business_type)
        `)
        .eq('id', input.id)
        .single();

      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: 'Prospect not found' });
      return data;
    }),

  // Create prospect manually
  create: protectedProcedure
    .input(z.object({
      campaign_id: z.string().uuid(),
      company_name: z.string().min(1),
      website: z.string().url().optional().nullable(),
      phone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      state: z.string().optional().nullable(),
      zip: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify campaign belongs to org
      const { data: campaign } = await ctx.supabase
        .from('campaigns')
        .select('org_id')
        .eq('id', input.campaign_id)
        .eq('org_id', ctx.user.orgId)
        .single();

      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      const { data, error } = await ctx.supabase
        .from('prospects')
        .insert({
          ...input,
          source: 'manual',
          status: 'new',
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  // Update prospect status
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['new', 'enriched', 'scored', 'contacted', 'replied', 'converted', 'disqualified']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('prospects')
        .update({ status: input.status })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  // Add contact to prospect
  addContact: protectedProcedure
    .input(z.object({
      prospect_id: z.string().uuid(),
      name: z.string().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      title: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      linkedin_url: z.string().url().optional(),
      is_primary: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('contacts')
        .insert({
          ...input,
          source: 'manual',
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  // Bulk import prospects
  bulkImport: protectedProcedure
    .input(z.object({
      campaign_id: z.string().uuid(),
      prospects: z.array(z.object({
        company_name: z.string(),
        website: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        contact_name: z.string().optional(),
        contact_email: z.string().email().optional(),
        contact_title: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify campaign belongs to org
      const { data: campaign } = await ctx.supabase
        .from('campaigns')
        .select('org_id')
        .eq('id', input.campaign_id)
        .eq('org_id', ctx.user.orgId)
        .single();

      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      const results = { created: 0, failed: 0, errors: [] as string[] };

      for (const prospect of input.prospects) {
        const { contact_name, contact_email, contact_title, ...prospectData } = prospect;

        // Insert prospect
        const { data: newProspect, error: prospectError } = await ctx.supabase
          .from('prospects')
          .insert({
            campaign_id: input.campaign_id,
            ...prospectData,
            source: 'import',
            status: 'new',
          })
          .select()
          .single();

        if (prospectError) {
          results.failed++;
          results.errors.push(`${prospect.company_name}: ${prospectError.message}`);
          continue;
        }

        // Insert contact if provided
        if (contact_email || contact_name) {
          await ctx.supabase.from('contacts').insert({
            prospect_id: newProspect.id,
            name: contact_name,
            email: contact_email,
            title: contact_title,
            is_primary: true,
            source: 'import',
          });
        }

        results.created++;
      }

      return results;
    }),

  // Delete prospect
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('prospects')
        .delete()
        .eq('id', input.id);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),
});

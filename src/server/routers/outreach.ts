import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const outreachRouter = router({
  // List outreach messages for a campaign
  list: protectedProcedure
    .input(z.object({
      campaign_id: z.string().uuid(),
      status: z.enum(['draft', 'pending_approval', 'approved', 'scheduled', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed']).optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(25),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('outreach_messages')
        .select(`
          *,
          contact:contacts(
            *,
            prospect:prospects(company_name, website)
          )
        `, { count: 'exact' })
        .eq('campaign_id', input.campaign_id);

      if (input.status) {
        query = query.eq('status', input.status);
      }

      const from = (input.page - 1) * input.limit;
      const to = from + input.limit - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return {
        messages: data,
        total: count || 0,
        page: input.page,
        totalPages: Math.ceil((count || 0) / input.limit),
      };
    }),

  // Get pending approval queue
  pendingApproval: protectedProcedure
    .input(z.object({ campaign_id: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('outreach_messages')
        .select(`
          *,
          contact:contacts(
            *,
            prospect:prospects(company_name, website, lead_scores(*))
          ),
          campaign:campaigns(name)
        `)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: true });

      if (input.campaign_id) {
        query = query.eq('campaign_id', input.campaign_id);
      }

      const { data, error } = await query;

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  // Get single message
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('outreach_messages')
        .select(`
          *,
          contact:contacts(
            *,
            prospect:prospects(*)
          ),
          campaign:campaigns(name, business_type)
        `)
        .eq('id', input.id)
        .single();

      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found' });
      return data;
    }),

  // Create draft message
  create: protectedProcedure
    .input(z.object({
      contact_id: z.string().uuid(),
      campaign_id: z.string().uuid(),
      subject: z.string().min(1),
      body: z.string().min(1),
      sequence_step: z.number().min(1).default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('outreach_messages')
        .insert({
          ...input,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  // Update message content
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      subject: z.string().min(1).optional(),
      body: z.string().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const { data, error } = await ctx.supabase
        .from('outreach_messages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  // Approve message for sending
  approve: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      scheduled_for: z.string().datetime().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('outreach_messages')
        .update({
          status: input.scheduled_for ? 'scheduled' : 'approved',
          scheduled_for: input.scheduled_for,
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      // TODO: Trigger Inngest send event if approved without schedule
      // if (!input.scheduled_for) {
      //   await inngest.send({ name: 'outreach/approved', data: { message_id: data.id } });
      // }

      return data;
    }),

  // Bulk approve messages
  bulkApprove: protectedProcedure
    .input(z.object({
      ids: z.array(z.string().uuid()),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('outreach_messages')
        .update({ status: 'approved' })
        .in('id', input.ids)
        .select();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      // TODO: Trigger Inngest for each approved message

      return { approved: data?.length || 0 };
    }),

  // Reject/discard message
  reject: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('outreach_messages')
        .delete()
        .eq('id', input.id);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),

  // Get outreach stats
  stats: protectedProcedure
    .input(z.object({ campaign_id: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('outreach_messages')
        .select('status');

      if (input.campaign_id) {
        query = query.eq('campaign_id', input.campaign_id);
      }

      const { data, error } = await query;

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      const stats = {
        total: data?.length || 0,
        draft: 0,
        pending_approval: 0,
        approved: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
        bounced: 0,
      };

      data?.forEach((m: any) => {
        if (m.status in stats) {
          stats[m.status as keyof typeof stats]++;
        }
      });

      // Calculate rates
      const rates = {
        open_rate: stats.sent > 0 ? ((stats.opened / stats.sent) * 100).toFixed(1) : '0',
        click_rate: stats.opened > 0 ? ((stats.clicked / stats.opened) * 100).toFixed(1) : '0',
        reply_rate: stats.sent > 0 ? ((stats.replied / stats.sent) * 100).toFixed(1) : '0',
        bounce_rate: stats.sent > 0 ? ((stats.bounced / stats.sent) * 100).toFixed(1) : '0',
      };

      return { ...stats, ...rates };
    }),
});

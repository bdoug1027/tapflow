import { inngest } from '@/lib/inngest/client';
import { createAdminClient } from '@/lib/supabase/server';

// Enrichment Agent - Finds contact info and enriches prospect data
export const enrichmentAgent = inngest.createFunction(
  {
    id: 'enrichment-agent',
    concurrency: { limit: 20 }, // Higher concurrency for parallelization
    retries: 3,
  },
  { event: 'prospect/found' },
  async ({ event, step }) => {
    const { prospect_id, campaign_id } = event.data;
    const supabase = createAdminClient();

    // Step 1: Get prospect details
    const prospect = await step.run('fetch-prospect', async () => {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('id', prospect_id)
        .single();

      if (error) throw new Error(`Failed to fetch prospect: ${error.message}`);
      return data;
    });

    // Step 2: Find emails via Hunter.io (placeholder)
    const contacts = await step.run('find-contacts-hunter', async () => {
      // TODO: Integrate Hunter.io API
      if (!prospect.website) return [];
      
      console.log(`Searching Hunter.io for contacts at: ${prospect.website}`);
      
      // Mock response
      return [
        {
          name: 'John Smith',
          first_name: 'John',
          last_name: 'Smith',
          email: `john@${new URL(prospect.website).hostname}`,
          title: 'Owner',
          is_primary: true,
        },
      ];
    });

    // Step 3: Scrape website for tech stack (placeholder)
    const techStack = await step.run('analyze-tech-stack', async () => {
      // TODO: Integrate Firecrawl or BuiltWith API
      if (!prospect.website) return null;
      
      console.log(`Analyzing tech stack for: ${prospect.website}`);
      
      return {
        cms: 'WordPress',
        ecommerce: null,
        analytics: ['Google Analytics'],
        marketing: [],
      };
    });

    // Step 4: Insert contacts
    const insertedContacts = await step.run('insert-contacts', async () => {
      const inserted = [];
      for (const contact of contacts) {
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            prospect_id,
            ...contact,
            source: 'hunter',
          })
          .select()
          .single();

        if (data) inserted.push(data);
      }
      return inserted;
    });

    // Step 5: Update prospect with enrichment data
    await step.run('update-prospect', async () => {
      await supabase
        .from('prospects')
        .update({
          tech_stack: techStack,
          status: 'enriched',
        })
        .eq('id', prospect_id);
    });

    // Step 6: Trigger scoring
    await step.run('trigger-scoring', async () => {
      await inngest.send({
        name: 'prospect/enriched',
        data: { prospect_id },
      });
    });

    return {
      prospect_id,
      contacts_found: insertedContacts.length,
      has_tech_stack: !!techStack,
    };
  }
);

import { inngest } from '@/lib/inngest/client';
import { createAdminClient } from '@/lib/supabase/server';

// Discovery Agent - Finds prospects from data sources
export const discoveryAgent = inngest.createFunction(
  {
    id: 'discovery-agent',
    concurrency: { limit: 10 }, // Max 10 concurrent jobs
    retries: 3,
  },
  { event: 'campaign/created' },
  async ({ event, step }) => {
    const { campaign_id, org_id } = event.data;
    const supabase = createAdminClient();

    // Step 1: Get campaign details
    const campaign = await step.run('fetch-campaign', async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaign_id)
        .single();

      if (error) throw new Error(`Failed to fetch campaign: ${error.message}`);
      return data;
    });

    // Step 2: Search Google Maps (placeholder - add real API later)
    const googleResults = await step.run('search-google-maps', async () => {
      // TODO: Integrate Google Maps Places API
      // For now, return mock data
      console.log(`Searching Google Maps for: ${campaign.business_type} in ${campaign.target_location}`);
      
      return [
        {
          company_name: `Sample ${campaign.business_type} 1`,
          address: `123 Main St, ${campaign.target_location}`,
          phone: '555-0100',
          website: 'https://example1.com',
          source_id: 'gm_sample_1',
        },
        {
          company_name: `Sample ${campaign.business_type} 2`,
          address: `456 Oak Ave, ${campaign.target_location}`,
          phone: '555-0200',
          website: 'https://example2.com',
          source_id: 'gm_sample_2',
        },
      ];
    });

    // Step 3: Search Yelp (placeholder)
    const yelpResults = await step.run('search-yelp', async () => {
      // TODO: Integrate Yelp Fusion API
      console.log(`Searching Yelp for: ${campaign.business_type} in ${campaign.target_location}`);
      return [];
    });

    // Step 4: Insert prospects into database
    const insertedProspects = await step.run('insert-prospects', async () => {
      const allResults = [
        ...googleResults.map(r => ({ ...r, source: 'google_maps' })),
        ...yelpResults.map(r => ({ ...r, source: 'yelp' })),
      ];

      const inserted = [];
      for (const prospect of allResults) {
        const { data, error } = await supabase
          .from('prospects')
          .upsert({
            campaign_id,
            company_name: prospect.company_name,
            address: prospect.address,
            phone: prospect.phone,
            website: prospect.website,
            source: prospect.source,
            source_id: prospect.source_id,
            status: 'new',
          }, {
            onConflict: 'campaign_id,source,source_id',
          })
          .select()
          .single();

        if (data) inserted.push(data);
      }

      return inserted;
    });

    // Step 5: Trigger enrichment for each prospect
    await step.run('trigger-enrichment', async () => {
      for (const prospect of insertedProspects) {
        await inngest.send({
          name: 'prospect/found',
          data: { prospect_id: prospect.id, campaign_id },
        });
      }
    });

    return {
      campaign_id,
      prospects_found: insertedProspects.length,
    };
  }
);

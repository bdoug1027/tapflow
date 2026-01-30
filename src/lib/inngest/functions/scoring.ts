import { inngest } from '@/lib/inngest/client';
import { createAdminClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

// Scoring Agent - Assigns A/B/C tier based on fit
export const scoringAgent = inngest.createFunction(
  {
    id: 'scoring-agent',
    concurrency: { limit: 5 }, // Limited due to API rate limits
    retries: 3,
  },
  { event: 'prospect/enriched' },
  async ({ event, step }) => {
    const { prospect_id } = event.data;
    const supabase = createAdminClient();

    // Step 1: Get prospect with all related data
    const prospect = await step.run('fetch-prospect-data', async () => {
      const { data, error } = await supabase
        .from('prospects')
        .select(`
          *,
          contacts(*),
          campaign:campaigns(business_type, ideal_customer_profile)
        `)
        .eq('id', prospect_id)
        .single();

      if (error) throw new Error(`Failed to fetch prospect: ${error.message}`);
      return data;
    });

    // Step 2: Calculate score using Claude
    const scoreResult = await step.run('calculate-score', async () => {
      // Check if API key exists
      if (!process.env.ANTHROPIC_API_KEY) {
        // Fallback scoring without AI
        console.log('No Anthropic API key, using fallback scoring');
        return calculateFallbackScore(prospect);
      }

      const anthropic = new Anthropic();

      const prompt = `You are a lead scoring assistant. Analyze this prospect and provide a score from 0-100 and a tier (A, B, or C).

Prospect Data:
- Company: ${prospect.company_name}
- Website: ${prospect.website || 'None'}
- Location: ${prospect.address || 'Unknown'}
- Tech Stack: ${JSON.stringify(prospect.tech_stack) || 'Unknown'}
- Has Email Contact: ${prospect.contacts?.length > 0}
- Contact Title: ${prospect.contacts?.[0]?.title || 'Unknown'}

Target Business Type: ${prospect.campaign?.business_type}
Ideal Customer Profile: ${JSON.stringify(prospect.campaign?.ideal_customer_profile) || 'Not specified'}

Scoring criteria:
- A tier (80-100): Perfect fit, has website, verified email, decision maker contact
- B tier (50-79): Good fit, missing some info but promising
- C tier (0-49): Poor fit or missing critical information

Respond in JSON format only:
{
  "score": <number>,
  "tier": "<A|B|C>",
  "factors": {
    "website_quality": <0-20>,
    "contact_quality": <0-20>,
    "business_fit": <0-30>,
    "tech_fit": <0-15>,
    "location_fit": <0-15>
  },
  "notes": ["<reason1>", "<reason2>"]
}`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      
      try {
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse AI response:', text);
        return calculateFallbackScore(prospect);
      }
    });

    // Step 3: Save score to database
    await step.run('save-score', async () => {
      await supabase
        .from('lead_scores')
        .upsert({
          prospect_id,
          score: scoreResult.score,
          tier: scoreResult.tier,
          scoring_factors: {
            ...scoreResult.factors,
            notes: scoreResult.notes,
          },
          model_version: 'v1',
        }, {
          onConflict: 'prospect_id',
        });

      // Update prospect status
      await supabase
        .from('prospects')
        .update({ status: 'scored' })
        .eq('id', prospect_id);
    });

    // Step 4: Trigger content generation for A and B tier
    if (scoreResult.tier === 'A' || scoreResult.tier === 'B') {
      await step.run('trigger-content-gen', async () => {
        await inngest.send({
          name: 'prospect/scored',
          data: {
            prospect_id,
            score: scoreResult.score,
            tier: scoreResult.tier,
          },
        });
      });
    }

    return {
      prospect_id,
      score: scoreResult.score,
      tier: scoreResult.tier,
    };
  }
);

// Fallback scoring when AI is unavailable
function calculateFallbackScore(prospect: any) {
  let score = 50; // Base score
  const factors = {
    website_quality: 0,
    contact_quality: 0,
    business_fit: 15,
    tech_fit: 5,
    location_fit: 10,
  };
  const notes: string[] = [];

  // Website quality
  if (prospect.website) {
    factors.website_quality = 15;
    score += 10;
    notes.push('Has website');
  } else {
    notes.push('No website found');
  }

  // Contact quality
  if (prospect.contacts?.length > 0) {
    factors.contact_quality = 10;
    score += 10;
    if (prospect.contacts[0]?.email) {
      factors.contact_quality += 5;
      score += 5;
      notes.push('Has email contact');
    }
  } else {
    notes.push('No contacts found');
  }

  // Tech stack
  if (prospect.tech_stack) {
    factors.tech_fit = 10;
    score += 5;
  }

  // Determine tier
  let tier: 'A' | 'B' | 'C';
  if (score >= 80) tier = 'A';
  else if (score >= 50) tier = 'B';
  else tier = 'C';

  return { score, tier, factors, notes };
}

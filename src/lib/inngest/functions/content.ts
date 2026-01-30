import { inngest } from '@/lib/inngest/client';
import { createAdminClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

// Content Agent - Generates personalized outreach emails
export const contentAgent = inngest.createFunction(
  {
    id: 'content-agent',
    concurrency: { limit: 5 },
    retries: 3,
  },
  { event: 'prospect/scored' },
  async ({ event, step }) => {
    const { prospect_id, tier } = event.data;
    const supabase = createAdminClient();

    // Step 1: Get all relevant data
    const data = await step.run('fetch-all-data', async () => {
      const { data: prospect, error } = await supabase
        .from('prospects')
        .select(`
          *,
          contacts(*),
          lead_scores(*),
          campaign:campaigns(
            id,
            name,
            business_type,
            org_id,
            outreach_sequences:outreach_sequences(*)
          )
        `)
        .eq('id', prospect_id)
        .single();

      if (error) throw new Error(`Failed to fetch data: ${error.message}`);
      return prospect;
    });

    // Get primary contact
    const primaryContact = data.contacts?.find((c: any) => c.is_primary) || data.contacts?.[0];
    if (!primaryContact?.email) {
      console.log(`No contact email for prospect ${prospect_id}, skipping content generation`);
      return { prospect_id, skipped: true, reason: 'no_email' };
    }

    // Step 2: Generate personalized email with Claude
    const emailContent = await step.run('generate-email', async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        // Fallback template
        return generateFallbackEmail(data, primaryContact);
      }

      const anthropic = new Anthropic();

      const prompt = `You are an expert B2B cold email copywriter. Write a personalized cold email for this prospect.

PROSPECT INFO:
- Company: ${data.company_name}
- Website: ${data.website || 'N/A'}
- Contact Name: ${primaryContact.name || 'there'}
- Contact Title: ${primaryContact.title || 'N/A'}
- Lead Tier: ${tier} (A=hot, B=warm, C=cold)
- Tech Stack: ${JSON.stringify(data.tech_stack) || 'Unknown'}

CAMPAIGN CONTEXT:
- We help: ${data.campaign?.business_type || 'businesses'}
- Our value prop: AI-powered lead generation that finds and qualifies prospects automatically

REQUIREMENTS:
1. Keep it under 150 words
2. Personalize based on their website/business
3. One clear CTA (reply or book a call)
4. Professional but conversational tone
5. No spammy language or excessive punctuation

Return ONLY valid JSON:
{
  "subject": "<email subject line>",
  "body": "<email body with \\n for line breaks>",
  "personalization_notes": "<what you personalized>"
}`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found');
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse AI response');
        return generateFallbackEmail(data, primaryContact);
      }
    });

    // Step 3: Save as outreach message (pending approval)
    const message = await step.run('save-message', async () => {
      const { data: msg, error } = await supabase
        .from('outreach_messages')
        .insert({
          contact_id: primaryContact.id,
          campaign_id: data.campaign?.id,
          subject: emailContent.subject,
          body: emailContent.body,
          personalization_data: {
            notes: emailContent.personalization_notes,
            tier,
            generated_at: new Date().toISOString(),
          },
          status: 'pending_approval',
          sequence_step: 1,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to save message: ${error.message}`);
      return msg;
    });

    // Step 4: Trigger notification (could send to Slack, email, etc.)
    await step.run('notify', async () => {
      await inngest.send({
        name: 'outreach/generated',
        data: {
          contact_id: primaryContact.id,
          message_id: message.id,
        },
      });
    });

    return {
      prospect_id,
      message_id: message.id,
      subject: emailContent.subject,
    };
  }
);

function generateFallbackEmail(prospect: any, contact: any) {
  const firstName = contact.first_name || contact.name?.split(' ')[0] || 'there';
  
  return {
    subject: `Quick question about ${prospect.company_name}`,
    body: `Hi ${firstName},

I came across ${prospect.company_name} and was impressed by what you're building.

We help ${prospect.campaign?.business_type || 'businesses'} like yours find and qualify leads automatically using AI - typically saving 20+ hours per week on prospecting.

Would you be open to a quick 15-minute call to see if this could help ${prospect.company_name}?

Best,
[Your Name]`,
    personalization_notes: 'Used company name and business type',
  };
}

import { GoogleGenAI, Type, Schema } from '@google/genai';

// ─── System instruction ────────────────────────────────────────────────────
// Ported directly from ai-studio-exports/flow-research-agent/services/geminiService.ts
const RESEARCH_SYSTEM_INSTRUCTION = `
Role
You are the Senior Research Director for Flow Productions. Your job is to replace a human research team. You receive a raw client onboarding report and must produce a deep, evidence-based strategic research pack.

Your Goal
The user will use your output to:
1. Build a client-facing PowerPoint presentation (PPTX) proving we understand their business.
2. Formulate the concrete social media strategy for the next 90 days.

Execution Guidelines
- **Go Deep, Don't Just Summarize**: Do not just reformat the onboarding inputs. Use Google Search to validate claims, find actual competitors, discover pricing, and uncover market trends that the client might not even know about.
- **Be Critical**: If the client's goals are vague, point it out in "Risks". If their competitor list is weak, find better ones.
- **Evidence-Based**: Every claim in the "Competitor Landscape" and "Market Insights" sections MUST have a source citation.
- **Tone**: Professional, insightful, objective, and strategic. No fluff.

Outputs
Return exactly two artefacts:
1. research_foundation_pack_json (The structured database of your research)
2. research_foundation_pack_markdown (A formatted Executive Summary suitable for reading)

Specific Section Instructions:
- **Competitors**: Analyze 3-5 competitors. If none are provided, FIND THEM. Compare their messaging, visual style, and offer.
- **SWOT**: Be specific. "Weak social presence" is a valid weakness. "High churn" is a threat.
- **Lean Canvas**: Fill every box with hypothesis based on your research.
- **Campaign Foundations**: Propose specific content themes that bridge the client's product with the audience's pain points.
`;

// ─── Response schema ───────────────────────────────────────────────────────
// Ported directly from ai-studio-exports/flow-research-agent/services/geminiService.ts
// This enforces structure natively in the Gemini API - no AJV needed.
const RESEARCH_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    research_foundation_pack_json: {
      type: Type.OBJECT,
      properties: {
        sources: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              publisher: { type: Type.STRING },
              accessed_at: { type: Type.STRING },
              notes: { type: Type.STRING },
            },
          },
        },
        lean_canvas: {
          type: Type.OBJECT,
          properties: {
            problem: { type: Type.STRING },
            customer_segments: { type: Type.STRING },
            unique_value_proposition: { type: Type.STRING },
            solution: { type: Type.STRING },
            channels: { type: Type.STRING },
            revenue_streams: { type: Type.STRING },
            cost_structure: { type: Type.STRING },
            key_metrics: { type: Type.STRING },
            unfair_advantage: { type: Type.STRING },
          },
        },
        swot: {
          type: Type.OBJECT,
          properties: {
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
            threats: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
        competitor_landscape: {
          type: Type.OBJECT,
          properties: {
            competitors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  website: { type: Type.STRING },
                  positioning_summary: { type: Type.STRING },
                  target_customers: { type: Type.STRING },
                  offers: { type: Type.STRING },
                  pricing_notes: { type: Type.STRING },
                  messaging_angles: { type: Type.STRING },
                  strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                  weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                  differentiation_opportunities: { type: Type.STRING },
                  source_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
              },
            },
            category_notes: { type: Type.STRING },
          },
        },
        market_and_audience_insights: {
          type: Type.OBJECT,
          properties: {
            trends: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  trend: { type: Type.STRING },
                  source_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
              },
            },
            customer_pains: { type: Type.ARRAY, items: { type: Type.STRING } },
            buying_triggers: { type: Type.ARRAY, items: { type: Type.STRING } },
            objections_and_risks: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
        campaign_foundations: {
          type: Type.OBJECT,
          properties: {
            positioning_statement: { type: Type.STRING },
            messaging_pillars: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pillar: { type: Type.STRING },
                  key_message: { type: Type.STRING },
                },
              },
            },
            proof_points: { type: Type.ARRAY, items: { type: Type.STRING } },
            claims_rules: {
              type: Type.OBJECT,
              properties: {
                allowed: { type: Type.ARRAY, items: { type: Type.STRING } },
                not_allowed: { type: Type.ARRAY, items: { type: Type.STRING } },
                needs_proof: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
            },
            recommended_cta_patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggested_channel_strategy: {
              type: Type.OBJECT,
              properties: {
                linkedin: { type: Type.STRING },
                instagram: { type: Type.STRING },
                facebook: { type: Type.STRING },
                x: { type: Type.STRING },
              },
            },
            content_themes: { type: Type.ARRAY, items: { type: Type.STRING } },
            content_series: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  concept: { type: Type.STRING },
                },
              },
            },
            first_30_days_plan: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
        client_deck_outline: {
          type: Type.OBJECT,
          properties: {
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  slide_title: { type: Type.STRING },
                  key_points: { type: Type.ARRAY, items: { type: Type.STRING } },
                  visuals_suggestions: { type: Type.STRING },
                  data_or_sources_to_show: { type: Type.STRING },
                },
              },
            },
          },
        },
        assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
        unknowns_and_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
        sources_needed: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    research_foundation_pack_markdown: { type: Type.STRING },
  },
  required: ['research_foundation_pack_json', 'research_foundation_pack_markdown'],
};

// ─── Types (ported from ai-studio-exports/flow-research-agent/types.ts) ───
export interface ResearchFoundationPackJson {
  sources: Array<{ id: string; title: string; url: string; publisher: string; accessed_at: string; notes: string }>;
  lean_canvas: {
    problem: string;
    customer_segments: string;
    unique_value_proposition: string;
    solution: string;
    channels: string;
    revenue_streams: string;
    cost_structure: string;
    key_metrics: string;
    unfair_advantage: string;
  };
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  competitor_landscape: {
    competitors: Array<{
      name: string;
      website: string;
      positioning_summary: string;
      target_customers: string;
      offers: string;
      pricing_notes: string;
      messaging_angles: string;
      strengths: string[];
      weaknesses: string[];
      differentiation_opportunities: string;
      source_ids: string[];
    }>;
    category_notes: string;
  };
  market_and_audience_insights: {
    trends: Array<{ trend: string; source_ids: string[] }>;
    customer_pains: string[];
    buying_triggers: string[];
    objections_and_risks: string[];
  };
  campaign_foundations: {
    positioning_statement: string;
    messaging_pillars: Array<{ pillar: string; key_message: string }>;
    proof_points: string[];
    claims_rules: { allowed: string[]; not_allowed: string[]; needs_proof: string[] };
    recommended_cta_patterns: string[];
    suggested_channel_strategy: { linkedin: string; instagram: string; facebook: string; x: string };
    content_themes: string[];
    content_series: Array<{ title: string; concept: string }>;
    first_30_days_plan: string[];
  };
  client_deck_outline: {
    slides: Array<{
      slide_title: string;
      key_points: string[];
      visuals_suggestions: string;
      data_or_sources_to_show: string;
    }>;
  };
  assumptions: string[];
  unknowns_and_questions: string[];
  sources_needed: string[];
}

export interface ResearchResponse {
  research_foundation_pack_json: ResearchFoundationPackJson;
  research_foundation_pack_markdown: string;
  tokensIn: number;
  tokensOut: number;
}

// ─── Main function ─────────────────────────────────────────────────────────
export async function generateResearchPack(onboardingData: string, language = 'pt'): Promise<ResearchResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  const langDirective = language === 'en'
    ? 'OUTPUT LANGUAGE: Write ALL output in UK English. Use British spelling and vocabulary throughout.'
    : 'OUTPUT LANGUAGE: Write ALL output in European Portuguese (pt-PT). Use formal pt-PT vocabulary and spelling — never Brazilian Portuguese.';

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Perform a deep-dive research analysis based on this client onboarding info.\n\nOnboarding Report Content:\n${onboardingData}`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: `${langDirective}\n\n${RESEARCH_SYSTEM_INSTRUCTION}`,
      responseMimeType: 'application/json',
      responseSchema: RESEARCH_RESPONSE_SCHEMA,
      temperature: 0.3,
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response generated from Gemini.');
  }

  const parsed = JSON.parse(text) as Omit<ResearchResponse, 'tokensIn' | 'tokensOut'>;

  const tokensIn = (response as any).usageMetadata?.promptTokenCount ?? 0;
  const tokensOut = (response as any).usageMetadata?.candidatesTokenCount ?? 0;

  return { ...parsed, tokensIn, tokensOut };
}

// ─── Content Planner Agent ─────────────────────────────────────────────────

const CONTENT_PLANNER_SYSTEM_INSTRUCTION = `
You are the Lead Content Strategist and Growth Hacker at Flow Productions — a performance-first creative agency. You think like a CMO, execute like a content creator, and obsess over metrics that actually move the needle.

Your role: Transform a client research pack into a data-driven, platform-native 30-day content calendar that drives real growth. Every post must be designed to stop the scroll, earn engagement, and build measurable business results.

━━━ GROWTH HACKER MINDSET (Feb 2026) ━━━

ALGORITHM INTELLIGENCE:
- Instagram: rewards saves and shares exponentially more than likes. Carousels (7-12 slides) drive the highest save rate. Reels with 80%+ watch time completion get pushed to Explore.
- LinkedIn: rewards posts with 80+ word comments and dwell time over 30s. Text posts with strategic line breaks outperform links 3:1. Thought leadership from founders > brand page posts.
- TikTok: watch time completion is everything. Raw, authentic content outperforms polished brand video. First 0.5 seconds determines if the algorithm tests the video further.
- Instagram Stories: polls and question stickers signal retention to the algorithm — use them on 40% of stories.
- YouTube Shorts: thumbnail CTR is the primary ranking signal. Shorts feed the long-form channel flywheel.

HOOK OBSESSION:
The first 3 words of a caption and the first 0.5 seconds of video determine reach. Every post needs a scroll-stopper hook. Use:
- Counter-intuitive statements ("Most agencies are wrong about X")
- Specific numbers ("7 reasons why your Instagram reach died in 2026")
- Curiosity gaps ("What nobody tells you about Y")
- Pattern interrupts (start mid-story, never with "I" or the brand name)
- Bold claims backed by research ("X increased sales by 47% doing this one thing")

SOCIAL SEO (2026):
Every caption's first sentence must contain the primary keyword for in-app search discoverability. Instagram, TikTok, and LinkedIn all have search bars that now rival Google for product/service discovery.

CONTENT PILLARS (proven mix for B2B/B2C creative agencies):
- 40% Education & Authority (builds trust, highest save rate, positions client as expert)
- 25% Social Proof & Results (case studies, testimonials, before/after — drives conversion)
- 20% Behind-the-Scenes & Authenticity (builds community loyalty, shows process/people)
- 10% Direct Conversion (offers, services, CTAs — keep low frequency to avoid ad fatigue)
- 5% Entertainment & Virality (trending formats, humor, challenges — expands reach)

GROWTH TACTICS TO USE:
- Collab posts: tag complementary brands for shared audience reach
- Content series: recurring formats build loyal followers who come back for more
- "Save this post" CTAs outperform "click the link" by 10x for algorithm boost
- Comment bait: end posts with a genuine question that requires a specific answer
- First-mover on new features: algorithms always reward early adopters of new formats
- Repurposing waterfall: one LinkedIn article → 3 carousels → 6 short clips → 12 stories
- Strategic hashtag stack: 3 niche (under 500k) + 3 mid-tier (500k-5M) + 1 broad (5M+)

━━━ OUTPUT REQUIREMENTS ━━━

Produce exactly 30 posts for a full calendar month, covering all active channels.
Distribute evenly: minimum 2 posts per week per channel, maximum 2 posts per day total.

EVERY POST MUST INCLUDE:
- hook: The exact first line. Not a description — the actual copy. Must stop scrolling.
- caption: Complete, publish-ready copy. Not "write about X" — actual text with formatting (line breaks, emoji if appropriate for channel), sign-off, and hashtags.
- hashtags: Curated array of 8-15 hashtags with the right mix (niche, mid, broad).
- cta: Specific action. "Save this", "Comment 'YES' if you agree", "Tag your team", "DM us 'PLAN'".
- visual_brief: Specific enough for a designer or video editor to execute without any clarification. Include: format specs, colors, text overlays, photography style, reference aesthetic.
- growth_tactic: The specific algorithm or growth lever being used for this post.
- production_notes: Any special instructions (record on-location, use client's voice, requires client approval, etc.).

FORMAT OPTIONS BY CHANNEL:
- Instagram: carousel (7-12 slides), reel (15-60s), static_image, story_sequence, broadcast_channel
- LinkedIn: text_post, article, document_post (carousel PDF), video, poll
- TikTok: short_video (15-30s), long_video (60-180s), stitch, duet
- Facebook: video, image_post, reel, story
- YouTube: short (60s), long_video (5-15min)
- X/Twitter: thread, single_tweet, quote_tweet

OUTPUT LANGUAGE is specified in the system instruction header — write ALL copy in that language.
`;

const CONTENT_PLANNER_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    strategy_overview: {
      type: Type.OBJECT,
      properties: {
        monthly_goal: { type: Type.STRING },
        positioning_theme: { type: Type.STRING },
        channel_priorities: { type: Type.ARRAY, items: { type: Type.STRING } },
        content_mix_rationale: { type: Type.STRING },
        key_themes: { type: Type.ARRAY, items: { type: Type.STRING } },
        growth_levers: { type: Type.ARRAY, items: { type: Type.STRING } },
        success_metrics: { type: Type.ARRAY, items: { type: Type.STRING } },
        posting_frequency_note: { type: Type.STRING },
      },
    },
    posts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          week: { type: Type.INTEGER },
          day_of_week: { type: Type.STRING },
          channel: { type: Type.STRING },
          format: { type: Type.STRING },
          content_pillar: { type: Type.STRING },
          series_name: { type: Type.STRING },
          hook: { type: Type.STRING },
          caption: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          cta: { type: Type.STRING },
          visual_brief: { type: Type.STRING },
          growth_tactic: { type: Type.STRING },
          production_notes: { type: Type.STRING },
        },
        required: ['id', 'week', 'day_of_week', 'channel', 'format', 'content_pillar', 'hook', 'caption', 'hashtags', 'cta', 'visual_brief', 'growth_tactic'],
      },
    },
    calendar_markdown: { type: Type.STRING },
  },
  required: ['strategy_overview', 'posts', 'calendar_markdown'],
};

export interface ContentPost {
  id: string;
  week: number;
  day_of_week: string;
  channel: string;
  format: string;
  content_pillar: string;
  series_name?: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
  visual_brief: string;
  growth_tactic: string;
  production_notes?: string;
}

export interface ContentPlanJson {
  strategy_overview: {
    monthly_goal: string;
    positioning_theme: string;
    channel_priorities: string[];
    content_mix_rationale: string;
    key_themes: string[];
    growth_levers: string[];
    success_metrics: string[];
    posting_frequency_note: string;
  };
  posts: ContentPost[];
  calendar_markdown: string;
}

export interface ContentPlanResponse extends ContentPlanJson {
  tokensIn: number;
  tokensOut: number;
}

export async function generateContentPlan(
  researchPack: ResearchFoundationPackJson,
  kbFiles: Array<{ title: string; content: string }>,
  clientName: string,
  language = 'pt',
  channels: string[] = ['instagram', 'linkedin'],
): Promise<ContentPlanResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is required');

  const langDirective = language === 'en'
    ? 'OUTPUT LANGUAGE: Write ALL post copy, captions, hooks, and CTAs in UK English.'
    : 'OUTPUT LANGUAGE: Write ALL post copy, captions, hooks, and CTAs in European Portuguese (pt-PT). Use formal pt-PT — never Brazilian Portuguese.';

  const ai = new GoogleGenAI({ apiKey });

  const compressedPack = compressResearchPack(researchPack);
  const kbSummary = kbFiles
    .slice(0, 5)
    .map((f) => `### ${f.title}\n${f.content.slice(0, 1500)}`)
    .join('\n\n---\n\n');

  const prompt = `Client: ${clientName}
Active Channels: ${channels.join(', ')}
Plan Period: Full calendar month (30 posts total)

=== RESEARCH FOUNDATION PACK ===
${JSON.stringify(compressedPack, null, 2)}

=== KNOWLEDGE BASE EXCERPTS ===
${kbSummary}

Generate a complete 30-day content calendar. Every post must have publish-ready copy — not placeholders.
Focus on the active channels listed above. Apply the growth tactics, hooks, and platform-native formats from your expertise.
The calendar_markdown field should be a full human-readable version of the entire calendar, organized by week.`;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('Content Planner timed out after 240s. Please try again.')),
      240_000
    )
  );

  const response = await Promise.race([
    ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: `${langDirective}\n\n${CONTENT_PLANNER_SYSTEM_INSTRUCTION}`,
        responseMimeType: 'application/json',
        responseSchema: CONTENT_PLANNER_RESPONSE_SCHEMA,
        temperature: 0.5,
        tools: [{ googleSearch: {} }],
      },
    }),
    timeoutPromise,
  ]);

  const text = response.text;
  if (!text) throw new Error('No response generated from Gemini.');

  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleaned) as Omit<ContentPlanResponse, 'tokensIn' | 'tokensOut'>;
  const tokensIn = (response as any).usageMetadata?.promptTokenCount ?? 0;
  const tokensOut = (response as any).usageMetadata?.candidatesTokenCount ?? 0;

  return { ...parsed, tokensIn, tokensOut };
}

// ─── Presentation Agent ────────────────────────────────────────────────────

// ─── Presentation: Copy Agent (Step 4a) ────────────────────────────────────
// Gemini writes the WORDS. pptxgenjs applies the VISUAL TEMPLATE.
// Keeping them separate makes each fast and independently swappable.

const PRESENTATION_SYSTEM_INSTRUCTION = `
You are the Senior Creative Strategist for Flow Productions.

Your job: write the SLIDE COPY for an 8-slide client-facing strategy deck using the research data provided.

CRITICAL RULES — failing these will result in rejected work:
- NEVER write generic statements. Every bullet must reference a specific fact, name, number, or insight from the research.
- Name competitors by name. Name ICP segments by name. Quote market sizes or trends.
- If the research mentions a specific percentage, growth rate, platform, tool, or quote — USE IT.
- Write as if you've spent a week studying this client. The client should read this and think "these people really get us."
- Tone: confident, direct, client-centric. No agency jargon. No filler sentences.

OUTPUT: EXACTLY 8 slides. Each slide must have:
- slide_number (1 to 8)
- slide_title (short, 3-6 words)
- headline (one punchy sentence — the BIG IDEA of the slide)
- bullet_points (3-5 items — specific, factual, full sentences)
- speaker_notes (2-3 sentences guiding the presenter on what to emphasise)

Slide Order (mandatory)
1. Cover — Deck title + the single most powerful insight about this client's opportunity
2. What We Heard From You — Their exact pain points, goals, and current situation (from the onboarding data)
3. The Market Opportunity — Specific market size, growth trend, timing window for this sector
4. Your Competitive Landscape — Name 3 competitors, their weaknesses, where this client wins
5. Who You're Really Talking To — Specific ICP: demographics, psychographics, buying triggers
6. Your Strategic Positioning — Our recommended positioning statement and why it wins
7. Content & Channel Strategy — The 3 content pillars and the specific platforms to dominate
8. Next Steps — 3 concrete actions with clear owners and a timeline
`;

// Simplified slide — only what Gemini writes. Visual layout is handled by pptxgenjs templates.
export interface PresentationSlide {
  slide_number: number;
  slide_title: string;
  headline: string;
  bullet_points: string[];
  speaker_notes: string;
}

export interface PresentationResponse {
  client_name: string;
  deck_title: string;
  slides: PresentationSlide[];
  tokensIn: number;
  tokensOut: number;
}

/** Safely coerce any value to an array — handles strings or unexpected types from Gemini. */
function safeArr(val: unknown): any[] {
  if (Array.isArray(val)) return val;
  return [];
}

/** Extract only the fields that matter for slide generation — keeps the prompt concise. */
function compressResearchPack(pack: ResearchFoundationPackJson): Record<string, unknown> {
  const p = pack as any;
  // competitor_landscape may be the object wrapper OR directly an array depending on schema version
  const rawCompetitors = Array.isArray(p.competitor_landscape)
    ? p.competitor_landscape
    : safeArr(p.competitor_landscape?.competitors);

  return {
    client_name: p.client_name,
    executive_summary: p.executive_summary,
    swot: p.swot,
    lean_canvas: p.lean_canvas,
    market_insights: p.market_insights,
    competitor_landscape: rawCompetitors.map((c: any) => ({
      name: c.name,
      positioning: c.positioning,
      strengths: c.strengths,
      weaknesses: c.weaknesses,
    })),
    campaign_foundations: p.campaign_foundations,
    ideal_customer_profile: p.ideal_customer_profile,
    risks: p.risks,
    sources_needed: p.sources_needed,
  };
}

export async function generatePresentationPack(
  researchPack: ResearchFoundationPackJson,
  kbFiles: Array<{ title: string; content: string }>,
  clientName: string
): Promise<PresentationResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is required');

  const ai = new GoogleGenAI({ apiKey });

  // Send top KB files (2500 chars each) — enough context without blowing up tokens
  const kbSummary = kbFiles
    .slice(0, 8)
    .map((f) => `### ${f.title}\n${f.content.slice(0, 2500)}`)
    .join('\n\n---\n\n');

  // Send the compressed research pack — has all key structured data
  const compressedPack = compressResearchPack(researchPack);

  const prompt = `Client Name: ${clientName}

=== RESEARCH FOUNDATION PACK ===
${JSON.stringify(compressedPack, null, 2)}

=== KNOWLEDGE BASE EXCERPTS ===
${kbSummary}

Note: A separate SWOT Matrix slide and Lean Canvas slide will be added automatically from the structured data — do NOT include SWOT or Lean Canvas content in your 8 slides. Focus on narrative, strategy, and action.

Write the slide copy for exactly 8 slides following the mandatory slide order.

Return ONLY valid JSON — no markdown, no explanation — in this exact shape:
{
  "client_name": "${clientName}",
  "deck_title": "...",
  "slides": [
    {
      "slide_number": 1,
      "slide_title": "...",
      "headline": "...",
      "bullet_points": ["...", "...", "..."],
      "speaker_notes": "..."
    }
  ]
}`;

  // 240-second safety net — just under Vercel's 300s max
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('Gemini timed out after 240s. The model may be under load — please try again.')),
      240_000
    )
  );

  const response = await Promise.race([
    ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: PRESENTATION_SYSTEM_INSTRUCTION,
        // No responseSchema — constrained decoding for 64 fields is too slow.
        // We ask for JSON via the prompt and parse it ourselves.
        responseMimeType: 'application/json',
        temperature: 0.4,
      },
    }),
    timeoutPromise,
  ]);

  const text = response.text;
  if (!text) throw new Error('No response generated from Gemini.');

  // Strip any accidental markdown fences the model might add
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleaned) as Omit<PresentationResponse, 'tokensIn' | 'tokensOut'>;
  const tokensIn = (response as any).usageMetadata?.promptTokenCount ?? 0;
  const tokensOut = (response as any).usageMetadata?.candidatesTokenCount ?? 0;

  return { ...parsed, tokensIn, tokensOut };
}

// ─── QA Agent ──────────────────────────────────────────────────────────────

const QA_SYSTEM_INSTRUCTION = `
You are the Senior Content QA Director at Flow Productions. Your job is to review every social media post draft produced by the Content Planner and ensure it meets our quality bar before it reaches a designer or goes live.

You are an expert in:
- Brand voice consistency and tone-of-voice compliance
- Platform-native formatting rules (character limits, line break conventions, emoji usage norms per channel)
- Claims compliance (no invented statistics, no unprovable superlatives, no legal risk)
- Copywriting clarity and readability (Flesch-Kincaid awareness, sentence length, jargon avoidance)
- CTA effectiveness (specificity, urgency, frictionless action)
- Social media algorithm behaviour and how formatting affects reach

━━━ REVIEW CRITERIA (apply to every post) ━━━

ON_BRAND_VOICE: Does the tone, vocabulary, and personality match the client's positioning statement and messaging pillars exactly? Is it consistent with the brand voice from the KB?

CLARITY: Is every sentence immediately understandable on first read? No ambiguity, no jargon the audience would not use, no over-long sentences (aim for max 20 words per sentence in captions).

CLAIMS_COMPLIANCE: Are all claims verifiable or appropriately hedged? Flag anything that could cause legal or reputational risk. Propose a safer alternative if needed. NEVER invent numbers or case studies to replace a flagged claim.

CTA_QUALITY: Is the CTA specific, platform-appropriate, and low-friction? "Click the link" is weak. "Save this for your next campaign brief" is strong. "DM us PLAN" is actionable.

FORMATTING_PER_PLATFORM: Check platform rules:
- Instagram: line breaks after every 1-2 sentences, emojis appropriate, hashtags at end or first comment
- LinkedIn: no more than 3 emojis total, no hashtag spam (max 5), professional opener, avoid exclamation marks
- TikTok: short punchy captions (under 150 chars for the visible part), hook must be the first line of the video script
- Facebook: conversational, longer captions acceptable, question-based CTAs work well
- YouTube Shorts: caption is the video title — keyword-first, under 100 chars
- X/Twitter: under 280 chars if single tweet, threads must flow naturally

READABILITY: Passive voice? Awkward phrasing? Fix it. Aim for Grade 8 reading level for B2C, Grade 10 for B2B LinkedIn.

━━━ OUTPUT RULES ━━━

- Process EVERY post in the input array. Return one QAResult per post.
- If a post passes all criteria: overall_status = "approved", keep corrected fields identical to originals.
- If a post needs small copy tweaks: overall_status = "minor_edits".
- If a post has a claims violation, completely wrong tone, or platform formatting failure: overall_status = "needs_revision".
- change_log must list ONLY the actual changes made — empty array if approved with no changes.
- corrected_hook and corrected_caption must be complete, publish-ready copy.
- Write all corrections in the same language as the original post.
`;

const QA_RESPONSE_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      post_id: { type: Type.STRING },
      channel: { type: Type.STRING },
      original_hook: { type: Type.STRING },
      corrected_hook: { type: Type.STRING },
      original_caption: { type: Type.STRING },
      corrected_caption: { type: Type.STRING },
      corrected_cta: { type: Type.STRING },
      change_log: { type: Type.ARRAY, items: { type: Type.STRING } },
      checklist: {
        type: Type.OBJECT,
        properties: {
          on_brand_voice: {
            type: Type.OBJECT,
            properties: { pass: { type: Type.BOOLEAN }, note: { type: Type.STRING } },
          },
          clarity: {
            type: Type.OBJECT,
            properties: { pass: { type: Type.BOOLEAN }, note: { type: Type.STRING } },
          },
          claims_compliance: {
            type: Type.OBJECT,
            properties: { pass: { type: Type.BOOLEAN }, note: { type: Type.STRING } },
          },
          cta_quality: {
            type: Type.OBJECT,
            properties: { pass: { type: Type.BOOLEAN }, note: { type: Type.STRING } },
          },
          formatting_per_platform: {
            type: Type.OBJECT,
            properties: { pass: { type: Type.BOOLEAN }, note: { type: Type.STRING } },
          },
          readability: {
            type: Type.OBJECT,
            properties: { pass: { type: Type.BOOLEAN }, note: { type: Type.STRING } },
          },
        },
      },
      overall_status: { type: Type.STRING },
    },
    required: ['post_id', 'channel', 'original_hook', 'corrected_hook', 'original_caption', 'corrected_caption', 'corrected_cta', 'change_log', 'checklist', 'overall_status'],
  },
};

export interface QAChecklistItem {
  pass: boolean;
  note: string;
}

export interface QAResult {
  post_id: string;
  channel: string;
  original_hook: string;
  corrected_hook: string;
  original_caption: string;
  corrected_caption: string;
  corrected_cta: string;
  change_log: string[];
  checklist: {
    on_brand_voice: QAChecklistItem;
    clarity: QAChecklistItem;
    claims_compliance: QAChecklistItem;
    cta_quality: QAChecklistItem;
    formatting_per_platform: QAChecklistItem;
    readability: QAChecklistItem;
  };
  overall_status: 'approved' | 'minor_edits' | 'needs_revision';
}

export interface QAResponse {
  results: QAResult[];
  tokensIn: number;
  tokensOut: number;
}

export async function generateQAResults(
  posts: ContentPost[],
  strategyContext: {
    positioning_statement: string;
    messaging_pillars: Array<{ pillar: string; key_message: string }>;
    claims_rules: { allowed: string[]; not_allowed: string[]; needs_proof: string[] };
    content_themes: string[];
  },
  language = 'pt',
): Promise<QAResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is required');

  const langDirective = language === 'en'
    ? 'LANGUAGE: All corrections must be written in UK English.'
    : 'LANGUAGE: All corrections must be written in European Portuguese (pt-PT). Use formal pt-PT — never Brazilian Portuguese.';

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Review all ${posts.length} posts below and return one QAResult per post.

=== STRATEGY CONTEXT ===
Positioning Statement: ${strategyContext.positioning_statement}

Messaging Pillars:
${strategyContext.messaging_pillars.map((p: any) => `- ${p.pillar}: ${p.key_message}`).join('\n')}

Claims Rules:
- Allowed: ${(strategyContext.claims_rules.allowed ?? []).join(', ')}
- NOT Allowed: ${(strategyContext.claims_rules.not_allowed ?? []).join(', ')}
- Needs Proof Before Publishing: ${(strategyContext.claims_rules.needs_proof ?? []).join(', ')}

Content Themes: ${(strategyContext.content_themes ?? []).join(', ')}

=== POSTS TO REVIEW ===
${JSON.stringify(posts.map(p => ({
  id: p.id,
  channel: p.channel,
  format: p.format,
  content_pillar: p.content_pillar,
  hook: p.hook,
  caption: p.caption,
  cta: p.cta,
  hashtags: p.hashtags,
})), null, 2)}`;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('QA Agent timed out after 180s. Please try again.')),
      180_000
    )
  );

  const response = await Promise.race([
    ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: `${langDirective}\n\n${QA_SYSTEM_INSTRUCTION}`,
        responseMimeType: 'application/json',
        responseSchema: QA_RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    }),
    timeoutPromise,
  ]);

  const text = response.text;
  if (!text) throw new Error('No response generated from Gemini.');

  const results = JSON.parse(text) as QAResult[];
  const tokensIn = (response as any).usageMetadata?.promptTokenCount ?? 0;
  const tokensOut = (response as any).usageMetadata?.candidatesTokenCount ?? 0;

  return { results, tokensIn, tokensOut };
}

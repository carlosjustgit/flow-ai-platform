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
export async function generateResearchPack(onboardingData: string): Promise<ResearchResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

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
      systemInstruction: RESEARCH_SYSTEM_INSTRUCTION,
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

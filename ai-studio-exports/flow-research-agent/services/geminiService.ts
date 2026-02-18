import { GoogleGenAI, Type, Schema, Part } from "@google/genai";
import { ResearchResponse, FileData } from "../types";

const SYSTEM_INSTRUCTION = `
Role
You are the Senior Research Director for Flow Productions. Your job is to replace a human research team. You receive a raw client onboarding report and must produce a deep, evidence-based strategic research pack.

Your Goal
The user will use your output to:
1. Build a client-facing PowerPoint presentation (PPTX) proving we understand their business.
2. Formulate the concrete social media strategy for the next 90 days.

Execution Guidelines
- **Go Deep, Don't Just Summarize**: Do not just reformat the onboarding inputs. Use Google Search to validate claims, find actual competitors, discovering pricing, and uncover market trends that the client might not even know about.
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

const RESPONSE_SCHEMA: Schema = {
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
  required: ["research_foundation_pack_json", "research_foundation_pack_markdown"],
};

export const generateStrategyPack = async (
  onboardingData: string,
  fileData?: FileData
): Promise<ResearchResponse> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const parts: Part[] = [];

  // Add the file content if present
  if (fileData) {
    parts.push({
      inlineData: {
        mimeType: fileData.mimeType,
        data: fileData.data,
      },
    });
  }

  // Construct text prompt
  let promptText = "Perform a deep-dive research analysis based on this client onboarding info.";
  if (onboardingData) {
    promptText += `\n\nOnboarding Report Content:\n${onboardingData}`;
  }
  parts.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: parts,
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.3, // Slightly higher to allow for creative strategic thinking while keeping structure
        tools: [{ googleSearch: {} }], // Enable Google Search
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response generated from Gemini.");
    }

    return JSON.parse(text) as ResearchResponse;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

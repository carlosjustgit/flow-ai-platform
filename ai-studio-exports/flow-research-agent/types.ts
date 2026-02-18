export interface Source {
  id: string;
  title: string;
  url: string;
  publisher: string;
  accessed_at: string;
  notes: string;
}

export interface LeanCanvas {
  problem: string;
  customer_segments: string;
  unique_value_proposition: string;
  solution: string;
  channels: string;
  revenue_streams: string;
  cost_structure: string;
  key_metrics: string;
  unfair_advantage: string;
}

export interface Swot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface Competitor {
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
}

export interface MarketInsights {
  trends: Array<{ trend: string; source_ids: string[] }>;
  customer_pains: string[];
  buying_triggers: string[];
  objections_and_risks: string[];
}

export interface CampaignFoundations {
  positioning_statement: string;
  messaging_pillars: Array<{ pillar: string; key_message: string }>;
  proof_points: string[];
  claims_rules: { allowed: string[]; not_allowed: string[]; needs_proof: string[] };
  recommended_cta_patterns: string[];
  suggested_channel_strategy: {
    linkedin: string;
    instagram: string;
    facebook: string;
    x: string;
  };
  content_themes: string[];
  content_series: Array<{ title: string; concept: string }>;
  first_30_days_plan: string[];
}

export interface Slide {
  slide_title: string;
  key_points: string[];
  visuals_suggestions: string;
  data_or_sources_to_show: string;
}

export interface ResearchFoundationPackJson {
  sources: Source[];
  lean_canvas: LeanCanvas;
  swot: Swot;
  competitor_landscape: {
    competitors: Competitor[];
    category_notes: string;
  };
  market_and_audience_insights: MarketInsights;
  campaign_foundations: CampaignFoundations;
  client_deck_outline: {
    slides: Slide[];
  };
  assumptions: string[];
  unknowns_and_questions: string[];
  sources_needed: string[];
}

export interface ResearchResponse {
  research_foundation_pack_json: ResearchFoundationPackJson;
  research_foundation_pack_markdown: string;
}

export interface OnboardingInput {
  text: string;
}

export interface FileData {
  mimeType: string;
  data: string;
}

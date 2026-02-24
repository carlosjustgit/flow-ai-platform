import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { readFile } from 'fs/promises';
import { join } from 'path';

// ─── Data shapes ────────────────────────────────────────────────────────────

export interface LeanCanvasData {
  problem?: unknown;
  solution?: unknown;
  unique_value_proposition?: unknown;
  unfair_advantage?: unknown;
  customer_segments?: unknown;
  key_metrics?: unknown;
  channels?: unknown;
  cost_structure?: unknown;
  revenue_streams?: unknown;
}

/** Flat map that directly mirrors every placeholder in deck-template.pptx */
export interface TemplateData {
  // Slide 1 — Cover
  client_name: string;
  deck_title: string;
  headline: string;
  // Slide 2 — Section / "What We Heard" dark slide
  slide2_headline: string;
  // Slide 3 — Content (topic 1, 2 bullets)
  slide3_title: string;
  slide3_bullet_1: string;
  slide3_bullet_2: string;
  // Slide 4 — Content (topic 2, 2 bullets)
  slide4_title: string;
  slide4_bullet_1: string;
  slide4_bullet_2: string;
  // Slide 5 — Content (topic 3, 1 bullet)
  slide5_title: string;
  slide5_bullet_1: string;
  // Slide 6 — Lean Canvas
  slide6_title: string;
  lc_problem: string;
  lc_solution: string;
  lc_uvp: string;
  lc_advantage: string;
  lc_segments: string;
  lc_metrics: string;
  lc_channels: string;
  lc_costs: string;
  lc_revenue: string;
  // Slide 7 — Closing (static, no placeholders)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert any Lean Canvas field value (string, string[], or object) to a clean display string. */
export function fieldToText(val: unknown, maxItems = 4): string {
  if (!val) return '—';
  if (Array.isArray(val)) {
    return val
      .slice(0, maxItems)
      .map((v, i) => `${i + 1}. ${String(v)}`)
      .join('\n');
  }
  if (typeof val === 'object') return JSON.stringify(val).slice(0, 300);
  return String(val).slice(0, 400);
}

/** Build the full TemplateData by merging Gemini narrative content with structured LC data. */
export function buildTemplateData(
  gemini: Omit<TemplateData, 'lc_problem' | 'lc_solution' | 'lc_uvp' | 'lc_advantage' | 'lc_segments' | 'lc_metrics' | 'lc_channels' | 'lc_costs' | 'lc_revenue'>,
  leanCanvas: LeanCanvasData = {}
): TemplateData {
  return {
    ...gemini,
    lc_problem:   fieldToText(leanCanvas.problem),
    lc_solution:  fieldToText(leanCanvas.solution),
    lc_uvp:       fieldToText(leanCanvas.unique_value_proposition),
    lc_advantage: fieldToText(leanCanvas.unfair_advantage),
    lc_segments:  fieldToText(leanCanvas.customer_segments),
    lc_metrics:   fieldToText(leanCanvas.key_metrics),
    lc_channels:  fieldToText(leanCanvas.channels),
    lc_costs:     fieldToText(leanCanvas.cost_structure),
    lc_revenue:   fieldToText(leanCanvas.revenue_streams),
  };
}

// ─── Renderer ───────────────────────────────────────────────────────────────

/**
 * Populate `templates/deck-template.pptx` with the provided data and return
 * the filled PPTX as a Node.js Buffer ready for Supabase Storage upload.
 */
export async function renderPptxFromTemplate(data: TemplateData): Promise<Buffer> {
  const templatePath = join(process.cwd(), 'templates', 'deck-template.pptx');
  const templateBuffer = await readFile(templatePath);

  const zip = new PizZip(templateBuffer);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Suppress errors for any placeholder that remains undefined (treat as empty string)
    nullGetter: () => '',
  });

  doc.render(data as unknown as Record<string, unknown>);

  const output = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return output;
}

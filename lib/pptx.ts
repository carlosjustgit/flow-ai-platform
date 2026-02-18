import PptxGenJS from 'pptxgenjs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { PresentationSlide } from './gemini';
import { FLOW_BRAND } from './brand';

// Raw research data shapes used for matrix slides
export interface SwotData {
  strengths?: unknown;
  weaknesses?: unknown;
  opportunities?: unknown;
  threats?: unknown;
}

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

const B = FLOW_BRAND;

// ─── Helpers ───────────────────────────────────────────────────────────────

function addFooter(slide: PptxGenJS.Slide, slideNum: number, total: number) {
  // Flow logo text mark (fallback when logo file unavailable)
  slide.addText('FLOW', {
    x: 0.3, y: B.slide_height_inches - 0.45,
    w: 1.0, h: 0.3,
    fontSize: 9, bold: true,
    color: B.primary,
    fontFace: B.font_title,
    valign: 'middle',
  });
  // Slide number
  slide.addText(`${slideNum} / ${total}`, {
    x: B.slide_width_inches - 1.2, y: B.slide_height_inches - 0.45,
    w: 0.9, h: 0.3,
    fontSize: 8, color: B.text_muted,
    fontFace: B.font_body,
    align: 'right', valign: 'middle',
  });
  // Bottom rule line
  slide.addShape('rect' as any, {
    x: 0.3, y: B.slide_height_inches - 0.5,
    w: B.slide_width_inches - 0.6, h: 0.03,
    fill: { color: B.grey_light },
    line: { color: B.grey_light },
  });
}

function addYellowAccent(slide: PptxGenJS.Slide) {
  slide.addShape('rect' as any, {
    x: 0, y: 0,
    w: 0.12, h: B.slide_height_inches,
    fill: { color: B.yellow },
    line: { color: B.yellow },
  });
}

// ─── Slide builders ────────────────────────────────────────────────────────

function buildCoverSlide(pptx: PptxGenJS, s: PresentationSlide, deckTitle: string, clientName: string, total: number) {
  const slide = pptx.addSlide();
  // Full dark background
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: B.slide_width_inches, h: B.slide_height_inches,
    fill: { color: B.primary_dark }, line: { color: B.primary_dark },
  });
  // Yellow left strip
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: 0.18, h: B.slide_height_inches,
    fill: { color: B.yellow }, line: { color: B.yellow },
  });
  // FLOW wordmark
  slide.addText('FLOW PRODUCTIONS', {
    x: 0.5, y: 0.5, w: 6, h: 0.5,
    fontSize: 11, bold: true, color: B.white,
    fontFace: B.font_title, charSpacing: 4,
  });
  // Client name label
  slide.addText(clientName.toUpperCase(), {
    x: 0.5, y: 1.5, w: 10, h: 0.45,
    fontSize: 13, color: B.yellow,
    fontFace: B.font_body, charSpacing: 2,
  });
  // Deck headline
  slide.addText(s.headline || deckTitle, {
    x: 0.5, y: 2.1, w: 10, h: 2.4,
    fontSize: 38, bold: true, color: B.white,
    fontFace: B.font_title,
    breakLine: true, valign: 'top',
  });
  // Subtitle — use first bullet point if available
  const subtitle = Array.isArray(s.bullet_points) && s.bullet_points[0] ? s.bullet_points[0] : '';
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 5.0, w: 9, h: 0.9,
      fontSize: 15, color: 'c4bfef',
      fontFace: B.font_body,
    });
  }
  addFooter(slide, 1, total);
}

function buildSectionDivider(pptx: PptxGenJS, s: PresentationSlide, idx: number, total: number) {
  const slide = pptx.addSlide();
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: B.slide_width_inches, h: B.slide_height_inches,
    fill: { color: B.primary }, line: { color: B.primary },
  });
  addYellowAccent(slide);
  slide.addText(s.slide_title.toUpperCase(), {
    x: 0.5, y: 2.8, w: 11, h: 1.8,
    fontSize: 40, bold: true, color: B.white,
    fontFace: B.font_title, valign: 'middle',
  });
  if (s.headline) {
    slide.addText(s.headline, {
      x: 0.5, y: 5.0, w: 10, h: 0.8,
      fontSize: 16, color: 'c4bfef', fontFace: B.font_body,
    });
  }
  addFooter(slide, idx, total);
}

function buildContentSlide(pptx: PptxGenJS, s: PresentationSlide, idx: number, total: number) {
  const slide = pptx.addSlide();
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: B.slide_width_inches, h: B.slide_height_inches,
    fill: { color: B.white }, line: { color: B.white },
  });
  addYellowAccent(slide);

  // Purple header bar
  slide.addShape('rect' as any, {
    x: 0.3, y: 0, w: B.slide_width_inches - 0.3, h: 1.15,
    fill: { color: B.primary }, line: { color: B.primary },
  });
  slide.addText(s.slide_title, {
    x: 0.5, y: 0.1, w: 11.5, h: 0.95,
    fontSize: 22, bold: true, color: B.white,
    fontFace: B.font_title, valign: 'middle',
  });

  if (s.headline) {
    slide.addText(s.headline, {
      x: 0.5, y: 1.25, w: 11.5, h: 0.7,
      fontSize: 17, bold: true, color: B.primary,
      fontFace: B.font_title, italic: true,
    });
  }

  const contentY = s.headline ? 2.1 : 1.3;
  const bullets = Array.isArray(s.bullet_points) ? s.bullet_points : [];

  bullets.slice(0, 6).forEach((pt, i) => {
    slide.addText([
      { text: '▸  ', options: { color: B.primary, bold: true } },
      { text: pt, options: { color: B.black } },
    ], {
      x: 0.55, y: contentY + i * 0.58, w: 11.5, h: 0.54,
      fontSize: 13, fontFace: B.font_body,
    });
  });

  addFooter(slide, idx, total);
}

function buildCtaSlide(pptx: PptxGenJS, s: PresentationSlide, idx: number, total: number) {
  const slide = pptx.addSlide();
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: B.slide_width_inches, h: B.slide_height_inches,
    fill: { color: B.primary_dark }, line: { color: B.primary_dark },
  });
  addYellowAccent(slide);
  slide.addText(s.slide_title, {
    x: 0.5, y: 1.5, w: 11.5, h: 0.7,
    fontSize: 20, color: B.yellow, fontFace: B.font_body, charSpacing: 2,
  });
  slide.addText(s.headline || s.slide_title, {
    x: 0.5, y: 2.4, w: 11.5, h: 1.8,
    fontSize: 36, bold: true, color: B.white,
    fontFace: B.font_title, breakLine: true,
  });
  const bullets = Array.isArray(s.bullet_points) ? s.bullet_points : [];
  bullets.slice(0, 5).forEach((pt, i) => {
    slide.addText([
      { text: '\u2022  ', options: { color: B.yellow, bold: true } },
      { text: pt, options: { color: B.white } },
    ], {
      x: 0.6, y: 4.5 + i * 0.52, w: 11, h: 0.5,
      fontSize: 14, fontFace: B.font_body,
    });
  });
  addFooter(slide, idx, total);
}

// ─── Matrix Slide Helpers ───────────────────────────────────────────────────

/** Convert any field (string, string[], or unknown) to a display string. */
function fieldToLines(val: unknown, maxLines = 5): string {
  if (!val) return '—';
  if (Array.isArray(val)) {
    return val
      .slice(0, maxLines)
      .map((v) => `• ${String(v)}`)
      .join('\n');
  }
  if (typeof val === 'object') return JSON.stringify(val).slice(0, 300);
  return String(val).slice(0, 400);
}

function addMatrixHeader(
  slide: PptxGenJS.Slide,
  title: string,
  subtitle: string,
  clientName: string
) {
  // Dark header bar
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: B.slide_width_inches, h: 1.1,
    fill: { color: B.primary_dark }, line: { color: B.primary_dark },
  });
  // Yellow left strip
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: 0.18, h: B.slide_height_inches,
    fill: { color: B.yellow }, line: { color: B.yellow },
  });
  slide.addText(title, {
    x: 0.35, y: 0.1, w: 8, h: 0.5,
    fontSize: 22, bold: true, color: B.white, fontFace: B.font_title,
  });
  slide.addText(`${clientName}  ·  ${subtitle}`, {
    x: 0.35, y: 0.6, w: 12, h: 0.4,
    fontSize: 11, color: B.yellow, fontFace: B.font_body, charSpacing: 1,
  });
}

function addCell(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number, h: number,
  label: string, labelColor: string, bgColor: string,
  content: string
) {
  slide.addShape('rect' as any, { x, y, w, h, fill: { color: bgColor }, line: { color: 'e0e0e0' } });
  slide.addText(label, {
    x: x + 0.08, y: y + 0.06, w: w - 0.16, h: 0.32,
    fontSize: 10, bold: true, color: labelColor, fontFace: B.font_title,
    charSpacing: 1,
  });
  slide.addText(content, {
    x: x + 0.1, y: y + 0.42, w: w - 0.2, h: h - 0.52,
    fontSize: 10, color: B.black, fontFace: B.font_body,
    valign: 'top', breakLine: true,
  });
}

// ─── SWOT Matrix Slide ─────────────────────────────────────────────────────

function buildSwotSlide(
  pptx: PptxGenJS,
  swot: SwotData,
  clientName: string,
  idx: number,
  total: number
) {
  const slide = pptx.addSlide();
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: B.slide_width_inches, h: B.slide_height_inches,
    fill: { color: 'f8f8f8' }, line: { color: 'f8f8f8' },
  });

  addMatrixHeader(slide, 'SWOT Analysis', 'Strengths · Weaknesses · Opportunities · Threats', clientName);

  // 2×2 grid — each cell ~6.4 w × 2.9 h
  const gx = 0.25, gy = 1.2, cw = 6.28, ch = 2.75, gap = 0.08;

  addCell(slide, gx, gy, cw, ch,
    'STRENGTHS', '2e7d32', 'e8f5e9', fieldToLines(swot?.strengths));
  addCell(slide, gx + cw + gap, gy, cw, ch,
    'WEAKNESSES', 'c62828', 'ffebee', fieldToLines(swot?.weaknesses));
  addCell(slide, gx, gy + ch + gap, cw, ch,
    'OPPORTUNITIES', 'f57f17', 'fffde7', fieldToLines(swot?.opportunities));
  addCell(slide, gx + cw + gap, gy + ch + gap, cw, ch,
    'THREATS', '424242', 'f5f5f5', fieldToLines(swot?.threats));

  addFooter(slide, idx, total);
}

// ─── Lean Canvas Slide ─────────────────────────────────────────────────────

function buildLeanCanvasSlide(
  pptx: PptxGenJS,
  lc: LeanCanvasData,
  clientName: string,
  idx: number,
  total: number
) {
  const slide = pptx.addSlide();
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: B.slide_width_inches, h: B.slide_height_inches,
    fill: { color: 'f8f8f8' }, line: { color: 'f8f8f8' },
  });

  addMatrixHeader(slide, 'Lean Canvas', 'Business Model Overview', clientName);

  // Grid layout — 5 columns × 2 rows + 1 bottom strip
  // Slide usable: x 0.22 → 13.1 (12.88 wide), y 1.18 → 6.9 (5.72 tall)
  const mx = 0.22, my = 1.18;
  const cw = 2.5, ch_top = 2.55, ch_mid = 1.55, ch_bot = 1.1, gap = 0.07;

  // UVP spans top + mid rows on col 3
  const uvpH = ch_top + ch_mid + gap;

  // Top row: Problem | Solution | UVP (span) | Unfair Advantage | Customer Segments
  addCell(slide, mx,                      my,          cw, ch_top, 'PROBLEM',              B.primary,  'ede7f6', fieldToLines(lc?.problem, 4));
  addCell(slide, mx + (cw+gap),           my,          cw, ch_top, 'SOLUTION',             B.primary,  'e8eaf6', fieldToLines(lc?.solution, 4));
  addCell(slide, mx + 2*(cw+gap),         my,          cw, uvpH,  'UNIQUE VALUE PROP.',   'ffffff',   B.primary, fieldToLines(lc?.unique_value_proposition, 5));
  addCell(slide, mx + 3*(cw+gap),         my,          cw, ch_top, 'UNFAIR ADVANTAGE',    '4a148c',   'f3e5f5', fieldToLines(lc?.unfair_advantage, 4));
  addCell(slide, mx + 4*(cw+gap),         my,          cw, ch_top, 'CUSTOMER SEGMENTS',   B.primary,  'e8f5e9', fieldToLines(lc?.customer_segments, 4));

  // Middle row: Key Metrics | Channels | (UVP continues) | | 
  addCell(slide, mx,                      my + ch_top + gap, cw, ch_mid, 'KEY METRICS',  '1565c0',   'e3f2fd', fieldToLines(lc?.key_metrics, 3));
  addCell(slide, mx + (cw+gap),           my + ch_top + gap, cw, ch_mid, 'CHANNELS',    '00695c',   'e0f2f1', fieldToLines(lc?.channels, 3));
  // Skip col 3 — UVP covers it
  addCell(slide, mx + 3*(cw+gap),         my + ch_top + gap, cw, ch_mid, 'CONT. SEGMENTS', B.primary, 'e8f5e9', '');
  addCell(slide, mx + 4*(cw+gap),         my + ch_top + gap, cw, ch_mid, 'CONT. ADVANTAGE', '4a148c', 'f3e5f5', '');

  // Bottom strip: Cost Structure | Revenue Streams
  const botY = my + ch_top + gap + ch_mid + gap;
  const halfW = (5 * cw + 4 * gap - gap) / 2;
  addCell(slide, mx,            botY, halfW, ch_bot, 'COST STRUCTURE',   'b71c1c', 'ffebee', fieldToLines(lc?.cost_structure, 2));
  addCell(slide, mx + halfW + gap, botY, halfW, ch_bot, 'REVENUE STREAMS', '1b5e20', 'e8f5e9', fieldToLines(lc?.revenue_streams, 2));

  addFooter(slide, idx, total);
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function renderPptxFromSlides(
  slides: PresentationSlide[],
  deckTitle: string,
  clientName: string,
  researchPack?: { swot?: SwotData; lean_canvas?: LeanCanvasData }
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = deckTitle;
  pptx.author = 'Flow Productions';
  pptx.subject = `Strategic Presentation — ${clientName}`;

  // Build the ordered slide sequence:
  // 1  Cover              (Gemini slide 1)
  // 2  What We Heard      (Gemini slide 2)
  // 3  SWOT Matrix        (data-driven — always inserted here)
  // 4  Market Opportunity (Gemini slide 3)
  // 5  Competitors        (Gemini slide 4)
  // 6  Lean Canvas        (data-driven — always inserted here)
  // 7  ICP                (Gemini slide 5)
  // 8  Strategic Position (Gemini slide 6)
  // 9  Content & Channel  (Gemini slide 7)
  // 10 Next Steps / CTA   (Gemini slide 8)

  const total = slides.length + (researchPack ? 2 : 0); // +2 for matrix slides

  // Slides rendered in order so footer numbers are accurate
  let globalIdx = 0;

  const renderNarrative = (s: PresentationSlide, isFirst: boolean, isLast: boolean) => {
    globalIdx++;
    if (isFirst) {
      buildCoverSlide(pptx, s, deckTitle, clientName, total);
    } else if (isLast) {
      buildCtaSlide(pptx, s, globalIdx, total);
    } else {
      buildContentSlide(pptx, s, globalIdx, total);
    }
  };

  // Slide 1: Cover
  if (slides[0]) renderNarrative(slides[0], true, false);

  // Slide 2: What We Heard
  if (slides[1]) renderNarrative(slides[1], false, false);

  // Slide 3: SWOT (data-driven)
  if (researchPack?.swot) {
    globalIdx++;
    buildSwotSlide(pptx, researchPack.swot, clientName, globalIdx, total);
  }

  // Slides 3-5 from Gemini (Market Opportunity, Competitors, ICP)
  for (let i = 2; i <= 4 && i < slides.length; i++) {
    renderNarrative(slides[i], false, false);
  }

  // Lean Canvas (data-driven)
  if (researchPack?.lean_canvas) {
    globalIdx++;
    buildLeanCanvasSlide(pptx, researchPack.lean_canvas, clientName, globalIdx, total);
  }

  // Remaining Gemini slides (Strategic Position, Content & Channel, Next Steps)
  for (let i = 5; i < slides.length; i++) {
    const isLast = i === slides.length - 1;
    renderNarrative(slides[i], false, isLast);
  }

  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as unknown as Buffer;
  return buffer;
}

import PptxGenJS from 'pptxgenjs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { PresentationSlide } from './gemini';
import { FLOW_BRAND } from './brand';

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

// ─── Public API ────────────────────────────────────────────────────────────

export async function renderPptxFromSlides(
  slides: PresentationSlide[],
  deckTitle: string,
  clientName: string
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = deckTitle;
  pptx.author = 'Flow Productions';
  pptx.subject = `Strategic Presentation — ${clientName}`;

  const total = slides.length;

  // Template-driven layout — Gemini writes copy, pptxgenjs decides visual treatment.
  // Slide 1 = Cover, Slide 8 (or last) = CTA, midpoint = section break, all others = content.
  const lastIdx = total;

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const num = s.slide_number ?? i + 1;

    if (num === 1) {
      buildCoverSlide(pptx, s, deckTitle, clientName, total);
    } else if (num === lastIdx) {
      buildCtaSlide(pptx, s, num, total);
    } else if (num === Math.ceil(total / 2)) {
      // Mid-deck section break adds visual rhythm
      buildSectionDivider(pptx, s, num, total);
    } else {
      buildContentSlide(pptx, s, num, total);
    }
  }

  // pptxgenjs write() with 'nodebuffer' returns a Buffer
  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as unknown as Buffer;
  return buffer;
}

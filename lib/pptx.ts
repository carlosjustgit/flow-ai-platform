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
  // Body / subtitle
  if (s.body_text) {
    slide.addText(s.body_text, {
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
  if (s.body_text) {
    slide.addText(s.body_text, {
      x: 0.5, y: 5.0, w: 10, h: 0.8,
      fontSize: 16, color: 'c4bfef', fontFace: B.font_body,
    });
  }
  addFooter(slide, idx, total);
}

function buildContentSlide(pptx: PptxGenJS, s: PresentationSlide, idx: number, total: number) {
  const slide = pptx.addSlide();
  // White background
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
  // Slide title in header
  slide.addText(s.slide_title, {
    x: 0.5, y: 0.1, w: 11.5, h: 0.95,
    fontSize: 22, bold: true, color: B.white,
    fontFace: B.font_title, valign: 'middle',
  });

  // Headline
  if (s.headline) {
    slide.addText(s.headline, {
      x: 0.5, y: 1.25, w: 11.5, h: 0.7,
      fontSize: 17, bold: true, color: B.primary,
      fontFace: B.font_title, italic: true,
    });
  }

  const hasPoints = s.bullet_points?.length > 0;
  const hasBody = !!s.body_text;
  const contentY = s.headline ? 2.1 : 1.3;

  if (hasPoints) {
    const rows = s.bullet_points.slice(0, 8).map((pt) => [
      { text: '▸ ', options: { color: B.primary, bold: true, fontSize: 13 } },
      { text: pt, options: { color: B.black, fontSize: 13 } },
    ]);
    s.bullet_points.slice(0, 8).forEach((pt, i) => {
      slide.addText([
        { text: '▸  ', options: { color: B.primary, bold: true } },
        { text: pt, options: { color: B.black } },
      ], {
        x: 0.55, y: contentY + i * 0.55, w: 11.5, h: 0.52,
        fontSize: 13, fontFace: B.font_body,
      });
    });
  } else if (hasBody) {
    slide.addText(s.body_text, {
      x: 0.55, y: contentY, w: 11.5, h: 4.5,
      fontSize: 14, color: B.black,
      fontFace: B.font_body, valign: 'top',
      breakLine: true,
    });
  }

  addFooter(slide, idx, total);
}

function buildQuoteSlide(pptx: PptxGenJS, s: PresentationSlide, idx: number, total: number) {
  const slide = pptx.addSlide();
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: B.slide_width_inches, h: B.slide_height_inches,
    fill: { color: B.grey_light }, line: { color: B.grey_light },
  });
  addYellowAccent(slide);
  // Opening quote mark
  slide.addText('\u201C', {
    x: 0.5, y: 0.8, w: 2, h: 2,
    fontSize: 96, color: B.primary, fontFace: B.font_title, bold: true,
  });
  slide.addText(s.headline || s.body_text, {
    x: 0.7, y: 1.8, w: 11, h: 3.2,
    fontSize: 26, bold: true, color: B.black,
    fontFace: B.font_title, valign: 'middle',
    breakLine: true,
  });
  if (s.body_text && s.headline) {
    slide.addText(`\u2014 ${s.body_text}`, {
      x: 0.7, y: 5.5, w: 11, h: 0.55,
      fontSize: 13, color: B.text_muted, fontFace: B.font_body, italic: true,
    });
  }
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
  s.bullet_points?.slice(0, 5).forEach((pt, i) => {
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

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const idx = i + 1;

    switch (s.slide_type) {
      case 'cover':
        buildCoverSlide(pptx, s, deckTitle, clientName, total);
        break;
      case 'section':
        buildSectionDivider(pptx, s, idx, total);
        break;
      case 'quote':
        buildQuoteSlide(pptx, s, idx, total);
        break;
      case 'cta':
        buildCtaSlide(pptx, s, idx, total);
        break;
      default:
        buildContentSlide(pptx, s, idx, total);
    }
  }

  // pptxgenjs write() with 'nodebuffer' returns a Buffer
  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as unknown as Buffer;
  return buffer;
}

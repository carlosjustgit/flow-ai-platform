/**
 * Flow Productions brand constants.
 *
 * This is the single file to update when brand guidelines change.
 * Update values here and every future presentation will use the new brand.
 *
 * Colours use hex WITHOUT the leading #, as pptxgenjs expects.
 */
export const FLOW_BRAND = {
  // Core palette
  primary: '5b54a1',        // Flow purple — CTA, accents, headings
  primary_dark: '3e3880',   // Darker purple for cover slide backgrounds
  yellow: 'ffcc00',         // Highlight only — tags, micro-accents
  grey_light: 'ededed',     // Slide backgrounds, dividers
  white: 'ffffff',          // Text on dark, clean backgrounds
  black: '141414',          // Charcoal — body text on light backgrounds
  text_muted: '6b7280',     // Footnotes, captions, metadata

  // Slide dimensions (widescreen 16:9 inches)
  slide_width_inches: 13.33,
  slide_height_inches: 7.5,

  // Typography — system fonts, no install required
  font_title: 'Calibri',
  font_body: 'Calibri',

  // Logo — update logo_path if filename changes
  logo_path: 'public/logo.png',
  logo_width_inches: 1.4,
  logo_height_inches: 0.45,
} as const;

export type FlowBrand = typeof FLOW_BRAND;

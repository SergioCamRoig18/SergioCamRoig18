export const COLORS = {
  bgTop: '#15181D',
  bgMid: '#1C2028',
  bgBottom: '#13161B',
  boxFill: 'rgba(46, 52, 60, 0.76)',
  boxBorder: 'rgba(255, 255, 255, 0.20)',
  lockedFill: 'rgba(34, 39, 46, 0.62)',
  lockedBorder: 'rgba(255, 255, 255, 0.12)',
  yellow: '#F5D042',
  coral: '#E05A47',
  green: '#4ADE80',
  text: '#EEF1F5',
  secondary: '#C7D0DB',
  muted: '#9AA4B2',
  dim: '#6E7785',
  barTrack: 'rgba(0, 0, 0, 0.42)',
  barFill: '#D8DEE6',
} as const;

export const HUD_FONT = `'Bahnschrift SemiCondensed', 'Segoe UI', 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif`;

export function esc(value: string | number): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function truncate(text: string, maxChars: number): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

export function wrapLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      if (lines.length === maxLines) {
        lines[maxLines - 1] = truncate(lines[maxLines - 1], maxCharsPerLine);
        return lines;
      }
      current = word.length > maxCharsPerLine ? truncate(word, maxCharsPerLine) : word;
    }
  }
  if (current) {
    if (lines.length < maxLines) lines.push(current);
  }
  return lines;
}

export function sectionHeader(
  title: string,
  x: number,
  y: number,
  width: number,
  rightLabel = '',
  rightColor: string = COLORS.muted,
): string {
  const rule = `<line x1="${x}" y1="${y}" x2="${x + width}" y2="${y}" stroke="rgba(255,255,255,0.52)" stroke-width="1"/>`;
  const dot = `<rect x="${x}" y="${y + 9}" width="3.5" height="3.5" fill="#FFFFFF"/>`;
  const heading = `<text x="${x + 8}" y="${y + 15}" class="sec-title">${esc(title.toUpperCase())}</text>`;
  const right = rightLabel
    ? `<text x="${x + width}" y="${y + 14}" text-anchor="end" class="meta" fill="${rightColor}">${esc(rightLabel.toUpperCase())}</text>`
    : '';
  return `${rule}${dot}${heading}${right}`;
}

export function lockIcon(x: number, y: number, color = 'rgba(255,255,255,0.42)'): string {
  return `<g transform="translate(${x} ${y}) scale(0.55)" fill="${color}">
    <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 5a3 3 0 0 1 6 0v3H9V7z"/>
  </g>`;
}

export function starIcon(x: number, y: number, color: string = COLORS.yellow): string {
  return `<g transform="translate(${x} ${y}) scale(0.45)" fill="${color}">
    <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"/>
  </g>`;
}

export interface SvgShellOptions {
  width: number;
  height: number;
  title: string;
  desc: string;
  extraDefs?: string;
  extraCss?: string;
  body: string;
}

export function svgShell(opts: SvgShellOptions): string {
  const { width, height, title, desc, extraDefs = '', extraCss = '', body } = opts;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-labelledby="title desc">
<title id="title">${esc(title)}</title>
<desc id="desc">${esc(desc)}</desc>
<defs>
  <linearGradient id="aw-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="${COLORS.bgTop}"/>
    <stop offset="55%" stop-color="${COLORS.bgMid}"/>
    <stop offset="100%" stop-color="${COLORS.bgBottom}"/>
  </linearGradient>
  <radialGradient id="aw-glow-left" cx="20%" cy="25%" r="55%">
    <stop offset="0%" stop-color="rgba(82, 96, 114, 0.28)"/>
    <stop offset="100%" stop-color="rgba(82, 96, 114, 0)"/>
  </radialGradient>
  <radialGradient id="aw-glow-amber" cx="82%" cy="72%" r="48%">
    <stop offset="0%" stop-color="rgba(180, 142, 54, 0.13)"/>
    <stop offset="100%" stop-color="rgba(180, 142, 54, 0)"/>
  </radialGradient>
  <linearGradient id="aw-active-grad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="rgba(245, 208, 66, 0.18)"/>
    <stop offset="100%" stop-color="rgba(46, 52, 60, 0.80)"/>
  </linearGradient>
  <linearGradient id="aw-banner-grad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="rgba(28, 32, 38, 0.92)"/>
    <stop offset="65%" stop-color="rgba(72, 85, 104, 0.34)"/>
    <stop offset="100%" stop-color="rgba(217, 119, 36, 0.28)"/>
  </linearGradient>
  <pattern id="aw-crosshairs" width="56" height="56" patternUnits="userSpaceOnUse">
    <path d="M28 24v8M24 28h8" stroke="rgba(255,255,255,0.13)" stroke-width="1"/>
  </pattern>
  <pattern id="coral-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="6" height="6" fill="rgba(224, 90, 71, 0.18)"/>
    <line x1="0" y1="0" x2="0" y2="6" stroke="${COLORS.coral}" stroke-width="2"/>
  </pattern>
  ${extraDefs}
</defs>
<style>
  text { font-family: ${HUD_FONT}; fill: ${COLORS.text}; }
  .sec-title { font-size: 13px; font-weight: 400; letter-spacing: 0.08em; fill: #FFFFFF; }
  .lbl { font-size: 10.5px; font-weight: 500; letter-spacing: 0.05em; }
  .val { font-size: 13px; font-weight: 600; letter-spacing: 0.03em; }
  .stat-num { font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; fill: #FFFFFF; }
  .meta { font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em; font-variant-numeric: tabular-nums; }
  .fade { animation: awFade 0.42s ease-out both; }
  .grow { transform-box: fill-box; transform-origin: left center; animation: awGrow 0.75s cubic-bezier(.2,.7,.2,1) 0.15s both; }
  @keyframes awFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes awGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  ${extraCss}
</style>
<rect width="${width}" height="${height}" fill="url(#aw-bg-grad)"/>
<rect width="${width}" height="${height}" fill="url(#aw-glow-left)"/>
<rect width="${width}" height="${height}" fill="url(#aw-glow-amber)"/>
<rect width="${width}" height="${height}" fill="url(#aw-crosshairs)"/>
<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" stroke="rgba(255,255,255,0.22)" stroke-width="1"/>
${body}
</svg>
`;
}

export function fadeGroup(delayMs: number, content: string): string {
  return `<g class="fade" style="animation-delay: ${delayMs}ms">${content}</g>`;
}

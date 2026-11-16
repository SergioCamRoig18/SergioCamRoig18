import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HUD_CONFIG } from '../config.ts';
import type { HudConfig, HudSnapshot, Lang, ProjectCardData } from '../types.ts';
import {
  COLORS,
  HUD_FONT,
  esc,
  fadeGroup,
  lockIcon,
  sectionHeader,
  starIcon,
  svgShell,
  truncate,
  wrapLines,
} from './theme.ts';

const I18N = {
  en: {
    profileSec: 'Profile Overview',
    memberSince: 'MEMBER SINCE',
    stats: ['COMMITS (12M)', 'REPOSITORIES', 'PULL REQUESTS', 'ACTIVE DAYS', 'BEST STREAK', 'TOTAL STARS'],
    langsSec: 'Most Used Languages',
    langsDelta: '30D DELTA',
    langsEmpty: 'Awaiting public repository code telemetry',
    weeklySec: 'Weekly Rhythm',
    peak: 'PEAK',
    noActivity: 'NO ACTIVITY',
    days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    stackSec: 'Tech Stack & Tools',
    stackSub: 'SOFTWARE ENGINEERING',
    projSec: 'Featured Projects',
    activeLbl: 'ACTIVE',
    slotsLbl: 'OPEN SLOTS',
    publicRepos: 'Public Repos',
    syncLbl: 'Sync',
    notice1: 'Reserved slots unlock',
    notice2: 'automatically as new',
    notice3: 'repos are deployed.',
    commitsWord: 'Commits',
    updatedWord: 'Updated',
    slotReserved: (n: number) => `Slot ${String(n).padStart(2, '0')} // Reserved`,
    pageWord: 'PAGE',
    statusLbl: 'Status',
    lockedLbl: 'Locked',
    awaitingLbl: 'Awaiting deployment...',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    btnPortfolio: 'PORTFOLIO',
    btnLinkedin: 'LINKEDIN',
    btnGithub: 'GITHUB',
  },
  es: {
    profileSec: 'Perfil General',
    memberSince: 'MIEMBRO DESDE',
    stats: ['COMMITS (12M)', 'REPOSITORIOS', 'PULL REQUESTS', 'DÍAS ACTIVOS', 'MEJOR RACHA', 'ESTRELLAS'],
    langsSec: 'Lenguajes Más Usados',
    langsDelta: 'VARIACIÓN 30D',
    langsEmpty: 'Esperando telemetría de repositorios públicos',
    weeklySec: 'Ritmo Semanal',
    peak: 'PICO',
    noActivity: 'SIN ACTIVIDAD',
    days: ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'],
    stackSec: 'Stack Tecnológico',
    stackSub: 'INGENIERÍA DEL SOFTWARE',
    projSec: 'Proyectos',
    activeLbl: 'ACTIVOS',
    slotsLbl: 'HUECOS',
    publicRepos: 'Repos Públicos',
    syncLbl: 'Sincr.',
    notice1: 'Los huecos reservados',
    notice2: 'se desbloquean solos',
    notice3: 'al subir proyectos.',
    commitsWord: 'Commits',
    updatedWord: 'Act.',
    slotReserved: (n: number) => `Hueco ${String(n).padStart(2, '0')} // Reservado`,
    pageWord: 'PÁG.',
    statusLbl: 'Estado',
    lockedLbl: 'Bloqueado',
    awaitingLbl: 'Esperando despliegue...',
    months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    btnPortfolio: 'PORTFOLIO',
    btnLinkedin: 'LINKEDIN',
    btnGithub: 'GITHUB',
  },
} as const;

function formatMonthYear(iso: string, lang: Lang): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const m = I18N[lang].months[d.getUTCMonth()];
  return `${m} ${d.getUTCFullYear()}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function renderProfileSvg(snapshot: HudSnapshot, lang: Lang, config: HudConfig = HUD_CONFIG): string {
  const t = I18N[lang];
  const parts: string[] = [];

  // Left column: Profile Overview (x=20, w=302)
  parts.push(sectionHeader(t.profileSec, 20, 18, 302));

  config.profileCards.forEach((card, idx) => {
    const y = 42 + idx * 43;
    const isActive = Boolean(card.active);
    const fill = isActive ? 'url(#aw-active-grad)' : COLORS.boxFill;
    const stroke = isActive ? COLORS.yellow : COLORS.boxBorder;
    const sw = isActive ? 1.5 : 1;
    const valColor = isActive ? COLORS.yellow : COLORS.text;
    const box = `
      <rect x="20" y="${y}" width="302" height="38" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <text x="30" y="${y + 14}" class="lbl" fill="${COLORS.muted}">${esc(card.label[lang].toUpperCase())}</text>
      <text x="30" y="${y + 30}" class="val" fill="${valColor}">${esc(card.value[lang])}</text>
    `;
    parts.push(fadeGroup(60 + idx * 60, box));
  });

  // Right column: Banner + 6 clean stats (x=338, w=442)
  const banner = `
    <rect x="338" y="18" width="442" height="58" fill="url(#aw-banner-grad)" stroke="${COLORS.boxBorder}" stroke-width="1"/>
    <rect x="350" y="29" width="36" height="36" fill="rgba(255,255,255,0.92)"/>
    <text x="368" y="52" text-anchor="middle" font-size="14" font-weight="700" fill="#14171C">${esc(config.shortTag)}</text>
    <text x="398" y="44" font-size="17" font-weight="600" letter-spacing="0.04em" fill="#FFFFFF">${esc(snapshot.user.login)}</text>
    <text x="398" y="61" font-size="11.5" fill="${COLORS.secondary}">${esc(config.subtitle[lang])}</text>
    <text x="766" y="40" text-anchor="end" class="lbl" fill="${COLORS.muted}">${t.memberSince}</text>
    <text x="766" y="59" text-anchor="end" font-size="15" font-weight="700" fill="${COLORS.yellow}">${snapshot.metrics.memberSince}</text>
  `;
  parts.push(fadeGroup(80, banner));

  const m = snapshot.metrics;
  const statValues = [
    formatNumber(m.commits12m),
    formatNumber(m.repositories),
    formatNumber(m.pullRequests),
    `${m.activeDaysPercent}%`,
    `${m.bestStreakDays}D`,
    formatNumber(m.totalStars),
  ];

  const cardW = 142;
  const cardH = 59;
  const gapX = 8;
  const gapY = 8;

  statValues.forEach((val, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 338 + col * (cardW + gapX);
    const y = 86 + row * (cardH + gapY);
    const box = `
      <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" fill="${COLORS.boxFill}" stroke="${COLORS.boxBorder}" stroke-width="1"/>
      <text x="${x + 11}" y="${y + 18}" class="lbl" fill="${COLORS.muted}">${esc(t.stats[i])}</text>
      <text x="${x + 11}" y="${y + 46}" class="stat-num">${esc(val)}</text>
    `;
    parts.push(fadeGroup(140 + i * 50, box));
  });

  return svgShell({
    width: 800,
    height: 230,
    title: `${snapshot.user.login} — ${t.profileSec}`,
    desc: `${config.profileCards[0].value[lang]} · ${statValues[0]} commits`,
    body: parts.join('\n'),
  });
}

export function renderLanguagesSvg(snapshot: HudSnapshot, lang: Lang): string {
  const t = I18N[lang];
  const parts: string[] = [];
  parts.push(sectionHeader(t.langsSec, 18, 18, 364, t.langsDelta, COLORS.muted));

  if (snapshot.languages.length === 0) {
    parts.push(
      fadeGroup(
        100,
        `
      <rect x="18" y="44" width="364" height="148" fill="${COLORS.lockedFill}" stroke="${COLORS.lockedBorder}" stroke-width="1"/>
      <text x="200" y="112" text-anchor="middle" font-size="13" fill="${COLORS.secondary}">${esc(t.langsEmpty)}</text>
      <text x="200" y="132" text-anchor="middle" class="lbl" fill="${COLORS.muted}">0% — 100%</text>
    `,
      ),
    );
  } else {
    const trackX = 36;
    const trackW = 304;

    snapshot.languages.slice(0, 4).forEach((l, idx) => {
      const y = 42 + idx * 39;
      const pct = Math.max(0, Math.min(100, l.percent));
      const d = l.delta30d;

      let deltaText = '= 0.0%';
      let deltaColor: string = COLORS.muted;
      if (d > 0) {
        deltaText = `▲ +${d.toFixed(1)}%`;
        deltaColor = COLORS.yellow;
      } else if (d < 0) {
        deltaText = `▼ ${d.toFixed(1)}%`;
        deltaColor = COLORS.coral;
      }

      // Compute pixel widths inside trackW (1px padding inside track)
      const innerW = trackW - 2;
      let barsSvg = '';
      if (d > 0) {
        const gainPx = Math.max(4, Math.round((Math.min(pct, d) / 100) * innerW));
        const totalPx = Math.max(gainPx, Math.round((pct / 100) * innerW));
        const basePx = Math.max(0, totalPx - gainPx);
        if (basePx > 0) {
          barsSvg += `<rect x="${trackX + 1}" y="${y + 21}" width="${basePx}" height="6" fill="${COLORS.barFill}" class="grow"/>`;
        }
        barsSvg += `<rect x="${trackX + 1 + basePx}" y="${y + 21}" width="${gainPx}" height="6" fill="${COLORS.yellow}" class="grow"/>`;
      } else if (d < 0) {
        const basePx = Math.round((pct / 100) * innerW);
        const dropPx = Math.min(
          innerW - basePx,
          Math.max(4, Math.round((Math.abs(d) / 100) * innerW)),
        );
        if (basePx > 0) {
          barsSvg += `<rect x="${trackX + 1}" y="${y + 21}" width="${basePx}" height="6" fill="${COLORS.barFill}" class="grow"/>`;
        }
        if (dropPx > 0) {
          barsSvg += `<rect x="${trackX + 1 + basePx}" y="${y + 21}" width="${dropPx}" height="6" fill="url(#coral-hatch)" stroke="${COLORS.coral}" stroke-width="0.8"/>`;
        }
      } else {
        const basePx = pct > 0 ? Math.max(2, Math.round((pct / 100) * innerW)) : 0;
        if (basePx > 0) {
          barsSvg += `<rect x="${trackX + 1}" y="${y + 21}" width="${basePx}" height="6" fill="${COLORS.barFill}" class="grow"/>`;
        }
      }

      const row = `
        <rect x="18" y="${y}" width="364" height="34" fill="${COLORS.boxFill}" stroke="${COLORS.boxBorder}" stroke-width="1"/>
        <text x="28" y="${y + 14}" font-size="12" font-weight="600" letter-spacing="0.04em" fill="#FFFFFF">${esc(l.name.toUpperCase())}</text>
        <text x="326" y="${y + 14}" text-anchor="end" class="meta" fill="${deltaColor}">${esc(deltaText)}</text>
        <text x="372" y="${y + 14}" text-anchor="end" font-size="12" font-weight="700" fill="#FFFFFF">${pct.toFixed(1)}%</text>
        <text x="28" y="${y + 27}" font-size="10" fill="${COLORS.muted}">0</text>
        <rect x="${trackX}" y="${y + 20}" width="${trackW}" height="8" fill="${COLORS.barTrack}" stroke="rgba(255,255,255,0.22)" stroke-width="1"/>
        ${barsSvg}
        <text x="372" y="${y + 27}" text-anchor="end" font-size="10" fill="${COLORS.muted}">100</text>
      `;
      parts.push(fadeGroup(80 + idx * 70, row));
    });
  }

  return svgShell({
    width: 400,
    height: 210,
    title: t.langsSec,
    desc: snapshot.languages.map((l) => `${l.name} ${l.percent}%`).join(', ') || t.langsEmpty,
    body: parts.join('\n'),
  });
}

export function renderWeeklySvg(snapshot: HudSnapshot, lang: Lang): string {
  const t = I18N[lang];
  const parts: string[] = [];

  const maxCount = Math.max(...snapshot.weekly.map((w) => w.count), 0);
  const peakEntry = snapshot.weekly.find((w) => w.isPeak);
  const peakLabel = peakEntry && maxCount > 0 ? `${t.peak}: ${t.days[peakEntry.dayIndex]}` : t.noActivity;
  const peakColor = peakEntry && maxCount > 0 ? COLORS.yellow : COLORS.muted;

  parts.push(sectionHeader(t.weeklySec, 18, 18, 364, peakLabel, peakColor));
  parts.push(
    `<rect x="18" y="42" width="364" height="151" fill="${COLORS.boxFill}" stroke="${COLORS.boxBorder}" stroke-width="1"/>`,
  );

  const trackX = 68;
  const trackW = 262;
  const innerW = trackW - 2;

  snapshot.weekly.forEach((w, idx) => {
    const y = 52 + idx * 20;
    const ratio = maxCount > 0 ? w.count / maxCount : 0;
    const barPx = w.count > 0 ? Math.max(4, Math.round(ratio * innerW)) : 0;
    const labelColor = w.isPeak ? COLORS.yellow : COLORS.muted;
    const countColor = w.isPeak ? COLORS.yellow : COLORS.text;
    const trackStroke = w.isPeak ? COLORS.yellow : 'rgba(255,255,255,0.20)';
    // Option 1: Entire peak day bar filled in solid #F5D042; other days white #D8DEE6
    const barFill = w.isPeak ? COLORS.yellow : COLORS.barFill;
    const weight = w.isPeak ? '700' : '500';

    const row = `
      <text x="28" y="${y + 11}" font-size="11.5" font-weight="${weight}" letter-spacing="0.05em" fill="${labelColor}">${t.days[w.dayIndex]}</text>
      <rect x="${trackX}" y="${y + 3}" width="${trackW}" height="9" fill="${COLORS.barTrack}" stroke="${trackStroke}" stroke-width="1"/>
      ${barPx > 0 ? `<rect x="${trackX + 1}" y="${y + 4}" width="${barPx}" height="7" fill="${barFill}" class="grow"/>` : ''}
      <text x="370" y="${y + 11}" text-anchor="end" font-size="11.5" font-weight="${weight}" fill="${countColor}">${w.count}</text>
    `;
    parts.push(fadeGroup(60 + idx * 45, row));
  });

  return svgShell({
    width: 400,
    height: 210,
    title: t.weeklySec,
    desc: peakLabel,
    body: parts.join('\n'),
  });
}

export function renderStackSvg(lang: Lang, config: HudConfig = HUD_CONFIG): string {
  const t = I18N[lang];
  const parts: string[] = [];
  parts.push(sectionHeader(t.stackSec, 20, 16, 760, t.stackSub, COLORS.muted));

  const cardW = 184;
  const gap = 8;

  config.techStack.forEach((cat, idx) => {
    const x = 20 + idx * (cardW + gap);
    const y = 38;
    const isActive = Boolean(cat.active);
    const fill = isActive ? 'url(#aw-active-grad)' : COLORS.boxFill;
    const stroke = isActive ? COLORS.yellow : COLORS.boxBorder;
    const sw = isActive ? 1.5 : 1;
    const lblColor = isActive ? COLORS.yellow : COLORS.muted;

    // Wrap items gracefully onto 2 lines if long so nothing ever overflows the 184px card
    const lines = wrapLines(cat.items, 24, 2);
    const linesSvg =
      lines.length <= 1
        ? `<text x="${x + 10}" y="${y + 38}" font-size="12.5" font-weight="600" fill="#FFFFFF">${esc(lines[0] ?? '')}</text>`
        : `<text x="${x + 10}" y="${y + 33}" font-size="12" font-weight="600" fill="#FFFFFF">${esc(lines[0])}</text>
           <text x="${x + 10}" y="${y + 48}" font-size="12" font-weight="600" fill="#FFFFFF">${esc(lines[1])}</text>`;

    const box = `
      <rect x="${x}" y="${y}" width="${cardW}" height="58" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <text x="${x + 10}" y="${y + 15}" class="lbl" fill="${lblColor}">${esc(cat.label[lang].toUpperCase())}</text>
      ${linesSvg}
    `;
    parts.push(fadeGroup(60 + idx * 60, box));
  });

  return svgShell({
    width: 800,
    height: 112,
    title: t.stackSec,
    desc: config.techStack.map((c) => `${c.label[lang]}: ${c.items}`).join(' | '),
    body: parts.join('\n'),
  });
}

function renderProjectCard(
  card: ProjectCardData,
  x: number,
  y: number,
  w: number,
  h: number,
  highlight: boolean,
  lang: Lang,
): string {
  const t = I18N[lang];
  if (card.isLocked) {
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${COLORS.lockedFill}" stroke="${COLORS.lockedBorder}" stroke-width="1"/>
      <text x="${x + 10}" y="${y + 20}" font-size="12.5" font-weight="600" fill="rgba(255,255,255,0.48)">${esc(t.slotReserved(card.slotNumber))}</text>
      ${lockIcon(x + w - 22, y + 8)}
      <text x="${x + 10}" y="${y + 52}" font-size="11" fill="rgba(255,255,255,0.38)">${t.statusLbl}:</text>
      <text x="${x + w - 10}" y="${y + 52}" text-anchor="end" font-size="11" fill="rgba(255,255,255,0.45)">${t.lockedLbl}</text>
      <text x="${x + 10}" y="${y + 82}" font-size="11" fill="rgba(255,255,255,0.34)">${t.awaitingLbl}</text>
    `;
  }

  const fill = highlight ? 'url(#aw-active-grad)' : COLORS.boxFill;
  const stroke = highlight ? COLORS.yellow : COLORS.boxBorder;
  const sw = highlight ? 1.5 : 1;
  const titleColor = highlight ? COLORS.yellow : '#FFFFFF';
  const titleText = truncate(card.name, 19);

  const badgeSvg =
    card.stars > 0
      ? `${starIcon(x + w - 34, y + 10)}<text x="${x + w - 10}" y="${y + 20}" text-anchor="end" font-size="11.5" font-weight="700" fill="${COLORS.yellow}">${card.stars}</text>`
      : `<text x="${x + w - 10}" y="${y + 20}" text-anchor="end" font-size="11.5" font-weight="700" fill="${COLORS.yellow}">${String(card.slotNumber).padStart(2, '0')}</text>`;

  const descLines = wrapLines(card.description, 28, 2);
  const descSvg = descLines
    .map(
      (line, i) =>
        `<text x="${x + 10}" y="${y + 38 + i * 14}" font-size="11.5" fill="${COLORS.secondary}">${esc(line)}</text>`,
    )
    .join('');

  const metaLine = `${card.commits} ${t.commitsWord} · ${t.updatedWord} ${formatMonthYear(card.updatedAt, lang)}`;
  const tagsLine = card.tags.map((tg) => `+${tg}`).join('  ');

  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
    <text x="${x + 10}" y="${y + 20}" font-size="13" font-weight="600" fill="${titleColor}">${esc(titleText)}</text>
    ${badgeSvg}
    ${descSvg}
    <text x="${x + 10}" y="${y + 70}" font-size="10.5" fill="${COLORS.muted}">${esc(truncate(metaLine, 30))}</text>
    <text x="${x + 10}" y="${y + 87}" font-size="11" font-weight="600" fill="${COLORS.green}">${esc(truncate(tagsLine, 30))}</text>
  `;
}

export function renderProjectsSvg(snapshot: HudSnapshot, lang: Lang): string {
  const t = I18N[lang];
  const pages = snapshot.projectPages;
  const pageCount = pages.length;
  const totalSlotsOnView = pageCount * 6;
  const openSlots = Math.max(0, totalSlotsOnView - snapshot.activeProjectCount);

  const parts: string[] = [];

  // Left sidebar (x=20, w=174)
  parts.push(sectionHeader(t.projSec, 20, 18, 174));
  parts.push(
    fadeGroup(
      60,
      `
    <rect x="20" y="42" width="84" height="44" fill="${COLORS.boxFill}" stroke="${COLORS.boxBorder}" stroke-width="1"/>
    <text x="62" y="57" text-anchor="middle" class="lbl" fill="${COLORS.muted}">${t.activeLbl}</text>
    <text x="62" y="77" text-anchor="middle" font-size="17" font-weight="700" fill="#FFFFFF">${snapshot.activeProjectCount}</text>

    <rect x="110" y="42" width="84" height="44" fill="${COLORS.boxFill}" stroke="${COLORS.boxBorder}" stroke-width="1"/>
    <text x="152" y="57" text-anchor="middle" class="lbl" fill="${COLORS.muted}">${t.slotsLbl}</text>
    <text x="152" y="77" text-anchor="middle" font-size="17" font-weight="700" fill="${COLORS.yellow}">${openSlots}</text>
  `,
    ),
  );

  parts.push(
    fadeGroup(
      110,
      `
    <rect x="20" y="94" width="174" height="50" fill="${COLORS.boxFill}" stroke="${COLORS.boxBorder}" stroke-width="1"/>
    <text x="30" y="113" font-size="11.5" fill="${COLORS.muted}">${t.publicRepos}</text>
    <text x="184" y="113" text-anchor="end" font-size="12" font-weight="700" fill="#FFFFFF">${snapshot.publicRepoCount}</text>
    <text x="30" y="132" font-size="11.5" fill="${COLORS.muted}">${t.syncLbl}</text>
    <text x="184" y="132" text-anchor="end" font-size="11.5" font-weight="700" fill="${COLORS.green}">ACTIONS</text>
  `,
    ),
  );

  parts.push(
    fadeGroup(
      160,
      `
    <rect x="20" y="152" width="174" height="72" fill="${COLORS.boxFill}" stroke="${COLORS.boxBorder}" stroke-width="1"/>
    <rect x="30" y="164" width="16" height="16" fill="#FFFFFF"/>
    <text x="38" y="176" text-anchor="middle" font-size="12" font-weight="700" fill="#14171C">!</text>
    <text x="54" y="174" font-size="11" fill="${COLORS.secondary}">${esc(t.notice1)}</text>
    <text x="54" y="189" font-size="11" fill="${COLORS.secondary}">${esc(t.notice2)}</text>
    <text x="54" y="204" font-size="11" fill="${COLORS.secondary}">${esc(t.notice3)}</text>
  `,
    ),
  );

  // Right 3x2 grid (x=206, y=18, w=574, h=206)
  const gridX = 206;
  const gridY = 18;
  const cardW = 186;
  const cardH = 99;
  const colGap = 8;
  const rowGap = 8;
  const pageStrideY = 216;

  let extraCss = '';
  const pagesSvg = pages
    .map((page, pIdx) => {
      const offsetY = pIdx * pageStrideY;
      const cards = page
        .map((card, cIdx) => {
          const col = cIdx % 3;
          const row = Math.floor(cIdx / 3);
          const x = gridX + col * (cardW + colGap);
          const y = gridY + offsetY + row * (cardH + rowGap);
          return renderProjectCard(card, x, y, cardW, cardH, false, lang);
        })
        .join('');
      return `<g class="proj-page">${cards}</g>`;
    })
    .join('');

  const visibleSegments = Math.min(6, pageCount);
  const hasOverflowPages = pageCount > 6;
  const barW = 36;
  const barGap = 5;
  const segStartX = hasOverflowPages ? gridX + 14 : gridX;
  const segmentsWidth = visibleSegments * barW + Math.max(0, visibleSegments - 1) * barGap;

  if (pageCount > 1) {
    const hold = 5.5;
    const move = 0.6;
    const step = hold + move;
    const totalSec = pageCount * step;
    const pct = (sec: number) => `${((sec / totalSec) * 100).toFixed(2)}%`;

    const trackFrames = pages
      .map((_, i) => `${pct(i * step)}, ${pct(i * step + hold)} { transform: translateY(-${i * pageStrideY}px); }`)
      .concat('100% { transform: translateY(0); }')
      .join(' ');

    extraCss += `\n  .proj-track { animation: projScroll ${totalSec}s ease-in-out infinite; }\n  @keyframes projScroll { ${trackFrames} }`;

    const activeSegForPage = (j: number) => {
      if (pageCount <= 6) return j;
      const winStart = Math.min(Math.max(0, j - 2), pageCount - 6);
      return j - winStart;
    };

    // Sync visible pagination segments at bottom
    for (let i = 0; i < visibleSegments; i++) {
      const segFrames = pages
        .map((_, j) => {
          const fill = activeSegForPage(j) === i ? COLORS.yellow : 'rgba(255,255,255,0.22)';
          return `${pct(j * step)}, ${pct(j * step + hold)} { fill: ${fill}; }`;
        })
        .concat(`100% { fill: ${i === 0 ? COLORS.yellow : 'rgba(255,255,255,0.22)'}; }`)
        .join(' ');
      extraCss += `\n  .pg-seg-${i} { animation: pgSeg${i} ${totalSec}s linear infinite; }\n  @keyframes pgSeg${i} { ${segFrames} }`;
    }

    // Sync dynamic page number text ("PAGE 1/N", "PAGE 2/N", ...)
    pages.forEach((_, j) => {
      const lblFrames = pages
        .map((__, k) => `${pct(k * step)}, ${pct(k * step + hold)} { opacity: ${j === k ? 1 : 0}; }`)
        .concat(`100% { opacity: ${j === 0 ? 1 : 0}; }`)
        .join(' ');
      extraCss += `\n  .pg-lbl-${j} { opacity: ${j === 0 ? 1 : 0}; animation: pgLbl${j} ${totalSec}s linear infinite; }\n  @keyframes pgLbl${j} { ${lblFrames} }`;
    });

    if (hasOverflowPages) {
      const leftFrames = pages
        .map((_, j) => `${pct(j * step)}, ${pct(j * step + hold)} { opacity: ${j === 0 ? 0 : 1}; }`)
        .concat('100% { opacity: 0; }')
        .join(' ');
      const rightFrames = pages
        .map((_, j) => `${pct(j * step)}, ${pct(j * step + hold)} { opacity: ${j === pageCount - 1 ? 0 : 1}; }`)
        .concat('100% { opacity: 1; }')
        .join(' ');
      extraCss += `\n  .pg-arrow-left { opacity: 0; animation: pgArrowLeft ${totalSec}s linear infinite; }\n  @keyframes pgArrowLeft { ${leftFrames} }`;
      extraCss += `\n  .pg-arrow-right { opacity: 1; animation: pgArrowRight ${totalSec}s linear infinite; }\n  @keyframes pgArrowRight { ${rightFrames} }`;
    }
  }

  parts.push(`
    <g clip-path="url(#proj-grid-clip)">
      <g class="proj-track">${pagesSvg}</g>
    </g>
  `);

  // Left arrow only when > 6 pages
  if (hasOverflowPages) {
    parts.push(
      `<polygon points="${gridX + 7},234 ${gridX + 7},242 ${gridX},238" fill="${COLORS.yellow}" class="pg-arrow-left"/>`,
    );
  }

  // Visible page segments (1..min(6, pageCount))
  for (let i = 0; i < visibleSegments; i++) {
    const bx = segStartX + i * (barW + barGap);
    const isInitialActive = i === 0;
    const cls = pageCount > 1 ? ` class="pg-seg-${i}"` : '';
    parts.push(
      `<rect x="${bx}" y="236" width="${barW}" height="4" fill="${isInitialActive ? COLORS.yellow : 'rgba(255,255,255,0.20)'}"${cls}/>`,
    );
  }

  // Right arrow only when > 6 pages
  if (hasOverflowPages) {
    const arrowRightX = segStartX + segmentsWidth + 7;
    parts.push(
      `<polygon points="${arrowRightX},234 ${arrowRightX},242 ${arrowRightX + 7},238" fill="${COLORS.yellow}" class="pg-arrow-right"/>`,
    );
  }

  // Page counter placed right beside the pagination bars (and right arrow if present)
  const labelX = hasOverflowPages ? segStartX + segmentsWidth + 21 : segStartX + segmentsWidth + 10;
  if (pageCount === 1) {
    parts.push(
      `<text x="${labelX}" y="241" class="meta" fill="${COLORS.yellow}">${esc(t.pageWord)} 1/1</text>`,
    );
  } else {
    for (let j = 0; j < pageCount; j++) {
      parts.push(
        `<text x="${labelX}" y="241" class="meta pg-lbl-${j}" fill="${COLORS.yellow}">${esc(t.pageWord)} ${j + 1}/${pageCount}</text>`,
      );
    }
  }

  return svgShell({
    width: 800,
    height: 256,
    title: t.projSec,
    desc: `${snapshot.activeProjectCount} active repositories, ${openSlots} reserved slots`,
    extraDefs: `<clipPath id="proj-grid-clip"><rect x="${gridX - 1}" y="${gridY - 1}" width="576" height="208"/></clipPath>`,
    extraCss,
    body: parts.join('\n'),
  });
}

export type ButtonVisual = string | { keycap?: string; iconSvg?: string; imageHref?: string };

const GITHUB_AVATAR_B64 =
  'data:image/jpeg;base64,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';

const GITHUB_ICON_SVG =
  '<path fill="#FFFFFF" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>';

const LINKEDIN_ICON_SVG =
  '<path fill="#FFFFFF" d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>';

export function renderActionButtonSvg(visual: ButtonVisual, label: string, active = false): string {
  const h = 28;
  const stroke = active ? COLORS.yellow : 'rgba(255,255,255,0.28)';
  const fill = active ? 'rgba(245, 208, 66, 0.16)' : '#1C2028';
  const txtFill = active ? COLORS.yellow : '#EEF1F5';

  let visualElement = '';
  let boxW = 20;

  if (typeof visual === 'string') {
    boxW = Math.max(22, visual.length * 8 + 10);
    visualElement = `
<rect x="5" y="5" width="${boxW}" height="18" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.45)" stroke-width="1"/>
<text x="${5 + boxW / 2}" y="18" text-anchor="middle" font-family="${HUD_FONT}" font-size="11" font-weight="700" fill="#FFFFFF">${esc(visual)}</text>
`;
  } else if (visual.imageHref) {
    boxW = 20;
    const clipId = 'btn-avatar-clip';
    visualElement = `
<defs><clipPath id="${clipId}"><rect x="5" y="4" width="20" height="20" rx="2"/></clipPath></defs>
<rect x="5" y="4" width="20" height="20" rx="2" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.45)" stroke-width="1"/>
<image x="5" y="4" width="20" height="20" href="${visual.imageHref}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>
`;
  } else if (visual.iconSvg) {
    boxW = 20;
    visualElement = `
<rect x="5" y="4" width="20" height="20" rx="2" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.45)" stroke-width="1"/>
${visual.iconSvg}
`;
  } else if (visual.keycap) {
    boxW = Math.max(22, visual.keycap.length * 8 + 10);
    visualElement = `
<rect x="5" y="5" width="${boxW}" height="18" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.45)" stroke-width="1"/>
<text x="${5 + boxW / 2}" y="18" text-anchor="middle" font-family="${HUD_FONT}" font-size="11" font-weight="700" fill="#FFFFFF">${esc(visual.keycap)}</text>
`;
  }

  const lblW = Math.max(64, label.length * 7.5 + 16);
  const totalW = boxW + lblW + 14;
  const textX = 5 + boxW + 9;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${h}" viewBox="0 0 ${totalW} ${h}" fill="none" role="img" aria-label="${esc(label)}">
<rect x="0.5" y="0.5" width="${totalW - 1}" height="${h - 1}" fill="${fill}" stroke="${stroke}" stroke-width="${active ? 1.5 : 1}"/>
${visualElement}
<text x="${textX}" y="18" font-family="${HUD_FONT}" font-size="11.5" font-weight="600" letter-spacing="0.06em" fill="${txtFill}">${esc(label)}</text>
</svg>
`;
}

function loadIconVisual(
  name: string,
  defaultPathSvg: string,
  iconsDir?: string,
): { iconSvg?: string; imageHref?: string } {
  if (iconsDir) {
    const svgPath = resolve(iconsDir, `${name}.svg`);
    if (existsSync(svgPath)) {
      try {
        const raw = readFileSync(svgPath, 'utf8');
        const vbMatch = raw.match(/viewBox=["']([^"']+)["']/i);
        const vb = vbMatch ? vbMatch[1] : '0 0 16 16';
        const inner = raw
          .replace(/<\?xml[\s\S]*?\?>/i, '')
          .replace(/<svg[^>]*>/i, '')
          .replace(/<\/svg>/i, '')
          .trim();
        if (inner.length > 5) {
          return {
            iconSvg: `<svg x="7" y="6" width="16" height="16" viewBox="${vb}" fill="#FFFFFF">${inner}</svg>`,
          };
        }
      } catch {
        // fallback
      }
    }

    const pngPath = resolve(iconsDir, `${name}.png`);
    if (existsSync(pngPath)) {
      try {
        const buf = readFileSync(pngPath);
        return {
          imageHref: `data:image/png;base64,${buf.toString('base64')}`,
        };
      } catch {
        // fallback
      }
    }
  }

  return { iconSvg: `<svg x="7" y="6" width="16" height="16" viewBox="0 0 16 16" fill="#FFFFFF">${defaultPathSvg}</svg>` };
}

function loadAvatarVisual(options?: { snapshot?: HudSnapshot; iconsDir?: string }): { imageHref: string } {
  if (options?.iconsDir) {
    for (const ext of ['png', 'jpg', 'jpeg', 'svg']) {
      const p = resolve(options.iconsDir, `portfolio.${ext}`);
      if (existsSync(p)) {
        try {
          const buf = readFileSync(p);
          const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : 'image/jpeg';
          return { imageHref: `data:${mime};base64,${buf.toString('base64')}` };
        } catch {
          // fallback
        }
      }
    }
  }

  if (options?.snapshot?.user?.avatarBase64) {
    return { imageHref: options.snapshot.user.avatarBase64 };
  }

  return { imageHref: GITHUB_AVATAR_B64 };
}

export function renderAllButtonSvgs(options: { snapshot?: HudSnapshot; iconsDir?: string } = {}): Record<string, string> {
  const linkedin = loadIconVisual('linkedin', LINKEDIN_ICON_SVG, options.iconsDir);
  const github = loadIconVisual('github', GITHUB_ICON_SVG, options.iconsDir);
  const portfolio = loadAvatarVisual(options);

  return {
    'lang-en-active.svg': renderActionButtonSvg('EN', 'ENGLISH', true),
    'lang-en-inactive.svg': renderActionButtonSvg('EN', 'ENGLISH', false),
    'lang-es-active.svg': renderActionButtonSvg('ES', 'ESPAÑOL', true),
    'lang-es-inactive.svg': renderActionButtonSvg('ES', 'ESPAÑOL', false),
    'btn-portfolio-en.svg': renderActionButtonSvg(portfolio, I18N.en.btnPortfolio, false),
    'btn-portfolio-es.svg': renderActionButtonSvg(portfolio, I18N.es.btnPortfolio, false),
    'btn-linkedin.svg': renderActionButtonSvg(linkedin, 'LINKEDIN', false),
    'btn-github.svg': renderActionButtonSvg(github, 'GITHUB', false),
  };
}

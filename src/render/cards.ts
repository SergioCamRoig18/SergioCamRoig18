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
      <polygon points="${x + cardW - 14},${y + 39} ${x + cardW - 10},${y + 46} ${x + cardW - 18},${y + 46}" fill="${COLORS.green}"/>
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
          const highlight = pIdx === 0 && cIdx === 0 && !card.isLocked;
          return renderProjectCard(card, x, y, cardW, cardH, highlight, lang);
        })
        .join('');
      return `<g class="proj-page">${cards}</g>`;
    })
    .join('');

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

    // Sync pagination indicators at bottom
    pages.forEach((_, i) => {
      const segFrames = pages
        .map((__, j) => {
          const fill = i === j ? COLORS.yellow : 'rgba(255,255,255,0.22)';
          return `${pct(j * step)}, ${pct(j * step + hold)} { fill: ${fill}; }`;
        })
        .concat(`100% { fill: ${i === 0 ? COLORS.yellow : 'rgba(255,255,255,0.22)'}; }`)
        .join(' ');
      extraCss += `\n  .pg-seg-${i} { animation: pgSeg${i} ${totalSec}s linear infinite; }\n  @keyframes pgSeg${i} { ${segFrames} }`;
    });
  }

  parts.push(`
    <g clip-path="url(#proj-grid-clip)">
      <g class="proj-track">${pagesSvg}</g>
    </g>
  `);

  // Bottom pagination indicator bar (shows 1..max(6, pageCount) bars like Capture 7)
  const totalBars = Math.max(6, pageCount);
  const barW = 36;
  const barGap = 5;
  for (let i = 0; i < totalBars; i++) {
    const bx = gridX + i * (barW + barGap);
    const isInitialActive = i === 0;
    const cls = i < pageCount && pageCount > 1 ? ` class="pg-seg-${i}"` : '';
    parts.push(
      `<rect x="${bx}" y="236" width="${barW}" height="4" fill="${isInitialActive ? COLORS.yellow : 'rgba(255,255,255,0.20)'}"${cls}/>`,
    );
  }
  const pageText = pageCount > 1 ? `1–${pageCount}/${pageCount} AUTO` : '1/1';
  parts.push(
    `<text x="780" y="241" text-anchor="end" class="meta" fill="${COLORS.yellow}">${pageText}</text>`,
  );

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

export function renderActionButtonSvg(keycap: string, label: string, active = false): string {
  const keyW = Math.max(22, keycap.length * 8 + 10);
  const lblW = Math.max(64, label.length * 7.5 + 16);
  const totalW = keyW + lblW + 14;
  const h = 28;
  const stroke = active ? COLORS.yellow : 'rgba(255,255,255,0.28)';
  const fill = active ? 'rgba(245, 208, 66, 0.16)' : '#1C2028';
  const txtFill = active ? COLORS.yellow : '#EEF1F5';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${h}" viewBox="0 0 ${totalW} ${h}" fill="none" role="img" aria-label="${esc(label)}">
<rect x="0.5" y="0.5" width="${totalW - 1}" height="${h - 1}" fill="${fill}" stroke="${stroke}" stroke-width="${active ? 1.5 : 1}"/>
<rect x="5" y="5" width="${keyW}" height="18" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.45)" stroke-width="1"/>
<text x="${5 + keyW / 2}" y="18" text-anchor="middle" font-family="${HUD_FONT}" font-size="11" font-weight="700" fill="#FFFFFF">${esc(keycap)}</text>
<text x="${5 + keyW + 9}" y="18" font-family="${HUD_FONT}" font-size="11.5" font-weight="600" letter-spacing="0.06em" fill="${txtFill}">${esc(label)}</text>
</svg>
`;
}

export function renderAllButtonSvgs(): Record<string, string> {
  return {
    'lang-en-active.svg': renderActionButtonSvg('EN', 'ENGLISH', true),
    'lang-en-inactive.svg': renderActionButtonSvg('EN', 'ENGLISH', false),
    'lang-es-active.svg': renderActionButtonSvg('ES', 'ESPAÑOL', true),
    'lang-es-inactive.svg': renderActionButtonSvg('ES', 'ESPAÑOL', false),
    'btn-portfolio-en.svg': renderActionButtonSvg('ENTER', I18N.en.btnPortfolio, true),
    'btn-portfolio-es.svg': renderActionButtonSvg('ENTER', I18N.es.btnPortfolio, true),
    'btn-linkedin.svg': renderActionButtonSvg('L', 'LINKEDIN', false),
    'btn-github.svg': renderActionButtonSvg('G', 'GITHUB', false),
  };
}

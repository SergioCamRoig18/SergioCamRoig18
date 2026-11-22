import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { applyAssetCacheBusters, computeAssetHash } from '../src/cli.ts';
import { buildDemoSnapshot, buildProjectPages, computeLanguagesWithDelta, mergeTags } from '../src/collect.ts';
import { HUD_CONFIG } from '../src/config.ts';
import {
  formatFittingTags,
  renderAllButtonSvgs,
  renderLanguagesSvg,
  renderProfileSvg,
  renderProjectsSvg,
  renderStackSvg,
  renderWeeklySvg,
} from '../src/render/cards.ts';
import { COLORS } from '../src/render/theme.ts';

test('computeLanguagesWithDelta calculates 30-day gains and drops from history', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hud-lang-'));
  try {
    const historyPath = join(dir, 'languages-history.json');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    writeFileSync(
      historyPath,
      JSON.stringify([{ date: thirtyDaysAgo, percentages: { TypeScript: 40, Java: 60 } }]),
      'utf8',
    );

    const raw = new Map([
      ['TypeScript', { bytes: 500, color: '#3178c6' }],
      ['Java', { bytes: 500, color: '#b07219' }],
    ]);

    const stats = computeLanguagesWithDelta(raw, historyPath, 4, 30, true);
    assert.equal(stats.length, 2);
    assert.equal(stats[0].percent, 50);
    assert.equal(stats[0].delta30d, 10);
    assert.equal(stats[1].percent, 50);
    assert.equal(stats[1].delta30d, -10);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('buildProjectPages prioritizes pinned repos, sorts by success, and pads with locked slots', () => {
  const makeRepo = (name: string, stars: number, isPinned = false) => ({
    name,
    description: `Repo ${name}`,
    stars,
    forks: 0,
    commits: 10,
    updatedAt: '2026-11-01T00:00:00Z',
    tags: ['TypeScript'],
    isPinned,
    isPrivate: false,
    isFork: false,
    languages: [],
  });

  // Fewer than 6 active repos -> 1 page padded to 6 with locked slots
  const few = buildProjectPages([makeRepo('alpha', 2), makeRepo('pinned-low', 0, true)], HUD_CONFIG);
  assert.equal(few.activeCount, 2);
  assert.equal(few.pages.length, 1);
  assert.equal(few.pages[0].length, 6);
  assert.equal(few.pages[0][0].name, 'pinned-low');
  assert.equal(few.pages[0][1].name, 'alpha');
  assert.equal(few.pages[0][2].isLocked, true);
  assert.equal(few.pages[0][5].slotNumber, 6);

  // More than 6 active repos -> 2 pages of 6
  const manyRepos = Array.from({ length: 8 }, (_, i) => makeRepo(`repo-${i}`, i));
  const many = buildProjectPages(manyRepos, HUD_CONFIG);
  assert.equal(many.activeCount, 8);
  assert.equal(many.pages.length, 2);
  assert.equal(many.pages[0].length, 6);
  assert.equal(many.pages[1].length, 6);
  assert.equal(many.pages[1][0].name, 'repo-1');
  assert.equal(many.pages[1][2].isLocked, true);
});

test('all SVG renderers produce valid SVGs in EN and ES without NaN or undefined', () => {
  const snapshot = buildDemoSnapshot(HUD_CONFIG);
  for (const lang of ['en', 'es'] as const) {
    const svgs = [
      { svg: renderProfileSvg(snapshot, lang, HUD_CONFIG), w: 800, h: 230 },
      { svg: renderLanguagesSvg(snapshot, lang), w: 400, h: 210 },
      { svg: renderWeeklySvg(snapshot, lang), w: 400, h: 210 },
      { svg: renderStackSvg(lang, HUD_CONFIG), w: 800, h: 112 },
      { svg: renderProjectsSvg(snapshot, lang), w: 800, h: 256 },
    ];

    for (const item of svgs) {
      assert.ok(item.svg.startsWith('<svg '), 'starts with <svg');
      assert.ok(item.svg.trimEnd().endsWith('</svg>'), 'ends with </svg>');
      assert.ok(item.svg.includes(`width="${item.w}" height="${item.h}"`), `expected ${item.w}x${item.h}`);
      assert.ok(!item.svg.includes('NaN'), 'must not contain NaN');
      assert.ok(!item.svg.includes('undefined'), 'must not contain undefined');
    }
  }

  const buttons = renderAllButtonSvgs();
  assert.equal(Object.keys(buttons).length, 8);
  for (const svg of Object.values(buttons)) {
    assert.ok(svg.startsWith('<svg ') && svg.trimEnd().endsWith('</svg>'));
  }
});

test('renderProjectsSvg emits CSS pagination animation when multiple pages exist and renderWeeklySvg highlights peak day', () => {
  const demo = buildDemoSnapshot(HUD_CONFIG);
  const projSvg = renderProjectsSvg(demo, 'en');
  assert.ok(projSvg.includes('@keyframes projScroll'), 'multi-page projects should animate');
  assert.ok(projSvg.includes('PAGE 1/2'), 'pagination label should show PAGE 1/2');
  assert.ok(projSvg.includes('PAGE 2/2'), 'pagination label should show PAGE 2/2');
  assert.ok(!projSvg.includes('pg-arrow-left'), '2 pages should not render overflow arrows');
  assert.ok(!projSvg.includes('pg-arrow-right'), '2 pages should not render overflow arrows');

  const weeklySvg = renderWeeklySvg(demo, 'en');
  assert.ok(weeklySvg.includes(`fill="${COLORS.yellow}"`), 'peak day bar should be solid tactical yellow');
  assert.ok(weeklySvg.includes('PEAK: THU'), 'peak day header should show THU');
});

test('renderProjectsSvg shows animated side arrows only when > 6 pages exist, hiding at boundaries', () => {
  const manyProjects = Array.from({ length: 39 }, (_, i) => ({
    name: `project-${i + 1}`,
    description: 'Sample repo',
    stars: 0,
    forks: 0,
    commits: 5,
    updatedAt: '2026-11-01T00:00:00Z',
    tags: ['TypeScript'],
    isPinned: false,
    isPrivate: false,
    isFork: false,
    languages: [],
  }));
  const { activeCount, pages } = buildProjectPages(manyProjects, HUD_CONFIG);
  assert.equal(pages.length, 7);

  const demo = buildDemoSnapshot(HUD_CONFIG);
  const sevenPageSnap = { ...demo, activeProjectCount: activeCount, projectPages: pages };
  const svg = renderProjectsSvg(sevenPageSnap, 'en');

  assert.ok(svg.includes('class="pg-arrow-left"'), '7 pages should render left overflow arrow');
  assert.ok(svg.includes('class="pg-arrow-right"'), '7 pages should render right overflow arrow');
  assert.ok(svg.includes('@keyframes pgArrowLeft'), 'left arrow should animate');
  assert.ok(svg.includes('@keyframes pgArrowRight'), 'right arrow should animate');
  assert.ok(svg.includes('0.00%, 12.88% { opacity: 0; }'), 'left arrow hidden on first page');
  assert.ok(svg.includes('85.71%, 98.59% { opacity: 0; }'), 'right arrow hidden on last page');
  assert.ok(svg.includes('PAGE 7/7'), '7th page label should exist');
  assert.ok(!svg.includes('pg-seg-6'), 'only up to 6 visible segment bars should be rendered');
});

test('mergeTags prioritizes languages, then configured tech topics, deduplicates, and formats cleanly', () => {
  const showcaseTags = mergeTags(
    {
      languages: [],
      topics: [
        'cloudflare-pages',
        'fan-site',
        'interactive-map',
        'leaflet',
        'nds',
        'nintendo-ds',
        'react',
        'threejs',
        'typescript',
        'vite',
        'wordle',
        'zubo',
      ],
    },
    HUD_CONFIG.priorityTopics,
  );
  assert.deepEqual(showcaseTags, ['TypeScript', 'React', 'Three.js', 'Leaflet', 'Vite', 'Cloudflare']);

  const codeRepoTags = mergeTags(
    {
      languages: [{ name: 'TypeScript' }, { name: 'CSS' }],
      topics: ['typescript', 'react', 'fan-site', 'docker'],
    },
    HUD_CONFIG.priorityTopics,
  );
  assert.deepEqual(codeRepoTags, ['TypeScript', 'CSS', 'React', 'Docker', 'fan-site']);
});

test('formatFittingTags packs tags cleanly within maxChars without ellipsis truncation', () => {
  assert.equal(
    formatFittingTags(['TypeScript', 'React', 'Three.js', 'Leaflet', 'Vite'], 28, 3),
    '+TypeScript +React +Three.js',
  );
  assert.equal(
    formatFittingTags(['Cloudflare', 'fan-site', 'interactive-map'], 28, 3),
    '+Cloudflare +fan-site',
  );
  assert.equal(
    formatFittingTags(['Cloudflare', 'interactive-maps', 'Vite'], 28, 3),
    '+Cloudflare +Vite',
  );
  assert.ok(!formatFittingTags(['Cloudflare', 'fan-site', 'interactive-map'], 28, 3).includes('…'));
});

test('applyAssetCacheBusters injects and updates deterministic SHA-256 ?v= query params', () => {
  const hashA = computeAssetHash('<svg>v1</svg>');
  const hashB = computeAssetHash('<svg>v2</svg>');
  assert.equal(hashA.length, 8);
  assert.notEqual(hashA, hashB);

  const raw = [
    '<img src="assets/en/04-projects.svg" width="800" />',
    '<img src="assets/buttons/btn-github.svg?v=00000000" />',
  ].join('\n');

  const firstPass = applyAssetCacheBusters(raw, () => hashA);
  assert.ok(firstPass.includes(`src="assets/en/04-projects.svg?v=${hashA}"`));
  assert.ok(firstPass.includes(`src="assets/buttons/btn-github.svg?v=${hashA}"`));

  // Idempotent when SVG content has not changed
  assert.equal(applyAssetCacheBusters(firstPass, () => hashA), firstPass);

  // Updates immediately when SVG hash changes
  const secondPass = applyAssetCacheBusters(firstPass, () => hashB);
  assert.ok(secondPass.includes(`src="assets/en/04-projects.svg?v=${hashB}"`));
});

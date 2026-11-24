import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDemoSnapshot, collectHudSnapshot } from './collect.ts';
import { HUD_CONFIG } from './config.ts';
import { buildPreviewHtml } from './preview.ts';
import {
  renderAllButtonSvgs,
  renderLanguagesSvg,
  renderProfileSvg,
  renderProjectsSvg,
  renderStackSvg,
  renderWeeklySvg,
} from './render/cards.ts';
import type { HudSnapshot, Lang } from './types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');

function writeSnapshotSvgs(snapshot: HudSnapshot, targetRoot: string): void {
  const langs: Lang[] = ['en', 'es'];
  for (const lang of langs) {
    const dir = resolve(targetRoot, lang);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, '01-profile.svg'), renderProfileSvg(snapshot, lang, HUD_CONFIG), 'utf8');
    writeFileSync(resolve(dir, '02a-languages.svg'), renderLanguagesSvg(snapshot, lang), 'utf8');
    writeFileSync(resolve(dir, '02b-weekly.svg'), renderWeeklySvg(snapshot, lang), 'utf8');
    writeFileSync(resolve(dir, '03-stack.svg'), renderStackSvg(lang, HUD_CONFIG), 'utf8');
    writeFileSync(resolve(dir, '04-projects.svg'), renderProjectsSvg(snapshot, lang), 'utf8');
  }
}

/** Compute an 8-char SHA-256 hash of an asset file for deterministic cache-busting. */
export function computeAssetHash(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 8);
}

/** Rewrite local SVG image src attributes in a README to include ?v=<hash> for instant GitHub Camo refresh. */
export function applyAssetCacheBusters(
  readmeContent: string,
  hashResolver: (assetRelPath: string) => string | null,
): string {
  return readmeContent.replace(
    /src="(assets\/[^"?]+\.svg)(?:\?v=[a-f0-9]+)?"/g,
    (fullMatch, assetRelPath: string) => {
      const hash = hashResolver(assetRelPath);
      return hash ? `src="${assetRelPath}?v=${hash}"` : fullMatch;
    },
  );
}

function syncReadmeCacheBusters(rootDir: string): void {
  const hashCache = new Map<string, string | null>();
  const resolveHash = (assetRelPath: string): string | null => {
    if (hashCache.has(assetRelPath)) return hashCache.get(assetRelPath) ?? null;
    const fullPath = resolve(rootDir, assetRelPath);
    const hash = existsSync(fullPath) ? computeAssetHash(readFileSync(fullPath)) : null;
    hashCache.set(assetRelPath, hash);
    return hash;
  };

  for (const readmeName of ['README.md', 'README.es.md']) {
    const readmePath = resolve(rootDir, readmeName);
    if (!existsSync(readmePath)) continue;
    const current = readFileSync(readmePath, 'utf8');
    const updated = applyAssetCacheBusters(current, resolveHash);
    if (updated !== current) {
      writeFileSync(readmePath, updated, 'utf8');
    }
  }
}

/** Build a lightweight, public-safe telemetry payload for the web portfolio (no base64 avatar or private repo data). */
export function buildPublicTelemetryPayload(snapshot: HudSnapshot) {
  const totalForks = snapshot.projectPages
    .flat()
    .filter((p) => !p.isLocked)
    .reduce((sum, p) => sum + (p.forks || 0), 0);

  return {
    version: snapshot.version,
    generatedAt: snapshot.generatedAt,
    source: snapshot.source,
    user: {
      login: snapshot.user.login,
      name: snapshot.user.name,
      createdAt: snapshot.user.createdAt,
      avatarUrl: snapshot.user.avatarUrl,
    },
    metrics: snapshot.metrics,
    languages: snapshot.languages,
    weekly: snapshot.weekly,
    publicRepoCount: snapshot.publicRepoCount,
    activeProjectCount: snapshot.activeProjectCount,
    totalForks,
  };
}

function writePublicTelemetryJson(snapshot: HudSnapshot, rootDir: string): void {
  const outPath = resolve(rootDir, 'data/telemetry.json');
  const nextPayload = buildPublicTelemetryPayload(snapshot);

  if (existsSync(outPath)) {
    try {
      const prev = JSON.parse(readFileSync(outPath, 'utf8')) as Record<string, unknown>;
      const prevComparable = JSON.stringify({ ...prev, generatedAt: '' });
      const nextComparable = JSON.stringify({ ...nextPayload, generatedAt: '' });
      if (prevComparable === nextComparable) return;
    } catch {
      // Rewrite if existing file is malformed
    }
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(nextPayload, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const offline = args.has('--offline');
  const demoOnly = args.has('--demo');

  const assetsDir = resolve(ROOT_DIR, 'assets');
  const buttonsDir = resolve(assetsDir, 'buttons');
  const iconsDir = resolve(assetsDir, 'icons');
  mkdirSync(buttonsDir, { recursive: true });

  let liveSnapshot: HudSnapshot | null = null;
  if (!demoOnly) {
    liveSnapshot = await collectHudSnapshot(HUD_CONFIG, ROOT_DIR, { offline });
    writeSnapshotSvgs(liveSnapshot, assetsDir);
    writePublicTelemetryJson(liveSnapshot, ROOT_DIR);
    console.log(
      `[hud] Generated live SVGs (${liveSnapshot.source}) -> assets/{en,es} & data/telemetry.json | Active projects: ${liveSnapshot.activeProjectCount}, Languages: ${liveSnapshot.languages.length}`,
    );
  }

  const demoSnapshot = buildDemoSnapshot(HUD_CONFIG);
  const demoDir = resolve(ROOT_DIR, 'out/demo');
  writeSnapshotSvgs(demoSnapshot, demoDir);

  const buttonSnapshot = liveSnapshot ?? demoSnapshot;
  for (const [filename, svg] of Object.entries(renderAllButtonSvgs({ snapshot: buttonSnapshot, iconsDir }))) {
    writeFileSync(resolve(buttonsDir, filename), svg, 'utf8');
  }
  writeSnapshotSvgs(demoSnapshot, demoDir);

  if (!demoOnly) {
    syncReadmeCacheBusters(ROOT_DIR);
  }

  const previewPath = resolve(ROOT_DIR, 'out/preview.html');
  mkdirSync(dirname(previewPath), { recursive: true });
  writeFileSync(previewPath, buildPreviewHtml(HUD_CONFIG), 'utf8');
  console.log(`[hud] Preview ready at ${previewPath}`);
}

const entryPath = typeof process.argv[1] === 'string' ? resolve(process.argv[1]) : '';
const currentPath = fileURLToPath(import.meta.url);
const isDirectRun =
  entryPath !== '' &&
  (process.platform === 'win32'
    ? entryPath.toLowerCase() === currentPath.toLowerCase()
    : entryPath === currentPath);

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

import { mkdirSync, writeFileSync } from 'node:fs';
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
    console.log(
      `[hud] Generated live SVGs (${liveSnapshot.source}) -> assets/{en,es} | Active projects: ${liveSnapshot.activeProjectCount}, Languages: ${liveSnapshot.languages.length}`,
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

  const previewPath = resolve(ROOT_DIR, 'out/preview.html');
  mkdirSync(dirname(previewPath), { recursive: true });
  writeFileSync(previewPath, buildPreviewHtml(HUD_CONFIG), 'utf8');
  console.log(`[hud] Preview ready at ${previewPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

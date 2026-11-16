import type { HudConfig } from './types.ts';
import { esc } from './render/theme.ts';

export function buildPreviewHtml(config: HudConfig): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(config.username)} — HUD Local Preview</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 16px 48px;
      background: #0d1117;
      color: #e6edf3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    }
    .toolbar {
      max-width: 820px;
      margin: 0 auto 20px;
      padding: 12px 16px;
      background: #161b22;
      border: 1px solid #30363d;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .btn-group { display: flex; gap: 6px; align-items: center; }
    .btn {
      background: #21262d;
      color: #c9d1d9;
      border: 1px solid #30363d;
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn.active {
      background: rgba(245, 208, 66, 0.16);
      border-color: #F5D042;
      color: #F5D042;
    }
    .readme-frame {
      max-width: 834px;
      margin: 0 auto;
      padding: 16px;
      background: #0d1117;
      border: 1px solid #30363d;
    }
    .stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .row-pair {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 4px;
      width: 100%;
    }
    .btn-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
      margin: 4px 0;
    }
    img { display: block; max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="btn-group">
      <span style="font-size:13px;color:#8b949e;">Dataset:</span>
      <button class="btn active" id="mode-live" onclick="setMode('live')">Real Account (${esc(config.username)})</button>
      <button class="btn" id="mode-demo" onclick="setMode('demo')">Demo Full (>6 Repos + 30D Delta)</button>
    </div>
    <div class="btn-group">
      <span style="font-size:13px;color:#8b949e;">Language:</span>
      <button class="btn active" id="lang-en" onclick="setLang('en')">EN</button>
      <button class="btn" id="lang-es" onclick="setLang('es')">ES</button>
    </div>
  </div>

  <div class="readme-frame">
    <div class="stack">
      <div class="btn-row">
        <a href="#" onclick="setLang('en'); return false;"><img id="btn-lang-en" src="../assets/buttons/lang-en-active.svg" alt="EN"></a>
        <a href="#" onclick="setLang('es'); return false;"><img id="btn-lang-es" src="../assets/buttons/lang-es-inactive.svg" alt="ES"></a>
      </div>

      <img id="svg-profile" src="../assets/en/01-profile.svg" width="800" alt="Profile Overview">

      <div class="row-pair">
        <img id="svg-langs" src="../assets/en/02a-languages.svg" width="398" alt="Most Used Languages">
        <img id="svg-weekly" src="../assets/en/02b-weekly.svg" width="398" alt="Weekly Rhythm">
      </div>

      <img id="svg-stack" src="../assets/en/03-stack.svg" width="800" alt="Tech Stack">
      <img id="svg-projects" src="../assets/en/04-projects.svg" width="800" alt="Featured Projects">

      <div class="btn-row">
        <a href="${esc(config.links.portfolio)}" target="_blank"><img id="btn-portfolio" src="../assets/buttons/btn-portfolio-en.svg" alt="Portfolio"></a>
        <a href="${esc(config.links.linkedin)}" target="_blank"><img src="../assets/buttons/btn-linkedin.svg" alt="LinkedIn"></a>
        <a href="${esc(config.links.github)}" target="_blank"><img src="../assets/buttons/btn-github.svg" alt="GitHub"></a>
      </div>
    </div>
  </div>

  <script>
    let mode = 'live';
    let lang = 'en';

    function refresh() {
      const base = mode === 'live' ? '../assets/' + lang : './demo/' + lang;
      const bust = '?t=' + Date.now();
      document.getElementById('svg-profile').src = base + '/01-profile.svg' + bust;
      document.getElementById('svg-langs').src = base + '/02a-languages.svg' + bust;
      document.getElementById('svg-weekly').src = base + '/02b-weekly.svg' + bust;
      document.getElementById('svg-stack').src = base + '/03-stack.svg' + bust;
      document.getElementById('svg-projects').src = base + '/04-projects.svg' + bust;

      document.getElementById('btn-lang-en').src = '../assets/buttons/lang-en-' + (lang === 'en' ? 'active' : 'inactive') + '.svg';
      document.getElementById('btn-lang-es').src = '../assets/buttons/lang-es-' + (lang === 'es' ? 'active' : 'inactive') + '.svg';
      document.getElementById('btn-portfolio').src = '../assets/buttons/btn-portfolio-' + lang + '.svg';

      document.getElementById('mode-live').classList.toggle('active', mode === 'live');
      document.getElementById('mode-demo').classList.toggle('active', mode === 'demo');
      document.getElementById('lang-en').classList.toggle('active', lang === 'en');
      document.getElementById('lang-es').classList.toggle('active', lang === 'es');
    }

    function setMode(m) { mode = m; refresh(); }
    function setLang(l) { lang = l; refresh(); }
  </script>
</body>
</html>
`;
}

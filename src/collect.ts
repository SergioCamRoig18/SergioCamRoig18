import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type {
  HudConfig,
  HudSnapshot,
  LanguageHistoryEntry,
  LanguageStat,
  ProjectCardData,
  WeekdayStat,
} from './types.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Java: '#b07219',
  'C#': '#178600',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SQL: '#e38c00',
};

interface RawProject {
  name: string;
  description: string;
  stars: number;
  forks: number;
  commits: number;
  updatedAt: string;
  tags: string[];
  isPinned: boolean;
  isPrivate: boolean;
  isFork: boolean;
  languages: { name: string; bytes: number; color: string | null }[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Calculate longest streak and active-day percentage from an ordered list of days. */
function computeCalendarStats(days: { date: string; count: number; weekdayMon0: number }[]): {
  activeDaysPercent: number;
  bestStreakDays: number;
  weekly: WeekdayStat[];
} {
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  let activeDays = 0;
  let bestStreak = 0;
  let currentStreak = 0;

  for (const day of days) {
    weekdayTotals[day.weekdayMon0] += day.count;
    if (day.count > 0) {
      activeDays++;
      currentStreak++;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  const maxCount = Math.max(...weekdayTotals);
  const peakDay = maxCount > 0 ? weekdayTotals.indexOf(maxCount) : -1;

  const weekly: WeekdayStat[] = weekdayTotals.map((count, dayIndex) => ({
    dayIndex,
    count,
    isPeak: dayIndex === peakDay,
  }));

  const activeDaysPercent = days.length > 0 ? Math.round((activeDays / days.length) * 100) : 0;
  return { activeDaysPercent, bestStreakDays: bestStreak, weekly };
}

/** Compute top N languages normalized to 100% and compare against ~30-day history. */
export function computeLanguagesWithDelta(
  rawLangs: Map<string, { bytes: number; color: string | null }>,
  historyPath: string,
  maxLanguages: number,
  deltaDays: number,
  persistHistory: boolean,
  now = new Date(),
): LanguageStat[] {
  const entries = [...rawLangs.entries()]
    .filter(([, info]) => info.bytes > 0)
    .sort((a, b) => b[1].bytes - a[1].bytes)
    .slice(0, maxLanguages);

  const totalBytes = entries.reduce((sum, [, info]) => sum + info.bytes, 0);
  if (totalBytes === 0) {
    if (persistHistory && !existsSync(historyPath)) {
      mkdirSync(dirname(historyPath), { recursive: true });
      writeFileSync(historyPath, '[]\n', 'utf8');
    }
    return [];
  }

  const currentPercentages: Record<string, number> = {};
  const baseStats = entries.map(([name, info]) => {
    const percent = round1((info.bytes / totalBytes) * 100);
    currentPercentages[name] = percent;
    return { name, bytes: info.bytes, percent, color: info.color ?? LANG_COLORS[name] ?? null };
  });

  // Fix rounding drift on the top language so shown percentages sum cleanly ~100%
  const sumPct = baseStats.reduce((s, l) => s + l.percent, 0);
  if (baseStats.length > 0 && Math.abs(100 - sumPct) >= 0.1) {
    baseStats[0].percent = round1(baseStats[0].percent + (100 - sumPct));
    currentPercentages[baseStats[0].name] = baseStats[0].percent;
  }

  let history: LanguageHistoryEntry[] = [];
  if (existsSync(historyPath)) {
    try {
      const parsed = JSON.parse(readFileSync(historyPath, 'utf8'));
      if (Array.isArray(parsed)) history = parsed;
    } catch {
      history = [];
    }
  }

  // Find baseline entry closest to `now - deltaDays`
  const targetMs = now.getTime() - deltaDays * DAY_MS;
  let baseline: LanguageHistoryEntry | undefined;
  let bestDiff = Infinity;

  for (const entry of history) {
    const t = new Date(`${entry.date}T00:00:00Z`).getTime();
    if (Number.isNaN(t)) continue;
    const diff = Math.abs(t - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      baseline = entry;
    }
  }

  const todayStr = isoDate(now);
  if (persistHistory) {
    const filtered = history.filter((h) => h.date !== todayStr);
    filtered.push({ date: todayStr, percentages: currentPercentages });
    // Keep last 120 snapshots sorted chronologically
    const trimmed = filtered.sort((a, b) => a.date.localeCompare(b.date)).slice(-120);
    mkdirSync(dirname(historyPath), { recursive: true });
    writeFileSync(historyPath, `${JSON.stringify(trimmed, null, 2)}\n`, 'utf8');
  }

  return baseStats.map((lang) => {
    const past = baseline ? (baseline.percentages[lang.name] ?? 0) : lang.percent;
    const delta30d = baseline ? round1(lang.percent - past) : 0;
    return { ...lang, delta30d };
  });
}

/** Rank active projects and pad each page of 6 with locked slots. */
export function buildProjectPages(
  projects: RawProject[],
  config: HudConfig,
): { activeCount: number; pages: ProjectCardData[][] } {
  const ignored = new Set(config.ignoredRepos.map((r) => r.toLowerCase()));
  const eligible = projects.filter(
    (p) => !p.isPrivate && !p.isFork && (p.isPinned || !ignored.has(p.name.toLowerCase())),
  );

  eligible.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const scoreA = a.stars * 10 + a.forks * 5 + a.commits;
    const scoreB = b.stars * 10 + b.forks * 5 + b.commits;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  const activeCards: ProjectCardData[] = eligible.map((p, idx) => ({
    slotNumber: idx + 1,
    isLocked: false,
    name: p.name,
    description: p.description || 'Software engineering repository.',
    stars: p.stars,
    forks: p.forks,
    commits: p.commits,
    updatedAt: p.updatedAt,
    tags: p.tags.slice(0, 6),
    isPinned: p.isPinned,
  }));

  const perPage = config.projectsPerPage;
  const totalSlots = Math.max(perPage, Math.ceil(activeCards.length / perPage) * perPage);
  const allSlots: ProjectCardData[] = [...activeCards];

  for (let slot = activeCards.length + 1; slot <= totalSlots; slot++) {
    allSlots.push({
      slotNumber: slot,
      isLocked: true,
      name: '',
      description: '',
      stars: 0,
      forks: 0,
      commits: 0,
      updatedAt: '',
      tags: [],
      isPinned: false,
    });
  }

  const pages: ProjectCardData[][] = [];
  for (let i = 0; i < allSlots.length; i += perPage) {
    pages.push(allSlots.slice(i, i + perPage));
  }

  return { activeCount: activeCards.length, pages };
}

function normalizeTagKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9#]+/g, '');
}

export function mergeTags(
  repo: { languages: { name: string }[]; topics: string[] },
  priorityTopics: Record<string, string> = {},
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const pushUnique = (label: string) => {
    const clean = label.trim();
    if (!clean) return;
    const key = normalizeTagKey(clean);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(clean);
  };

  // Tier 1: GitHub-detected repository languages (already ordered by byte size)
  for (const lang of repo.languages) {
    pushUnique(lang.name);
  }

  // Tier 2: Priority technical topics in configured order with clean display labels
  const priorityOrder = new Map<string, { rank: number; label: string }>();
  Object.entries(priorityTopics).forEach(([slug, label], rank) => {
    priorityOrder.set(slug.toLowerCase(), { rank, label });
  });

  const matchedPriority: { rank: number; label: string }[] = [];
  const otherTopics: string[] = [];

  for (const topic of repo.topics) {
    const clean = topic.trim();
    if (!clean) continue;
    const match = priorityOrder.get(clean.toLowerCase());
    if (match) {
      matchedPriority.push(match);
    } else {
      otherTopics.push(clean);
    }
  }

  matchedPriority.sort((a, b) => a.rank - b.rank);
  for (const item of matchedPriority) {
    pushUnique(item.label);
  }

  // Tier 3: Remaining descriptive topics as fallback
  for (const topic of otherTopics) {
    pushUnique(topic);
  }

  return out.slice(0, 6);
}

async function fetchAvatarBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return '';
  }
}

async function fetchGraphQL(token: string, config: HudConfig, historyPath: string): Promise<HudSnapshot> {
  const now = new Date();
  const from = new Date(now.getTime() - 364 * DAY_MS).toISOString();
  const to = now.toISOString();

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        login
        name
        createdAt
        avatarUrl(size: 64)
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          totalPullRequestContributions
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
                weekday
              }
            }
          }
        }
        pinnedItems(first: 6, types: REPOSITORY) {
          nodes {
            ... on Repository {
              name
            }
          }
        }
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: { field: PUSHED_AT, direction: DESC }) {
          nodes {
            name
            description
            isPrivate
            isFork
            stargazerCount
            forkCount
            pushedAt
            repositoryTopics(first: 20) {
              nodes {
                topic { name }
              }
            }
            languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
              edges {
                size
                node { name color }
              }
            }
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 1) {
                    totalCount
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': `${config.username}-hud-generator`,
    },
    body: JSON.stringify({ query, variables: { login: config.username, from, to } }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status}: ${await res.text()}`);
  }
  const payload = (await res.json()) as { data?: { user?: any }; errors?: { message: string }[] };
  if (payload.errors?.length) {
    throw new Error(`GraphQL error: ${payload.errors.map((e) => e.message).join('; ')}`);
  }
  const user = payload.data?.user;
  if (!user) throw new Error(`User ${config.username} not found via GraphQL`);

  const ignoredSet = new Set(config.ignoredRepos.map((r) => r.toLowerCase()));
  const pinnedSet = new Set<string>(
    (user.pinnedItems?.nodes ?? []).map((n: { name?: string }) => (n?.name ?? '').toLowerCase()),
  );

  const calendarDays: { date: string; count: number; weekdayMon0: number }[] = [];
  for (const week of user.contributionsCollection.contributionCalendar.weeks ?? []) {
    for (const day of week.contributionDays ?? []) {
      calendarDays.push({
        date: day.date,
        count: day.contributionCount,
        weekdayMon0: (day.weekday + 6) % 7,
      });
    }
  }
  const calStats = computeCalendarStats(calendarDays);

  const rawLangs = new Map<string, { bytes: number; color: string | null }>();
  const rawProjects: RawProject[] = [];
  let totalStars = 0;

  for (const repo of user.repositories?.nodes ?? []) {
    if (!repo || repo.isFork) continue;
    const isPinned = pinnedSet.has(repo.name.toLowerCase());
    if (ignoredSet.has(repo.name.toLowerCase()) && !isPinned) continue;
    totalStars += repo.stargazerCount ?? 0;

    const repoLangs = (repo.languages?.edges ?? []).map((e: any) => ({
      name: e.node.name as string,
      bytes: e.size as number,
      color: (e.node.color as string | null) ?? null,
    }));

    for (const l of repoLangs) {
      const prev = rawLangs.get(l.name) ?? { bytes: 0, color: l.color };
      rawLangs.set(l.name, { bytes: prev.bytes + l.bytes, color: prev.color ?? l.color });
    }

    const topics = (repo.repositoryTopics?.nodes ?? []).map((t: any) => t.topic?.name).filter(Boolean);
    rawProjects.push({
      name: repo.name,
      description: repo.description ?? '',
      stars: repo.stargazerCount ?? 0,
      forks: repo.forkCount ?? 0,
      commits: repo.defaultBranchRef?.target?.history?.totalCount ?? 0,
      updatedAt: repo.pushedAt ?? '',
      tags: mergeTags({ languages: repoLangs, topics }, config.priorityTopics),
      isPinned,
      isPrivate: Boolean(repo.isPrivate),
      isFork: Boolean(repo.isFork),
      languages: repoLangs,
    });
  }

  const publicRepos = rawProjects.filter((p) => !p.isPrivate);
  const { activeCount, pages } = buildProjectPages(rawProjects, config);
  const languages = computeLanguagesWithDelta(
    rawLangs,
    historyPath,
    config.maxLanguages,
    config.languageDeltaDays,
    true,
    now,
  );

  const avatarUrl = user.avatarUrl || `https://github.com/${config.username}.png?size=64`;
  const avatarBase64 = await fetchAvatarBase64(avatarUrl);

  return {
    version: 1,
    generatedAt: now.toISOString(),
    source: 'graphql',
    user: {
      login: user.login,
      name: user.name ?? config.displayName,
      createdAt: user.createdAt,
      avatarUrl,
      avatarBase64,
    },
    metrics: {
      commits12m: user.contributionsCollection.totalCommitContributions ?? 0,
      repositories: rawProjects.length,
      pullRequests: user.contributionsCollection.totalPullRequestContributions ?? 0,
      activeDaysPercent: calStats.activeDaysPercent,
      bestStreakDays: calStats.bestStreakDays,
      totalStars,
      memberSince: new Date(user.createdAt).getUTCFullYear() || config.memberSinceFallback,
    },
    languages,
    weekly: calStats.weekly,
    publicRepoCount: publicRepos.length,
    activeProjectCount: activeCount,
    projectPages: pages,
  };
}

async function fetchRestJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'sergiocamroig18-hud-generator',
    },
  });
  if (!res.ok) throw new Error(`REST HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

async function fetchRepoCommitCount(owner: string, repo: string): Promise<number> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'sergiocamroig18-hud-generator',
      },
    });
    if (!res.ok) return 0;
    const link = res.headers.get('link') ?? '';
    const match = link.match(/&page=(\d+)>;\s*rel="last"/);
    if (match) return Number(match[1]);
    const body = (await res.json()) as unknown[];
    return Array.isArray(body) ? body.length : 0;
  } catch {
    return 0;
  }
}

async function fetchPublicRest(config: HudConfig, historyPath: string): Promise<HudSnapshot> {
  const now = new Date();
  const user = await fetchRestJson<{
    login: string;
    name: string | null;
    created_at: string;
    public_repos: number;
    avatar_url?: string;
  }>(`https://api.github.com/users/${config.username}`);
  const avatarUrl = user.avatar_url || `https://github.com/${config.username}.png?size=64`;
  const avatarBase64 = await fetchAvatarBase64(avatarUrl);
  const repos = await fetchRestJson<any[]>(
    `https://api.github.com/users/${config.username}/repos?per_page=100&sort=pushed`,
  );
  let events: any[] = [];
  try {
    events = await fetchRestJson<any[]>(`https://api.github.com/users/${config.username}/events/public?per_page=100`);
  } catch {
    events = [];
  }

  const ignoredSet = new Set(config.ignoredRepos.map((r) => r.toLowerCase()));
  const rawLangs = new Map<string, { bytes: number; color: string | null }>();
  const rawProjects: RawProject[] = [];
  let totalStars = 0;

  for (const r of repos) {
    if (r.fork) continue;
    if (ignoredSet.has(String(r.name ?? '').toLowerCase())) continue;
    totalStars += r.stargazers_count ?? 0;

    let langMap: Record<string, number> = {};
    try {
      langMap = await fetchRestJson<Record<string, number>>(r.languages_url);
    } catch {
      if (r.language) langMap = { [r.language]: 1000 };
    }

    const repoLangs = Object.entries(langMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, bytes]) => ({ name, bytes, color: LANG_COLORS[name] ?? null }));

    for (const l of repoLangs) {
      const prev = rawLangs.get(l.name) ?? { bytes: 0, color: l.color };
      rawLangs.set(l.name, { bytes: prev.bytes + l.bytes, color: prev.color ?? l.color });
    }

    const commits = await fetchRepoCommitCount(config.username, r.name);
    rawProjects.push({
      name: r.name,
      description: r.description ?? '',
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      commits,
      updatedAt: r.pushed_at ?? r.updated_at ?? '',
      tags: mergeTags({ languages: repoLangs, topics: Array.isArray(r.topics) ? r.topics : [] }, config.priorityTopics),
      isPinned: false,
      isPrivate: Boolean(r.private),
      isFork: Boolean(r.fork),
      languages: repoLangs,
    });
  }

  // Approximate recent public activity from REST events
  const activeDates = new Set<string>();
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  let recentCommits = 0;
  let recentPrs = 0;

  for (const ev of events) {
    const dt = new Date(ev.created_at);
    if (Number.isNaN(dt.getTime())) continue;
    const mon0 = (dt.getUTCDay() + 6) % 7;
    const count = ev.type === 'PushEvent' ? Math.max(1, ev.payload?.size ?? 1) : 1;
    weekdayTotals[mon0] += count;
    activeDates.add(isoDate(dt));
    if (ev.type === 'PushEvent') recentCommits += count;
    if (ev.type === 'PullRequestEvent' && ev.payload?.action === 'opened') recentPrs++;
  }

  const maxCount = Math.max(...weekdayTotals);
  const peakDay = maxCount > 0 ? weekdayTotals.indexOf(maxCount) : -1;
  const weekly: WeekdayStat[] = weekdayTotals.map((count, dayIndex) => ({
    dayIndex,
    count,
    isPeak: dayIndex === peakDay,
  }));

  const totalCommits = Math.max(
    recentCommits,
    rawProjects.reduce((sum, p) => sum + p.commits, 0),
  );
  const { activeCount, pages } = buildProjectPages(rawProjects, config);
  const languages = computeLanguagesWithDelta(
    rawLangs,
    historyPath,
    config.maxLanguages,
    config.languageDeltaDays,
    true,
    now,
  );

  return {
    version: 1,
    generatedAt: now.toISOString(),
    source: 'rest',
    user: {
      login: user.login,
      name: user.name ?? config.displayName,
      createdAt: user.created_at,
      avatarUrl,
      avatarBase64,
    },
    metrics: {
      commits12m: totalCommits,
      repositories: rawProjects.length,
      pullRequests: recentPrs,
      activeDaysPercent: Math.round((activeDates.size / 365) * 100),
      bestStreakDays: activeDates.size > 0 ? Math.min(activeDates.size, 7) : 0,
      totalStars,
      memberSince: new Date(user.created_at).getUTCFullYear() || config.memberSinceFallback,
    },
    languages,
    weekly,
    publicRepoCount: rawProjects.filter((p) => !p.isPrivate).length,
    activeProjectCount: activeCount,
    projectPages: pages,
  };
}

export function buildDemoSnapshot(config: HudConfig): HudSnapshot {
  const demoProjects: RawProject[] = [
    {
      name: 'hud-profile-engine',
      description: 'Dynamic CoD Advanced Warfare SVG HUD generator for GitHub READMEs.',
      stars: 24,
      forks: 4,
      commits: 68,
      updatedAt: '2026-11-16T12:00:00Z',
      tags: ['TypeScript', 'SVG', 'Actions'],
      isPinned: true,
      isPrivate: false,
      isFork: false,
      languages: [],
    },
    {
      name: 'cloud-inventory-net',
      description: 'Clean architecture REST API & Blazor admin dashboard with Supabase.',
      stars: 14,
      forks: 2,
      commits: 94,
      updatedAt: '2026-11-02T18:30:00Z',
      tags: ['C# (.NET)', 'Blazor', 'Supabase'],
      isPinned: true,
      isPrivate: false,
      isFork: false,
      languages: [],
    },
    {
      name: 'spring-order-service',
      description: 'Microservice architecture with Java Spring Boot, PostgreSQL & Docker.',
      stars: 9,
      forks: 1,
      commits: 52,
      updatedAt: '2026-10-14T09:15:00Z',
      tags: ['Java', 'PostgreSQL', 'Docker'],
      isPinned: false,
      isPrivate: false,
      isFork: false,
      languages: [],
    },
    {
      name: 'react-task-board',
      description: 'Kanban workflow client in React + TypeScript with local state sync.',
      stars: 6,
      forks: 1,
      commits: 41,
      updatedAt: '2026-09-20T15:00:00Z',
      tags: ['TypeScript', 'React', 'CSS'],
      isPinned: false,
      isPrivate: false,
      isFork: false,
      languages: [],
    },
    {
      name: 'node-webhook-relay',
      description: 'Lightweight Node.js event relay and queue processor for CI alerts.',
      stars: 5,
      forks: 0,
      commits: 33,
      updatedAt: '2026-08-19T11:10:00Z',
      tags: ['Node.js', 'TypeScript', 'Docker'],
      isPinned: false,
      isPrivate: false,
      isFork: false,
      languages: [],
    },
    {
      name: 'sql-query-bench',
      description: 'Indexing benchmark suite comparing PostgreSQL and MySQL plans.',
      stars: 4,
      forks: 1,
      commits: 27,
      updatedAt: '2026-07-08T14:20:00Z',
      tags: ['PostgreSQL', 'MySQL', 'SQL'],
      isPinned: false,
      isPrivate: false,
      isFork: false,
      languages: [],
    },
    {
      name: 'uml-architecture-kit',
      description: 'Software engineering patterns and C4 architecture diagrams.',
      stars: 3,
      forks: 0,
      commits: 19,
      updatedAt: '2026-06-12T10:00:00Z',
      tags: ['Java', 'Design Patterns'],
      isPinned: false,
      isPrivate: false,
      isFork: false,
      languages: [],
    },
    {
      name: 'dotnet-auth-starter',
      description: 'Reusable JWT and role-based access template for .NET Web APIs.',
      stars: 2,
      forks: 0,
      commits: 22,
      updatedAt: '2026-05-03T17:45:00Z',
      tags: ['C#', '.NET', 'REST'],
      isPinned: false,
      isPrivate: false,
      isFork: false,
      languages: [],
    },
  ];

  const { activeCount, pages } = buildProjectPages(demoProjects, config);
  const weeklyCounts = [52, 64, 58, 81, 45, 24, 18];

  return {
    version: 1,
    generatedAt: '2026-11-16T12:00:00Z',
    source: 'demo',
    user: {
      login: config.username,
      name: config.displayName,
      createdAt: '2023-03-16T22:32:30Z',
      avatarUrl: `https://github.com/${config.username}.png?size=64`,
    },
    metrics: {
      commits12m: 342,
      repositories: 8,
      pullRequests: 28,
      activeDaysPercent: 68,
      bestStreakDays: 14,
      totalStars: 67,
      memberSince: 2023,
    },
    languages: [
      { name: 'TypeScript', bytes: 48000, percent: 48.0, delta30d: 3.4, color: LANG_COLORS.TypeScript },
      { name: 'C#', bytes: 27000, percent: 27.0, delta30d: -2.1, color: LANG_COLORS['C#'] },
      { name: 'Java', bytes: 16000, percent: 16.0, delta30d: 0.8, color: LANG_COLORS.Java },
      { name: 'HTML / SQL', bytes: 9000, percent: 9.0, delta30d: 0.0, color: LANG_COLORS.HTML },
    ],
    weekly: weeklyCounts.map((count, dayIndex) => ({
      dayIndex,
      count,
      isPeak: dayIndex === 3,
    })),
    publicRepoCount: 8,
    activeProjectCount: activeCount,
    projectPages: pages,
  };
}

export async function collectHudSnapshot(
  config: HudConfig,
  rootDir: string,
  options: { offline?: boolean; demo?: boolean } = {},
): Promise<HudSnapshot> {
  if (options.demo) return buildDemoSnapshot(config);

  const cachePath = resolve(rootDir, '.cache/snapshot.json');
  const historyPath = resolve(rootDir, 'history/languages-history.json');

  if (options.offline && existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, 'utf8')) as HudSnapshot;
    return { ...cached, source: 'cache' };
  }

  const token = process.env.HUD_TOKEN || process.env.GITHUB_TOKEN || '';
  try {
    let snapshot: HudSnapshot;
    if (token) {
      try {
        snapshot = await fetchGraphQL(token, config, historyPath);
      } catch (gqlErr) {
        console.warn(`[collect] GraphQL failed (${(gqlErr as Error).message}). Falling back to public REST.`);
        snapshot = await fetchPublicRest(config, historyPath);
      }
    } else {
      snapshot = await fetchPublicRest(config, historyPath);
    }

    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    return snapshot;
  } catch (err) {
    console.warn(`[collect] API fetch failed (${(err as Error).message}). Falling back to cache/baseline.`);
    if (existsSync(cachePath)) {
      const cached = JSON.parse(readFileSync(cachePath, 'utf8')) as HudSnapshot;
      return { ...cached, source: 'cache' };
    }
    // Minimal clean baseline if offline & no cache exists yet
    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      source: 'cache',
      user: {
        login: config.username,
        name: config.displayName,
        createdAt: `${config.memberSinceFallback}-01-01T00:00:00Z`,
        avatarUrl: `https://github.com/${config.username}.png?size=64`,
      },
      metrics: {
        commits12m: 0,
        repositories: 1,
        pullRequests: 0,
        activeDaysPercent: 0,
        bestStreakDays: 0,
        totalStars: 0,
        memberSince: config.memberSinceFallback,
      },
      languages: [],
      weekly: Array.from({ length: 7 }, (_, dayIndex) => ({ dayIndex, count: 0, isPeak: false })),
      publicRepoCount: 1,
      activeProjectCount: 0,
      projectPages: buildProjectPages([], config).pages,
    };
  }
}

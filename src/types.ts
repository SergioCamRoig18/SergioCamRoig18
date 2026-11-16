export type Lang = 'en' | 'es';

export interface LocalizedText {
  en: string;
  es: string;
}

export interface ProfileCardConfig {
  label: LocalizedText;
  value: LocalizedText;
  active?: boolean;
}

export interface TechCategoryConfig {
  label: LocalizedText;
  items: string;
  active?: boolean;
}

export interface HudConfig {
  username: string;
  displayName: string;
  shortTag: string;
  memberSinceFallback: number;
  subtitle: LocalizedText;
  links: {
    portfolio: string;
    linkedin: string;
    github: string;
  };
  profileCards: ProfileCardConfig[];
  techStack: TechCategoryConfig[];
  ignoredRepos: string[];
  maxLanguages: number;
  projectsPerPage: number;
  languageDeltaDays: number;
}

export interface LanguageStat {
  name: string;
  bytes: number;
  percent: number;
  delta30d: number;
  color: string | null;
}

export interface WeekdayStat {
  /** 0 = Monday .. 6 = Sunday */
  dayIndex: number;
  count: number;
  isPeak: boolean;
}

export interface ProjectCardData {
  slotNumber: number;
  isLocked: boolean;
  name: string;
  description: string;
  stars: number;
  forks: number;
  commits: number;
  updatedAt: string;
  tags: string[];
  isPinned: boolean;
}

export interface SummaryMetrics {
  commits12m: number;
  repositories: number;
  pullRequests: number;
  activeDaysPercent: number;
  bestStreakDays: number;
  totalStars: number;
  memberSince: number;
}

export interface HudSnapshot {
  version: number;
  generatedAt: string;
  source: 'graphql' | 'rest' | 'cache' | 'demo';
  user: {
    login: string;
    name: string;
    createdAt: string;
    avatarUrl?: string;
    avatarBase64?: string;
  };
  metrics: SummaryMetrics;
  languages: LanguageStat[];
  weekly: WeekdayStat[];
  publicRepoCount: number;
  activeProjectCount: number;
  projectPages: ProjectCardData[][];
}

export interface LanguageHistoryEntry {
  date: string;
  percentages: Record<string, number>;
}

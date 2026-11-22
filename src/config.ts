import type { HudConfig } from './types.ts';

export const HUD_CONFIG: HudConfig = {
  username: 'SergioCamRoig18',
  displayName: 'Sergio Camacho Roig',
  shortTag: 'SCR',
  memberSinceFallback: 2023,
  subtitle: {
    en: 'Software Engineering · 4th Year Student',
    es: 'Ingeniería del Software · 4º Curso',
  },
  links: {
    portfolio: 'https://sergiocamroig18.github.io',
    linkedin: 'https://www.linkedin.com/in/sergio-camacho-roig-343550318/',
    github: 'https://github.com/SergioCamRoig18',
  },
  profileCards: [
    {
      label: { en: 'Education', es: 'Formación' },
      value: {
        en: 'B.Sc. Computer Engineering · 4th Year',
        es: 'Grado en Ing. Informática · 4º Curso',
      },
    },
    {
      label: { en: 'Specialization', es: 'Especialización' },
      value: {
        en: 'Software Engineering Track',
        es: 'Rama de Ingeniería del Software',
      },
    },
    {
      label: { en: 'Location & Languages', es: 'Ubicación e Idiomas' },
      value: {
        en: 'Spain · Spanish (Native) / English',
        es: 'España · Español (Nativo) / Inglés',
      },
    },
    {
      label: { en: 'Portfolio & Links', es: 'Portfolio y Enlaces' },
      value: {
        en: 'Web Portfolio · LinkedIn · GitHub',
        es: 'Web Portfolio · LinkedIn · GitHub',
      },
    },
  ],
  techStack: [
    {
      label: { en: 'Backend & Core', es: 'Backend y Core' },
      items: 'Java · C# (.NET) · Node.js',
    },
    {
      label: { en: 'Frontend & UI', es: 'Frontend e Interfaz' },
      items: 'TypeScript · React · Blazor · HTML/CSS',
    },
    {
      label: { en: 'Databases', es: 'Bases de Datos' },
      items: 'PostgreSQL · MySQL · Supabase',
    },
    {
      label: { en: 'DevOps & QA', es: 'DevOps y QA' },
      items: 'Git · GitHub · Docker',
    },
  ],
  // Profile special repo is excluded from Featured Projects unless explicitly pinned
  ignoredRepos: ['SergioCamRoig18'],
  // Ordered tech-topic priority map (slug -> formatted badge label) for Featured Projects cards
  priorityTopics: {
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    java: 'Java',
    csharp: 'C#',
    'c-sharp': 'C#',
    dotnet: '.NET',
    python: 'Python',
    react: 'React',
    blazor: 'Blazor',
    nextjs: 'Next.js',
    vue: 'Vue',
    angular: 'Angular',
    svelte: 'Svelte',
    threejs: 'Three.js',
    'three-js': 'Three.js',
    webgl: 'WebGL',
    leaflet: 'Leaflet',
    nodejs: 'Node.js',
    'node-js': 'Node.js',
    'spring-boot': 'Spring Boot',
    spring: 'Spring',
    vite: 'Vite',
    postgresql: 'PostgreSQL',
    postgres: 'PostgreSQL',
    mysql: 'MySQL',
    supabase: 'Supabase',
    mongodb: 'MongoDB',
    sql: 'SQL',
    docker: 'Docker',
    kubernetes: 'Kubernetes',
    graphql: 'GraphQL',
    tailwindcss: 'Tailwind',
    tailwind: 'Tailwind',
    'cloudflare-pages': 'Cloudflare',
    'cloudflare-workers': 'Cloudflare',
    cloudflare: 'Cloudflare',
    'github-actions': 'Actions',
  },
  maxLanguages: 4,
  projectsPerPage: 6,
  languageDeltaDays: 30,
};

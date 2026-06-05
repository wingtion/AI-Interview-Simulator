// Single source of truth for interview arenas (modes) and editor languages.
// Home (bento grid) and Interview (lobby + persona + editor) both read from here
// so the three never drift apart. The .NET backend (GroqAiService) holds the
// matching system-prompt persona keyed by the same `id`.

export interface ArenaTag {
    label: string;
}

export type ArenaLevel = 'hard' | 'medium' | 'expert' | 'soft' | 'info';
export type ArenaCategory = 'company' | 'domain' | 'core';

export interface Arena {
    id: string;             // modeParam — must match the backend switch + the /interview/:id URL
    emoji: string;
    title: string;          // card heading + lobby dropdown label
    desc: string;           // card description
    category: ArenaCategory;                            // drives the icon accent tint
    difficulty: { label: string; level: ArenaLevel };  // rendered as the corner badge
    tags?: ArenaTag[];      // optional topic chips along the bottom
    coding: boolean;        // false = conversation only (editor + language picker hidden)
    fixedLanguage?: string; // forces the editor language and hides the picker (e.g. SQL, YAML)
    persona: { name: string; tagline: string };
    span?: string;          // bento layout sizing class
    resume?: boolean;       // opens the résumé upload modal instead of navigating
}

// Order matters: it drives the bento auto-placement (Google = wide hero top-left,
// Résumé = accent top-right, then six singles fill a clean 3×3 with no gaps).
export const ARENAS: Arena[] = [
    {
        id: 'Google',
        emoji: '🧠',
        title: 'Google Algorithms',
        desc: 'Data structures, graph traversals, and shaving down your Big-O. Strict and rigorous.',
        category: 'company',
        difficulty: { label: 'Hard', level: 'hard' },
        tags: [{ label: 'Dijkstra' }, { label: 'DP' }],
        coding: true,
        persona: { name: 'Senior Google Engineer', tagline: 'Rigorous · Big-O obsessed' },
        span: 'span-2',
    },
    {
        id: 'Resume',
        emoji: '📄',
        title: 'Grill My Résumé',
        desc: 'Upload your PDF résumé. The AI digs into your real projects and grills you on them.',
        category: 'core',
        difficulty: { label: 'Personalized', level: 'soft' },
        coding: true,
        persona: { name: 'Hiring Manager', tagline: 'Grilling your résumé' },
        resume: true,
    },
    {
        id: 'Meta',
        emoji: '⚛️',
        title: 'Meta Frontend',
        desc: 'Build a real interactive UI component. React, state management, and product sense.',
        category: 'company',
        difficulty: { label: 'Hard', level: 'hard' },
        tags: [{ label: 'React' }],
        coding: true,
        persona: { name: 'Meta Frontend Engineer', tagline: 'UI craft · product sense' },
    },
    {
        id: 'SystemDesign',
        emoji: '🏗️',
        title: 'System Design',
        desc: 'Architect systems that scale — caching, sharding, load balancing, and trade-offs.',
        category: 'domain',
        difficulty: { label: 'Expert', level: 'expert' },
        coding: false,
        persona: { name: 'Principal Engineer', tagline: 'Architecture & scale' },
    },
    {
        id: 'SQL',
        emoji: '🗄️',
        title: 'SQL & Data',
        desc: 'Write real queries against a schema — joins, aggregation, indexes, window functions.',
        category: 'domain',
        difficulty: { label: 'Medium', level: 'medium' },
        tags: [{ label: 'Queries' }],
        coding: true,
        fixedLanguage: 'sql',
        persona: { name: 'Data Engineer', tagline: 'Queries · data modeling' },
    },
    {
        id: 'Amazon',
        emoji: '📦',
        title: 'Amazon Leadership',
        desc: "Behavioral deep-dive on Amazon's Leadership Principles, structured with STAR. No code.",
        category: 'company',
        difficulty: { label: 'Behavioral', level: 'soft' },
        coding: false,
        persona: { name: 'Amazon Bar Raiser', tagline: 'Leadership Principles · STAR' },
    },
    {
        id: 'DevOps',
        emoji: '☁️',
        title: 'DevOps & Cloud',
        desc: 'CI/CD pipelines, containers, and infra-as-code. Ship it — or debug a broken deploy.',
        category: 'domain',
        difficulty: { label: 'Hard', level: 'hard' },
        tags: [{ label: 'Cloud' }],
        coding: true,
        fixedLanguage: 'yaml',
        persona: { name: 'Platform / SRE Lead', tagline: 'CI/CD · reliability' },
    },
    {
        id: 'Startup',
        emoji: '🚀',
        title: 'Startup Velocity',
        desc: 'Ship a feature fast. Pragmatic full-stack work — React, Node, clean readable code.',
        category: 'core',
        difficulty: { label: 'Medium', level: 'medium' },
        coding: true,
        persona: { name: 'Startup CTO', tagline: 'Speed & shipping' },
    },
];

// Languages offered in the lobby picker (Monaco language ids).
export const LANGUAGES: { id: string; label: string }[] = [
    { id: 'javascript', label: 'JavaScript' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'python', label: 'Python' },
    { id: 'java', label: 'Java' },
    { id: 'csharp', label: 'C#' },
    { id: 'cpp', label: 'C++' },
    { id: 'go', label: 'Go' },
    { id: 'rust', label: 'Rust' },
];

// Labels for every language we can land in, including fixed-only ones (sql, yaml).
export const LANG_LABEL: Record<string, string> = {
    ...Object.fromEntries(LANGUAGES.map((l) => [l.id, l.label])),
    sql: 'SQL',
    yaml: 'YAML',
};

const DEFAULT_PERSONA = { emoji: '🎯', name: 'Technical Interviewer', tagline: 'Friendly but professional' };

const arenaById = (mode: string): Arena | undefined => ARENAS.find((a) => a.id === mode);

// Comment leader differs per language so the starter snippet isn't a syntax error.
const commentLeader = (lang: string): string => {
    if (lang === 'python' || lang === 'yaml') return '#';
    if (lang === 'sql') return '--';
    return '//';
};

export const starterFor = (lang: string): string =>
    `${commentLeader(lang)} The interviewer will give you a problem. Write your solution here…\n`;

export const personaFor = (mode: string) => {
    const a = arenaById(mode);
    return a ? { emoji: a.emoji, name: a.persona.name, tagline: a.persona.tagline } : DEFAULT_PERSONA;
};

// Standard (the lobby default) and any unknown mode are coding modes.
export const isCodingMode = (mode: string): boolean => arenaById(mode)?.coding ?? true;

export const fixedLanguageFor = (mode: string): string | undefined => arenaById(mode)?.fixedLanguage;

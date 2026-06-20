// Loaders đọc dữ liệu từ /content (repo root). Grok ghi vào content/news/*.json mỗi ngày.
import profileJson from '../../content/profile.json';
import profileEnJson from '../../content/profile.en.json';
import newsIndexJson from '../../content/news/index.json';
import type { Lang } from '../i18n/ui';

/** Profile theo ngôn ngữ. VI = nguồn gốc, JA fallback về EN. */
export function getProfile(lang: Lang) {
  if (lang === 'vi') return profileJson as any;
  return profileEnJson as any; // en + ja đều dùng EN profile
}

export interface NewsItem {
  title: string;
  summary: string;
  source: string;
  tags: string[];
  importance?: number;
}

/** Data-driven content block. LLM emits DATA only; ContentBlocks.astro renders. */
export interface ContentBlock {
  type: 'callout' | 'chart' | 'comparison' | 'flow' | 'step' | 'sequence' | 'architecture';
  id: string;
  caption?: string;
  variant?: 'insight' | 'warning' | 'tradeoff' | 'fact';
  title?: string;
  body?: string;
  chart?: { variant: 'bar' | 'line'; unit?: string; data: { label: string; value: number }[] };
  comparison?: { left: ComparisonCol; right: ComparisonCol };
  flow?: { steps: { label: string; desc?: string }[] };
  step?: { items: { label: string; body: string }[] };
  sequence?: {
    actors: { id: string; label: string }[];
    events: { phase: number; from: string; to?: string; label: string; kind?: 'request' | 'internal' | 'response' | 'event' }[];
  };
  architecture?: {
    components: { id: string; label: string; kind?: 'orchestrator' | 'reasoner' | 'control' | 'side-effect' | 'storage' | 'external' }[];
    connections: { from: string; to: string; label?: string; type?: 'sync' | 'async' | 'event' | 'control' | 'data' }[];
  };
}
export interface ComparisonCol { title: string; points: string[]; }

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  contentMarkdown: string;
  tags: string[];
  readingTimeMin?: number;
  coverImage?: string | null;
  coverKeywords?: string[];
  interactiveBlock?: string | null;
  tldr?: string[];
  blocks?: ContentBlock[];
  mechanismGif?: string | null;
}

/** Slim listing type — no contentMarkdown/blocks/tldr. Used for blog index + news listing. */
export interface BlogListing {
  date: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  readingTimeMin?: number | null;
  coverImage?: string | null;
  coverKeywords?: string[];
}

export interface FinanceNewsItem {
  title: string;
  summary: string;
  source: string;
  tags: string[];
  importance?: number;
  category?: 'fintech' | 'crypto' | 'vc-startup' | 'market' | 'macro';
}

export interface DailyContent {
  date: string;
  generatedBy?: string;
  version?: number;
  news?: NewsItem[];
  financeNews?: FinanceNewsItem[];
  blog?: BlogPost | null;
  expUpdate?: { summary?: string; skills?: string[]; highlights?: string[] } | null;
}

export const profile = profileJson as any;

/** Slim blog listing from pre-built index — no contentMarkdown/blocks loaded. */
export function getBlogListing(): BlogListing[] {
  return (newsIndexJson as any).posts as BlogListing[];
}

// Vite glob: pattern bắt đầu bằng "/" tính từ project root.
const dailyModules = import.meta.glob<DailyContent>('/content/news/*.json', { eager: true });
// Essays: standalone deep-dive posts from gen-blog-agent (content/essays/*.json)
const essayModules = import.meta.glob<{ date: string; type: string; blog?: BlogPost | null }>('/content/essays/*.json', { eager: true });

function isDaily(d: any): d is DailyContent {
  return d && typeof d === 'object' && typeof d.date === 'string';
}

/** Tất cả file daily, mới nhất trước. */
export function getDailyContent(): DailyContent[] {
  return Object.values(dailyModules)
    .map((m: any) => (m && m.default ? m.default : m))
    .filter(isDaily)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Gộp toàn bộ news từ mọi ngày, mới nhất trước, kèm ngày. */
export function getAllNews(): (NewsItem & { date: string })[] {
  return getDailyContent()
    .flatMap((d) => (d.news ?? []).map((n) => ({ ...n, date: d.date })))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Resolve blog post cho 1 daily entry theo lang, với fallback về VI source.
 *  Language-agnostic fields (interactiveBlock, coverKeywords, coverImage)
 *  được inherit từ VI source nếu bản dịch chưa có. */
function resolvePost(d: DailyContent, lang: Lang): BlogPost | null {
  const vi = d.blog && d.blog.slug ? d.blog : null;

  if (lang === 'ja') {
    const ja = (d as any)['blog.ja'];
    if (ja && ja.slug) return {
      ...ja,
      interactiveBlock: ja.interactiveBlock ?? vi?.interactiveBlock ?? null,
      coverKeywords:    ja.coverKeywords    ?? vi?.coverKeywords,
      coverImage:       ja.coverImage       ?? vi?.coverImage ?? null,
      tldr:             ja.tldr             ?? vi?.tldr,
      blocks:           ja.blocks           ?? vi?.blocks,
    } as BlogPost;
  }
  if (lang === 'en') {
    const en = (d as any)['blog.en'];
    if (en && en.slug) return {
      ...en,
      interactiveBlock: en.interactiveBlock ?? vi?.interactiveBlock ?? null,
      coverKeywords:    en.coverKeywords    ?? vi?.coverKeywords,
      coverImage:       en.coverImage       ?? vi?.coverImage ?? null,
      tldr:             en.tldr             ?? vi?.tldr,
      blocks:           en.blocks           ?? vi?.blocks,
    } as BlogPost;
  }
  return vi;
}

/** Resolve language variant for a standalone essay (supports blog.en / blog.ja inside the essay JSON, with fallback to base blog). */
function resolveEssay(e: any, lang: Lang): BlogPost | null {
  if (!e || !e.blog?.slug) return null;
  const base = e.blog as BlogPost;

  if (lang === 'en') {
    const en = (e as any)['blog.en'];
    if (en && en.slug) {
      return {
        ...base,
        ...en,
        interactiveBlock: en.interactiveBlock ?? base.interactiveBlock ?? null,
        coverKeywords: en.coverKeywords ?? base.coverKeywords,
        coverImage: en.coverImage ?? base.coverImage ?? null,
        tldr: en.tldr ?? base.tldr,
        blocks: en.blocks ?? base.blocks,
      } as BlogPost;
    }
  }
  if (lang === 'ja') {
    const ja = (e as any)['blog.ja'];
    if (ja && ja.slug) {
      return {
        ...base,
        ...ja,
        interactiveBlock: ja.interactiveBlock ?? base.interactiveBlock ?? null,
        coverKeywords: ja.coverKeywords ?? base.coverKeywords,
        coverImage: ja.coverImage ?? base.coverImage ?? null,
        tldr: ja.tldr ?? base.tldr,
        blocks: ja.blocks ?? base.blocks,
      } as BlogPost;
    }
  }
  return base;
}

/** Essays từ content/essays/ (deep-dive posts từ gen-blog-agent). Lang-aware with fallback. */
function getEssayPosts(lang: Lang = 'vi'): (BlogPost & { date: string })[] {
  return Object.values(essayModules)
    .map((m: any) => {
      const e = m && m.default ? m.default : m;
      const post = resolveEssay(e, lang);
      if (!post) return null;
      return { ...post, date: e.date ?? '' } as BlogPost & { date: string };
    })
    .filter((p): p is BlogPost & { date: string } => p !== null);
}

/** Tất cả blog post (daily + essays), mới nhất trước, kèm ngày. Lang-aware với fallback VI. */
export function getAllPosts(lang: Lang = 'vi'): (BlogPost & { date: string })[] {
  const daily = getDailyContent()
    .map((d) => {
      const post = resolvePost(d, lang);
      return post ? { ...post, date: d.date } : null;
    })
    .filter((p): p is BlogPost & { date: string } => p !== null);
  const essays = getEssayPosts(lang);
  return [...daily, ...essays].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string, lang: Lang = 'vi') {
  return getAllPosts(lang).find((p) => p.slug === slug);
}

/** Static paths helper: tất cả slugs (dùng cho getStaticPaths). */
export function getAllSlugs(): string[] {
  const daily = getDailyContent()
    .filter((d) => d.blog && d.blog.slug)
    .map((d) => d.blog!.slug);
  const essays = getEssayPosts() // slugs are language-independent
    .map((e) => e.slug);
  return Array.from(new Set([...daily, ...essays]));
}

/** Gộp toàn bộ finance news từ mọi ngày, mới nhất trước, kèm ngày. */
export function getAllFinanceNews(): (FinanceNewsItem & { date: string })[] {
  return getDailyContent()
    .flatMap((d) => (d.financeNews ?? []).map((n) => ({ ...n, date: d.date })))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Trả về danh sách locale có nội dung THẬT (không phải fallback VI) cho slug đó.
 *  Dùng cho hreflang integrity và noindex decision ở [slug].astro. */
export function getPostNativeLocales(slug: string): Lang[] {
  // Check daily content
  for (const m of Object.values(dailyModules)) {
    const d: any = (m as any).default ?? m;
    if (!isDaily(d)) continue;
    if (d.blog?.slug === slug) {
      const locales: Lang[] = ['vi'];
      if ((d as any)['blog.en']?.slug) locales.push('en');
      if ((d as any)['blog.ja']?.slug) locales.push('ja');
      return locales;
    }
  }
  // Check essays
  for (const m of Object.values(essayModules)) {
    const e: any = (m as any).default ?? m;
    if (e?.blog?.slug === slug) {
      const locales: Lang[] = ['vi'];
      if ((e as any)['blog.en']?.slug) locales.push('en');
      if ((e as any)['blog.ja']?.slug) locales.push('ja');
      return locales;
    }
  }
  return ['vi'];
}

/** expUpdate gần nhất (nếu có) để show trên trang Experience. */
export function getLatestExpUpdate() {
  for (const d of getDailyContent()) {
    if (d.expUpdate && (d.expUpdate.summary || (d.expUpdate.skills ?? []).length || (d.expUpdate.highlights ?? []).length)) {
      return { ...d.expUpdate, date: d.date };
    }
  }
  return null;
}

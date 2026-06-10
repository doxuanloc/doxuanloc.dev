// Loaders đọc dữ liệu từ /content (repo root). Grok ghi vào content/news/*.json mỗi ngày.
import profileJson from '../../content/profile.json';
import profileEnJson from '../../content/profile.en.json';
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

// Vite glob: pattern bắt đầu bằng "/" tính từ project root.
const dailyModules = import.meta.glob<DailyContent>('/content/news/*.json', { eager: true });

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

/** Resolve blog post cho 1 daily entry theo lang, với fallback về VI source. */
function resolvePost(d: DailyContent, lang: Lang): BlogPost | null {
  if (lang === 'ja') {
    const ja = (d as any)['blog.ja'];
    if (ja && ja.slug) return ja as BlogPost;
  }
  if (lang === 'en') {
    const en = (d as any)['blog.en'];
    if (en && en.slug) return en as BlogPost;
  }
  return d.blog && d.blog.slug ? d.blog : null;
}

/** Tất cả blog post, mới nhất trước, kèm ngày. Lang-aware với fallback VI. */
export function getAllPosts(lang: Lang = 'vi'): (BlogPost & { date: string })[] {
  return getDailyContent()
    .map((d) => {
      const post = resolvePost(d, lang);
      return post ? { ...post, date: d.date } : null;
    })
    .filter((p): p is BlogPost & { date: string } => p !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string, lang: Lang = 'vi') {
  return getAllPosts(lang).find((p) => p.slug === slug);
}

/** Static paths helper: tất cả slugs (dùng cho getStaticPaths). */
export function getAllSlugs(): string[] {
  return getDailyContent()
    .filter((d) => d.blog && d.blog.slug)
    .map((d) => d.blog!.slug);
}

/** Gộp toàn bộ finance news từ mọi ngày, mới nhất trước, kèm ngày. */
export function getAllFinanceNews(): (FinanceNewsItem & { date: string })[] {
  return getDailyContent()
    .flatMap((d) => (d.financeNews ?? []).map((n) => ({ ...n, date: d.date })))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
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

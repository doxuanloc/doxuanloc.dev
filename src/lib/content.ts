// Loaders đọc dữ liệu từ /content (repo root). Grok ghi vào content/news/*.json mỗi ngày.
import profileJson from '../../content/profile.json';
import profileEnJson from '../../content/profile.en.json';
import type { Lang } from '../i18n/ui';

/** Profile theo ngôn ngữ. EN mặc định, VI là nguồn gốc nội dung. */
export function getProfile(lang: Lang) {
  return (lang === 'vi' ? profileJson : profileEnJson) as any;
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
}

export interface DailyContent {
  date: string;
  generatedBy?: string;
  version?: number;
  news?: NewsItem[];
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

/** Tất cả blog post, mới nhất trước, kèm ngày. */
export function getAllPosts(): (BlogPost & { date: string })[] {
  return getDailyContent()
    .filter((d) => d.blog && d.blog.slug)
    .map((d) => ({ ...(d.blog as BlogPost), date: d.date }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string) {
  return getAllPosts().find((p) => p.slug === slug);
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

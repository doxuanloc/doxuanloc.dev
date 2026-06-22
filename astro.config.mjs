// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function readNewsDir() {
  const dir = join(process.cwd(), 'content/news');
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.json') && f !== 'index.json')
      .map(f => { try { return JSON.parse(readFileSync(join(dir, f), 'utf-8')); } catch { return null; } })
      .filter(Boolean);
  } catch { return []; }
}

function readEssayDir() {
  const dir = join(process.cwd(), 'content/essays');
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => { try { return JSON.parse(readFileSync(join(dir, f), 'utf-8')); } catch { return null; } })
      .filter(Boolean);
  } catch { return []; }
}

const allDailyContent = readNewsDir();
const allEssays = readEssayDir();

// Slugs that have real EN translation → eligible for EN sitemap entries
const enBlogSlugs = new Set([
  ...allDailyContent.filter(d => d['blog.en']?.slug).map(d => d['blog.en'].slug),
  ...allEssays.filter(e => e['blog.en']?.slug).map(e => e['blog.en'].slug),
]);

// slug → YYYY-MM-DD for sitemap lastmod
const slugToDate = new Map([
  ...allDailyContent.filter(d => d.blog?.slug).map(d => [d.blog.slug, d.date]),
  ...allEssays.filter(e => e.blog?.slug).map(e => [e.blog.slug, e.date]),
]);

// Đổi `site` thành domain thật khi deploy (Vercel/custom domain).
export default defineConfig({
  site: 'https://doxuanloc.space',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
  i18n: {
    locales: ['en', 'vi'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', vi: 'vi' } },
      // Drop EN blog post URLs with no real EN translation
      filter: (page) => {
        const m = page.match(/\/blog\/([^/]+)\/?$/);
        if (!m) return true;
        const isEnPath = !page.includes('/vi/blog/');
        if (isEnPath) return enBlogSlugs.has(m[1]);
        return true;
      },
      // Inject lastmod from post date — signals freshness to crawlers
      serialize: (item) => {
        const m = item.url.match(/\/blog\/([^/]+)\/?$/);
        if (m) {
          const date = slugToDate.get(m[1]);
          if (date) return { ...item, lastmod: date }; // YYYY-MM-DD — W3C sitemap date format
        }
        return item;
      },
    }),
  ],
});

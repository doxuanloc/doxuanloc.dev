// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Build set of blog slugs that have real EN content (blog.en.slug exists in daily JSON)
function getEnBlogSlugs() {
  const newsDir = join(process.cwd(), 'content/news');
  const slugs = new Set();
  try {
    const files = readdirSync(newsDir).filter(f => f.endsWith('.json') && f !== 'index.json');
    for (const f of files) {
      try {
        const d = JSON.parse(readFileSync(join(newsDir, f), 'utf-8'));
        if (d['blog.en']?.slug) slugs.add(d['blog.en'].slug);
      } catch {}
    }
  } catch {}
  return slugs;
}

import { readdirSync } from 'node:fs';
const enBlogSlugs = getEnBlogSlugs();

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
      // Drop EN blog post URLs that don't have a real EN translation — avoid indexing VI content under EN path
      filter: (page) => {
        const m = page.match(/\/blog\/([^/]+)\/?$/);
        if (!m) return true;
        const slug = m[1];
        const isEnPath = !page.includes('/vi/blog/');
        if (isEnPath) return enBlogSlugs.has(slug);
        return true; // always keep /vi/blog/* (VI is source)
      },
    }),
  ],
});

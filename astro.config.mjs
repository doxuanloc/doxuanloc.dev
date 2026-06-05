// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Đổi `site` thành domain thật khi deploy (Vercel/custom domain).
export default defineConfig({
  site: 'https://doxuanloc.dev',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
  integrations: [sitemap()],
});

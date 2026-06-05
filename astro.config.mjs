// @ts-check
import { defineConfig } from 'astro/config';

// Đổi `site` thành domain thật khi deploy (Vercel/custom domain).
export default defineConfig({
  site: 'https://portfolio-doxuanloc.vercel.app',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});

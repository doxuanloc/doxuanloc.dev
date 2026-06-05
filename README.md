# Portfolio — Đỗ Xuân Lộc (tự cập nhật hàng ngày)

Portfolio cá nhân vận hành theo mô hình **multi-AI**:

- **Grok** — content-engine: mỗi ngày dùng web search realtime quét tin công nghệ + viết blog theo contract JSON.
- **Claude** — architect/implementer: thiết kế kiến trúc, build site (Astro), dựng pipeline.

## Stack
- [Astro](https://astro.build) — static, content-first, deploy Vercel.
- Nội dung từ `content/` (JSON) → render lúc build.

## Cấu trúc
```
content/
  profile.json         # CV/identity/skills/experience/roadmap (nguồn trang Home + Experience)
  schema.json          # JSON Schema cho nội dung hàng ngày (guardrail)
  schema.example.json  # ví dụ contract cho Grok
  news/YYYY-MM-DD.json # nội dung Grok sinh mỗi ngày (news + blog + expUpdate)
src/
  pages/   layouts/   components/   lib/content.ts
scripts/
  validate-content.mjs # guardrail: chặn content sai trước khi deploy
  gen-today.mjs        # gọi Grok headless sinh nội dung hôm nay
.github/workflows/daily-content.yml  # cron hàng ngày
```

## Lệnh
```bash
npm install
npm run dev        # dev server
npm run build      # validate content -> astro build
npm run validate   # chỉ chạy guardrail
npm run gen:today  # sinh nội dung hôm nay bằng Grok (cần grok đã auth)
```

## Pipeline auto-publish
```
GitHub Action (cron 00:30 UTC)
  → cài Grok CLI → node scripts/gen-today.mjs (web search → JSON)
  → npm run validate (guardrail: schema + source URL + chống trùng slug + bảo mật)
  → git push → Vercel auto-deploy
```

## Bảo mật nội dung auto (guardrail "chặn mạnh")
Nội dung Grok tự sinh đi qua `scripts/validate-content.mjs` trước khi deploy:
- **expUpdate = "skill snapshot"** — chỉ thể hiện kỹ năng làm được, **không** lộ tên công ty/khách/dự án nội bộ, số liệu cụ thể. Mỗi highlight phải có động từ kỹ năng. Chỉ sinh Thứ 2/4/6.
- Blocklist tên nhạy cảm + phát hiện số liệu before→after → **fail build, không deploy**.
- Thêm tên cần ẩn vào `SENSITIVE_TERMS` trong `scripts/validate-content.mjs`.

## SEO / discoverability
- `sitemap-index.xml` (tự sinh), `robots.txt`, RSS `/rss.xml` (blog + tech radar).
- JSON-LD `Person` (mọi trang) + `BlogPosting` (trang blog), canonical + Open Graph/Twitter card.

## Setup deploy
1. Push repo lên GitHub.
2. Import vào [Vercel](https://vercel.com) (framework auto-detect: Astro).
3. Thêm GitHub Secret `XAI_API_KEY` (lấy ở https://console.x.ai) để Action chạy Grok.
4. (Tùy chọn) chạy tay: tab **Actions → Daily content → Run workflow**.

> ⚠️ Không commit API key. Dùng GitHub Secrets / biến môi trường.

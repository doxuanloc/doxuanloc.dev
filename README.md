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
npm run dev             # dev server
npm run build           # validate content -> astro build
npm run validate        # chỉ chạy guardrail
npm run gen:today       # sinh nội dung hôm nay bằng Grok CLI (OAuth, không cần API key)
npm run post:linkedin   # đăng blog hôm nay lên LinkedIn (độc lập)
npm run publish:today   # gen → validate → LinkedIn post → commit → push (1 lệnh, chạy tay hằng ngày)
```

## Pipeline (MVP: chạy tay ở local, KHÔNG cần API key)
Grok CLI auth bằng **OAuth** (`grok login`) nên không cần `XAI_API_KEY`. Mỗi ngày chạy:
```
npm run publish:today
  → grok CLI (web search → JSON)
  → validate (guardrail: schema + source URL + chống trùng slug + bảo mật)
  → post-to-linkedin.mjs (optional: chỉ chạy nếu LINKEDIN_* có trong .env)
  → git commit + push → host tự deploy
```
> GitHub Action (`workflow_dispatch`) chỉ là fallback chạy tay trên cloud — cần secret `XAI_API_KEY`. Đã bỏ cron để không phụ thuộc API key.

## LinkedIn Auto-Post (setup 1 lần)

Mỗi lần `publish:today` chạy, blog hôm nay sẽ tự post lên LinkedIn nếu đã setup.

### 1. Tạo LinkedIn Developer App
1. Truy cập https://www.linkedin.com/developers/ → Create app.
2. Tab **Products**: request cả 2 product:
   - **Share on LinkedIn** (unlock `w_member_social`)
   - **Sign In with LinkedIn using OpenID Connect** (unlock `openid profile`)
3. Tab **Auth** → thêm redirect URL: `http://localhost:8765/callback`
4. Chờ approval (vài giờ đến vài ngày).

### 2. Chạy setup
```bash
node scripts/setup-linkedin-auth.mjs
```
Script tự mở browser, nhận OAuth callback, lưu tokens vào `.env`.

### 3. Env vars (không commit)
```env
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REFRESH_TOKEN=...     # có hiệu lực 1 năm
LINKEDIN_PERSON_URN=urn:li:person:XXXX   # tự điền sau lần chạy đầu
```

### Thời điểm post tối ưu
Chạy `publish:today` vào **10:00–14:00 VN** (Thứ 3–5) để đạt engagement cao nhất.

### Behavior
- Nếu không có `LINKEDIN_*` trong `.env` → skip (không lỗi).
- Nếu ngày không có blog → skip.
- Idempotent: đã post rồi → skip (marker `linkedin.posted` trong JSON).
- LinkedIn fail → log warn, **không block** git push.
- Refresh token hết hạn sau 1 năm → re-run `setup-linkedin-auth.mjs`.

> ⚠️ Không commit `.env` hoặc token vào git.

## Bảo mật nội dung auto (guardrail "chặn mạnh")
Nội dung Grok tự sinh đi qua `scripts/validate-content.mjs` trước khi deploy:
- **expUpdate = "skill snapshot"** — chỉ thể hiện kỹ năng làm được, **không** lộ tên công ty/khách/dự án nội bộ, số liệu cụ thể. Mỗi highlight phải có động từ kỹ năng. Chỉ sinh Thứ 2/4/6.
- Blocklist tên nhạy cảm + phát hiện số liệu before→after → **fail build, không deploy**.
- Thêm tên cần ẩn vào `SENSITIVE_TERMS` trong `scripts/validate-content.mjs`.

## SEO / discoverability
- `sitemap-index.xml` (tự sinh), `robots.txt`, RSS `/rss.xml` (blog + tech radar).
- JSON-LD `Person` (mọi trang) + `BlogPosting` (trang blog), canonical + Open Graph/Twitter card.

## Setup deploy
1. Push repo lên GitHub (đã xong).
2. Import vào host tĩnh (Vercel/Netlify/Cloudflare Pages) — framework auto-detect: Astro. Mỗi lần `git push` sẽ tự build & deploy.
3. Nội dung hằng ngày: chạy `npm run publish:today` ở local (Grok CLI OAuth, không cần API key).

> ⚠️ Không commit API key. `XAI_API_KEY` chỉ cần nếu chạy workflow fallback trên cloud.

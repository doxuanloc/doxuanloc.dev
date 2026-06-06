# Codebase Overview — doxuanloc.space

> Tài liệu kỹ thuật cho Grok & Claude. Mô tả architecture, file structure, data flow.

## File Structure

```
portfolio/
├── content/
│   ├── profile.json          # Source of truth VI — identity, skills, journey, roadmap
│   ├── profile.en.json       # EN translation (Grok dịch từ profile.json)
│   └── news/
│       └── YYYY-MM-DD.json   # Daily auto-gen: news[], blog{}, expUpdate{}
│
├── src/
│   ├── layouts/
│   │   └── Base.astro        # Global layout — nav, footer, og:image, schema.org
│   ├── pages/
│   │   ├── index.astro       # Home
│   │   ├── journey.astro     # Journey page
│   │   ├── experience.astro  # CV/work history
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro  # Blog post static render
│   │   ├── news.astro        # Daily news + finance feed
│   │   ├── about.astro
│   │   └── vi/               # VI locale mirrors (same components, different lang)
│   ├── components/
│   │   ├── journey/
│   │   │   ├── JourneyPinned.astro   # Main scrollytelling component
│   │   │   ├── utils.ts              # resolveJourneyImage, prepareMilestones
│   │   │   └── types.ts              # Milestone, MilestoneRaw, JourneyChapter
│   │   ├── Hero.astro
│   │   ├── SiteBackground.astro
│   │   └── JourneyScene.astro        # Starfield canvas (journey page)
│   ├── lib/
│   │   └── content.ts        # getProfile(), getBlogPosts(), getLatestNews()
│   ├── i18n/
│   │   └── ui.ts             # i18n dictionary, getLangFromUrl(), useTranslations(), localizedPath()
│   └── styles/
│       └── global.css        # Design tokens, utility classes, animations
│
├── scripts/
│   ├── gen-today.mjs         # Grok CLI pipeline: gen news + blog + expUpdate
│   ├── validate-content.mjs  # JSON schema validation (chạy trước build)
│   └── deploy.sh             # Full pipeline: gen → validate → build → commit → push
│
├── public/
│   ├── images/
│   │   ├── journey/          # {milestone-id}.webp — auto-discovered bởi resolveJourneyImage()
│   │   └── me/               # Personal photos
│   └── robots.txt
│
├── docs/
│   ├── DISCOVERY.md          # Original project discovery doc
│   ├── ui-spec.md            # UI/UX spec (Grok soạn)
│   ├── ai-integration-spec.md # AI feature spec (Grok soạn 06/2026)
│   ├── decisions.md          # ADR log
│   └── codebase-overview.md  # File này
│
├── INSIGHT.md                # Project overview nhanh (Grok + Claude đọc đầu tiên)
├── CLAUDE.md                 # Claude instructions (project-level)
├── astro.config.mjs          # site URL, i18n, integrations
├── vercel.json               # CDN headers, cache rules
└── package.json
```

## Key Patterns

### i18n
```typescript
// Trong mọi page/component
const lang = getLangFromUrl(Astro.url);       // 'en' | 'vi'
const t = useTranslations(lang);               // t('nav.home') → "Home" | "Trang chủ"
const profile = getProfile(lang);             // load profile.json hoặc profile.en.json
localizedPath('/blog', lang)                  // '/' | '/vi' prefix
```

### Content loading
```typescript
// src/lib/content.ts
getProfile(lang)              // parse profile.json hoặc profile.en.json
getBlogPosts(lang, limit?)    // scan news/ JSONs, extract blog field
getLatestNews(lang, limit?)   // scan news/ JSONs, extract news[] + financeNews[]
```

### Journey image resolution
```typescript
// src/components/journey/utils.ts
resolvePublicPath(raw.photo)         // explicit path (/images/presenting.webp)
resolveJourneyImage(milestone.id)    // auto-discover /images/journey/{id}.webp
// Priority: resolvedPhoto > resolvedImage > generated SVG placeholder
```

### Design tokens (CSS)
```css
--bg: #04060e;          /* dark space background */
--accent: #5b8cff;      /* blue */
--accent-2: #36d6c3;    /* teal */
--accent-3: #b58cff;    /* purple */
--text: #e8eaf6;
--text-dim: #8892b0;
--text-mute: #4a5568;
--mono: 'JetBrains Mono', monospace;
--display: 'Tektur', sans-serif;
```

### Animation patterns
```html
<!-- Scroll reveal (IntersectionObserver) -->
<div data-reveal>...</div>

<!-- 3D tilt (mousemove, desktop only) -->
<div data-tilt>...</div>

<!-- CSS vars set by JS -->
<!-- --par-x/--par-y: parallax từ mousemove -->
<!-- --scroll-in: scroll-driven value trong journey panels -->
```

## Journey Pinned — Architecture

Journey page dùng **pinned scrollytelling**: `.jp-root { height: calc(var(--n) * 100vh) }` — tạo scroll space. Panel container sticky ở top, JS `render(scrollY)` tính opacity của từng panel theo vị trí scroll.

```
jp-root (height: n × 100vh)
  jp-sticky (position: sticky, height: 100dvh - 62px)
    jp-rail (desktop only: 256px, chapter nav)
    jp-stage (position: relative)
      jp-panel × n (position: absolute, opacity 0)
                    ← JS render() sets opacity 1:1 với scroll
```

**JS render loop:**
- `scrolled / scrollTotal` → `p` (0→1)
- `raw = p * n` → `i = floor(raw)`, `inPanel = raw - i` (0→1 within panel)
- Crossfade: panel `i` fades out trong BLEND=25% cuối, panel `i+1` fades in
- RAF-throttled, no CSS transition — instant scroll-locked feel

**Lazy loading:** Panels `i >= 1` có `img src` stripped, restored progressively qua `imgQueue` khi panel activate.

**Mobile:** Cùng sticky UX (không có rail sidebar). CSS `@media (max-width: 899px)` override layout.

## Content Pipeline

```
node scripts/gen-today.mjs
  → grok CLI --tools web_search,web_fetch,read,write
  → writes content/news/YYYY-MM-DD.json
  → node scripts/validate-content.mjs (JSON schema check)
  → npx astro build
  → git commit content/ + dist-ish changes
  → GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa_doxuanloc" git push origin main
  → Vercel auto-deploy
```

**Schema** (`content/news/YYYY-MM-DD.json`):
```json
{
  "date": "YYYY-MM-DD",
  "generatedBy": "grok",
  "news": [{ "title", "summary", "source", "tags", "importance" }],
  "financeNews": [{ "title", "summary", "source", "tags", "importance", "category" }],
  "blog": { "title", "slug", "summary", "tags", "body" },
  "expUpdate": { "skills": [], "note": "" }
}
```

## Vercel Config

`vercel.json` cấu hình CDN headers:
- `/_astro/*`: `immutable` (1 năm) — content-hashed bundles
- `/images/*`: `s-maxage=604800` (7 ngày CDN)
- HTML: `s-maxage=3600` + `stale-while-revalidate=86400`
- Security: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`

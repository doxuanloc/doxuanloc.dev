# INSIGHT — Portfolio doxuanloc.space

> Quick-reference cho Grok & Claude. Cập nhật khi có quyết định mới.

## Dự án

Portfolio cá nhân của Đỗ Xuân Lộc (AI & System Optimization Engineer). Static site tự cập nhật hàng ngày, vận hành bằng multi-AI pipeline.

**Live**: https://doxuanloc.space | **Repo**: doxuanloc/portfolio | **Deploy**: Vercel

## Trạng thái hiện tại (06/2026)

| Page | Trạng thái | Ghi chú |
|------|-----------|---------|
| `/` | 🔄 Renewal in progress | Home UI/UX renewal (web3/futuristic space style + rich scroll-driven animations & visit interactions). Master plan `docs/home-ui-renewal-plan.md` (research + catalog + phases). Detailed logic `docs/home-implementation-spec.md`. Claude implements per plan. |
| `/journey` | ✅ Done | Sticky scrollytelling, scroll-driven crossfade, mobile sticky |
| `/experience` | ✅ Done | Work history, education, tech stack |
| `/blog` | ✅ Done | Auto-gen daily (Grok), markdown render |
| `/news` | ✅ Done | Tech + finance radar, daily JSON, tags |
| `/about` | ✅ Done | Identity, stack, contact |
| AI integration | 🔜 P1 planned | Spec: docs/ai-integration-spec.md |

## Multi-AI Workflow

```
Grok CLI  →  gen-today.mjs  →  content/news/YYYY-MM-DD.json
                             →  content/news/YYYY-MM-DD.json (blog post)
Claude    →  implement, refactor, debug, components
User      →  priority, tie-breaker, approve architecture
```

- **Grok**: system thinking, spec, content gen, UI/UX review, architecture decisions
- **Claude**: implement, test, refactor, technical docs
- Mọi thay đổi lớn về UI/UX hoặc architecture: Grok spec trước

## Stack

- **Framework**: Astro 5, islands architecture, View Transitions
- **Deploy**: Vercel (static, sắp chuyển hybrid cho AI routes)
- **i18n**: EN mặc định (`/`), VI tại `/vi`
- **Fonts**: Be Vietnam Pro + Tektur (display) + JetBrains Mono
- **Theme**: Space/vũ trụ — `--bg: #04060e`, accent `#5b8cff`/`#36d6c3`/`#b58cff`
- **Content**: JSON files + markdown, source-of-truth ở `content/`

## Key Constraints

- ❌ Không WebGL / Three.js / GSAP (Lighthouse)
- ❌ Không số liệu bịa (metrics, thời gian cụ thể)
- ❌ Không commit tên công ty/khách/nội bộ
- ❌ Không paste API key, PII vào bất kỳ AI nào
- ✅ Lighthouse score phải giữ
- ✅ `prefers-reduced-motion` fallback cho mọi animation
- ✅ `expUpdate` = skill snapshot chung, không chi tiết dự án

## Links tới docs

- Architecture: [docs/codebase-overview.md](docs/codebase-overview.md)
- Decisions: [docs/decisions.md](docs/decisions.md)
- UI/UX spec: [docs/ui-spec.md](docs/ui-spec.md)
- AI integration spec: [docs/ai-integration-spec.md](docs/ai-integration-spec.md)

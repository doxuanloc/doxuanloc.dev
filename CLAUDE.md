# Portfolio — Claude Project Instructions

## Project
Portfolio cá nhân của Đỗ Xuân Lộc (doxuanloc.dev) — Astro 5 static site, tự cập nhật hàng ngày qua Grok CLI.

## Workflow
- **Grok** = design spec, content, architecture decisions, UI/UX review
- **Claude** = implement, refactor, test, debug
- **User** = priority, tie-breaker

→ **Bất kỳ task nào có planning/design** (UI mới, section mới, layout thay đổi): thảo luận với Grok trước, lấy spec rồi Claude mới implement.
→ Bug fix hoặc tweak nhỏ (< 30 phút, không thay đổi layout): Claude implement trực tiếp.
→ Claude KHÔNG tự lên kế hoạch UI/UX rồi implement — phải có Grok spec trước.

## Stack
- **Framework**: Astro 5, islands architecture, View Transitions
- **i18n**: EN mặc định (`/`), VI tại `/vi`, helper `localizedPath(path, lang)`
- **Fonts**: Be Vietnam Pro (body) + Tektur (display/HUD) + JetBrains Mono
- **Theme**: Space/vũ trụ — `--bg: #04060e`, accent xanh/teal/tím

## Key files
| File | Vai trò |
|------|---------|
| `content/profile.json` | Source of truth (VI) — identity, skills, journey, roadmap, solves |
| `content/profile.en.json` | EN translation (Grok dịch) |
| `src/i18n/ui.ts` | i18n dictionary + helpers |
| `src/layouts/Base.astro` | Global layout — nav, footer, space bg, scripts |
| `src/styles/global.css` | Design tokens + utility classes |
| `docs/ui-spec.md` | UI/UX spec (Grok soạn) |
| `scripts/gen-today.mjs` | Auto-content pipeline (Grok CLI) |

## Git
- Push bằng account `doxuanloc`, KHÔNG phải `MEDoXuanLoc`
- Credential: `gh auth git-credential` (override osxkeychain)

## Content security
- KHÔNG commit tên công ty / khách hàng / số liệu nội bộ
- `expUpdate` = skill snapshot (kỹ năng chung, không chi tiết dự án)
- Guardrail trong `gen-today.mjs` bắt buộc

## Design principles
- `[data-reveal]` → scroll reveal (IO)
- `[data-tilt]` → 3D tilt trên desktop
- `--par-x/--par-y` → parallax từ mousemove
- `.grad` → aurora gradient text animation
- `.hud-bracket` → corner brackets kiểu sci-fi
- Mọi animation đều có `@media (prefers-reduced-motion: reduce)` fallback

## Don'ts
- Không WebGL / Three.js / GSAP (Lighthouse)
- Không số liệu bịa (metrics, thời gian cụ thể)
- Không Next.js / React full-page (dùng Astro islands)
- Không thêm comments giải thích WHAT — chỉ WHY nếu cần

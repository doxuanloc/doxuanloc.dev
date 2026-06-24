# Portfolio — Claude Project Instructions

## Project
Portfolio cá nhân của Đỗ Xuân Lộc (doxuanloc.dev) — Astro 5 static site, tự cập nhật hàng ngày qua Grok CLI.

## Workflow
Theo doctrine global **capability-routing** (`~/.claude/CLAUDE.md`). Portfolio-specific:
- **UI/UX/layout mới** = high-taste → mode **parallel độc lập**: Grok + Claude mỗi bên 1 take → user chốt. Claude KHÔNG solo-design rồi ship.
- **Bug fix / tweak nhỏ** (<30', không đổi layout) = single actor, Claude làm thẳng.
- **Sau khi Claude implement UI/UX** → Grok quick-review (verification owner cho design) trước khi merge.
- Project này **full-power mode**: Grok đọc repo trực tiếp (public, no PII).
- Spec lớn theo mẫu `docs/templates/spec-template.md`.
- **User** = priority, taste, tie-breaker.

## Shared context (Grok ↔ Claude — cùng đọc file này)

File `CLAUDE.md` này được **CẢ Claude Code LẪN Grok Build** đọc (Grok nhận diện `Claude.md` khi chạy trong repo, scan từ repo-root → cwd). Đây là "bộ não chung": sửa 1 chỗ → cả 2 AI cùng cập nhật. KHÔNG tách file riêng cho Grok.

**Dự án này: Grok ĐƯỢC full context.** Đọc trực tiếp repo (code, docs, content) — KHÔNG cần abstract/ẩn danh như rule global, vì portfolio là public, không có PII khách hàng. (Rule abstract chỉ áp dụng cho project có dữ liệu khách thật.)

**Artifact dùng chung — cả 2 AI đọc/ghi:**
- `docs/decisions.md` — joint decision log (format: Quyết định / Lý do / Trade-off / References). Mọi quyết định kiến trúc ghi vào đây.
- `docs/*-spec.md` — Grok soạn spec → Claude implement theo.
- `INSIGHT.md` — system context tổng quan.
- `content/insights/inbox.md` — ghi chú thực tế của user → feed vào content pipeline mỗi ngày.

**Handoff loop (liên tục cải tiến):** user nêu vấn đề → Grok đọc repo + soạn spec vào `docs/` → Claude implement → cả 2 ghi `decisions.md` → lặp lại.

**Grok**: CLI đã bỏ — dùng **prompt-handoff** (Claude soạn block `---GROK PROMPT---` để user paste vào grok.com). Routing đầy đủ ở global `~/.claude/CLAUDE.md`. Web research thường → **Claude WebSearch/WebFetch inline**, không cần Grok.

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

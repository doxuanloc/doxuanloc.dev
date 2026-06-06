# UI/UX Spec — Portfolio doxuanloc.dev

> **Status**: Draft skeleton — cần Grok review và bổ sung.
> Grok: Đây là spec template, hãy hoàn thiện phần "Design decisions" và "Component specs" dựa trên đặc thù portfolio AI Engineer.

## Design language

| Token | Value | Ghi chú |
|-------|-------|---------|
| Theme | Space / Vũ trụ kiểu SpaceX | Tối, sao, nebula, HUD |
| Feeling | Future-forward, minimal, confident | Không kỳ ảo, không quá colorful |
| Typography | Be Vietnam Pro (body) + Tektur (display) | Đầy đủ dấu VN |
| Primary accent | `#5b8cff` (blue) | |
| Secondary accent | `#36d6c3` (teal) | |
| Tertiary | `#b58cff` (purple) | |
| Background | `#04060e` | |

## Pages & layout

| Page | Mục đích | Trạng thái |
|------|----------|-----------|
| `/` | Home — giới thiệu nhanh, solves, skills, journey teaser | ✅ Done |
| `/journey` | Scrollytelling — flight/chapter experience | 🔧 Grok đang làm |
| `/experience` | CV chi tiết — work history, education | ✅ Done |
| `/blog` | Auto-generated blog posts (Grok) | ✅ Done |
| `/news` | Tech radar daily (Grok) | ✅ Done |
| `/about` | About me + portfolio meta | ✅ Done |

## Component patterns

### Cards
- Background: `rgba(12,18,40,0.65)` + border `var(--border)`
- Hover: border-color accent + glow shadow
- Optional `[data-tilt]` cho interactive tilt

### Sections
- eyebrow: Tektur, 0.78rem, accent-2, uppercase, letter-spacing 3px
- section-title: 700, `clamp(1.4rem, 3vw, 1.7rem)`
- section-sub: text-dim, max 62ch

### HUD elements
- `.hud-bracket` corners (tl + br), 2px border, 22px size
- Codename: mono, 0.72rem, uppercase, letter-spacing 2.5px
- Progress: filled gradient bar

### Animations
- `[data-reveal]`: opacity 0 + translateY 24px → `.in` via IO
- `[data-tilt]`: perspective + rotateX/Y mousemove (desktop only)
- `.gen-orb`: float 7s infinite (fallback visual)
- Avatar spin: 7s linear
- Scan line: 6s linear (hero visual)
- Hero float: 8s ease-in-out

## Journey page spec
> **TODO for Grok**: Hoàn thiện spec cho `/journey` theo hướng "Spatial Flight + Story Chapters"

Key decisions (from docs/journey-redesign-plan.md):
- Primary: Flight/Cockpit scrolly (depth, filaments, HUD)
- View: Story Chapters (narrative) + Timeline (chrono, switchable)
- Reuse existing star canvas
- No new heavy deps

## Home page sections (current)
1. Hero — avatar + astronaut visual 2-col
2. Manifesto strip — 3 punchy belief lines
3. Problems I solve — numbered dramatic cards (01-04)
4. Tech DNA — category rows with dot indicators
5. Current mission bar — in-progress roadmap item
6. Journey teaser — cinematic card → /journey
7. Roadmap
8. Blog / News

## TODO (cần Grok quyết)
- [ ] Journey page final UX spec (chapters + timeline + flight metaphor detail)
- [ ] About page richer content
- [ ] Mobile nav pattern (hamburger vs. scroll-collapse)
- [ ] Animation timing guidelines (durations, easing names)
- [ ] Dark/light mode? (hiện tại chỉ dark)

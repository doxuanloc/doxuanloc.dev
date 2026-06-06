# UI/UX Spec — Portfolio doxuanloc.dev

> **Status**: Active — Full renewal plan + research-backed spec ready. Master plan: `docs/home-ui-renewal-plan.md`. Detailed impl: `docs/home-implementation-spec.md`. High-level vision: `home-redesign-spec.md`. Other pages stable.
> Grok: Home redesign (web3/space + scroll-first UX) đã được thiết kế chi tiết theo yêu cầu. Phần còn lại của site giữ nguyên direction.

## Design language

| Token | Value | Ghi chú |
|-------|-------|---------|
| Theme | Space / Vũ trụ kiểu high-spec aerospace + clean web3 | Tối sâu, nebula, HUD, orbital lines, glass + energy fields |
| Feeling | Future-forward, precise, confident, immersive on scroll | Không crypto noise, không over-colorful. "Docked into a live protocol" |
| Typography | Be Vietnam Pro (body) + Tektur (display) + JetBrains Mono (HUD) | Đầy đủ dấu VN |
| Primary accent | `#5b8cff` (vector blue) | |
| Secondary accent | `#36d6c3` (teal / systems) | |
| Tertiary | `#b58cff` (purple / intelligence) | |
| Quaternary | `#f0b232` (gold / AI) | |
| Background | `#04060e` | + layered `.space-bg` + constellation canvas |

**Home v2 direction** (2026 redesign): "Orbital Command / Ingress". Scroll = primary interaction for first visit. See full spec: [docs/home-redesign-spec.md](docs/home-redesign-spec.md). Key upgrades: Live Sector HUD, scroll-synced parallax/vars/filaments/charge, holographic borders, constellation DNA, stargate journey teaser, velocity-aware canvas hints. All progressive + reduced-motion safe.

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

## Journey page spec (reference)
Already implemented with strong spatial scrolly (see `src/components/journey/`):
- Desktop pinned 100dvh panels + crossfade + live rail + HUD counter
- `--scroll-in` + mouse `--par-x/y` for inner visuals
- Filaments / connections computed
- Mobile graceful + progress tracking
- Reuses JourneyVisual + existing canvas patterns

Home redesign deliberately **does not** copy full pinned scrolly (home must stay scannable overview + marketing surface). Instead it uses lighter "flow + floating live HUD + progressive depth" model. Shared learnings (scroll controller, CSS vars, HUD language, filaments) are referenced in the home spec.

## Home page sections (v2 Spatial Ingress)
1. **Hero / Ingress Portal** — deeper 2-col with holo frame, orbital rings, scroll-driven depth recession (visual recedes, content stays). Entry vector feel.
2. **Primary Directives** — manifesto as connected filament mesh. Lines draw on enter; current line activates by scroll band.
3. **Anomaly Briefs** — solves grid. Left charge bars fill by intersection ratio. Holo borders + ghost num data flicker while primary.
4. **Constellation Core** — Tech DNA rows enhanced as hubs + faint bus filaments between rows. Skills "sync in". Big telemetry total with optional soft count-up.
5. **Live Vector** — current mission strip, stronger glass + slow data sweep on lock. Direct link to full flight plan.
6. **Stargate** — journey teaser. Large cinematic. On approach: converging warp lines + active HUD brackets. Strongest CTA.
7. **Flight Plan** — Roadmap (enhanced dots + ignite on reveal).
8. **Downlinks** — Blog + News as compact log packets (signal strength dots, T- timestamps).

**Global primitives** (apply across home):
- Live Sector HUD (right rail desktop / compact mobile) — 01 DIRECTIVE … 07 LOGS. Click to jump. Updates live with most-visible sector.
- Trajectory progress bar (top, nebula gradient) — always visible on home.
- `--home-scroll-p`, `--home-scroll-vel` + per-card `--charge` CSS vars driven by one throttled controller.
- Enhanced canvas + space-bg reactivity to scroll velocity/depth (subtle).

Full interaction, motion, perf and implementation notes: [docs/home-redesign-spec.md](docs/home-redesign-spec.md)

## TODO (cần Grok / follow-up)
- [x] Home v2 Web3 Spatial Ingress full spec (filaments, HUD, scroll vars, constellation, stargate) — done in `docs/home-redesign-spec.md`
- [ ] Journey page — continue polish (existing scrolly is already strong)
- [ ] About page richer content / meta
- [ ] Optional: extract shared scroll utils (`src/lib/scroll.ts`) from journey + new home controller
- [ ] Animation timing + easing canon (move to global CSS tokens)
- [ ] (Low prio) Dark/light? — currently pure dark space only

**Implementation status**: Spec ready. No code changes yet (per workflow: Grok designs, Claude implements for large UI/UX).

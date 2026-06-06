# Home UI/UX Renewal Spec — Web3 Futuristic Space Ingress (Home Page)

> **Mục tiêu**: Làm mới trang home thành trải nghiệm "web3 + tương lai/không gian" với nhiều animation và tương tác mượt mà theo scroll/visit của user, giữ nguyên triết lý static-first Astro, Lighthouse, và multi-AI workflow hiện tại (Grok thiết kế spec + nghiên cứu, Claude implement).
> **Phạm vi**: Chỉ trang home (`/` và `/vi`). Không đụng journey/experience/blog/news/about.
> **Constraints**: Astro 5 static/hybrid, Vercel, i18n EN/VI, **không WebGL/GSAP/Three/full React**, KHÔNG số liệu bịa, giữ content fidelity từ profile.json, `prefers-reduced-motion` fallback đầy đủ, Lighthouse score không regress.
> **Assumptions**: Traffic thấp (personal portfolio). Home là landing/overview page — cần scannable + cinematic scroll experience. Sử dụng lại pattern hiện có (data-reveal, data-tilt, space-bg canvas, journey scroll logic).

**Status**: Plan v1.1 (tiếp tục từ research + detailed spec, modeled directly after `docs/ai-integration-spec.md` structure for Claude implementability). 

**Related docs**:
- High-level vision & research: `docs/home-redesign-spec.md`
- Detailed logic, pseudocode, file list: `docs/home-implementation-spec.md`
- Master plan + continuation (this file)
- Decisions: `docs/decisions.md` (ADR-008)
- Project context: `INSIGHT.md`, `docs/codebase-overview.md`, `docs/ui-spec.md`

---

## 1. Architecture Decision Record (ADR)

### Quyết định: Lightweight Scroll-Synchronized Layers + Floating Live Sector HUD (normal document flow)

**Chọn**: Giữ normal vertical flow cho home (không copy pinned 100vh scrolly từ Journey). Dùng **một** central throttled controller (RAF + passive scroll listener, reuse pattern từ `journey/scroll.ts`) để tính toán progress/velocity/most-visible sector và set CSS custom properties. Kết hợp floating HUD (right rail desktop / compact mobile) + rich scroll-driven effects (filaments, charges, parallax layers, SVG draw, canvas modulation).

**Rationale** (dựa trên research 2026 web3/futuristic trends + project constraints):
- Scrollytelling là xu hướng chính (Lusion-style SVG paths, cosmic layered parallax, HUD telemetry, glass + on-scroll charge/glow). Home cần "nhiều animation + tương tác khi visit" nhưng vẫn là **fast overview + marketing surface**.
- Pinned scrolly (như Journey) sẽ hại scanability, SEO, blog/news consumption ở phần dưới.
- Một controller + CSS vars + SVG + existing canvas = đạt được "depth, filaments, velocity, assembly effects" mà không vi phạm "no heavy libs / Lighthouse".
- Re-use 100% pattern đã chứng minh (most-visible visibility ratio, ticking RAF, astro:page-load, reduced-motion guards, data-reveal/tilt).
- Floating HUD cung cấp "sense of place" và navigation mà không chiếm nội dung (phù hợp cockpit/HUD trend trong futuristic/web3 designs).

**Trade-off ghi nhận**:
- Hiệu ứng "spatial flight" nhẹ hơn full pinned (không crossfade 1:1). Bù bằng progressive layers, SVG draw, và persistent HUD.
- Cần duy trì ~8-10 CSS vars + một số per-element states. Đã lock contract chặt trong spec để tránh scope creep.
- Mobile phải collapse mạnh HUD (không rail đầy đủ).

**Rejected**:
- Full 3D/WebGL/GSAP (vi phạm constraints + Lighthouse).
- Pure CSS ScrollTimeline (hỗ trợ browser chưa ổn định, khó coordinate HUD + nhiều effects).
- Nhiều listener nhỏ per-section (perf overhead cao hơn một controller tập trung).

**Migration / Implementation note**: Xây dựng trên `home-implementation-spec.md`. Bắt đầu P1 với controller + HUD + hero + solves. SVG path draw (Lusion emulation) đưa vào P2. Test kỹ với View Transitions và reduced-motion.

---

## 2. Interaction & Animation Selection Matrix

Bảng chọn các hiệu ứng tương tác/animation theo research (web3/space/futuristic 2026: scrollytelling, parallax layers, HUD, glassmorphism + energy, SVG draw, kinetic) và feasibility dưới constraints.

| Use case / Effect                  | Recommendation (inspired by)          | Lý do chính + Feasibility                                                                 | Effort | Phase |
|------------------------------------|---------------------------------------|-------------------------------------------------------------------------------------------|--------|-------|
| Scroll-driven "drawing" paths     | Lusion.co flowing paths              | Vanilla SVG + strokeDashoffset + scroll calc. Rất đẹp, nhẹ, "web3 future" feel.           | Medium | P2    |
| Multi-layer parallax (scroll + mouse) | Cosmic Scroll, parallax collections | Extend existing --par-x/y + new --home-scroll-p multipliers. Pure CSS transform.          | Low    | P1/P2 |
| Live Sector HUD + trajectory progress | Futuristic cockpit / scrolly HUDs   | Floating rail (desktop) / compact (mobile). Updates active section + overall progress. Click jump. | Low-Medium | P1 |
| Charge / assembly / glow on entry | Glassmorphism web3 cards             | Visibility-ratio driven left bars, holo borders, staggered chips. Re-use data-reveal.    | Low    | P1    |
| Depth recession on hero           | Layered sci-fi portals               | Visual recedes more than text via --hero-depth. Orbital rings.                            | Low    | P1    |
| Constellation / node activation   | Web3 network + canvas examples       | Existing SiteBackground canvas + CSS hubs + bus filaments. Velocity boost on canvas.     | Low    | P2    |
| Kinetic typography & reactive text| Kinetic type trends 2026             | Class toggle on scroll band → CSS scale/gradient or subtle reveal. Keep very light.      | Low    | P3    |
| Stargate / portal energy on CTA   | Cosmic journey teasers               | Radial lines, proximity var, live brackets when focused.                                  | Medium | P2    |

**Provider / Technique strategy**:
- **Core**: Vanilla JS (one controller) + CSS custom properties + SVG (for draw effects) + existing canvas.
- **Progressive**: Native `scroll-timeline` / `animation-timeline` where supported (fallback JS).
- **No mix heavy libs**: Giữ Lighthouse. Tất cả effects additive.

---

## 3. Feature Spec (Scroll-Driven User Experience)

### User Flows Chính (Visit + Scroll Interactions)

1. **Land / Ingress**: Ngay khi load — background stars/canvas "alive", hero có subtle scan + float. Badge "SIGNAL LOCKED". User cảm nhận "đã dock vào hệ thống".
2. **Scroll to explore layers**:
   - Hero recedes (depth) + orbital rings react khi cuộn qua.
   - Manifesto: filaments "vẽ" nối 3 directives. Active line highlight theo vị trí scroll trong band.
   - Solves (Anomaly Briefs): 4 cards charge bar fill theo visibility. Holo border intensify. Ghost num pulse khi primary.
   - DNA (Constellation): Hubs sáng lên, bus filaments connect, chips "sync in" staggered.
   - Mission bar: data sweep nhẹ + telemetry.
   - Journey teaser (Stargate): Khi gần — warp lines converge, brackets active, outer energy field.
3. **Live HUD / Telemetry**: Right rail (desktop) hoặc bottom compact (mobile) luôn hiển thị 01 DIRECTIVE → 07 LOGS. Cập nhật real-time theo most-visible. Click = smooth jump đến section.
4. **Velocity & micro feedback**: Cuộn nhanh → canvas links sáng hơn, subtle speed hints. Cuộn chậm deliberate → rich reveals và assembly.
5. **Lower sections**: Roadmap dots ignite, blog/news cards có signal dots + "T-" timestamps. Feel như "mission logs" cập nhật.
6. **Reduced motion**: Tất cả advanced effects tắt, giữ static elegant final state + basic reveals.

**Component names (islands / progressive)**:
- `HomeIngress` (island, client:visible): HUD markup + controller mount.
- Central logic in `src/lib/scroll.ts` (pure helpers + `initHomeScrollSync`).
- Enhance existing: `Hero.astro`, `.solve-card` in `index.astro`, `Roadmap.astro`.
- Reusable: Filament SVG helpers, charge bar patterns.

**Data flow (text diagram — scroll controller)**:
```
[index.astro static + data-sector / data-chargeable]
  + <HomeIngress client:visible />
      ↓ astro:page-load
      initHomeScrollSync()
          | passive scroll + RAF tick
          | computeMostVisibleSector (reuse journey visibility ratio)
          | compute p + vel
          | sampleCharges
          ↓ batch setProperty on :root
              --home-scroll-p / --vel / --active-sector
              --hero-depth / --solve-charge-*
          ↓ updateSVGPaths (for filaments)
          ↓ class toggles (holo-active, synced, etc.)
  + CSS reads vars → parallax, charge height, filament dashoffset, glows
  + HUD reads data-active-sector → .active states
```

**Scroll state strategy**:
- Overall progress + velocity from one listener.
- Per-section local progress (for filaments inside manifesto, charge per card).
- Most-visible uses same logic as journey mobile (rect visibility / height).
- All in one RAF batch to avoid thrash.

---

## 4. File Structure (mới / thay đổi)

```
docs/
  home-ui-renewal-plan.md          # file này (master + continuation, style ai-integration-spec)
  home-implementation-spec.md      # logic chi tiết, pseudocode cũ
  home-redesign-spec.md            # vision + research high-level

src/
  lib/
    scroll.ts                      # NEW: getHomeSectors, computeMostVisibleSector, computeScrollState, initHomeScrollSync, updateSVGPaths...
  components/
    home/
      HomeIngress.astro            # NEW: HUD island (desktop rail + mobile bar) + mount logic
    Hero.astro                     # enhance (wrappers, orbital rings, --hero-depth)
  pages/
    index.astro                    # markup: data-sector, data-chargeable, filament SVGs, class additions
    vi/index.astro                 # re-export (giữ nguyên)
  styles/
    global.css                     # tokens mới, .holo-border, .sector-hud, .filament, .charge-bar, parallax layers, reduced-motion rules
  layouts/
    Base.astro                     # wiring astro:page-load cho home controller (nếu không để trong island)

# Không thay đổi (reuse):
- SiteBackground.astro (canvas — chỉ modulate nhẹ với --vel)
- Roadmap.astro (nhẹ: ignite effect)
```

**Ghi chú**:
- Ưu tiên vanilla progressive. Island chỉ cho HUD + controller (giữ JS nhỏ).
- SVG cho filaments (inline trong .astro, JS control dashoffset).
- Tất cả init bên trong `astro:page-load` để hỗ trợ View Transitions.
- Không commit secret (không có ở đây). 

---

## 5. Phase Plan

**P1 — Foundation + High-Impact Visit Effects (core "nhiều tương tác khi visit")**  
- Tokens + holo/glass enhancements, trajectory bar, basic HUD (rail + mobile).
- Central controller + CSS var engine (p, vel, active-sector, hero-depth, solve charges).
- Hero recession + orbital rings.
- Solve charge bars + holo intensification.
- Manifesto basic filaments (CSS version đầu, SVG draw P2).
- HUD active state + click navigation.
- Reduced-motion full coverage + basic wiring.
- **Deliverable**: Land + first deliberate scroll cảm thấy "hệ thống đang respond". HUD orient + jump. Hero có depth. Solves charge khi vào view. Hoạt động tốt cả EN/VI.

**P2 — Connection, Depth & Drawing Effects (web3 future density)**  
- Full SVG filament drawing (Lusion-style stroke-dashoffset trên manifesto + stargate radials).
- DNA Constellation: hubs, bus filaments, staggered chip sync, telemetry count-up.
- Stargate proximity + warp energy lines + live brackets.
- Canvas velocity modulation (subtle).
- Roadmap ignite + blog/news signal treatments.
- More parallax layers.
- **Deliverable**: Scroll "narrative" và connected. Filaments vẽ theo cuộn. Constellation wake up. Journey teaser thành portal mạnh.

**P3 — Polish, Velocity, Mobile, Kinetic Delight**  
- Kinetic text / soft counters.
- Velocity micro (faint speed hints, stronger canvas boost).
- Refined mobile HUD + extra telemetry.
- Enhanced tilt + hover energy sweeps.
- "Assembly complete" micro states per band.
- Full testing (breakpoints, reduced-motion, VT, Lighthouse, real devices).
- **Deliverable**: Production quality, delightful density of motion/interaction, metrics giữ nguyên.

**Thứ tự ưu tiên (nếu cắt scope)**: P1 → P2 (drawing + constellation là "wow" cao) → P3.

---

## 6. Risks & Mitigations

- **Over-animation fatigue**: Tiered catalog (P1 core, P2/P3 extras). One-time or slow effects. Research cho thấy deliberate scroll được reward.
- **Perf / jank trên low-end**: Một controller + RAF batch + passive listener. Early reduced-motion exit. Test throttled CPU.
- **Mobile HUD complexity**: Collapse mạnh (compact bar + dots). Lighter parallax.
- **Scope creep "thêm nhiều animation"**: Locked catalog + phases. Mọi ý mới phải qua feasibility + impact filter trong plan.
- **View Transitions / re-init**: Tất cả init trong `astro:page-load` (pattern đã chứng minh ở Base + Journey).
- **Lighthouse regress**: JS chỉ chạy trên home, rất nhỏ. Decorative effects. AI UI pattern (client:visible) áp dụng tương tự.
- **Content drift**: 100% data từ getProfile(lang) + i18n. HUD codenames giữ English (sci-fi convention, giống "FLIGHT LOG" trong journey).

---

## 7. Estimated Effort (giờ, 1 dev, realistic)

- **P1 (Foundation + Visit Wow)**: 6-10 giờ  
  (tokens/HUD/controller 3-4h; hero + solves + basic filaments 2-3h; wiring + reduced-motion + test 2-3h)
- **P2 (Drawing + Constellation + Stargate)**: 5-8 giờ  
  (SVG path logic + update 2-3h; DNA + stargate 2h; canvas + lower sections 1-2h)
- **P3 (Polish + Velocity + Full Test)**: 3-6 giờ  
  (kinetic + micro 1-2h; mobile refine + telemetry 1h; cross test + Lighthouse 2-3h)

**Tổng ước tính**: 14-24 giờ (có buffer cho tuning "feel" — scroll test nhiều + 1-2 vòng review).

**Milestone gợi ý**: Ship P1 trong 1 sprint ngắn để có value nhanh và test scroll thực tế. P2/P3 theo sau khi validate feel + Lighthouse.

---

## 8. Next Steps sau spec

1. User review + approve (đặc biệt ADR, matrix, phase plan, task breakdown).
2. (Optional) spike nhỏ: implement 1-2 effect cốt lõi (controller + HUD + hero depth) trong branch để cảm nhận.
3. Claude implement theo phase + granular tasks (bắt đầu P1). Grok review logic + visual feel sau mỗi phase.
4. Sau P1: đo thực tế scroll experience + Lighthouse trên real devices, adjust nếu cần.
5. Update docs (ui-spec, INSIGHT, decisions nếu có nuance mới).

Giữ nguyên guardrail: Home vẫn scannable overview, không bịa metrics, content từ profile, i18n đầy đủ, phù hợp professional AI Engineer tone.

---

**Kết thúc spec theo đúng cấu trúc và rigor của ai-integration-spec.md.**

File `docs/home-ui-renewal-plan.md` đã được cập nhật với header và các section 1-8 được viết lại/tiếp tục để match chính xác format (Mục tiêu/Phạm vi/Constraints, ADR, Matrix, Feature Spec với flows + data flow diagram, File Structure, Phase Plan, Risks, Effort, Next steps).

Các phần chi tiết component, task breakdown, pseudocode (từ continuation trước) vẫn được giữ nguyên ở dưới (section 9+).

Bây giờ Claude có một tài liệu **đồng nhất về cấu trúc** với ai-integration-spec.md để implement home renewal.

Bạn có muốn tôi:
- Xuất riêng phần "task list" thành file markdown sạch cho Claude?
- Thêm ví dụ code cụ thể hơn (ví dụ full small snippet cho SVG update)?
- Bắt đầu chuẩn bị branch / một số file khởi tạo?

Hãy cho biết "tiếp tục với ..." phần nào tiếp theo.

---

## 1. Research Synthesis — What "Web3 Futuristic + Heavy Interaction on Visit" Looks Like in 2025-2026

I researched current trends and examples (web searches on futuristic/web3/space portfolios, scrollytelling, parallax, HUDs, glassmorphism + neon, kinetic motion, 2026 design trend reports from Figma, Awwwards, School of Motion, Fireart, etc.).

### Dominant Trends Relevant to Us
- **Scrollytelling as the star**: Scroll is no longer passive reading — it is the controller. As users scroll, stories unfold: elements assemble, lines draw/grow, layers shift at different speeds, HUD telemetry updates live, sections "activate" with energy. Examples: Cosmic Scroll journeys (astronaut/space themes), B/UXSTUDIO, various Awwwards scroll sites, Lusion.co-inspired flowing paths.
- **Depth & Parallax layers**: Multi-plane movement (backgrounds slow, mid elements medium, foreground fast or counter). Mouse parallax + scroll parallax combined. Creates "flying through space / entering atmosphere" feeling. Common in sci-fi and web3 (glass cards lifting, orbital elements).
- **HUD / Telemetry / Persistent Navigation**: Floating or fixed minimal HUDs (progress bars, active "sector/chapter" indicators, counters, status orbs). Feels like a cockpit or protocol dashboard. Right rail on desktop, compact bottom on mobile. Clickable for navigation.
- **Glassmorphism + Holographic/Neon Energy**: Translucent glass with heavy blur + multi-color thin borders/glows that "charge", pulse, or sweep on interaction/scroll. Neon accents on dark space backgrounds. Very popular in web3/NFT/AI/futuristic portfolios.
- **Kinetic Typography & Reactive Elements**: Text that shifts weight, reveals, or has micro-morphs tied to scroll position. Numbers that count or "sync". Orbs, dots, filaments that connect or light up progressively.
- **Drawing & Assembly Effects**: SVG paths/lines that draw themselves as you scroll into a section (Lusion-style flowing/growing paths is a standout). Cards that "dock" or gain internal progress bars. Constellation/node networks that activate.
- **Retrofuturism + Sci-Fi Motifs**: Chrome/neon, subtle glitch or scanlines (already in our hero), orbital rings, data readouts, "mission log" treatment for content sections.
- **Micro + Macro Interactions on Visit**:
  - Immediate on-load: subtle background life (stars twinkle, canvas nodes), hero "lock in" or float.
  - Scroll entry: staggered reveals with depth, charge/fill, filament connections.
  - Velocity awareness: faster scroll = more "speed lines" or boosted connections (subtle).
  - Hover + tilt (already have data-tilt) amplified with energy sweeps or glows.
  - Persistent feedback: top trajectory progress (nebula gradient), live sector HUD.

**High-signal examples / references** (emulate the *feeling*, not the heavy tech):
- Lusion.co and similar: Scroll-controlled SVG path drawing/growth (achievable in vanilla with `stroke-dashoffset` + scroll calc).
- Cosmic/astronaut scroll experiences (e.g. "A Cosmic Scroll", various space scrollytelling): Layered parallax + narrative progression through "space layers".
- Web3/glass futuristic portfolios (Dribbble/Awwwards NFT/web3 dark themes): Heavy use of glass cards, neon holo borders, on-scroll glow/charge, subtle node networks.
- General scrollytelling winners: Progress-driven HUDs, parallax depth, kinetic elements that reward deliberate scrolling.
- Parallax collections (Awwwards): Multiple speed layers, content that moves relative to scroll.

Many winning examples use GSAP/Three/Framer or Webflow — **we will emulate the visual/UX outcome with our constrained stack** (see §3).

**What to avoid copying directly** (per constraints):
- Full 3D/WebGL solar systems, heavy particle engines, GSAP ScrollTrigger timelines.
- Overly busy motion that tanks Lighthouse or feels gimmicky on a professional AI Engineer portfolio.

---

## 2. Vision for Renewed Home (refined with research)

**Name**: "Protocol Ingress — Orbital Command Deck v2"

User lands → immediate sense of "docking into a live, responsive system in deep space".

As they **visit/scroll deliberately**, the page reacts richly:
- Background "comes alive" more (enhanced canvas + parallax layers).
- Content "assembles" itself (filaments connect, charges build, orbs pulse in sequence).
- A minimal but always-present HUD gives "where am I in the system" + quick jumps.
- Depth and motion create immersion and reward slow, exploratory scrolling (the "many animations and interactions when visit").

**Tone**: Professional, confident, high-spec (matches AI & System Optimization Engineer). Not crypto hype, not childish sci-fi. Think premium aerospace UI + clean web3 data viz (glass, thin energy fields, telemetry).

**Key promise**: "Scroll to explore the stack. The system responds."

This builds directly on the previous vision/spec but adds more **density of interaction** and explicit research backing.

---

## 3. Technical Approach & Feasibility (Aligned with Constraints)

**Stack (no changes)**:
- Astro 5 + islands + View Transitions.
- Vanilla JS (RAF-throttled scroll, IntersectionObserver) + CSS (custom properties, transforms, transitions, SVG).
- Reuse/extend heavily: existing `data-reveal`, `data-tilt`, `.space-bg` + `SiteBackground` canvas (constellation nodes — perfect web3 "network" metaphor), HUD brackets, glass cards, aurora gradients, journey scroll patterns (most-visible calc, ticking RAF, reduced-motion guards, astro:page-load init).

**Core Engine** (from previous detailed spec, validated by research):
- One central `initHomeScrollSync()` (in `src/lib/scroll.ts` + small HomeIngress island or Base enhancement).
- Computes: overall progress `p`, recent velocity, most-visible sector, per-element visibility/charge.
- Sets a tight set of CSS vars on `:root`.
- Styles react via `calc(var(--xxx))`, class toggles, or inline style for SVG dash.
- Early exit + static fallbacks for `prefers-reduced-motion`.

**Feasible Emulations of Research Inspirations**:
- **Scroll-driven SVG paths / filaments (Lusion-style)**: Inline SVG in manifesto / DNA / stargate sections. In the RAF tick, compute progress for that band → `path.style.strokeDashoffset = totalLength * (1 - localProgress)`. Lightweight, beautiful "drawing" feel.
- **Multi-layer parallax on scroll + mouse**: Extend existing `--par-x/y`. Add `--home-scroll-p` multipliers on different elements (bg slower, mid, hero visual with counter or stronger). Pure CSS transform.
- **HUD / live telemetry**: Floating right rail (desktop) + compact mobile. Updates active sector + overall progress. Matches many futuristic cockpits.
- **Charge / assembly / glow on entry**: Left bars on solves that fill by visibility ratio. Chips or nodes that "sync" (opacity + tiny lift staggered). Glass borders that intensify.
- **Kinetic / reactive text**: Section titles or key lines get `.active` class → CSS scale/gradient shift or subtle letter effects (keep very light).
- **Depth recession + velocity hints**: Hero recedes as you scroll past. Canvas link opacity or star twinkle boosts with velocity (subtle — research shows velocity awareness feels premium).
- **Glassmorphism + holo energy**: Enhance existing cards with stronger multi-stop borders, soft inner gradients, on-scroll "sweep" or glow pulse.
- **Progressive disclosure / scrolly feel without pinning**: Normal flow (preserves scan + SEO) + rich entry animations + persistent HUD for orientation. Users feel they are "flying through layers" without being locked into panels.

**Progressive Enhancement**:
- Core content + basic reveals always work.
- Advanced scroll vars + SVG drawing + HUD = additive (graceful degradation).
- Bonus: Where supported, experiment with native `animation-timeline: scroll()` / `scroll-timeline` for some pure-CSS effects (fallback to JS controller). Chrome/Edge strong; Safari catching up.

**Perf & Lighthouse Guardrails** (non-negotiable):
- Single passive scroll listener + one RAF (ticking flag, like journey).
- Batch all style writes.
- No layout thrashing.
- Canvas remains throttled/pausable.
- Total added JS on home target: <6kB gz.
- Test throttled CPU, mobile, reduced-motion, View Transitions.

---

## 4. Interaction & Animation Catalog (Prioritized)

Prioritized by **impact on "many animations + interactions on visit"** vs feasibility/effort.

**Tier 1 (High impact, include in P1)**
1. Enhanced hero "dock/ingress": On load subtle scan + float. On scroll past: depth recession (visual moves more than text), orbital rings react.
2. Live Sector HUD + top trajectory progress (nebula gradient bar): Always visible orientation. Updates on scroll. Clickable jumps. Mobile collapse.
3. Solve cards "Anomaly Briefs": Left charge bar fills smoothly with visibility. Holo border intensifies. Ghost num pulses when primary. Inner subtle grid/lines appear.
4. Manifesto "Primary Directives": Connecting filaments (SVG or CSS) that draw on section enter. Active line (by scroll band inside section) gets stronger glow/energy.
5. Overall scroll velocity & progress vars: Drive subtle background boosts and element scales.

**Tier 2 (Immersion depth, P2)**
6. Tech DNA "Constellation Core": Row hubs light up. Faint bus filaments connect rows progressively. Skill chips "sync in" (staggered opacity + micro-lift) as row becomes visible. Big telemetry "NODES SYNCED" with optional soft count.
7. Journey teaser "Stargate": On approach — converging radial warp lines (CSS or SVG), brackets go live with scan, card gains outer energy field. Strongest CTA "portal" feel.
8. Canvas modulation: Existing node network gets slight link density / brightness boost on higher velocity (feels like "speeding through the protocol").
9. Roadmap + logs "Flight Plan / Downlinks": Dots ignite with ring expansion on reveal. Cards get signal strength dots or T- timestamps. Filament underlines on hover/scroll.

**Tier 3 (Polish & delight, P3 or later)**
10. Kinetic micro on key text (e.g. manifesto or section titles shift slightly or reveal letters).
11. More parallax layers (e.g. faint latitude grid or planet elements that move at different scroll factors).
12. Subtle "data flicker" or scan on active elements.
13. Velocity "speed lines" (very faint, low opacity, only on fast scroll).
14. Enhanced tilt + hover energy (sweep + stronger glow on data-tilt cards).
15. Section "assembly complete" micro state (all elements in a band lock into final polished look once fully passed).

All respect reduced-motion (static elegant final state, no continuous anims).

---

## 5. Phased Implementation Roadmap

Builds on the previous `home-implementation-spec.md` phases but refreshed with research priorities. Start with high-engagement, low-risk items.

**P1: Foundation + Visit "Wow" (biggest immediate difference, ~6-10h)**
- Tokens, glass/holo enhancements, trajectory bar, basic HUD (desktop rail + mobile).
- Central scroll controller + CSS var engine (`--home-scroll-p`, `--vel`, `--active-sector`, `--hero-depth`, solve charges).
- Hero depth recession + simple orbital rings.
- Solve cards charge bars + holo.
- Manifesto basic filaments (start with CSS, upgrade to SVG draw in P2).
- HUD active state + click navigation.
- Reduced-motion full coverage.
- **Deliverable**: Land + first scroll feels alive. HUD orients you. Hero recedes. Cards charge as you discover them. Both languages.

**P2: Connection & Depth (scrolly "web3 future" density, ~5-8h)**
- Full SVG filament drawing where impactful (manifesto, perhaps DNA connections, stargate radials) — JS dashoffset driven by band progress.
- DNA constellation: hubs, bus lines, chip sync waves.
- Stargate proximity + warp energy.
- Canvas subtle velocity response.
- Roadmap ignite + blog/news signal treatments.
- More parallax layers on key visuals.
- **Deliverable**: Scroll feels connected and narrative. Filaments draw. Constellation wakes. Journey teaser feels like a gate.

**P3: Polish, Velocity, Mobile, Delight (~3-6h)**
- Kinetic text / counters (light).
- Velocity micro effects (speed hints, stronger canvas).
- Refined mobile HUD.
- Extra telemetry polish.
- Full cross-breakpoint + perf + reduced-motion + VT testing.
- Lighthouse re-measure.
- **Deliverable**: Production, delightful on visit, metrics preserved or improved.

**Total**: 14-24h realistic (with buffer for tuning "feel" — you will scroll-test a lot).

**Order for Claude**: P1 first → real scroll test + feedback → P2 → review → P3.

**Files** (same as detailed spec + small additions):
- `src/lib/scroll.ts` (helpers + controller)
- `src/components/home/HomeIngress.astro` (HUD island)
- `src/pages/index.astro` (markup, data-*, wrappers)
- `src/components/Hero.astro`
- `src/styles/global.css` (heavy lifting on new motifs)
- `src/layouts/Base.astro` (init wiring)
- Light touches on Roadmap, existing cards.

---

## 6. Success Criteria & Risks

**Success**:
- First-time visitors spend more deliberate time scrolling and reach Journey CTA with a sense of "I've explored the system".
- Rich motion and interaction density that feels premium/web3/futuristic/space, but professional.
- Lighthouse scores stay strong (target no regression).
- Works beautifully on reduced-motion and mobile.
- Content fidelity 100% (profile data + i18n).

**Risks & Mitigations**:
- Over-animation / fatigue: Tiered (core in P1, extras optional). One-time or slow effects. Research shows deliberate scroll rewards.
- Perf on low-end: One controller, batching, early exits. Test throttled.
- Mobile complexity: Strong collapse strategy for HUD + lighter parallax.
- Scope creep on "more animations": Locked catalog + phases. Any new idea goes through feasibility + impact filter.
- View Transitions / re-init: All inits inside `astro:page-load` (proven pattern).

---

## 7. Alignment with Project Workflow & Constraints

- **Grok role**: This plan + previous specs = architecture, research, decisions, UX direction.
- **Claude role**: Execute implementation, test, refine details, technical docs.
- **User**: Priority / tie-breaker / final visual approval.
- **Constraints honored**: No forbidden libs. Static-first where possible. Content from source of truth. i18n. Reduced-motion. No fake metrics. Git push as `doxuanloc`.

**New/Updated Decision**: ADR-008 (lightweight scroll-sync + HUD for home) already added. This plan refines the "many animations" density within that decision.

---

## 8. Immediate Next Steps

1. User (you) review this plan + linked specs. Provide feedback / priorities / cuts.
2. Approve or request adjustments.
3. Claude begins execution (recommend starting P1 in a branch for easy review).
4. After P1: real-device scroll session + Grok visual + logic review.
5. Iterate to P2/P3.
6. Update INSIGHT.md status, any final docs.

**Key files for the team to read together**:
- This plan (`docs/home-ui-renewal-plan.md`)
- Detailed logic (`docs/home-implementation-spec.md`)
- Vision (`docs/home-redesign-spec.md`)
- `INSIGHT.md` (quick context)

---

## 9. Detailed Component Specifications (Continuation)

This section provides Claude with precise, implementable specs for each major piece, building on the catalog in §4 and the engine in §3.

### 9.1 HomeIngress Controller & HUD (Core of "visit interaction")
**File**: `src/components/home/HomeIngress.astro` (new, `client:visible` island for perf)

**Responsibilities**:
- Render desktop `.sector-hud` (fixed right rail, thin, 7 items with mono labels like "01 DIRECTIVE").
- Render mobile `.mobile-sector-bar` (compact, current sector name + 7 micro dots or progress).
- Mount the scroll sync logic on `astro:page-load`.
- Handle click-to-jump using `scrollIntoView({behavior: 'smooth', block: 'start'})` on sector items.

**Data contract**:
- Set `data-active-sector="xxx"` on `document.documentElement` from the controller.
- CSS targets: `.sector-item[data-id="directive"].active { color: var(--accent); }` etc.
- HUD items have `data-sector-id`.

**Init**:
```js
// Inside island or imported
document.addEventListener('astro:page-load', () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const homeRoot = document.querySelector('[data-home]') || document.documentElement;
  initHomeScrollSync(homeRoot);  // from src/lib/scroll.ts
});
```

### 9.2 Manifesto Filaments (Lusion-inspired drawing)
**Markup addition** (in index.astro .manifesto):
- Wrap the 3 lines in a container with relative positioning.
- Add an inline SVG (or 2-3 `<div class="filament">` for simplicity in P1, upgrade to SVG in P2) between lines.
- Best: One `<svg class="manifesto-filaments" width="100%" height="100%" style="position:absolute">` with 2 `<path>` elements.

**Logic** (in the central tick, when manifesto section visibility > 0.1):
- For each path: `const len = path.getTotalLength(); path.style.strokeDasharray = len;`
- Compute local progress inside the manifesto band (using its rect vs viewport or overall p mapped to the 3 lines).
- `path.style.strokeDashoffset = len * (1 - localProgress);`

**Styles**:
- `stroke: var(--accent-2); stroke-width: 1; opacity: 0.4;`
- Active line: thicker or different color when its band is dominant.
- Transition or direct style set (no CSS transition on offset for instant scroll feel).

This directly emulates the "flowing path as you scroll" from Lusion research.

### 9.3 Solve Cards Charge + Holo
- Add `data-chargeable` and `style="--charge: var(--solve-charge-0)"` to each `.solve-card`.
- Left accent becomes `.charge-bar { height: calc(var(--charge, 0) * 100%); background: linear-gradient(var(--sc), transparent); }` or width/position for horizontal feel.
- On high charge: add `.holo-active` class that boosts `box-shadow` and border gradient.

### 9.4 Hero Depth + Orbital Rings
- Wrap visual in `<div class="hero-visual-wrapper" style="--depth: var(--hero-depth)">`.
- `transform: translateY(calc(var(--depth) * 20px)) scale(calc(1 - var(--depth) * 0.03));`
- Add 3 orbital rings as absolutely positioned divs or SVG circles inside the visual frame.
- One ring can have slow CSS animation (rotation), disabled on reduced-motion.

### 9.5 Multi-Layer Parallax
- Elements get different factors:
  - Background nebula/grid: 0.3 * --home-scroll-p
  - Hero visual: 0.8 or counter direction
  - Content cards: subtle 0.15 lift
- All driven from the same var in the controller tick.

---

## 10. Granular Task Breakdown for Claude (Actionable Checklist)

Use this as the execution backlog. Grouped by phase. Each task has owner (Claude), files, acceptance criteria.

### P1 Tasks (Foundation + High-Impact Visit Effects)
1. **Setup & Tokens**  
   Files: `src/styles/global.css`, `docs/home-ui-renewal-plan.md` (for reference)  
   AC: Add all new tokens (--glass, --line-active, --ease-orbital, holo-border base, sector-hud styles). Top trajectory bar styled as nebula gradient. No visual regression on existing elements.

2. **HUD Component**  
   Files: `src/components/home/HomeIngress.astro` (new), `src/pages/index.astro` (add data attributes)  
   AC: Desktop rail + mobile bar render. 7 sectors hardcoded (matching data-sector). Click jumps work. Active state driven by `data-active-sector` on html.

3. **Central Scroll Controller**  
   Files: `src/lib/scroll.ts` (new or extend), `src/layouts/Base.astro` (wiring)  
   AC: Single RAF + passive listener. Computes p, vel, most-visible (reuse journey visibility ratio logic). Sets the core vars. Reduced-motion early exit with static values. Runs on astro:page-load. < 4kB added.

4. **Hero Recession + Rings**  
   Files: `src/components/Hero.astro`, global.css  
   AC: Visual wrapper responds to --hero-depth. 3 orbital rings (CSS or SVG) present, one animated slowly. Depth effect visible on scroll past ~30vh.

5. **Solve Charge Bars**  
   Files: `src/pages/index.astro`, global.css  
   AC: 4 cards have data-chargeable + var-driven left bar. Bar fills from 0 to 1 as card enters view. Holo border boost on high charge.

6. **Manifesto Basic Filaments (P1 version)**  
   Files: `src/pages/index.astro`, global.css  
   AC: Lines connect the 3 directives. Basic CSS or simple div lines appear on reveal. Active line (rough band) has stronger style.

7. **Integration & Guardrails**  
   Files: All above + testing  
   AC: Works on / and /vi. No console errors. Reduced-motion tested (static but elegant). Basic Lighthouse run (no regression on home).

**P1 Exit Criteria**: First scroll session feels "the page is reacting to me". HUD orients + jumps. Hero has depth. Solves charge. Manifesto has connection.

### P2 Tasks
8. **Full SVG Filament Drawing**  
   Files: index.astro (manifesto + possibly DNA/stargate), scroll.ts (progress calc per band), global.css  
   AC: Real getTotalLength() + strokeDashoffset animation on scroll for at least manifesto paths. Smooth, no jank. Looks like "drawing in" as you descend the section.

9. **DNA Constellation**  
   Files: index.astro (skills section), css, controller  
   AC: Hubs styled. Faint lines connect rows progressively. Chips stagger-sync on visibility. Telemetry count-up (vanilla, one-time).

10. **Stargate Energy**  
    AC: Radial lines or warp elements appear/scale with --stargate-proximity. Brackets "live". Card has stronger outer glow when focused in HUD.

11. **Canvas + Velocity Polish**  
    AC: SiteBackground (or light extension) reads --home-scroll-vel to slightly increase link opacity or particle activity (very subtle).

12. **Roadmap + Logs**  
    AC: In-progress dot has ignite ring. Cards have signal indicators.

### P3 Tasks
13-17. Kinetic text, extra parallax layers, velocity speed hints (faint), tilt energy amplification, assembly states, mobile HUD refinement, full test suite (breakpoints, reduced motion, VT, Lighthouse desktop/mobile).

**Overall Backlog Tip**: Create a GitHub issue or local markdown with checkboxes from this list. Do P1 in one PR/branch for fast feedback.

---

## 11. High-Level Code Structure & Pseudocode (for Key Interactions)

### Central Tick (in scroll.ts)
```ts
function tick() {
  const state = computeScrollState(); // p, vel
  const active = computeMostVisibleSector(sectors);
  const charges = sampleVisibilityRatios(chargeEls);

  document.documentElement.style.setProperty('--home-scroll-p', state.p);
  document.documentElement.style.setProperty('--home-scroll-vel', state.vel);
  document.documentElement.setAttribute('data-active-sector', active.id);

  // Hero depth example
  const heroP = Math.max(0, Math.min(1, (window.scrollY - heroTop) / heroHeight));
  document.documentElement.style.setProperty('--hero-depth', heroP);

  charges.forEach((c, i) => 
    document.documentElement.style.setProperty(`--solve-charge-${i}`, c)
  );

  // Filament example (manifesto)
  updateSVGPaths(manifestoPaths, manifestoLocalProgress);
}
```

### SVG Path Draw Helper
```ts
function preparePath(path) {
  const len = path.getTotalLength();
  path.style.strokeDasharray = len;
  path.style.strokeDashoffset = len;
  return len;
}

function updatePath(path, len, progress) {  // progress 0->1
  path.style.strokeDashoffset = len * (1 - Math.max(0, Math.min(1, progress)));
}
```

Call prepare on load, update in tick when the section band is relevant.

### Multi Parallax Layer Example (CSS + var)
```css
.hero-visual-wrapper { 
  transform: translateY(calc(var(--hero-depth, 0) * 30px)) 
             scale(calc(1 - var(--hero-depth, 0) * 0.04)); 
}
.bg-layer-slow { transform: translateY(calc(var(--home-scroll-p, 0) * -15px)); }
```

---

## 12. CSS & Animation Guidelines (Tokens + Timing)

**Easing** (add to :root):
- `--ease-orbital`: cubic-bezier(0.22, 1, 0.36, 1)  // springy space feel
- Filament draw / charge: 420-650ms, direct style set (no transition) or very short for smoothness.

**Durations**:
- Entry reveals: 520-680ms
- One-time draws (filaments): tied to scroll, not timed
- Hover energy: 180-300ms
- Count-up: 650ms max, ease-out

**Classes to introduce sparingly**:
- `.holo-active`, `.synced`, `.warping`, `.ignited`

Always have `@media (prefers-reduced-motion: reduce)` rules that pin vars to final values and disable continuous animations.

---

## 13. Success Metrics & Testing Protocol

**Qualitative (user visit feel)**:
- "The page feels alive and responsive to my scrolling."
- User can name 2-3 "moments" (e.g. "the lines drew", "the HUD followed me", "hero went deeper").
- Reaches Journey teaser with clear "next step" sense.

**Quantitative**:
- Lighthouse Home (desktop + mobile) ≥ current baseline (target no >2 point drop in Performance).
- No new CLS or long tasks on scroll (use DevTools).
- Reduced-motion version is clean and usable (no broken layouts).

**Testing Steps for Claude**:
1. `npm run dev` + slow scroll on desktop.
2. Mobile (responsive mode or real device).
3. `prefers-reduced-motion: reduce` simulation.
4. Fast flick scroll (velocity effects should not break).
5. View Transitions (navigate away and back).
6. `astro build && npx serve dist` + Lighthouse.
7. Both EN and VI.

---

## 14. Quick Start for Claude (After Approval)

1. Read this entire plan + the two linked specs + INSIGHT.md.
2. Checkout a branch: `home-renewal-p1` or similar.
3. Implement in strict P1 order (tasks 1-7).
4. Commit frequently with "home: P1 - XXX" messages.
5. When P1 done: ping for review (real scroll test).
6. Then P2, etc.

This continuation makes the previous master plan fully executable by Claude with minimal ambiguity.

**Plan version**: v1.1 (continued with component specs, granular tasks, code structures, metrics).

All previous work (research, catalog, phases) remains valid. This is additive depth for implementation.

---

**End of continued plan.**

User: If this is the direction you wanted ("tiếp tục kế hoạch với" more details/task list/code structure), we're ready. Provide any specific additions (e.g. "thêm ví dụ CSS cụ thể cho X", "tạo file task list riêng", "bắt đầu implement P1 outline") and I'll refine or produce the next artifact. 

Otherwise, the full set of docs is now:
- `docs/home-ui-renewal-plan.md` (this master + continuation)
- `docs/home-implementation-spec.md`
- `docs/home-redesign-spec.md`
- Supporting: decisions.md (ADR-008), ui-spec.md, INSIGHT.md

This gives Claude everything needed to deliver a rich, research-inspired, constraint-respecting web3/space home with lots of scroll/visit-driven animations and interactions.
- Current home code for reference.

This gives a complete, research-backed, constraint-respecting plan that will deliver a distinctly more interactive, animated, web3-future/space visit experience while staying true to the existing beautiful space foundation and project rules.

Ready for your direction.
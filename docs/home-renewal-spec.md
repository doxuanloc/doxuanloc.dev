# Home UI/UX Renewal Spec — Web3 Futuristic Space Ingress (Home Page)

> **Mục tiêu**: Làm mới trang home thành trải nghiệm web3 + không gian/tương lai với nhiều animation và tương tác mượt mà, tương tác sâu với scroll và visit của user. Giữ nguyên triết lý static-first, Lighthouse, và multi-AI workflow hiện tại (Grok thiết kế spec + nghiên cứu, Claude implement).
> **Phạm vi**: Chỉ trang home (`/` và `/vi`). Không đụng journey, experience, blog, news, about.
> **Constraints**: Astro 5 static/hybrid, Vercel, i18n EN/VI, **không WebGL/GSAP/Three.js/full React**, KHÔNG số liệu bịa, giữ content fidelity từ profile.json, `prefers-reduced-motion` fallback đầy đủ, Lighthouse score không regress đáng kể.
> **Assumptions**: Traffic thấp (personal portfolio). Home là landing/overview page — cần vừa scannable nhanh vừa có cinematic scroll experience khi user visit lần đầu. Sử dụng và mở rộng pattern hiện có (data-reveal, data-tilt, space-bg + canvas constellation, journey scroll logic).

**Status**: Spec v1.0 — ready for review & implementation (modeled directly after `docs/ai-integration-spec.md` structure).

**Related docs**:
- High-level vision + research: `docs/home-redesign-spec.md`
- Detailed logic & previous implementation notes: `docs/home-implementation-spec.md`
- Master plan & research synthesis: `docs/home-ui-renewal-plan.md`
- AI Integration (kèm Research Assistant mới): `docs/ai-integration-spec.md`
- Decisions: `docs/decisions.md` (ADR-008)
- Project context: `INSIGHT.md`, `docs/codebase-overview.md`, `docs/ui-spec.md`

---

## 1. Architecture Decision Record (ADR)

### Quyết định: Lightweight Scroll-Synchronized Layers + Floating Live Sector HUD trên normal document flow (không pinned scrolly)

**Chọn**: Giữ normal vertical flow cho home. Sử dụng **một** central throttled controller (RAF + passive scroll listener, tái sử dụng pattern từ `src/components/journey/scroll.ts`) để tính toán progress, velocity, most-visible sector và set CSS custom properties. Kết hợp floating HUD (right rail desktop / compact mobile) + rich scroll-driven effects (filaments/SVG draw, charge bars, multi-layer parallax, canvas modulation, kinetic elements).

**Rationale** (dựa trên research web3/futuristic/space designs 2025-2026 + project constraints):
- Scrollytelling là xu hướng chính (Lusion-style SVG paths drawing on scroll, cosmic layered parallax, HUD telemetry, glassmorphism + on-scroll energy/charge/glow, kinetic typography).
- Home cần "nhiều animation và tương tác với user khi visit" nhưng vẫn là **fast overview + marketing surface** (scannable cho recruiter, dễ tiếp cận blog/news).
- Full pinned scrolly (như Journey) sẽ hại scanability, SEO, và trải nghiệm phần dưới (Roadmap, Blog, News).
- Một controller + CSS vars + SVG + existing canvas = đạt được depth, filaments, velocity awareness, progressive assembly mà không vi phạm "không heavy libs / Lighthouse".
- Tái sử dụng 100% pattern đã chứng minh (most-visible với visibility ratio, ticking RAF, astro:page-load init, reduced-motion guards, data-reveal/tilt).
- Floating HUD cung cấp "sense of place" và quick navigation mà không chiếm không gian nội dung (phù hợp cockpit/HUD trend trong futuristic/web3 sites).

**Trade-off ghi nhận**:
- Hiệu ứng "spatial flight" nhẹ hơn full pinned scrolly (không crossfade 1:1 panel). Bù bằng progressive layers, SVG draw, và persistent HUD.
- Cần duy trì ~8-10 CSS vars + một số per-element states. Đã lock contract chặt để tránh scope creep.
- Mobile HUD phải collapse mạnh.

**Rejected**:
- Full 3D/WebGL/GSAP/Framer (vi phạm constraints + Lighthouse).
- Pure CSS ScrollTimeline / animation-timeline (hỗ trợ browser chưa ổn định, khó coordinate HUD + nhiều hiệu ứng phức tạp).
- Nhiều listener nhỏ per-section (perf overhead cao hơn một controller tập trung).

**Migration note**: Xây dựng trên `docs/home-implementation-spec.md` và `docs/home-ui-renewal-plan.md`. Bắt đầu P1 với controller + HUD + hero depth + solves charge. SVG path draw (Lusion emulation) đưa vào P2. Test kỹ với View Transitions và reduced-motion từ đầu.

---

## 2. Animation & Interaction Selection Matrix

Bảng chọn các hiệu ứng tương tác/animation theo research (web3/space/futuristic 2026: scrollytelling, parallax layers, HUD, glassmorphism + energy, SVG draw, kinetic) và feasibility dưới constraints của project.

| Use case / Effect                      | Recommendation (inspired by)             | Lý do chính + Feasibility                                                                 | Effort | Phase |
|----------------------------------------|------------------------------------------|-------------------------------------------------------------------------------------------|--------|-------|
| Scroll-driven "drawing" paths / filaments | Lusion.co flowing paths                 | Vanilla SVG + `getTotalLength()` + `strokeDashoffset` driven by scroll progress. Rất đẹp, nhẹ, "web3 future" feel. | Medium | P2    |
| Multi-layer parallax (scroll + mouse)  | Cosmic Scroll, parallax collections     | Mở rộng existing `--par-x/y` + `--home-scroll-p` multipliers trên nhiều layer. Pure CSS transform. | Low    | P1/P2 |
| Live Sector HUD + trajectory progress  | Futuristic cockpit / scrolly HUDs       | Floating right rail (desktop) / compact bottom (mobile). Real-time active sector + overall progress. Click to jump. | Low-Medium | P1 |
| Charge / assembly / glow on entry      | Glassmorphism web3 cards                | Visibility-ratio driven left bars, holo borders intensify, staggered chips sync. Reuse data-reveal. | Low    | P1    |
| Depth recession + orbital rings on Hero| Layered sci-fi portals                  | Visual recedes more than text via `--hero-depth`. Add thin orbital rings (CSS/SVG). | Low    | P1    |
| Constellation / node activation        | Web3 network + canvas examples          | Existing SiteBackground canvas + CSS hubs + bus filaments. Subtle velocity boost on canvas links. | Low    | P2    |
| Kinetic typography & reactive text     | Kinetic type trends 2026                | Class toggle theo scroll band → CSS scale/gradient shift hoặc subtle reveal. Giữ rất nhẹ. | Low    | P3    |
| Stargate / portal energy on Journey teaser | Cosmic journey teasers                | Radial warp lines, proximity var, brackets "live", outer energy field khi focused. | Medium | P2    |

**Technique strategy**:
- **Core**: Vanilla JS (một controller) + CSS custom properties + SVG (cho draw effects) + existing canvas.
- **Progressive enhancement**: Native `scroll-timeline` / `animation-timeline` (fallback JS).
- **Không mix heavy libs**: Giữ Lighthouse. Tất cả effects là additive.

---

## 3. Feature Spec

### User Flows Chính (Visit + Scroll Interactions)

1. **Land / Ingress Portal**: Ngay khi load — background (stars + nebula + canvas constellation) "alive" (twinkle + nodes). Hero có subtle scanline + float. Badge location "SIGNAL LOCKED". User cảm nhận "đã dock vào một hệ thống sống".
2. **Scroll to descend layers**:
   - Hero: visual recedes (depth) + orbital rings react khi cuộn qua ~30vh.
   - Manifesto (Primary Directives): filaments "vẽ" nối 3 lines (SVG draw). Active line highlight theo vị trí scroll trong band.
   - Solves (Anomaly Briefs): 4 cards — left charge bar fill theo visibility ratio. Holo border + glow intensify. Ghost num pulse khi card là primary.
   - Tech DNA (Constellation Core): hubs sáng lên, bus filaments connect rows progressively. Skill chips "sync in" (opacity + micro-lift staggered).
   - Current Mission: data sweep nhẹ + telemetry feel.
   - Journey Teaser (Stargate): khi gần viewport — radial warp lines converge, brackets active + scan, card outer energy field. CTA trở thành "portal".
3. **Live HUD / Telemetry**: Right rail (desktop, thin, 7 sectors "01 DIRECTIVE" → "07 LOGS") hoặc compact bottom bar (mobile). Cập nhật real-time theo most-visible sector. Click = smooth scrollIntoView. Top trajectory bar (nebula gradient) fill theo overall progress.
4. **Velocity & micro feedback**: Cuộn nhanh → canvas link density/brightness tăng nhẹ (speed feel). Cuộn chậm deliberate → rich staggered reveals và assembly.
5. **Lower sections (Flight Plan + Downlinks)**: Roadmap dots "ignite" với ring expansion. Blog/News cards có signal strength dots + "T-{days}" timestamps. Hover có filament underline.
6. **Reduced motion**: Tất cả advanced scroll-var effects tắt ngay, giữ static elegant final state + basic data-reveal.

**Component names (islands / progressive)**:
- `HomeIngress` (island `client:visible`): HUD markup (desktop rail + mobile bar) + mount controller.
- Central logic: `src/lib/scroll.ts` (pure helpers: `getHomeSectors`, `computeMostVisibleSector`, `computeScrollState`, `initHomeScrollSync`, `updateSVGPaths`...).
- Enhanced existing: `Hero.astro` (wrappers + rings), `.solve-card` (chargeable), manifesto section (filament SVG), `Roadmap.astro` (light ignite).
- Reusable patterns: charge bar, filament SVG, kinetic text.

**Data flow (text diagram — scroll controller)**:
```
[index.astro static + data-sector="xxx" / data-chargeable + filament SVGs]
  + <HomeIngress client:visible />
      ↓ document 'astro:page-load'
      initHomeScrollSync()
          | window.addEventListener('scroll', onScroll, {passive:true}) + RAF tick (ticking flag)
          | computeMostVisibleSector(sectors)  // reuse journey visibility ratio logic
          | compute p + vel
          | sampleCharges(chargeEls)
          ↓ batch style.setProperty on :root
              --home-scroll-p / --home-scroll-vel / --home-active-sector
              --hero-depth / --solve-charge-0..3 / --stargate-proximity ...
          ↓ updateSVGPaths(manifestoPaths, localProgress)  // strokeDashoffset
          ↓ class toggles (.holo-active, .synced, .warping...)
  + CSS reads vars → parallax transforms, charge height, filament dashoffset, glow intensity, canvas modulation
  + HUD reads data-active-sector attribute → .active states + connector lines
```

**Scroll state strategy**:
- Overall progress + recent velocity từ một listener (clamped 0-1).
- Per-section / per-element local progress (cho filaments trong manifesto, charge từng card, stargate proximity).
- Most-visible dùng cùng logic với journey mobile (rect visibility / height).
- Tất cả trong một RAF batch để tránh layout thrash.

---

## 4. File Structure (mới / thay đổi)

```
docs/
  home-renewal-spec.md             # file này (spec theo format ai-integration-spec.md)
  home-ui-renewal-plan.md          # research + detailed continuation
  home-implementation-spec.md      # logic chi tiết, pseudocode
  home-redesign-spec.md            # high-level vision

src/
  lib/
    scroll.ts                      # NEW/expanded: helpers + initHomeScrollSync (core engine)
  components/
    home/
      HomeIngress.astro            # NEW: HUD island (desktop rail + mobile) + controller mount
    Hero.astro                     # enhance (visual wrapper, orbital rings, --hero-depth)
  pages/
    index.astro                    # markup updates: data-sector, data-chargeable, inline SVG filaments, wrappers
    vi/index.astro                 # re-export (giữ nguyên)
  styles/
    global.css                     # new tokens, .holo-border, .sector-hud, .filament, .charge-bar, parallax layers, reduced-motion rules, velocity effects
  layouts/
    Base.astro                     # wiring (nếu controller không hoàn toàn trong island)

# Reuse (không thay đổi lớn):
- SiteBackground.astro (canvas — chỉ thêm modulation với --vel)
- Roadmap.astro (nhẹ: ignite ring)
- Existing data-reveal, data-tilt, .hud-bracket, .grad, glass cards
```

**Ghi chú**:
- Ưu tiên vanilla progressive. Island chỉ cho HUD + controller (giữ JS footprint nhỏ).
- SVG cho filaments (inline trong .astro, JS control `strokeDashoffset`).
- Tất cả init bên trong `astro:page-load` để hỗ trợ View Transitions.
- Không thêm dependency.

---

## 5. Phase Plan

**P1 — Foundation + High-Impact Visit Effects (core "nhiều tương tác khi visit")**  
- Tokens + holo/glass enhancements, trajectory bar, basic HUD (rail + mobile).
- Central controller + CSS var engine (`--home-scroll-p`, `--vel`, `--active-sector`, `--hero-depth`, solve charges).
- Hero depth recession + orbital rings.
- Solve charge bars + holo intensification.
- Manifesto basic filaments (CSS version đầu).
- HUD active state + click navigation.
- Reduced-motion full coverage + wiring.
- **Deliverable**: Land + first deliberate scroll cảm thấy "hệ thống đang respond". HUD orient + jump. Hero có depth. Solves charge khi vào view. Hoạt động tốt cả EN/VI. Lighthouse không regress.

**P2 — Connection, Depth & Drawing Effects (web3 future density)**  
- Full SVG filament drawing (Lusion-style `strokeDashoffset` trên manifesto + stargate radials).
- DNA Constellation: hubs, bus filaments, staggered chip sync, telemetry count-up (vanilla).
- Stargate proximity + warp energy lines + live brackets.
- Canvas velocity modulation (subtle link boost).
- Roadmap ignite + blog/news signal treatments.
- More parallax layers.
- **Deliverable**: Scroll "narrative" và connected. Filaments vẽ theo cuộn. Constellation wake up. Journey teaser thành portal mạnh.

**P3 — Polish, Velocity, Mobile, Kinetic Delight**  
- Kinetic text / soft counters.
- Velocity micro effects (faint speed hints, stronger canvas).
- Refined mobile HUD + extra telemetry.
- Enhanced tilt + hover energy sweeps.
- "Assembly complete" micro states per band.
- Full testing (breakpoints, reduced-motion, View Transitions, real devices, Lighthouse).
- **Deliverable**: Production quality, rich density of motion/interaction khi visit, metrics giữ nguyên hoặc cải thiện.

**Thứ tự ưu tiên (nếu cắt scope)**: P1 → P2 (drawing + constellation là "wow" cao từ research) → P3.

---

## 6. Risks & Mitigations

- **Over-animation fatigue**: Tiered catalog (P1 core, P2/P3 extras). One-time or slow effects. Research cho thấy deliberate scroll được reward.
- **Perf / jank trên low-end**: Một controller + RAF batch + passive listener. Early reduced-motion exit. Test throttled CPU + mobile.
- **Mobile HUD complexity**: Collapse mạnh (compact bar + dots). Lighter parallax.
- **Scope creep "thêm nhiều animation"**: Locked catalog + phases. Mọi ý mới phải qua feasibility + impact filter.
- **View Transitions / re-init**: Tất cả init trong `astro:page-load` (pattern đã chứng minh).
- **Lighthouse regress**: JS chỉ chạy trên home, rất nhỏ. Decorative effects. Sử dụng `client:visible` pattern.
- **Content drift**: 100% data từ `getProfile(lang)` + i18n. HUD codenames giữ English (sci-fi convention, giống "FLIGHT LOG" trong journey).

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

1. User review + approve (đặc biệt ADR, matrix, phase plan, task breakdown từ plan chi tiết).
2. (Optional) spike nhỏ: implement 1-2 effect cốt lõi (controller + HUD + hero depth) trong branch để cảm nhận.
3. Claude implement theo phase + granular tasks (bắt đầu P1). Grok review logic + visual feel sau mỗi phase.
4. Sau P1: đo thực tế scroll experience + Lighthouse trên real devices, adjust nếu cần.
5. Update docs (ui-spec, INSIGHT, decisions nếu có nuance mới).

Giữ nguyên guardrail: Home vẫn là scannable overview chuyên nghiệp, không bịa metrics, content từ profile, i18n đầy đủ, tone phù hợp AI & System Optimization Engineer.

---

**Kết thúc spec theo đúng cấu trúc và rigor của `ai-integration-spec.md`.**

Tài liệu chính để implement: 
- File này (`docs/home-renewal-spec.md`)
- `docs/home-ui-renewal-plan.md` (research + task breakdown chi tiết)
- `docs/home-implementation-spec.md` (logic sâu)

Sẵn sàng để user review và handover cho Claude.
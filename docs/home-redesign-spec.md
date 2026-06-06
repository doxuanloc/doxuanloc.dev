# Home Redesign Spec — Web3 Spatial Ingress (2026)

> **Owner**: Grok (design + decisions)  
> **Implementer**: Claude (or follow-on)  
> **Status**: Spec v1 — ready for review / spike  
> **Scope**: `/` (EN) and `/vi` (same structure, strings via i18n)  
> **Constraint**: Astro 5 static + View Transitions, no WebGL/Three/GSAP. Vanilla + CSS + minimal island. Lighthouse-first.

## 1. Vision & Narrative

**Name**: "Ingress" / "Orbital Command Deck"

The home is no longer a vertical stack of sections. It is the **entry portal** into a living protocol. The user "docks" on load. As they scroll they descend through atmospheric layers of the system:

1. **Atmosphere breach** — Hero (launch vector + identity lock)
2. **Primary Directives** — Manifesto (core axioms, filament-connected)
3. **Anomaly Briefs** — Solves (4 mission reports, charging on approach)
4. **Constellation Core** — Tech DNA (nodes + connections lighting progressively)
5. **Live Vector** — Current mission (telemetry strip)
6. **Stargate** — Journey teaser (warp threshold)
7. **Flight Plan + Downlinks** — Roadmap + Blog/News (mission logs)

**Feeling**: High-spec aerospace UI meets clean web3 data visualization. Deep space (#04060e), cold neon (blue #5b8cff, teal #36d6c3, purple #b58cff, gold #f0b232), glass with energy fields, thin orbital lines, subtle scan/HUD, zero clutter.

**Scroll is the primary input device** on first visit:
- Slow deliberate scroll = rich layered reveals, lines drawing, orbs charging, data "syncing".
- Faster scroll = velocity hints (faint speed lines in bg, higher link density in canvas).
- Position = "current sector" in a persistent minimal HUD (right rail desktop / compact bottom on mobile).
- Never forces reading order; everything remains scannable at a glance.

**Success metrics (qualitative)**:
- First scroll session feels like "flying through the stack" rather than "reading a resume".
- User naturally reaches the Journey CTA with a sense of "I've seen the map".
- Stays true to professional, humble, production-grade tone (no hype, no fake metrics).

## 2. Design Language Updates (builds on existing)

### Core Tokens (add / promote)
```css
--bg: #04060e;
--bg-elev: #16203f;
--border: #233056;
--accent: #5b8cff;      /* primary lock / vector */
--accent-2: #36d6c3;    /* systems / teal */
--accent-3: #b58cff;    /* intelligence / purple */
--accent-4: #f0b232;    /* AI gold */
--text, --text-dim, --text-mute (existing)

--glass: rgba(18, 27, 53, 0.72);
--glass-strong: rgba(12, 18, 40, 0.85);

--line: rgba(91, 140, 255, 0.25);     /* thin orbital / filament */
--line-active: rgba(54, 214, 195, 0.55);

--ease: cubic-bezier(0.4, 0, 0.2, 1);
--ease-rev: cubic-bezier(0.23, 1, 0.32, 1);   /* for reveals */
--ease-orbital: cubic-bezier(0.22, 1, 0.36, 1);
```

New utilities / motifs:
- `.holo-border` — multi-stop gradient border + soft glow (used on key cards + hero visual)
- `.node` / `.hub` — small orbs with ring + soft shadow for constellation
- `.filament` — 1px line (SVG or pseudo) that can draw via stroke-dash or scale
- `.scan` — horizontal or radial energy sweep (used sparingly on enter)
- `.telemetry` — mono small caps + subtle tabular numbers
- `.sector-hud` — the live right-rail / bottom indicator

Existing patterns to **amplify** (do not remove):
- `data-reveal` + `.in` (IO)
- `data-tilt` (desktop magnetic)
- `.hud-bracket`
- `.grad` aurora text
- `.space-bg` + `#site-bg` canvas (constellation)
- `.card` glass

### Background & Depth Layers (scroll-aware)
Current 3 layers:
1. `.space-bg` (fixed stars + nebula + planet + shoots) — already has mouse `--par-x/y`
2. `#site-bg` canvas (moving nodes + links) — mouse parallax stronger

**New**:
- Drive a `--scroll-depth` (0–1) and `--scroll-vel` (clamped) from a single throttled listener.
- Use them to:
  - Slightly increase canvas link opacity + node brightness on fast scroll (velocity lines feel).
  - Shift nebula/planet position or opacity very subtly (pure CSS transform on scroll via var).
  - Fade some background shoots or flares when deep in page.
- Add a very faint fixed "grid" or "latitude lines" at z=-3 (subtle, 1px, low opacity) that also reacts.

All motion respects `@media (prefers-reduced-motion: reduce)` — everything snaps to static elegant state.

## 3. Scroll Narrative & Global Primitives

### 3.1 Live Sector HUD (new, high impact, low cost)
- Desktop: thin fixed vertical rail on the right (inside container or edge). Shows 6–7 sector labels in mono small size.
  - Sectors (suggested codenames, short):
    - 01 DIRECTIVE
    - 02 ANOMALY
    - 03 CONSTELL
    - 04 VECTOR
    - 05 STARGATE
    - 06 PLAN
    - 07 LOGS
  - Active sector has accent color + small filled dot + thin horizontal connector to content.
  - Click jumps to that section (smooth, like journey rail).
- Mobile / <900px: collapse to a compact bottom or top micro bar with current sector name + progress dots (or just current name + thin progress fill).
- Implementation: one `setupHomeSectorHUD()` using a `Map<el, id>` + scroll listener (rAF) computing most-visible section. ~60 lines total. Reuses existing reveal IO patterns.

### 3.2 Trajectory Progress (enhance existing)
- Top 2–3px bar: nebula gradient (`--accent` → `--accent-2` → `--accent-3`).
- Fills with actual document progress (existing read-progress logic, just restyle + always visible on home).
- Optional: small % or "depth" label next to it on desktop (telemetry flavor).

### 3.3 CSS Scroll Variables (lightweight)
Expose from the controller:
```css
:root {
  --home-scroll-p: 0;     /* 0–1 page progress */
  --home-scroll-vel: 0;   /* 0–1 normalized recent velocity */
}
```
Use for:
- Hero visual parallax amount
- Card "charge" level on solves
- Filament dash offset or opacity on manifesto & constellation
- Subtle scale/brightness on journey teaser as it nears viewport

Fallback: if no JS or reduced motion → static values.

## 4. Section-by-Section Spec

### 4.1 Hero (Ingress Portal)
**Visual goal**: "You have arrived. Systems are reading you in."

- Keep 2-col (content | visual) on >=820px.
- **Visual column**:
  - Stronger `.holo-border` + inner multi-glow.
  - The astronaut image gets a new wrapper that applies `translateZ` feel via stronger `--par` + new `--scroll-in` (moves opposite to scroll direction lightly).
  - Existing scanline stays; make it slower + more ethereal.
  - Add 2–3 thin "orbital rings" or vector arcs (CSS or tiny SVG) clipped to the frame, very low opacity, one of them rotates at glacial speed (12–18s, reduced-motion: none).
- **Content column**:
  - Badge (location) stays, perhaps gains a "SIGNAL LOCKED" micro state.
  - Name in larger grad with slight letter-spacing control.
  - Title + tagline crisp.
  - Capability lines: keep 3, but each becomes a small "bus" with left node.
  - Stack matrix (hero-stack): treat as "Core Bus Map". On scroll past hero, the 4 columns can receive a sequential "power on" highlight (staggered by 120ms via IO or scroll band).
- **Scroll behavior**:
  - 0–30vh: normal.
  - Past ~35vh: hero-inner gets `opacity: 0.92` + slight scale(0.985) + content shifts up a bit (feels like the deck is receding while you continue forward). Use CSS var driven by scroll.
  - Visual recedes more than text (depth layering).

**Responsive**: On mobile the visual sits below, aspect tightens, no heavy parallax.

### 4.2 Manifesto → Primary Directives
**Visual goal**: Three unbreakable axioms, connected like a minimal command mesh.

- Keep the 3 numbered lines.
- Wrap in a slightly elevated glass band with top/bottom hairline that has aurora energy when in view.
- **On enter** (data-reveal enhanced):
  - Draw 2 light filaments (SVG paths or 3 absolutely positioned 1px elements with gradient) connecting 01-02 and 02-03.
  - Filaments use `stroke-dasharray` + JS or pure CSS animation on reveal to "draw".
  - The active line (based on rough scroll band or center proximity) gets full opacity + accent glow; others dim.
- Typography: first line strongest (grad), others slightly muted until activated.
- No hover gimmicks — this band is "read once, felt on scroll".

### 4.3 Solves → Anomaly Briefs
**Visual goal**: 4 high-signal mission reports. Each feels like a docked data crystal.

- Grid: 2-col desktop → 1-col mobile (existing).
- Card upgrades:
  - Outer: glass + `.holo-border` (thin multi-accent on hover/charge).
  - Left border: existing colored 3px → becomes a "charge bar" that grows from 0 to full height (or fills a gradient) as the card's intersection ratio goes 0→1. Driven by scroll (per-card observer or shared controller sampling).
  - Ghost number: larger, more transparent, gains a very slow pulse or "data flicker" only while the card is the primary in view.
  - Problem title: strong weight.
  - Approach + stack chips: keep clean. Chips get the accent of that card.
  - Subtle inner: very faint 8×8 dot grid or latitude lines in the background of the card (pointer-events none) that become slightly more visible on charge.
- Interaction: keep `data-tilt`. Add a "locked" micro state (thicker left bar + bracket glow) when the card is most centered.
- Order and colors preserved (01 blue, 02 teal, 03 purple, 04 gold).

### 4.4 Tech DNA → Constellation Core
**Visual goal**: Not a list — a live partial map of the operating system.

Options (pick one primary, keep scannable):
**Preferred**: Hybrid "orbital rows".
- Keep the current clean row structure (label + count + chips) for scannability and mobile.
- **Enhance**:
  - Each row header (the colored dot + cat + count) becomes a small "hub".
  - As rows enter view, faint connection filaments appear between consecutive active hubs (visual "bus").
  - The chips (skills) start slightly desaturated / lower opacity and "sync in" (opacity + tiny lift) staggered as the row is revealed.
  - The final total line becomes a big telemetry readout: `NODES SYNCED  {total}  /  {groups} DOMAINS` with accent numbers. On full reveal it can do a one-time soft count-up (vanilla, 600–800ms, respect reduce).
- Alternative (if we want more visual pop): turn the whole block into a contained "star map" SVG + legend below. But only if it doesn't hurt scan speed. Current rows win for content density.

Keep existing skillGroups mapping (colors + labels).

### 4.5 Current Mission → Live Vector
**Visual goal**: Single source of truth cockpit strip. "This is where thrust is applied right now."

- Existing pulsing bar is good.
- Make the whole strip use a slightly stronger glass + hairline top/bottom in accent.
- Add a small "phase" or "bearing" indicator on the right of the label (e.g. "PHASE 04" or pull from roadmap if we add a short code later — keep optional).
- The CTA "See full roadmap" gets a tiny trajectory arrow.
- On scroll: the bar can have a very slow "data sweep" background (low opacity) that moves left→right once when it first locks in view.

### 4.6 Journey Teaser → Stargate
**Visual goal**: The single most important call-to-action on the site. Feels like a jump gate.

- Large aspect-ratio cinematic card (existing 21/8 or adjust to 2.4:1 for more presence).
- Image treatment: existing hover scale + overlay. Add:
  - On approach (when card top enters ~65vh from bottom): a set of thin radial "warp" lines or converging filaments animate in from the edges toward center (CSS, one-time or while near).
  - The overlay gains a very faint rotating energy ring (subtle).
- Content: eyebrow + title + CTA button (primary style).
- HUD brackets: existing — make them "live" (thicker or color shift + small corner scan when active).
- Whole card container gets a stronger outer glow on hover + when it becomes the focused sector.
- Click target remains the whole card + the button text.

**Text**: "Explore the journey →" must stay prominent.

### 4.7 Roadmap + Blog + News (Flight Plan + Downlinks)
- Roadmap: keep component. Enhance individual items:
  - In-progress gets stronger live dot + aurora label treatment (existing).
  - On scroll reveal: the dot "ignites" with a soft ring expansion (CSS).
- Blog/News grids: treat as downlink packets.
  - Cards get a top-right "signal" micro indicator (3 tiny vertical bars, height randomized or based on recency if we expose it).
  - Date becomes "T-{days}".
  - Hover: the usual sweep + border, plus a quick filament underline on the title.

All lower sections use normal flow (no pinning) so user can still skim fast.

## 5. Motion & Performance Rules

**Durations**:
- Reveal base: 520–680ms (ease-rev)
- Filament draw: 420–650ms
- Charge / sync waves: 280–400ms per element, staggered
- Hero depth shift: 300ms (on scroll position, not instant)
- Count-up: 650ms max

**Easing**: favor `--ease-rev` and `--ease-orbital` for space feel (slightly springy but controlled).

**JS budget**:
- Single home controller (or extend Base script under `if (isHome)`) .
- One passive scroll listener + rAF for HUD + vars + per-card charge sampling.
- Max 1 additional lightweight IntersectionObserver per major feature (or reuse one).
- Canvas already throttled ~25fps and pauses on hidden — good.
- Total added JS on home: aim < 4–5 kB gz after tree-shake.

**Lighthouse / perf**:
- No layout thrash (read measurements in rAF, write in same frame).
- All decorative elements `aria-hidden`.
- Images already optimized (hero eager, others lazy).
- Keep existing `animatedBg` prop behavior.

**Reduced motion**:
- All advanced scroll var driven transforms → static final positions.
- No drawing animations, no velocity effects, no count-up.
- Reveal still works (instant .in).
- HUD remains for navigation value but without live updates (static or click-to-jump only).

## 6. Implementation Notes (for Claude)

**Files likely touched**:
- `src/pages/index.astro` (and vi alias) — markup + per-section classes + new data attrs (`data-sector="directive"`, `data-chargeable`, etc.)
- `src/styles/global.css` — new tokens, `.holo-border`, `.filament`, sector HUD base styles, scroll var usage examples
- `src/layouts/Base.astro` — extend the astro:page-load script with `setupHomeIngress()` (guarded by `document.body.dataset.page === 'home'` or pathname check). Or create a tiny island `src/components/HomeIngress.astro` (client:visible) that only mounts the controller + HUD markup.
- New or extended: small utils in `src/lib/scroll.ts` (pure functions for progress, most-visible, velocity) if it grows.
- `docs/ui-spec.md` — link to this spec + mark Home as "v2 spatial" .

**Content stability**:
- All text, solves, skills, roadmap come from `getProfile(lang)`.
- Do not hardcode counts or copy.
- i18n keys stay the same; only add new keys if we introduce new UI strings (e.g. sector labels, "NODES SYNCED").

**Component reuse**:
- Reuse `.card`, `.hud-bracket`, `.grad`, existing reveal/tilt setup.
- Roadmap component can receive optional props for enhanced reveal if needed.
- Journey teaser image path stays `/images/hero-astronaut.webp`.

**A/B or incremental**:
- Phase 1: tokens + global HUD + hero depth + solves charge bars + manifesto filaments (biggest perceived change).
- Phase 2: constellation connections + stargate warp lines + velocity canvas link.
- Phase 3: polish, mobile HUD, count-ups, telemetry details.

**Testing**:
- Desktop 1200+ (the cinematic experience)
- 820–1100 (tablet-ish)
- 600 and below (flow + compact HUD)
- Reduced motion
- View Transitions on/off (Astro)
- Slow CPU / throttle to ensure rAF doesn't jank

## 7. Open Decisions / Trade-offs (Grok decided)

- **No full pinned scrolly on home** (unlike Journey). Reason: home must remain a fast overview + content marketing surface. Pinned would hurt blog/news consumption and SEO scanning.
- **Sector HUD on right vs left**: right (after content reads L→R in most cultures, HUD lives in periphery like real cockpits).
- **Canvas modulation**: subtle only. The constellation should never fight the content.
- **Keep existing hero visual** (astronaut). It is strong brand asset. We enhance framing and motion around it, do not replace.
- **New i18n strings** minimal. Sector labels can be English-only HUD flavor (or add 2 keys). Prefer English codenames for sci-fi consistency (like "FLIGHT LOG" already in journey).

## 8. Next Steps

1. User review + approve.
2. See the **Claude-ready detailed implementation spec**: [docs/home-implementation-spec.md](home-implementation-spec.md) (tech stack, exact scroll logic pseudocode, component inventory, CSS var contract, phase plan with deliverables, i18n, perf rules, checklist).
3. ADR-008 added to decisions.md.
4. Claude implements (start with P1 foundation + HUD + hero + solves).
5. Grok does visual/UX + logic review after P1 (and P2).

---

**References**:
- Current implementation: `src/pages/index.astro`, `src/components/Hero.astro`, `src/styles/global.css`, `src/layouts/Base.astro`
- Inspiration patterns: `src/components/journey/*` (scroll.ts, pinned HUD, --scroll-in, rail)
- Content contract: `content/profile.json` + `.en.json`
- Existing UI spec: `docs/ui-spec.md`
- Detailed impl plan: `docs/home-implementation-spec.md`

This high-level vision doc + the implementation spec together give full context for Claude. The "why & feel" is here; the "how, what files, exact logic" is in the impl spec.

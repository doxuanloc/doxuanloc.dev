# Home UI/UX Redesign — Detailed Implementation Spec & Plan
## Web3 Spatial Ingress v2 (for Claude)

> **Owner / Spec Author**: Grok  
> **Implementer**: Claude  
> **Status**: v1.0 — ready for implementation (after user approval)  
> **Related**: [docs/home-redesign-spec.md](home-redesign-spec.md) (vision + high-level UX) | [docs/ui-spec.md](ui-spec.md) | [docs/decisions.md](decisions.md) (will add ADR-008)  
> **Date**: 2026-06

**Goal**: Transform the home (`/`, `/vi`) into an immersive "orbital command ingress" experience. Scroll becomes the primary interaction instrument on first visit. Deepen the existing space/web3 aesthetic with holographic, orbital, telemetry, and filament motifs while preserving scannability, content fidelity, Lighthouse, and all current constraints.

**Non-goals**:
- Do not turn home into full pinned 100vh scrolly (Journey already owns that pattern — see ADR-004).
- No new runtime dependencies.
- No fake metrics or content changes (all data from `getProfile(lang)`).
- Keep hero astronaut visual.

---

## 1. Architecture Decisions & Tech Stack

### 1.1 Core Decision (will be ADR-008)
**Lightweight scroll-synchronized layers + floating live Sector HUD on normal document flow.**

- Use normal vertical flow (good for SEO, scanning, blog/news consumption).
- One central, throttled scroll controller (RAF + passive listener) that:
  - Computes page progress + recent velocity.
  - Detects "most visible sector" using visibility-ratio logic (reused from journey/scroll.ts).
  - Sets a small set of CSS custom properties on `:root`.
  - Toggles active states on HUD and a few key elements.
- Progressive enhancement: core content works without JS. Advanced effects are additive.
- Inspiration (reuse patterns, do not copy-paste): Journey's `initJourneyScroll` (most-visible calc, ticking flag, RAF, mobile/reduced-motion early exits, astro:page-load init).

**Why not alternatives**:
- Pure CSS ScrollTimeline / view-timeline: still limited browser support + hard to coordinate HUD + multiple effects reliably.
- Full pinned scrolly: hurts overview + lower sections (blog/news).
- Heavy canvas/WebGL per section: violates Lighthouse + "no Three" rule.
- Many small per-section listeners: higher overhead than one coordinated controller.

### 1.2 Tech Stack (strictly minimal)
- **Framework**: Astro 5 (islands, View Transitions via `ClientRouter`)
- **Language**: `.astro` + TypeScript for any new `.ts` helpers (existing pattern in `src/components/journey/`)
- **Styling**: Tailwind? No — existing custom CSS in `global.css` + component `<style>`. Design tokens in `:root`.
- **JS runtime**: Vanilla (no Preact/React/Svelte islands unless justified). One small `client:visible` island for HUD + controller is acceptable.
- **Animation**: CSS transitions + transforms + `requestAnimationFrame`. Existing `data-reveal` (IO) + `data-tilt`.
- **Scroll primitives**: `IntersectionObserver` (existing reveal), one `scroll` + RAF loop (like journey).
- **No new packages**. Reuse `@astrojs/*` already present.

**New files (minimal)**:
- `src/lib/scroll.ts` — pure reusable helpers (computeMostVisible, estimateScrollVelocity, etc.)
- `src/components/home/HomeIngress.astro` — island that renders the Sector HUD + mounts the controller (client:visible)
- (Optional but recommended) Keep controller logic importable so it can also be called from Base script if we prefer zero new island for perf.

**Modified files** (see §4):
- `src/pages/index.astro` + `src/pages/vi/index.astro` (latter just re-exports)
- `src/components/Hero.astro`
- `src/styles/global.css`
- `src/layouts/Base.astro` (extend astro:page-load + possibly expose isHome)
- `src/components/Roadmap.astro` (light touch for ignite effect)
- `content/profile.json` / `.en.json` ? (only if we need tiny new strings — avoid if possible)

### 1.3 CSS Custom Properties Contract (the "API" between JS and style)
Set on `document.documentElement` (or a home root element):

```css
--home-scroll-p: 0;        /* 0–1 overall page progress (top of hero to bottom of logs) */
--home-scroll-vel: 0;      /* 0–1 clamped recent velocity (for canvas boost + subtle speed lines) */
--home-active-sector: 'directive'; /* current sector id for HUD + targeted effects */

--hero-depth: 0;           /* 0–1 how far we have scrolled past hero (drives recession) */
--manifesto-active: 0;     /* 0,1,2 index of most prominent directive line */
--solve-charge-0: 0; ... --solve-charge-3: 0;  /* per-card 0–1 charge */
--dna-sync: 0;             /* overall "synced" progress for constellation */
--stargate-proximity: 0;   /* 0–1 when journey teaser is entering/leaving view */
```

These are the **only** vars the controller is allowed to write. Styles read them with `calc()` / `var()`.

Fallback when `prefers-reduced-motion` or no JS: all vars = sensible static values (1 for charges, 0 for depth/vel, first sector).

---

## 2. Core Logic (detailed — implement exactly this shape)

Create `src/lib/scroll.ts`:

```ts
export type Sector = { id: string; label: string; selector: string; el?: HTMLElement };

export function getHomeSectors(): Sector[] {
  // Hardcoded order — matches markup data-sector or section ids
  return [
    { id: 'directive', label: '01 DIRECTIVE', selector: '.manifesto' },
    { id: 'anomaly',   label: '02 ANOMALY',   selector: '.section-solve' },
    { id: 'constell',  label: '03 CONSTELL',  selector: '.section-skills' },
    { id: 'vector',    label: '04 VECTOR',    selector: '.mission-bar' },
    { id: 'stargate',  label: '05 STARGATE',  selector: '.section-journey-teaser' },
    { id: 'plan',      label: '06 PLAN',      selector: '#roadmap' },
    { id: 'logs',      label: '07 LOGS',      selector: 'section:has(.blog-card), section:has(.news-card)' }, // or add data-sector on wrappers
  ];
}

/** Returns { index, id, visibility } for the most visible sector. Uses same visibility-ratio logic as journey mobile path. */
export function computeMostVisibleSector(sectors: Sector[], viewportH: number): { index: number; id: string; visibility: number } { ... }

/** Returns 0–1 page progress + 0–1 recent velocity (deltaY / time window, clamped). Call inside RAF. */
export function computeScrollState(lastY: number, lastT: number): { p: number; vel: number; newY: number; newT: number } { ... }

/** Sample intersection charge (0–1) for a list of elements. Can be called from RAF or dedicated IO. */
export function sampleCharges(els: HTMLElement[]): number[] { ... }
```

**Main controller** (inside the HomeIngress island or a setup function):

```ts
export function initHomeScrollSync(root: HTMLElement = document.documentElement) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { applyReducedMotionDefaults(); return; }

  const sectors = getHomeSectors().map(s => { s.el = document.querySelector(s.selector) as HTMLElement | undefined; return s; }).filter(s => s.el);

  let ticking = false;
  let lastScrollY = window.scrollY;
  let lastTime = performance.now();

  const chargeable = Array.from(document.querySelectorAll<HTMLElement>('[data-chargeable]')); // the 4 solve cards

  function tick() {
    ticking = false;

    const { p, vel } = computeScrollState(...);
    const most = computeMostVisibleSector(sectors, window.innerHeight);
    const charges = sampleCharges(chargeable);

    // Batch writes (one style mutation)
    const style = document.documentElement.style;
    style.setProperty('--home-scroll-p', p.toFixed(3));
    style.setProperty('--home-scroll-vel', vel.toFixed(3));
    style.setProperty('--home-active-sector', most.id);

    // Hero depth (example mapping)
    const heroRect = document.querySelector('.hero-section')?.getBoundingClientRect();
    const heroDepth = heroRect ? Math.max(0, Math.min(1, -heroRect.top / (heroRect.height * 0.6))) : 0;
    style.setProperty('--hero-depth', heroDepth.toFixed(3));

    // Per-solve charges
    charges.forEach((c, i) => style.setProperty(`--solve-charge-${i}`, c.toFixed(3)));

    // Optional: boost canvas (SiteBackground listens to --home-scroll-vel already via existing par, we can extend)
    // Optional: set --manifesto-active based on which of the 3 lines has highest visibility in its band

    // HUD active state is handled by CSS + a data-active-sector on the HUD root or by JS class toggle on the 7 items.
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(tick);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Initial
  tick();

  // Return cleanup for View Transition friendliness (rarely needed)
  return () => { /* remove listeners if we ever unmount */ };
}
```

**Sector HUD component** renders 7 buttons/items. On click: `el.scrollIntoView({ behavior: 'smooth', block: 'start' })`. Active styling driven by `[data-active-sector="xxx"] .sector-item[data-id="xxx"]` or a small reactive class list updated from the same tick (or use CSS `:has()` + attribute on body if we set `data-active-sector` on html).

**Filament / connector strategy (low complexity)**:
- Manifesto: 2 thin `<div class="filament">` absolutely positioned between the 3 lines. Use `scaleY(var(--manifesto-connection))` or `stroke-dashoffset` on an inline SVG (preferred for "drawing" feel). Toggle a class or CSS var when the section has high visibility.
- Constellation (DNA rows): very faint horizontal/vertical hairlines between row hubs (CSS `::after` on the grid container or individual borders that appear on `[data-dna-active]`). No heavy SVG unless easy.
- Stargate: 4–6 radial lines (CSS conic or multiple rotated 1px elements) that scale in when `--stargate-proximity > 0.3`.

Prefer CSS transitions for draw-in (duration 420–650ms) triggered by adding `.connected` or `[data-filaments="true"]` once on first enter (one-time, like data-reveal).

---

## 3. Component & File Changes (exact)

### 3.1 New
- `src/lib/scroll.ts` — helpers above (export compute*, getHomeSectors, initHomeScrollSync). Pure, testable in theory.
- `src/components/home/HomeIngress.astro` (new dir for future home islands)
  ```astro
  ---
  // Renders the desktop right rail + mobile compact HUD
  // <script> import { initHomeScrollSync } from '../../lib/scroll';  onMount or astro:page-load
  ---
  <aside class="sector-hud" data-home-hud aria-hidden="true"> ... 7 items ... </aside>
  <div class="mobile-sector-bar">...</div>
  <script>
    // attach init only if not reduced
    document.addEventListener('astro:page-load', () => { /* find root and call init */ });
  </script>
  ```

### 3.2 Modified (high level diffs)
**src/pages/index.astro** (and keep vi/index.astro as thin re-export):
- Add `data-page="home"` on a wrapper or use `document.documentElement`.
- Wrap sections with `data-sector="xxx"` or keep using stable class selectors.
- Add `data-chargeable` + `style="--charge: var(--solve-charge-0)"` on the 4 solve cards (or drive the left bar width via the var).
- Enhance manifesto with filament containers + `data-active-line`.
- Add classes: `holo-border`, `telemetry`, `hub`, etc.
- Hero: extra wrappers for `--hero-depth` and orbital rings.
- Journey teaser: extra decorative warp container.
- Keep all existing `{t()}` and profile data.

**src/components/Hero.astro**:
- Add orbital ring elements (3 divs or one SVG with circles).
- Wrap visual in `.hero-visual-wrapper` that consumes `--hero-depth` and `--home-scroll-vel` for extra parallax amount.
- Add `data-reveal` already present — keep.

**src/styles/global.css**:
- New tokens (see home-redesign-spec.md §2).
- `.holo-border { border-image or multiple box-shadow + ::before gradient }`
- `.sector-hud`, `.sector-item` (fixed or sticky rail, mono, small, active state with accent + dot + connector line).
- `.filament`, `.warp-line`, `.charge-bar` (the left accent that uses `height: calc(var(--charge) * 100%)` or `background-position`).
- Enhance existing `.card`, `.manifesto`, `.dna-row`, `.journey-card` with new states.
- `@media (prefers-reduced-motion: reduce) { ... all vars pinned }`
- Top trajectory bar (restyle or replace the existing read-progress for home).

**src/layouts/Base.astro**:
- In the astro:page-load handler: also call a `setupHomeIfNeeded()`.
- Or: `if (document.body.dataset.page === 'home' || location.pathname.replace('/vi','') === '/') { import or call home init }`.
- Extend the existing parallax mousemove to also consider scroll-vel if desired (minor).
- Add the top trajectory bar markup (home-only) or make the read-progress always present and home styles it differently.

**src/components/Roadmap.astro** (light):
- Add ignite ring animation on the in-progress or on reveal of each dot when `--home-scroll-p` high enough or via data-reveal enhancement.

**SiteBackground.astro** (optional Phase 2/3):
- Make the canvas also read `--home-scroll-vel` (or a global one) to modulate link alpha / particle speed slightly. Current code already has transform from --par-x/y — we can add another multiplier.

---

## 4. Phase Plan (Claude executes in this order)

**P1 — Foundation & High-Impact Visuals (biggest perceived change, ~6-9h)**
- Add all new tokens + basic `.holo-border`, trajectory bar, sector-hud CSS (desktop rail + mobile bar).
- Create `src/lib/scroll.ts` + basic `initHomeScrollSync` (p + vel + most-visible sector only).
- Create `HomeIngress.astro` island (client:visible) + wire it on home pages.
- Markup updates on index.astro: data-sector, hero depth wrapper, solve cards with chargeable + left bar that reads the var.
- Hero recession + simple orbital rings (CSS).
- Manifesto basic elevation + one-time filament lines (CSS scale or static).
- Wire active sector to HUD (class or attribute toggle in the tick).
- Click-to-jump on HUD items.
- Reduced-motion guard everywhere.
- **Deliverable**: User can land, scroll, see HUD update live, hero recede slightly, solve charge bars fill as they enter view, top trajectory fills. All on both EN/VI. Lighthouse still ≥ current.

**P2 — Filaments, Constellation, Stargate, Polish (deeper immersion, ~5-8h)**
- Manifesto: proper "drawing" filaments (inline SVG preferred) + active line highlight synced to scroll band inside the section.
- DNA / skills: hub styling on rows, faint bus filaments (CSS), staggered chip sync-in (use existing data-reveal or new --dna-sync var + nth-child delays).
- Soft count-up on the total line (vanilla, one-time when section mostly visible, skip on reduce).
- Stargate: radial warp lines (CSS), proximity var, live brackets.
- Extend controller to set --stargate-proximity, --dna-sync, --manifesto-active.
- Subtle canvas modulation (if easy in SiteBackground).
- Enhance Roadmap dots (ignite) + blog/news signal dots.
- **Deliverable**: Scroll feels "connected". Filaments appear and highlight. Constellation "wakes up". Journey teaser has warp energy when approached. All effects one-time or low-cost.

**P3 — Mobile refinement, velocity effects, telemetry details, testing (3-5h)**
- Mobile HUD (compact bar or pills at bottom, current sector name + 7 micro dots).
- Velocity-driven micro effects (very faint background speed lines or canvas boost — keep extremely subtle).
- Extra telemetry (small "depth XX%" next to trajectory on desktop — optional, can be removed).
- Full i18n for any new visible strings (sector labels can stay English for HUD flavor, or add keys).
- Edge cases: very short viewport, fast flick, View Transition back to home, print, etc.
- Manual Lighthouse + reduced-motion audit.
- **Deliverable**: Production quality on all breakpoints + motion prefs.

**Total realistic effort (1 dev)**: 14–22 hours including debug, two review passes, and small adjustments after real scroll feel.

**Recommended rollout**: Merge P1 first (visible value), get feedback on scroll "feel", then P2.

---

## 5. i18n Additions (minimal — add only if text is new and visible)

In `src/i18n/ui.ts` (both en + vi):
- Optional: `'home.sector.directive'`, etc. (if we decide to localize HUD labels).
- `'home.telemetry.nodes'`: 'NODES SYNCED'
- If we add visible "DEPTH" label: new key.

**Preference**: Keep sector codenames in English (sci-fi HUD convention, consistent with "FLIGHT LOG", "Sector" in journey). Only translate if user requests.

All existing strings (manifesto, solve, etc.) remain untouched.

---

## 6. Data Attributes & Class Contract (for markup)

- `data-sector="directive|anomaly|..."` — on the section containers (or the first child that represents the band).
- `data-chargeable` — on each solve card (in order 0-3).
- `data-home-hud` — on the HUD root.
- `data-tilt` + existing `data-reveal` — keep and enhance.
- New classes: `holo-border`, `filament`, `warp-line`, `hub`, `charge-bar`, `sector-item`, `telemetry-readout`, `orbital-ring`.

---

## 7. Reduced-Motion, Perf & Guardrails (non-negotiable)

- At the very top of `initHomeScrollSync`: check reduce → apply static styles / add `.reduced` class on html and early-return. No RAF, no listeners for advanced effects.
- All var-driven effects must have a static fallback in CSS (e.g. `.reduced .solve-card { --solve-charge-0: 1; }` or just don't use the var).
- RAF tick must be throttled with `if (ticking) return; ticking=true; requestAnimationFrame(...)`.
- Never read layout inside the RAF write phase without batching (use one `getBoundingClientRect` pass for all needed rects at start of tick).
- Keep total added JS on home < ~5-6 kB gz.
- Existing `SiteBackground` canvas stays at its ~25fps cap.
- All new decorative nodes get `aria-hidden="true"`.
- `astro:page-load` must re-init (View Transitions can replace the DOM).

---

## 8. Risks & Mitigations (from ai-integration-spec style)

- **Scroll jank on low-end**: One controller + RAF + passive + early reduced-motion exit. Test throttled CPU.
- **HUD fights content on narrow screens**: Mobile collapses to micro bar. Desktop rail is thin (28-36px) and outside main text flow.
- **Over-animation fatigue**: Effects are mostly one-time (on enter) or very slow/subtle. Velocity only boosts existing canvas lightly.
- **i18n / content drift**: No new hard-coded copy in components except HUD codenames (English OK).
- **View Transition breakage**: All inits are inside `astro:page-load` listener (current pattern). Test back/forward.
- **Lighthouse regression**: Measure before/after. New JS only runs on home and is tiny. Decorative only.

---

## 9. Implementation Checklist / Order for Claude

1. Read this spec + home-redesign-spec.md + current `src/pages/index.astro` + `Base.astro` + `global.css` + journey scroll.ts.
2. Add ADR-008 to decisions.md (Grok can draft text; or you propose).
3. Create `src/lib/scroll.ts` with the helpers (start with most-visible + state computer — copy/adapt journey logic).
4. Add tokens + HUD + trajectory + holo + filament base CSS to global.css.
5. Update index.astro markup for P1 (data attrs, wrappers, chargeable cards, hero orbital).
6. Create HomeIngress.astro island (HUD markup + mount logic).
7. Wire astro:page-load in Base or inside the island.
8. Implement P1 JS (p, vel, sector, hero-depth, charges).
9. Style the effects for P1.
10. Iterate on "feel" (you will scroll a lot).
11. P2 + P3.
12. Run `astro build`, check dist, Lighthouse (desktop + mobile), reduced-motion simulation.
13. Update docs/ui-spec.md + INSIGHT.md status.
14. Ask Grok for review of the scroll logic + any visual polish.

---

## 10. References & Prior Art in Codebase

- Scroll logic: `src/components/journey/scroll.ts` (most-visible, RAF ticking, mobile branch, reduced-motion)
- Global init pattern: `src/layouts/Base.astro` lines ~177-253 (setupReveal, astro:page-load, passive listeners, rAF mousemove)
- Existing effects: `data-reveal`, `data-tilt`, `.hud-bracket`, `.grad`, `.space-bg`, SiteBackground canvas
- Content: `src/lib/content.ts` + `getProfile(lang)`
- i18n: `src/i18n/ui.ts` + `localizedPath`

---

**This spec is written so Claude can implement with minimal back-and-forth.** All major decisions (no pinned scrolly, one controller, CSS var contract, filament strategy, phases, constraints) are locked here and in the vision doc.

After implementation of P1, a quick real-device scroll test + Grok visual/UX review is recommended before P2.

Ready when you are. Paste this + INSIGHT.md + relevant docs links for future sessions.
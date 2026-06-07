# Home Redesign v2 — Spec (Grok)

> **Owner**: Grok (design decisions, spec)  
> **Implementer**: Claude  
> **Status**: Spec ready — Claude implements  
> **Date**: 2026-06  
> **Scope**: `/` (EN default) + `/vi` (identical structure, strings via i18n + `getProfile(lang)`)  
> **Build budget**: 1 dev, ≤ 3–4 days wall time for full v2  
> **Constraints locked**: No WebGL/Three.js/GSAP/canvas API; CSS transforms + custom props + RAF only; Lighthouse ≥95; `prefers-reduced-motion` full fallback; content 100% from profile + i18n (no hard-coded claims or metrics); reuse P1 scroll controller + HomeIngress + journey patterns; minimal new files.

## Executive Summary

Current home (post-P1 HUD/scroll layer) still suffers **information overload in the first viewport** (name + title + tagline + 3 caps + 16-item 4-col stack table + CTAs + socials) and lacks a single memorable "this is not a typical portfolio" moment. Manifesto and Problems I Solve — the strongest personality and proof sections — are buried. The stack table is resume-detail, not entry signal.

**v2 goal**: Deliver a page that feels like a **personal command deck**, not a resume site. In 3 seconds the visitor knows:
- Who (identity + location + title)
- What domain (3 capability vectors, crisp)
- Why different (poetic but concrete philosophy + visual systems map)

**Core move**: Remove the stack table from hero entirely. Turn Tech DNA into the **visual hook** (CSS Orbit Constellation). Elevate Manifesto into a breathing, connected "Primary Directives" statement. Keep/build on the existing P1 trajectory bar + 7-sector right rail (desktop) / mobile dot bar + CSS vars (`--home-scroll-p`, `--home-scroll-vel`, `--solve-charge-N`, `--hero-depth`, `--stargate-proximity`). All sections serve a single narrative arc instead of a list.

**Memorable element**: The Constellation Core (pure CSS + minimal inline SVG for filaments) — a live systems diagram of the 5–6 skill domains as orbiting hubs with connection lines that "power on" on scroll. Engineers and recruiters will remember "the one with the orbital tech map."

Output of this task is the spec only. No code changes here.

## Design Direction (single, unambiguous)

**"Signal Lock Ingress"**

Hero = clean entry + short welcome sequence that feels like systems coming online (no overlay).  
Manifesto = the philosophical and emotional core — elevated, visual mesh, the part that makes it personal.  
Solves = proof (Anomaly Briefs) — charge bars already strong, keep and polish.  
Tech DNA = the craft map (Constellation visual first, rows as manifest). This is the "wow, this person thinks in systems" moment.  
Mission + Stargate = current vector and the jump gate to the full story.  
Blog/News = live downlinks / thinking in public.

Everything progressive: glance (hero) → feel (manifesto) → proof (solves) → how (constellation) → now + future (mission + journey) → currency (logs).

Desktop distinctive: generous 2-col hero with visual, full-label right sector rail, spacious constellation panel.  
Mobile-first execution: sequence and visuals must read perfectly stacked; complex orbits collapse to clean hub rows or compact grid; HUD already dots + label.

Builds directly on P1 (HUD + scroll controller + charge + depth vars already shipped in `HomeIngress.astro` + `lib/scroll.ts`). v2 adds personality layer and tightens narrative.

## Section-by-Section Breakdown

### Hero (rework)

**Current problems addressed**: Stack table (4×4 technical dump) removed. Overload reduced. Sequence gives "not like the others" without extra chrome.

**Layout (desktop ≥820px)**:
- Left (content): 
  - Small location badge (existing, "SIGNAL LOCK" micro flavor optional).
  - Name (large grad, aurora) with welcome sequence treatment.
  - Title (AI & System Optimization Engineer).
  - Short tagline (from profile.identity.tagline — keep concise).
  - 3 capability lines (System Architecture / AI Engineering / Cloud & Optimization) — prominent, staggered in sequence, sufficient for first impression.
  - Compact CTAs (Journey primary, Experience secondary) + social icons (LinkedIn, GitHub if present, email).
  - Optional one-line real telemetry under caps: e.g. "5 DOMAINS • {totalSkills} NODES • 3 PROTOCOLS" (sourced live from profile.skills + profile.languages; no invented numbers).
- Right (visual): Astronaut image (keep as primary brand asset) inside holo frame + existing 3 orbital rings (CSS) + scanline. 
  - Enhance: stronger depth recession via existing `--hero-depth` var (already wired).
  - Add subtle "systems overlay" treatment on/inside the frame on desktop (small mono telemetry strip or 3–5 micro nodes representing the caps, purely decorative, no new data load).
- No stack table anywhere in hero.

**Mobile (<820px)**: Content stack full-width, visual below hero content (tighter aspect), sequence plays vertically with grouped timing. No loss of 3s clarity.

**Welcome Sequence (inside hero, no full-screen overlay)**:
- On `astro:page-load` (home only, skip if reduced-motion): add a temporary `.seq` class or set CSS var `--seq-p: 0→1`.
- Timing (total ~1.6–1.8s):
  1. 0–120ms: "L" monogram / vector lock mark (Tektur or display font, large, HUD-bracketed) fades + brackets engage.
  2. 120–650ms: Name settles (letter-spacing tightens or simple steps width reveal on a mono wrapper for terminal feel; or staggered opacity on individual letters via spans for pure CSS). Caret or power-on flash optional and tasteful.
  3. 500–1100ms: 3 capability lines pop staggered (translateY + opacity, each with its accent dot).
  4. 1100ms+: CTAs and socials rise; visual rings/scan reach full activity.
- After sequence or on first user scroll (threshold ~60–80px) or click: force `.seq-complete` — all elements snap to final interactive state, no re-trigger.
- Implementation: extend existing `HomeIngress.astro` script (already listens astro:page-load and imports from `lib/scroll`) or a tiny shared helper. Prefer CSS custom properties + `@keyframes` + `animation-delay` for the bulk of motion; use one short rAF/timeout only for "type" width or completion flag. Total added JS minimal.
- Reduced-motion: instant final state, no delays, no caret.
- i18n: no new strings required for sequence (name/title/caps already in profile + existing caps in Hero.astro). Add 1–2 micro labels only if telemetry line needs them (e.g. "NODES", "DOMAINS" — English HUD flavor ok).

**Result**: 3-second rule satisfied. Visitor sees identity, 3 vectors, and a subtle "this loads like a system" moment. Stack detail moved to Constellation section where it belongs.

### Welcome Sequence / Overlay (verdict)

**Verdict: Internal sequence only. No full-screen welcome overlay (Brief D rejected).**

**Why no overlay**:
- Violates 3-second rule and immediate professional signal.
- High UX cost for target audience (recruiters, peer engineers): they land, want to scan "who + proof" instantly. Friction = bounce risk.
- Return-visit detection (sessionStorage) is brittle on static site + View Transitions; adds state complexity with little value.
- Accessibility and perceived performance hit (extra layer, potential focus issues).
- The "wow this is different" is better delivered *inside* the hero content itself via timing + visual + the later Constellation. No need to gate the actual page.

If future iteration wants a "first contact" micro-hint, a one-line non-modal status under the nav ("SYSTEMS NOMINAL — SCROLL TO DESCEND") can be considered, but not for v2.

### Manifesto (rework)

Current 3 lines are excellent (poetic, memorable, on-brand). They are currently the best "personality" but visually and hierarchically weak.

**Changes**:
- Rename section in code/comments to "Primary Directives" (internal) while keeping i18n keys or adding light aliases if needed.
- Larger breathing room (more vertical padding, max-width tighter on text).
- Typography: first line strongest (grad-text), others slightly lower weight/opacity until activated.
- Visual mesh: on reveal or when sector active, draw 2–3 thin filaments connecting the 01-02-03 nodes (CSS linear-gradient lines or a tiny inline SVG with stroke-dasharray + dashoffset transition, or scaleX pseudo-elements). Pure CSS timing on `data-reveal` or driven by `--home-scroll-p` band.
- Active line (rough center-of-viewport or most-visible) gets full opacity + soft glow; others dim slightly. Reuses existing most-visible sector logic (directive sector already maps to `.manifesto`).
- Border treatment: subtle top/bottom hairline with aurora energy when in view (existing aurora-line pattern).

This becomes the emotional peak of the upper page — "this is the engineer who thinks this way."

### Problems I Solve (keep/tweak)

Already strong P1 implementation (4 cards, `--solve-charge-N` from shared controller, ghost nums, tilt, colored left charge bar that fills bottom-to-top on scroll approach).

**Tweaks only**:
- Keep 2-col → 1-col collapse.
- Polish: when a card is the primary visible sector ("anomaly"), boost left bar to full + thicker holo treatment + ghost num flicker (very low opacity pulse, reduced-motion safe).
- Optional: section title/eyebrow evolve to "Anomaly Briefs" or "What I'm built for" flavor (update i18n keys if we decide on new copy; otherwise keep current "Problems I demolish" / "What I'm built for" — they are punchy).
- Stack chips stay accent-matched per card.
- No new data; all from `profile.solves`.

Charge behavior and data-chargeable pattern stay exactly as wired.

### Tech DNA (rework visual)

Current: clean but list-like rows. Buried after hero overload. No visual "show, don't tell."

**New direction (Brief B Orbit Map winner)**: "Constellation Core"

- Eyebrow + title + sub (existing i18n).
- **Primary visual (the hook)**: A contained "core display" panel (glass, holo-bracketed on desktop) showing 5–6 domain hubs as orbiting nodes.
  - Hubs: colored orbs (match existing skill group colors: frontend teal, backend blue, cloud purple, ai gold, practices pink/magenta, database if surfaced).
  - Size or ring weight hints depth (larger count = larger hub or thicker ring).
  - Subtle CSS orbit: individual hubs or a parent container slow-rotates (12–20s, glacial; killed on reduced-motion and on mobile if cramped).
  - Connecting filaments: thin 1px lines or conic/radial gradients, or (preferred for control) a single small inline `<svg>` with `<line>` or `<path>` elements between hub centers. Lines "draw" (dash + transition) when the section enters or when constell sector activates.
  - Counts inside or next to hubs (real: `(skills[key] ?? []).length`).
  - Center or focal element: "CORE" or total "NODES {total}" — real number.
- Below / adjacent (or collapsible on mobile): the existing `dna-row` list, now enhanced:
  - Rows "sync in" (staggered opacity + tiny lift on reveal or per-row charge).
  - Faint horizontal "bus" filaments between consecutive rows (CSS or pseudo) that intensify when active.
  - Chips remain readable; desaturate slightly until synced.
- Telemetry footer line (existing total) upgraded to mono HUD style: "NODES SYNCED {n} / {g} DOMAINS • {languages.length} PROTOCOLS".

**Why this over alternatives**:
- Orbit/Constellation fits space/HUD theme perfectly and is unexpected on a personal site.
- Pure CSS + 1 tiny SVG (no canvas, no new deps, low bytes).
- Scannable: hubs + counts give instant breadth + integration signal; rows give the actual list for those who care.
- Mobile: hubs become a horizontal or 2×3 compact grid with simplified (or omitted) lines; rows stack naturally.
- Reuses existing skillGroups mapping and color tokens from index.astro.

This is the element peers will screenshot or remember.

### Mission Bar (keep/tweak)

Current pulsing dot + current focus label + story + "See full roadmap" CTA is good "Live Vector" flavor.

**Tweaks**:
- Stronger glass background + hairline accents in accent color.
- Add very slow left-to-right data sweep (low opacity gradient) that triggers once on first entry into view (CSS or one-time class).
- Rename in comments to "Live Vector".
- CTA points to `#roadmap` or (if we remove roadmap section) directly to journey. Keep behavior.
- If roadmap is removed from home, the CTA text can become "See full flight plan →" pointing to `/journey`.

Pulls real `currentFocus` from `profile.roadmap` (status === 'in-progress').

### Journey Teaser (rework)

Current: large cinematic card with astronaut image (duplicates hero visual), overlay, HUD brackets, link to `/journey`.

**Rework to "Stargate"**:
- Keep large aspect, glass, brackets, hover scale on img.
- Enhance with existing `--stargate-proximity` var (already computed): on approach, intensify overlay with converging radial/warp filaments (CSS conic or multiple absolutely positioned 1px elements rotated, scale or opacity driven by the var; or a second subtle ring).
- Content: eyebrow + title (with milestone count from profile) + primary CTA.
- Visual: to reduce duplication, consider a treatment that crops or tints the astronaut differently, or (low cost) add a faint starfield layer or vector lines over the image area. Image path stays the same for now (strong asset).
- Whole card becomes the strongest single CTA on the page — "the portal out of the overview into the story."

Sector already mapped as "stargate".

### Blog + News (keep/tweak)

Current grids are functional.

**Keep as "Downlinks / Signal Log"** (sector "logs"):
- Compact header with "see all".
- Blog: 3 cards (title, excerpt, date/read time).
- News: 4 items (date, title, summary) — 2-col → 1-col.
- Optional light polish: tiny "signal strength" 3-bar indicator (static or recency-based) top-right of cards; hover filament underline on titles.
- No heavy change — these are utility sections for currency and SEO. Keep scannable.

If page feels long after other additions, reduce to 2 posts + 3 news.

## Animation Plan (P2)

**P1 (already shipped)**: trajectory top bar, 7-sector rail + mobile dots + active state, `--home-scroll-p/vel`, `--hero-depth`, `--stargate-proximity`, per-card `--solve-charge-N` sampling, most-visible sector computation, reduced-motion defaults. All in one RAF loop in `initHomeScrollSync`.

**P2 (v2 scope — high value, contained cost)**:
- Hero welcome sequence (staggered entrance + optional type-width or letter effects; completion on scroll).
- Manifesto filaments (2–3 connectors, draw on reveal or sector active via dash/scale).
- Constellation Core: hub power-on (scale + glow + count pop), inter-hub filaments draw (SVG or CSS), row sync waves staggered.
- Stargate proximity boost: warp lines or energy ring intensification driven by existing var.
- Subtle polish: mission sweep, locked states on primary solve card and active directive line, velocity-aware micro boost on existing orbital rings (if cheap).
- All new motion: CSS keyframes / transitions + existing controller vars or one additional lightweight IO for "first enter" flags. No new RAF loops.
- Reusable primitives: extend data-reveal with optional `--reveal-stagger`, filament utility classes, `.holo-active`.

**P3 (future, out of v2)**: soft real-number count-ups (only if we can source cleanly), more canvas modulation, any new telemetry.

**Rules**:
- Every animation has instant reduced-motion path (class or media query kills delays + complex transitions).
- One controller remains authoritative.
- Total added bytes on home low; tree-shake friendly.
- Test slow CPU + 3G.

## What to Remove

- **Hero stack table** (`hero-stack`, 4-col grid, all related markup and styles in Hero.astro and index.astro). This is the single biggest source of overload. Full stack detail moves to Constellation Core (visual + rows).
- **Full Roadmap section from home** (the `<div id="roadmap"><Roadmap /></div>` block). It duplicates "future" signal already carried by Mission Bar + Journey Stargate. Roadmap component itself stays for `/journey` or can be reused on Experience/About. Home narrative becomes tighter.
- Redundant astronaut image usage emphasis (journey teaser can receive distinct treatment even if src same).
- Any future hard-coded claims or extra CTAs that don't serve the arc.

**Shrink (not remove)**: Blog + News visual weight if needed; section padding on lower page.

## Implementation Priority (P0/P1/P2)

**P0 (foundation, biggest perceived lift)**:
- Hero.astro: strip stack table + markup, add sequence timing hooks (CSS + minimal controller), tighten layout + telemetry line (real data).
- index.astro: remove hero-stack styles + the Roadmap include block; add any new data attrs for sectors if names shift; keep existing solve charge wiring.
- Manifesto elevation styles + basic filament (CSS only first).
- Update any sector selectors in HomeIngress / lib/scroll if Manifesto/Skills ids change (prefer keep current: directive, anomaly, constell... for minimal diff).

**P1 (the memorable hook)**:
- Tech DNA full visual: constellation container + hubs (CSS positioned orbs + rings) + inline SVG lines or pseudo filaments.
- Sync behavior: hook into existing reveal or add simple per-hub "powered" classes driven by scroll band or one IO.
- Row enhancements (stagger, bus lines).
- Wire new `--dna-sync` or reuse existing vars if sufficient.
- Mobile grid collapse for hubs.

**P2 (polish + arc complete)**:
- Full hero sequence (type/settle + completion logic + scroll force-complete).
- Manifesto + constellation + stargate filament/proximity effects using controller.
- Mission sweep + locked card states.
- Mobile sequence + constellation refinements.
- Any new minimal i18n (telemetry labels, section renames if we change copy).
- Cross-check both EN and VI pages; reduced-motion; View Transitions; Lighthouse spot-check.
- Update `docs/ui-spec.md` with v2 direction link.

**Files touched (minimal)**:
- `src/components/Hero.astro`
- `src/pages/index.astro` (and vi mirror if separate)
- `src/components/home/HomeIngress.astro` (extend script for sequence)
- `src/lib/scroll.ts` (small pure helpers only if needed; prefer reuse)
- `src/styles/global.css` (new tokens: orbit sizes, filament styles, seq vars; .constellation, .filament utilities)
- `src/components/Roadmap.astro` (no change or light if we decide to keep a compact version)

No changes to profile, content pipeline, or global layout unless tiny.

## ADR-009 (new architectural decision)

**Title**: Hero as Sequenced Entry + Constellation as Primary Visual Hook for Craft (instead of data table or pinned scrolly)

**Date**: 2026-06  
**Status**: Accepted (this spec)

**Decision**: On the home overview, replace the dense technical stack table in the hero with a short welcome sequence + 3 capability lines + real lightweight telemetry. Move the full "how I'm wired" to a dedicated Constellation Core visual (CSS orbital hubs + filaments) in the Tech DNA section. Home remains normal-flow + one shared scroll controller (ADR-008); Journey keeps exclusive ownership of pinned scrolly.

**Rationale**:
- Directly solves the stated overload and "no personality hook" problems.
- Delivers "show don't tell" expertise via a single memorable visual system (orbit map) that fits the space/HUD language and respects all hard constraints (no canvas, no libs, Lighthouse, mobile-first).
- Sequence provides the "different on first load" feeling without the UX cost of a blocking overlay.
- Keeps scannability for recruiters while giving engineers the systems-thinking signal they remember.
- Reuses every P1 primitive (vars, sectors, controller, reduced-motion path, data-reveal/tilt).

**Trade-offs**:
- Slightly more CSS/positioning work for the constellation (worth it for the differentiation).
- Roadmap list leaves home → tighter narrative, but some visitors who want "future" at a glance may need one extra click (acceptable; Journey is the destination).
- Sequence requires one small timing piece in the existing ingress script (contained, not a new island).
- If the constellation visual proves hard to make beautiful on all viewports, fallback is enhanced rows + telemetry numbers only (still better than current list).

**References**: This spec (v2), ADR-008 (lightweight HUD + flow), previous home-redesign-spec.md (P1 foundation), `src/lib/scroll.ts`, profile skill groups + journey as source of truth.

---

**Next for Claude**: Implement per P0 → P1 → P2. After P1 visual + sequence, Grok reviews the live feel (desktop + mobile + reduced-motion). Update `docs/ui-spec.md` and link back here.

All content, numbers, and copy remain driven by `getProfile(lang)` and `useTranslations`. No invented claims.

**End of spec**. Ready for implementation.
# Portfolio renewal

- Domain: personal portfolio and professional experience.
- Goal: make engineering work, recent capabilities, and contact paths immediately understandable in a distinctive, readable portfolio.
- Value Metric: successful discovery of a relevant project and contact action. These are usability goals; conversion impact remains unmeasured until real visitors use the published site.
- Scope: home, shared navigation and visual system, experience, EN/VI/JA profile copy. Preserve existing routes, historical role titles and dates, and Astro static delivery.
- Invariants: no invented impact metrics, no new internal names or operational details, no change to publishing automation, usable content without animation, native keyboard navigation. Verify through source/content comparison and browser checks.
- Solution: charcoal and pale-blue editorial surfaces, oversized clean typography, an interactive CSS 3D architecture scene with rotating volume, draggable camera, and distinct assembled/exploded/evidence perspectives, illustrated selected-work cards, a concise career preview, localized recent focus, curated writing, and a direct contact section. Long experience details use native disclosure controls.
- Acceptance Criteria:
  - Home project links land on the matching experience project; contact links work.
  - Home and experience render at desktop and narrow mobile widths without horizontal overflow.
  - Language switching preserves the logical page; Japanese profile is translated rather than English fallback.
  - Mobile menu works by click and keyboard, closes on Escape, and has visible focus; motion respects reduced-motion preferences.
  - Hero changes actual 3D composition with perspective tabs; pointer dragging rotates the scene; motion can be paused, stops offscreen, and respects reduced-motion. Scroll entries and project interactions remain readable.
  - Existing content validator and production build pass; actual browser views reviewed.
  - Xem IDE v1.0.3 is the first featured project, with localized Workspace / Sessions / AI ledger demo controls and matching experience details. Demo content is explicitly illustrative and contains no live workspace data.
- Risk / Trade-off: simplified pages expose less architecture detail at first glance; disclosures preserve depth. Existing historical claims are retained as supplied, with no new quantified outcome claims.
- Tracking: [Portfolio renewal issue](https://github.com/doxuanloc/doxuanloc.dev/issues/1).

# Journey Redesign Plan (Spatial Flight + Story Chapters)

Full approved plan lives in the active session plan file.

This is the key reference for implementers (Claude / subagents).

See the detailed version generated during planning for phases, data model, component breakdown, success criteria, and trade-offs.

**Summary of decisions (user-confirmed):**
- Primary metaphor: Flight / Cockpit Scrolly (depth, filaments, HUD, reuse star canvas).
- Primary view: Story Chapters (narrative logic).
- Secondary: Timeline (chrono, user selectable).
- Granular: 9-12 beats.
- Editability: Both (richer journey[] in profile + docs + light derivation helpers from experience data).
- No new heavy deps. Leverage KIND_META, existing visuals, cosmic theme.

Key files to touch:
- content/profile.json + profile.en.json (journey + comments)
- src/components/journey/types.ts, utils.ts, scroll.ts (or flight.ts)
- New: JourneyExplorer.astro, chapters/timeline views, FilamentLayer, HUD
- Evolve: JourneyScene, JourneyVisual, journey pages + i18n

Implementation follows the 5 phases in the full plan.

Update this file with decisions/ADRs during execution if architecture shifts.
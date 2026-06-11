# Content Storage Upgrade — Phase 1: Astro Content Collections

**Status**: Planned  
**Decision**: ADR entry → `docs/decisions.md`  
**Prerequisite**: Phase 0 done (index.json + slim loader — ✅ shipped 2026-06-11)

---

## Value

Flat-file eager glob (`import.meta.glob` eager) scans every JSON on every build.  
At 7 days: 95KB total, 132KB news HTML — tolerable.  
At 30 days: ~600KB JSON glob, ~500KB+ news HTML — build slows, HTML fat.  
Astro Content Collections is the documented, zero-cost path for exactly this shape.

**Measurable target**: build time and `dist/news/index.html` size at N=30 days do not grow linearly past Phase 0 baseline.

---

## Scope

**In**: 
- `src/content.config.ts` — defineCollection for daily news JSONs
- `src/lib/content.ts` — migrate from eager glob to `getCollection()`  
- All call sites: pages + RSS

**Out**:
- No server adapter (stays pure static)
- No DB, no S3 (evaluated and rejected — see decisions.md 2026-06-11)
- `validate-content.mjs` stays on raw JSON files (Grok contract, pre-build)
- `gen-today.mjs` unchanged (still writes YYYY-MM-DD.json)
- `gen-news-index.mjs` — keep as fast index for client-side use

---

## Design

### Step 1 — `src/content.config.ts`

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const daily = defineCollection({
  loader: glob({ pattern: '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json', base: './content/news' }),
  schema: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    generatedBy: z.string().optional(),
    version: z.number().optional(),
    news: z.array(z.object({
      title: z.string(),
      summary: z.string(),
      source: z.string().url(),
      tags: z.array(z.string()),
      importance: z.number().optional(),
    })).optional(),
    financeNews: z.array(z.object({
      title: z.string(),
      summary: z.string(),
      source: z.string().url(),
      tags: z.array(z.string()),
      importance: z.number().optional(),
      category: z.enum(['fintech','crypto','vc-startup','market','macro']).optional(),
    })).optional(),
    blog: z.object({
      slug: z.string(),
      title: z.string(),
      excerpt: z.string(),
      contentMarkdown: z.string().min(200),
      tags: z.array(z.string()),
      readingTimeMin: z.number().optional(),
      coverImage: z.string().nullable().optional(),
      coverKeywords: z.array(z.string()).optional(),
      tldr: z.array(z.string()).max(5).optional(),
      blocks: z.array(z.any()).max(12).optional(),
      linkedinPost: z.string().optional(),
    }).nullable().optional(),
    expUpdate: z.object({
      summary: z.string().optional(),
      skills: z.array(z.string()).optional(),
      highlights: z.array(z.string()).optional(),
    }).nullable().optional(),
  }).passthrough(),
});

export const collections = { daily };
```

**Note**: `passthrough()` allows `blog.en`, `blog.ja` and other extension fields without schema churn.  
`validate-content.mjs` (ajv + safety guardrails) is the strict contract — Zod schema is for DX/types only.

### Step 2 — `src/lib/content.ts` migration

Replace:
```ts
const dailyModules = import.meta.glob<DailyContent>('/content/news/*.json', { eager: true });
export function getDailyContent(): DailyContent[] {
  return Object.values(dailyModules)...
}
```

With:
```ts
import { getCollection } from 'astro:content';

export async function getDailyContent(): Promise<DailyContent[]> {
  const entries = await getCollection('daily');
  return entries
    .map(e => e.data as DailyContent)
    .sort((a, b) => a.date < b.date ? 1 : -1);
}
```

All downstream functions (`getAllPosts`, `getAllNews`, etc.) become `async`.

### Step 3 — Call site updates (mechanical)

| File | Change |
|------|--------|
| `src/pages/blog/index.astro` | keep `getBlogListing()` (slim, index.json — no change) |
| `src/pages/blog/[slug].astro` | `const all = await getDailyContent()` |
| `src/pages/news.astro` | `const news = await getAllNews()` |
| `src/pages/index.astro` | `const latestDaily = (await getDailyContent())[0]` |
| `src/pages/rss.xml.js` | `const posts = await getAllPosts('vi')` |
| `src/pages/*/` mirrors | same pattern |

Astro pages support top-level await in frontmatter. `getStaticPaths` already async.

---

## Edge Cases

- `blog.en` / `blog.ja` nested keys: handled by `resolvePost()` logic, no schema change needed. `passthrough()` ensures Zod doesn't strip these.
- `index.json` already excluded from validate; exclude it from glob loader too (pattern only matches YYYY-MM-DD.json).
- `getBlogListing()` stays on imported `index.json` — no async refactor needed there.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/content.config.ts` | **Create** |
| `src/lib/content.ts` | **Migrate** (getDailyContent + dependents → async) |
| `src/pages/blog/[slug].astro` | **Update** (await) |
| `src/pages/news.astro` | **Update** (await) |
| `src/pages/index.astro` | **Update** (await) |
| `src/pages/rss.xml.js` | **Update** (await) |
| `src/pages/vi/news.astro`, `src/pages/ja/news.astro` | **Update** mirrors |
| `docs/decisions.md` | **Append** ADR |

---

## Definition of Done

- [ ] `npm run build` passes with Content Collections loader
- [ ] All 3 locales (EN/VI/JA) blog + news pages render correctly
- [ ] `dist/news/index.html` size at current N is ≤ Phase 0 baseline
- [ ] Build time at simulated N=30 does not exceed 3× current (currently ~1.4s → target ≤4s at 30 days)
- [ ] RSS feed valid (spot-check titles + links)
- [ ] `validate-content.mjs` still blocks bad content (run manually)

---

## Rollback

`git revert` the `src/content.config.ts` creation + `src/lib/content.ts` revert to eager glob.  
`index.json` and `getBlogListing()` survive either way.

---

## When to Trigger

- At N ≥ 20 days OR if build time exceeds 3s OR if `dist/news/index.html` > 300KB  
- Whichever comes first.

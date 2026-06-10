# LinkedIn Auto-Post Spec (ADR-level)

**Project**: doxuanloc.space (Astro 5 portfolio)  
**Date**: 2026-06  
**Status**: Proposed (awaiting user review + priority)  
**Owner**: Grok (spec) → Claude (implement after approval)  
**Related**: `publish:today`, `gen-today.mjs`, `validate-content.mjs`, daily `content/news/YYYY-MM-DD.json`, `.github/workflows/daily-content.yml`

---

## 1. Architecture Recommendation

### Primary: Local-first, append to `publish:today`

**Decision**: Implement LinkedIn posting as an **optional step inside the existing local publish pipeline**.

- New script: `scripts/post-to-linkedin.mjs`
- Invoked after `validate` succeeds, before the git add/commit/push.
- Controlled by presence of LinkedIn env vars (if missing → graceful skip, exit 0).

**Rationale (aligned with current MVP)**:
- Current primary flow is **manual local** (`npm run publish:today` by user with `grok` CLI). GH Action is explicitly "fallback chạy tay" (workflow_dispatch only, no cron).
- Local keeps secrets on the author's machine (`.env`, never committed). Matches existing Grok CLI OAuth pattern.
- Publishing social is a **side-effect of content publication**, not an independent scheduled job.
- Simple to implement, test, and reason about. One command = content + social.
- Avoids risk of double-posting (local run + scheduled cloud run).

**Integration point** (package.json):
```json
"publish:today": "node scripts/gen-today.mjs && npm run validate && node scripts/post-to-linkedin.mjs && git add content/news && (git diff --cached --quiet || git commit -m \"content: auto $(date -u +%F)\") && git push",
"post:linkedin": "node scripts/post-to-linkedin.mjs"
```

Standalone `npm run post:linkedin` also supported for ad-hoc re-posts or testing.

### GitHub Actions: Secondary / Manual only (do not schedule)

- Keep the existing workflow as-is (workflow_dispatch + XAI_API_KEY).
- **Do not add cron or schedule** for LinkedIn.
- If user triggers the GH Action manually on a day they did not run local, the post-to-linkedin step can still run (it will be idempotent).
- For GH path, LinkedIn secrets would be stored as GitHub Secrets (`LINKEDIN_REFRESH_TOKEN`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, optional `LINKEDIN_PERSON_URN`).

**Trade-off table**:

| Aspect                  | Local + publish:today (Recommended)          | GitHub Actions (scheduled or dispatch)          |
|-------------------------|----------------------------------------------|-------------------------------------------------|
| Secret management       | .env (user machine) — simple                 | GitHub Secrets — more ceremony                  |
| Idempotency / double-post risk | Low (user controls execution)              | Higher if both local + cloud can trigger        |
| Reliability             | Depends on user's laptop + internet          | Higher (cloud)                                  |
| Timing control          | User runs at optimal time (manual)           | Fixed schedule or manual                        |
| Maintenance             | One script, same as gen/validate             | Needs secret sync, possible drift               |
| Current project philosophy | Matches "chạy tay local + grok CLI" MVP    | Only for content fallback                       |

**Recommendation**: Ship local-first. Revisit GH scheduled path only if user wants fully hands-off (after 3-6 months of stable local usage).

---

## 2. Content Format & Template (Optimized for LinkedIn Algorithm)

### Recommendation: Structured value post (between Option A and B, with light C elements)

**Not pure minimalist** (title + excerpt + link only feels too thin).  
**Not full Grok-generated long copy** every day (adds latency, cost, another prompt surface, and risk of tone drift).

**Chosen approach (v1)**:
- Strong hook in first 1-2 lines (≤150 chars).
- Adapted excerpt or 1-2 punchy sentences from blog.
- 2-4 concise bullets (key trade-offs / actionable points) — extracted heuristically from blog headings + first sentences of sections (no extra LLM call in v1).
- Clear CTA + full canonical link.
- 4-6 targeted hashtags at the end (mix of blog.tags + evergreen tech tags).
- Total length target: 600-1100 characters (comfortable, scannable, algorithm-friendly).
- Language: **Vietnamese** (primary blog language). English version can be a future manual or flag-driven variant.

### Why this wins on LinkedIn (2026):
- First 150 chars decide expand/scroll.
- Bullets + numbers + "trade-off / thực tế / tại sao" language performs well for technical audience.
- Native text + link (OG preview from blog page does the heavy visual lifting).
- Question/CTA at end drives comments (algorithm loves).

### Post Template (pseudo + example)

```text
🚀 [Hook ≤ 140 chars — question or strong claim from title/excerpt]

[1-2 sentence context or excerpt adaptation]

Thực tế khi scale:
• Bullet 1 (trade-off or concrete advice)
• Bullet 2
• Bullet 3 (optional)

Phân tích chi tiết + patterns (NestJS/Bedrock/...):  
https://doxuanloc.space/blog/2026-06-10-llm-cost-optimization-model-routing-ai-agent/

Bạn đang giải quyết cost optimization kiểu gì? Comment bên dưới 👇

#LLM #AIAgent #ModelRouting #SystemDesign #AWS #DeveloperProductivity
```

**Extraction rules for bullets (in script, no LLM)**:
1. Take blog title as hook base or first 120-140 chars of excerpt.
2. Use first 2-3 top-level H2/H3 sections: take the heading + the first sentence after it.
3. Clean markdown, truncate each bullet to ~110-130 chars.
4. Fallback: if no good sections, use 2-3 sentences from excerpt split by period.

**Hashtag strategy**:
- Take 3-5 from `blog.tags` (they are already SEO/search-intent rich: "llm cost optimization", "ai agent", "aws bedrock"...).
- Append 2-3 evergreen: #SystemDesign #Engineering #AI (Vietnamese tags already good; keep as-is or normalize lightly).
- Total 5-7 max.

**Image / media**:
- v1: text-only post (`shareMediaCategory: "NONE"`). The blog URL provides rich OG preview (title, excerpt, hero image or `/images/hero-astronaut.webp` fallback).
- Future (nice-to-have): if `blog.coverImage` or generated visual exists, do the 2-step upload (registerUpload → asset URN → attach). Adds complexity and rate-limit surface — defer.

**Character safety**: Script should truncate gracefully if > 2800 chars (LinkedIn hard limit ~3000). Current target keeps us far under.

---

## 3. Authentication & Token Strategy

### Scope & App Setup (required)

1. LinkedIn Developer portal → Create new app (or reuse if you have one for Sign In).
2. **Products** tab:
   - Request access to **"Share on LinkedIn"** (unlocks `w_member_social`).
   - Request access to **"Sign In with LinkedIn using OpenID Connect"** (unlocks `openid`, `profile`, `email`).
3. App must be verified / approved (can take hours to days; some reports of longer partner review for posting scope).
4. **Auth** tab → add redirect URL(s). For local setup script we will use `http://localhost:8765/callback` (or similar).

**Required scopes for the OAuth request**: `openid profile email w_member_social`

**Endpoint for posting**: `POST https://api.linkedin.com/v2/ugcPosts`

Required headers (current as of 2026):
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`
- `X-Restli-Protocol-Version: 2.0.0`
- `LinkedIn-Version: 202507` (or latest stable; pin a recent one and update when needed)

### Token Lifetimes & Refresh (official)

- Access token: **60 days**
- Programmatic refresh token: **1 year** (fixed lifetime from original issuance — refreshes do **not** extend it)
- When refresh token expires → user must re-run full OAuth flow.

### Recommended Storage (local-first)

Use a dedicated small env file or append to existing `.env` (both gitignored):

```env
# LinkedIn (for post-to-linkedin.mjs)
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REFRESH_TOKEN=...          # 1-year
LINKEDIN_PERSON_URN=urn:li:person:XXXX   # cache after first fetch (optional but recommended)
```

**Never commit these.**

### One-time Setup Flow (recommended companion script)

Create `scripts/setup-linkedin-auth.mjs`:

- Reads client_id/secret from env or prompts.
- Constructs the authorization URL with correct scopes + state + redirect.
- Spins up a **temporary Node http server** on localhost:8765 (or chosen port) for 90 seconds to receive the `?code=`.
- User opens the printed URL in browser, logs in, authorizes.
- Script exchanges code → gets access + refresh tokens.
- Calls `https://api.linkedin.com/v2/userinfo` (or `/v2/me`) to obtain the person `sub` / id → constructs `urn:li:person:...`
- Writes refresh token + URN + client creds to `.env` (or a `linkedin.env`).
- Prints success + "you can now run publish:today".

This keeps everything zero-external-dep (use Node built-ins).

Alternative (simpler for first run): document the curl steps + manual code paste. The helper script is strongly preferred for repeatability.

### Refresh Logic (in post-to-linkedin.mjs)

Before every post attempt:
1. If we have a recent access token in memory and not expired → use it.
2. Else: POST to `https://www.linkedin.com/oauth/v2/accessToken`
   - `grant_type=refresh_token`
   - `refresh_token=...`
   - `client_id=...`
   - `client_secret=...`
3. Store the new access token + its expiry (60 days from now) temporarily for this run.
4. On 401/invalid_grant during refresh → surface clear message: "Refresh token expired or revoked. Run setup-linkedin-auth again."

### Personal Profile vs Company Page

**Start with Personal Profile only** (`w_member_social`).

Company Page (`w_organization_social`) requires:
- Admin access to the Page.
- Additional review/approval.
- Different URN (`urn:li:organization:...`).
- Higher bar for "official" voice.

For a personal brand portfolio + daily technical insights, **personal profile is the correct and lower-friction choice**.

Later (optional): support both by adding an org URN + separate scope.

---

## 4. Frequency, Timing & Conditional Posting

### Frequency
- **Only when a blog exists** (`blog && blog.slug && blog.title`).
- If `blog: null` on a given day (news-only or skipped) → script logs "No blog today — skipping LinkedIn" and exits 0. No post.
- This respects the existing guard in gen-today (blog is the deep piece worth amplifying).

### Timing
- **No automatic scheduling in the script**. Posting happens at the moment `publish:today` (or `post:linkedin`) is executed.
- Best practice (from 2026 data for tech/software audience):
  - Tuesday–Thursday, **10:00–14:00 local time** (Vietnam, UTC+7) is strong.
  - Monday/Friday lunch or early afternoon secondary.
  - Weekends: lower priority for B2B/engineering content.
- Recommendation to user: run `npm run publish:today` in the 9-11am or 12-2pm VN window on Tue-Thu when possible. Document this in README.

**Weekend handling**: Do not auto-skip in code (content may still be valuable). If user wants strict weekday-only, they can simply not run the command on weekends (or we can add a `--weekdays-only` flag later).

### Idempotency / Duplicate Prevention (critical)

State lives in the daily content JSON itself (safe because `additionalProperties: true` at root in schema).

On successful post:
- Script reads the day's JSON.
- Adds (or updates):
  ```json
  "linkedin": {
    "posted": true,
    "postedAt": "2026-06-10T09:42:00.000Z",
    "urn": "urn:li:share:..."   // the response id if available
  }
  ```
- Writes the JSON back (pretty-printed).
- The outer publish script's `git add content/news` will include the update → committed as part of the day's content record.

On every run of post-to-linkedin:
- If `data.linkedin?.posted === true` for today's date → log "Already posted to LinkedIn on ${postedAt}" and skip.
- Supports re-runs, GH Action fallback, and multi-machine without double-posting.

Alternative marker file (local only) was considered but rejected in favor of committed state for consistency.

---

## 5. Error Handling, Observability & Resilience

### Principles
- **Content publication > social syndication**. A LinkedIn failure must **never** fail `publish:today` or block the git push.
- Silent-as-possible for normal "no blog" or "already posted" cases.
- Clear, actionable errors for real problems (auth, network, rate limit).
- Zero extra dependencies.

### Behaviors

| Situation                        | Script Action                                      | Exit Code | Impact on publish:today |
|----------------------------------|----------------------------------------------------|-----------|---------------------------|
| No blog today                    | Log "Skipping LinkedIn — no blog for YYYY-MM-DD"  | 0         | None (continues)         |
| Already posted (marker present)  | Log + skip                                         | 0         | None                     |
| LinkedIn creds missing / disabled| Log "LinkedIn not configured (no LINKEDIN_* env). Skipping." | 0 | None            |
| Auth / refresh failure (401/400) | Log clear message + "Re-run setup-linkedin-auth"  | 0         | None                     |
| Rate limit (429)                 | Log + "Try again later or tomorrow"                | 0         | None                     |
| Network / timeout                | Log + warn                                         | 0         | None                     |
| Any other unexpected error       | console.error + stack (sanitized, no tokens)       | 0         | None                     |

- On success: log the posted URL if LinkedIn returns one (usually in `Location` header or `id` in body for ugcPosts).
- Optional future: append a short line to a local log file `logs/linkedin-posts.log` (gitignored) for audit.

### Duplicate / Re-post Guardrails
- Date-based + marker in JSON (above).
- Also respect the blog slug uniqueness already enforced by validate-content.

### Rate Limits & Quotas
- Personal posting via API is low-volume. 1 post/day is well inside typical limits.
- If hitting limits frequently, add exponential backoff + jitter on 429 (simple `setTimeout`).

### Monitoring (manual for v1)
- User sees output during `publish:today`.
- Check the committed JSON → `linkedin.posted` field as source of truth.
- Occasional manual check of LinkedIn profile.

No PagerDuty / Slack / email alerts needed at this stage (constraint: keep simple, no 3rd-party tools).

---

## Script Structure Outline

### New files
- `scripts/post-to-linkedin.mjs` (main logic)
- `scripts/setup-linkedin-auth.mjs` (one-time OAuth helper)

### post-to-linkedin.mjs — high-level functions

```js
// pseudocode
const today = getTodayUTC();
const data = readDailyJson(today);
if (!hasBlog(data)) { logSkip("no blog"); return; }
if (alreadyPosted(data)) { logSkip("already posted"); return; }

const tokens = loadAndRefreshTokens(); // may throw recoverable errors → catch & exit 0
const personUrn = tokens.personUrn || await fetchPersonUrn(tokens.access);

const postText = buildLinkedInText(data.blog); // hook + bullets + url + hashtags
const res = await postToUgc(postText, personUrn, tokens.access);

if (res.ok) {
  markAsPosted(data, res.shareUrn);
  writeDailyJson(today, data);
  logSuccess(`Posted: ${res.url}`);
} else {
  handlePostError(res);
}
```

Key modules (internal):
- `loadEnv()` / `getLinkedInConfig()`
- `refreshAccessTokenIfNeeded()`
- `fetchPersonUrn(accessToken)`
- `buildLinkedInText(blog)` — pure, deterministic, no network
- `postToUgc(text, authorUrn, accessToken)` — fetch + error classification
- `markAsPosted(data, shareUrn?)`
- `isLinkedInConfigured()` — early graceful exit

Use only Node built-ins + `node:fs`, `node:path`, `node:https` or `fetch` (Node 20+ has global fetch).

### Error classification
- 400/401/403 → auth/scope/config problem
- 429 → rate limit
- 5xx → transient, retry later ok
- Network error → retry not automatic in v1

---

## Implementation Constraints & Non-Goals

**Must**:
- Pure Node.js (no new runtime deps beyond what Astro project already has).
- Respect all existing guardrails (no sensitive terms leak into post text).
- Idempotent and safe to run multiple times.
- Work for both local `grok` flow and the GH Action fallback path.
- Vietnamese primary.

**Non-goals (v1)**:
- Posting to Company Page.
- Attaching images / documents / multi-media.
- Using a 3rd-party scheduler or paid tool.
- LLM call inside the poster (keep deterministic + cheap).
- Cross-posting to X/Twitter/Threads in same change.
- Auto-generated English variant post.
- Full rich embeds or polls.

Future extensions (document in the spec file as "Phase 2"):
- Image thumbnail via LinkedIn asset upload.
- Separate English LinkedIn post (using `blog.en`).
- Optional "highlight" mode for high-importance days.

---

## Security & Content Hygiene

- All tokens in env only. Add to `.gitignore` explicitly if not already broad.
- Script must **never** log tokens, client secrets, or full auth URLs with codes.
- When writing the `linkedin` marker back to JSON, only store `posted`, `postedAt`, and the public share URN if returned. No tokens.
- The blog content itself already passes `validate-content.mjs` safety scan — reuse or lightly extend the scan if we extract bullets (unlikely to introduce new sensitive terms, but belt-and-suspenders).
- Update README with setup instructions + "do not commit tokens" warning (consistent with XAI_API_KEY guidance).

---

## Recommended Rollout Steps (for Claude after approval)

1. Create `scripts/setup-linkedin-auth.mjs` + `scripts/post-to-linkedin.mjs`.
2. Add `post:linkedin` and update `publish:today` in package.json.
3. Add `content/.linkedin-*` or just rely on the JSON field (no new gitignore needed if we only touch the daily JSON).
4. Update README.md with:
   - One-time LinkedIn Developer App + Products setup.
   - `node scripts/setup-linkedin-auth.mjs` instructions.
   - "Best time to run publish:today" note.
5. Add a short ADR-009 entry to `docs/decisions.md` referencing this spec.
6. (Optional) Extend validate-content to optionally warn (not fail) if linkedin field present but malformed.
7. Test end-to-end with a DRAFT post first if possible, or post to profile and immediately delete/edit during dev.
8. Document the `LinkedIn-Version` header value chosen and how to bump it.

---

## Open Questions for User (tie-breaker)

- Priority: Ship this quarter or after current home renewal?
- Do we want the setup script to also support a "test mode" that posts with `lifecycleState: "DRAFT"`?
- Any preference on max bullets (3 vs 4) or strict char target?
- After 1-2 months, evaluate engagement and decide on image attachment or English variant?

---

**References**:
- Current pipeline: `scripts/gen-today.mjs`, `package.json#publish:today`, `.github/workflows/daily-content.yml`, `content/schema.json`, `scripts/validate-content.mjs`
- LinkedIn docs (via research 2026): ugcPosts, Share on LinkedIn product, programmatic refresh tokens (60d access / 1y refresh).
- Best times: mid-week 10am-2pm for tech/engineering audiences (multiple 2026 sources).
- Site: https://doxuanloc.space, blog pattern `/blog/{slug}/`

This spec is ready for review. Once approved, Claude can implement directly.

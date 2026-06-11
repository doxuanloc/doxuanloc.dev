# Decisions — ADR Log

> Architecture Decision Records. Mỗi entry: quyết định + bối cảnh + lý do + trade-off.

---

## ADR-001 — Framework: Astro 5 (static-first)

**Date**: 2025-Q4  
**Status**: Accepted

**Quyết định**: Dùng Astro 5 với static output thay vì Next.js / SvelteKit.

**Lý do**:
- Content-heavy site (blog, news, journey) → phần lớn là HTML tĩnh, không cần SSR
- Astro islands: chỉ ship JS cho component tương tác (journey scroll, nav toggle)
- Build ra pure HTML/CSS/JS → Lighthouse đạt cao, CDN cache toàn bộ
- View Transitions API native → SPA feel mà không cần React hydration toàn trang

**Trade-off**: Không có server-side logic mặc định → phải chuyển hybrid khi cần API (xem ADR-006).

---

## ADR-002 — Deploy: Vercel

**Date**: 2025-Q4  
**Status**: Accepted

**Quyết định**: Deploy trên Vercel thay vì Netlify / Cloudflare Pages / GitHub Pages.

**Lý do**:
- Vercel Fluid Compute (2026) phù hợp cho AI streaming workload (pay per active CPU, không idle)
- Astro adapter chính thức (`@astrojs/vercel`) maintained tốt
- Preview deployments tự động trên mọi push
- CDN headers cấu hình linh hoạt qua `vercel.json`

**Trade-off**: Free plan giới hạn serverless timeout 10s → cần Pro ($20/th) cho AI streaming (timeout 300s).

---

## ADR-003 — Multi-AI Pipeline: Grok gen content, Claude implement

**Date**: 2025-Q4  
**Status**: Accepted

**Quyết định**: Tách vai trò AI rõ ràng — Grok CLI gen news/blog/expUpdate hàng ngày, Claude implement code/components.

**Lý do**:
- Grok có web search realtime → news content luôn fresh, có nguồn URL thật
- Claude có tools tốt hơn cho code, refactor, test
- Tách rõ → mỗi AI làm đúng điểm mạnh, không chồng lấn

**Trade-off**: Phải maintain hai API key + hai workflow. Content "Góc nhìn" do Grok gen có tone riêng → AI features dùng Claude phải prompt cẩn thận để match.

---

## ADR-004 — Journey: Pinned Scrollytelling (sticky + scroll-driven opacity)

**Date**: 2026-Q1  
**Status**: Accepted

**Quyết định**: Journey dùng `position: sticky` + JS `render(scrollY)` thay vì CSS transitions / IntersectionObserver.

**Lý do**:
- CSS transitions tạo 0.38s delay → mất cảm giác scroll control
- `backdrop-filter` trên 12 panels overlapping → GPU jank nặng
- Scroll-driven: opacity = f(scrollY), tính mỗi RAF → instant, zero-lag
- `will-change` chỉ assign cho 2 panels đang transition (k=i, k=i+1), không 12 panels

**Trade-off**: JS phải chạy mỗi scroll event (RAF-throttled, minimal perf impact). Cần `height: calc(var(--n) * 100vh)` trên root → page dài.

---

## ADR-005 — Domain: doxuanloc.space

**Date**: 2026-Q2  
**Status**: Accepted

**Quyết định**: Dùng `doxuanloc.space` thay vì `doxuanloc.dev`.

**Lý do**: Domain `.space` phù hợp hơn với theme space/vũ trụ của portfolio. Đã mua và config DNS.

**Trade-off**: Cần update `astro.config.mjs` (`site:`), `public/robots.txt`, og:image URLs, và tất cả hardcoded references.

---

## ADR-006 — AI Integration: Vercel Hybrid (output: 'server' + prerender per page)

**Date**: 2026-06  
**Status**: Planned (chờ implement P1)

**Quyết định**: Chuyển từ pure static → hybrid bằng `@astrojs/vercel` adapter. Pages tĩnh dùng `export const prerender = true`, chỉ `src/pages/api/ai/*` là serverless.

**Lý do** (từ ai-integration-spec.md, Grok):
- Cùng repo, cùng Vercel project — không tách infra
- Fluid Compute phù hợp I/O-bound LLM streaming
- Option B (separate backend): overkill, thêm infra/latency/secret sync
- Option C (Edge Functions): giới hạn runtime, Claude/xAI SDK không chạy sạch trên Edge

**Model**: Claude Haiku 4.5 cho 1-shot explain (nhanh, rẻ, cacheable). Grok 4.3 cho blog chat (voice match với content Grok gen). Xem ma trận đầy đủ: docs/ai-integration-spec.md §2.

**Trade-off**: Cần nâng Vercel plan lên Pro cho timeout 300s. Cold start ~500ms-1s cho AI routes (first call after idle).

---

## ADR-007 — Journey Mobile: Sticky (cùng UX desktop, không có rail)

**Date**: 2026-06  
**Status**: Accepted

**Quyết định**: Mobile dùng cùng sticky scrollytelling UX như desktop, bỏ rail sidebar. Không dùng stacked-card layout.

**Lý do**:
- Stacked cards không có cảm giác "điều khiển scroll"
- JS `render()` đã scroll-driven, hoạt động cho cả mobile với CSS phù hợp
- Image overlay (text đè lên ảnh) tận dụng tốt không gian màn hình nhỏ
- `nodes[]` rỗng trên mobile → `forEach` no-op, an toàn

**Trade-off**: iOS momentum scroll có thể làm panels flash nhanh khi flick mạnh. Không có rail nav → user phải scroll tuần tự (không jump). Acceptable vì mobile thường đọc tuyến tính.

---

## ADR-008 — Home: Lightweight Scroll-Synchronized Layers + Floating Sector HUD (normal flow, not pinned scrolly)

**Date**: 2026-06  
**Status**: Accepted (spec phase)

**Quyết định**: Trang home dùng normal document flow + **một** central throttled scroll controller (RAF + passive listener) để drive CSS custom properties (`--home-scroll-p`, `--home-scroll-vel`, `--home-active-sector`, `--hero-depth`, per-card `--solve-charge-*`, etc.) + floating Live Sector HUD. Không chuyển sang pinned 100vh scrollytelling như Journey.

**Lý do**:
- Home phải vẫn là **fast overview + marketing surface** (scannable cho recruiter, easy blog/news consumption, good SEO). Pinned scrolly sẽ làm lower sections (Roadmap, Blog, News) khó tiếp cận và phá vỡ linear reading.
- Scroll vẫn là "primary input" cho first-visit immersion (depth recession, filaments drawing, charge bars, active sector, subtle velocity on canvas) — đạt được mục tiêu UX mà không trả giá về scanability.
- Tái sử dụng pattern đã chứng minh ở Journey (computeMostVisible với visibility ratio, RAF ticking, reduced-motion early exit, astro:page-load init) → ít code mới, behavior nhất quán.
- Chỉ một listener + batch CSS var writes → perf overhead rất thấp (giữ Lighthouse).
- Floating HUD (right rail desktop / compact mobile) cung cấp "sense of place" và quick navigation mà không chiếm không gian nội dung.

**Trade-off**:
- Hiệu ứng "spatial flight" nhẹ hơn Journey (không có pinned crossfade 1:1). Bù lại bằng progressive layers, filaments, và HUD telemetry.
- Cần duy trì ~7-8 CSS var + một số per-element states → nhiều hơn pure CSS reveal hiện tại. Đã giới hạn rõ contract trong spec để tránh scope creep.
- Mobile HUD phải collapse mạnh (không rail) — chấp nhận được vì mobile user thường scroll tuyến tính.

**Implementation constraints locked**:
- Vanilla + 1 small island (client:visible) hoặc attach vào Base script.
- Tối đa 1 RAF scroll loop cho toàn bộ home effects.
- Tất cả advanced effects có static fallback khi `prefers-reduced-motion`.
- Không thêm dependency. Re-use existing data-reveal, data-tilt, hud-bracket, space-bg, SiteBackground canvas.
- Content 100% từ profile + i18n (không hardcode copy mới trừ HUD codenames — giữ English cho flavor).

**References**: home-redesign-spec.md (vision), home-implementation-spec.md (detailed logic + phases), codebase-overview.md (Journey scroll pattern), ADR-004 (why pinned only for Journey).

---

## ADR-009 — Social Syndication: LinkedIn Auto-Post via Local Pipeline (Personal Profile)

**Date**: 2026-06  
**Status**: Accepted (spec complete; implementation pending priority)

**Quyết định**:
- Thêm cơ chế auto-post blog hàng ngày lên LinkedIn Personal Profile, chạy như bước optional trong `publish:today` (local).
- Script mới `scripts/post-to-linkedin.mjs` + setup helper `scripts/setup-linkedin-auth.mjs`.
- State idempotency ghi trực tiếp vào daily JSON (`linkedin.posted`).
- Chỉ post khi có `blog` (không post news-only days). Text format: hook + excerpt + 2-4 bullets + link + hashtags (VI).
- GH Actions chỉ là fallback manual (không schedule/cron).

**Lý do**:
- Phù hợp pipeline hiện tại (local Grok CLI → gen → validate → commit → push). Giữ secret trên máy user, tránh double-post.
- LinkedIn algorithm ưu thích value post có hook mạnh + bullets + CTA + native link (OG preview từ blog page đã đủ rich).
- w_member_social + refresh token 1 năm là cách đơn giản nhất, zero 3rd-party paid tool.
- Content publication quan trọng hơn social → lỗi LinkedIn không được fail publish pipeline.

**Trade-off**:
- Local: đơn giản, user control timing (tốt nhất 10-14h VN Tue-Thu) nhưng phụ thuộc máy.
- GH scheduled: robust hơn nhưng phức tạp secret + risk double-post + lệch triết lý "chạy tay" hiện tại → defer.
- Text-only v1 (không image upload) → nhanh ship, dễ test; sau này thêm asset upload nếu cần.
- Không LLM call trong poster (deterministic extraction) → rẻ, ổn định, tone nhất quán với blog.

**Integration**:
- `npm run publish:today` append `&& node scripts/post-to-linkedin.mjs`
- Standalone `npm run post:linkedin`
- Setup 1 lần: LinkedIn Developer App → Share on LinkedIn + OIDC products → run setup script (local http callback) → lưu refresh token vào .env.

**References**: `docs/linkedin-auto-post-spec.md` (full architecture, template, OAuth flow, error matrix, script outline).

---

## 2026-06-11 — Multi-AI doctrine v3 + Blog richness P0

**Quyết định (doctrine v3, global)**: Thay vai cố định → capability-routing (4 mode cộng hưởng: parallel/sequential/adversarial/single; evidence-gates; security mode full-power vs redacted). Ghi `~/.claude/CLAUDE.md` + `PART2_WORKFLOW.md`, pushed. Grok raw take + record: `~/.claude/docs/workflow-doctrine-v3.md`.

**Quyết định (blog richness P0)**: Thêm `blog.tldr` + `blog.blocks` (5 type data-driven: callout/chart/comparison/flow/step). LLM emit DATA, `ContentBlocks.astro` render safe HTML/SVG. `[slug].astro`: TL;DR box + blocks interleave giữa H2. `validate-content.mjs` mở rộng quét blocks/tldr.

**Lý do**: (1) Doctrine cũ lagging harness — Grok Build đọc repo trực tiếp; 2 take độc lập + cross-check mới là giá trị multi-AI. (2) Blog "wall of text" khó catch-up; data-driven blocks = điểm nhấn + an toàn auto-gen (LLM không viết HTML/SVG thô → diệt sanitization + vỡ layout). 2 take Grok+Claude hội tụ về data-driven.

**Trade-off**:
- Data-driven > raw markup: bớt linh hoạt, tin cậy hơn nhiều khi auto-gen hàng ngày.
- Widget free-compute JS + raw-SVG → P1 (rủi ro logic/geometry); P0 tương tác qua `step` (reveal, không free JS).
- Interleave theo thứ tự H2 (P0); position-markers chính xác → P1.
- LinkedIn org dual-post → P2 (scope `w_organization_social` restricted).

**References**: `docs/blog-richness-spec.md` (Grok draft + 3 tie-break resolved), `src/components/blog/ContentBlocks.astro`, `content/schema.json`.

---

## 2026-06-11 — Cover GIF: decorative → animated insight card

**Quyết định**: GIF LinkedIn bỏ orbital-pulse decorative → render block đắt nhất của bài thành infographic động trên nền **light editorial** (#f4f6f8). Ưu tiên chọn block: `chart` (bar, ≥3 điểm, cap 5) > `comparison` (2×3 bullets) > `flow` (cap 4 bước). 4 frame eased reveal (bar mọc dần / bullets hiện dần / step highlight), frame cuối hold ~1.4s. Bài không có block phù hợp → fallback GIF orbital cũ. PNG cover trên site giữ dark decorative (đồng bộ theme site).

**Lý do**: User feedback "GIF không có giá trị" — cover phải là hình vẽ mô tả kĩ thuật (tham chiếu style AI Insiders bar chart / RAG patterns diagram). Parallel mode Grok + Claude: đồng thuận animate THÔNG TIN không animate trang trí, dùng `blocks[]` có sẵn không thêm schema field. Grok thắng 2 điểm: nền sáng (dark làm diagram chết trên feed), 4 frame (size <420KB). Claude giữ easing trong 4 frame.

**Trade-off**:
- Light cover ≠ dark brand site → chấp nhận: legibility trên feed > brand consistency của cover; PNG site vẫn dark.
- Không icon library (satori flexbox-only) → node hình học + Unicode (→ ● ✓ số trong vòng tròn).
- LLM emit block quá dày (flow 6 bước, chart 7 bar) → renderer tự cap, không tin LLM.
- 2 generator (PNG dark / GIF light) → chi phí maintain 2 visual path.

**References**: `scripts/linkedin-card.mjs`, raw takes trong session 2026-06-11 (Grok in-repo `--tools read_file,grep,list_dir`).

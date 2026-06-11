# Blog Richness Spec — Visual + Interactive (Task L)

> **Status**: FINAL — P0 scope chốt (3 tie-break resolved). Grok = architect draft; Claude = cross-check + tie-break resolution. P0 đang implement.
> **Method**: 2 take độc lập (Grok + Claude, không anchor nhau) → đối chiếu. Đây là bằng chứng workflow flexible chạy.

## Hội tụ (2 AI độc lập cùng kết luận → tự tin cao, chốt được)

| Vấn đề | Kết luận chung |
|--------|----------------|
| **Kiến trúc lõi** | **Data-driven blocks**: LLM xuất **data JSON có schema**, renderer (Astro) vẽ SVG/HTML an toàn. KHÔNG để LLM emit chuỗi HTML/SVG. Diệt sanitization + vỡ layout cùng lúc. |
| **Block tin cậy nhất** | callout (Very High) → chart bar/line data-driven (High) → before/after (High) → diagram data-driven nodes/edges (Medium). |
| **Block rủi ro nhất** | widget slider/calculator có JS compute — "dễ chết nhất in prod". |
| **Guardrail** | Mở rộng `validate-content.mjs` (ajv): schema + size cap + allowlist tag cho escape-hatch + sandbox `compute` (cấm eval/fetch/Function). Mỗi block có text fallback → lỗi thì **degrade về text, bài không vỡ**. |
| **Layout** | cover → title → **TL;DR/key-takeaways (catch-up 10s)** → blocks xen kẽ text mỗi 2-3 đoạn → CTA. |
| **Interactivity P0** | Widget client-only (không backend). AI chat thật = sau (đã có `docs/ai-integration-spec.md`, ~$3-8/mo). **Bỏ nút disabled giả.** |
| **GIF** | Giữ GIF cover trang trí (rẻ, brand). Minh họa nội dung → inline SVG data-driven trong bài, KHÔNG GIF freehand. |
| **LinkedIn org** | Cần scope `w_organization_social` (restricted, phải LinkedIn duyệt) + role **ADMINISTRATOR** trên page + author `urn:li:organization:{id}`. Idempotency marker tách riêng. Voice company khác personal → field `linkedinPostOrg`. |

Grok dùng web_search xác minh role org page (ADMINISTRATOR / DIRECT_SPONSORED_CONTENT_POSTER / CONTENT_ADMIN) — đúng phần edge realtime của nó.

## Tie-break — RESOLVED

**P0 block set chốt**: callout · chart · comparison · flow (boxes+CSS arrows) · step (progressive reveal) — tất cả DATA-DRIVEN (LLM emit DATA, site render; KHÔNG raw HTML/SVG).
- **TB-1**: raw-SVG KHÔNG vào P0 (chỉ data-driven; raw = escape-hatch P1).
- **TB-2**: free-compute widget → P1; P0 tương tác bằng `step` (reveal tuần tự, không free JS).
- **TB-3**: LinkedIn org → P2 (scope `w_organization_social` restricted).

Rationale 2 hướng (giữ lại):

**TB-1 — Raw-SVG escape hatch trong P0?**
- *Grok*: có field `svg` (maxLength 12000) làm fallback khi data-driven không đủ, sanitize bằng allowlist.
- *Claude*: KHÔNG đưa raw-SVG vào P0 — đó đúng là chỗ "freehand geometry" dễ vỡ nhất; chỉ data-driven diagram, giữ `interactiveBlock` cũ làm escape-hatch hiếm dùng. Thêm raw-SVG khi P1 nếu thực sự thiếu.

**TB-2 — Widget (JS slider/compute) ở P0 hay P1?**
- *Grok*: P0 — vì "interactivity là evidence" thấy ngay ngày 1.
- *Claude*: P1 — widget là block rủi ro nhất (chính Grok cũng nói "easiest to die"). P0 nên chắc chắn (callout + chart + before/after + diagram data-driven). Nếu muốn tương tác ở P0 → chỉ `stepReveal` (không có compute JS tự do).
- *Compromise khả dĩ*: P0 có 1 widget DUY NHẤT loại constrained (stepReveal hoặc slider preset, không cho LLM viết compute tự do).

**TB-3 (nhỏ) — LinkedIn org priority**: Grok P2, Claude P1. Nghiêng P2 (Grok đã check API: scope bị restricted, duyệt có thể chậm/bị từ chối → đừng đặt cược P0/P1 vào đó).

---

# Grok's full architect draft (verbatim)

_Đọc trực tiếp repo (CLAUDE.md, gen-today, schema, [slug].astro, BlogCoverVisual, linkedin-card, post-to-linkedin, ai-integration-spec, decisions + content.ts, validate-content.mjs, astro.config). Chỉ web_search cho Q6._

## Q1 — Content Block System
4 block P0: **callout, diagram, chart, widget**. before/after + tabbedCode = P1.

Schema additive (`blog.blocks?: Block[]`, giữ `contentMarkdown` + `interactiveBlock` cũ):
```json
"blocks": {
  "type": "array", "maxItems": 12,
  "items": {
    "type": "object", "required": ["type","id"], "additionalProperties": false,
    "properties": {
      "type": { "enum": ["callout","diagram","chart","widget","step"] },
      "id": { "type": "string", "maxLength": 40 },
      "caption": { "type": "string", "maxLength": 240 },
      "variant": { "enum": ["insight","warning","tradeoff","fact"] },
      "title": { "type": "string", "maxLength": 80 },
      "body": { "type": "string", "maxLength": 600 },
      "diagram": { "kind": ["flow","arch","boxes"], "nodes": "[{id,label,kind}] max12", "edges": "[{from,to,label}] max20" },
      "svg": { "maxLength": 12000, "desc": "compact self-contained <svg> ONLY if data insufficient; viewBox, inline, no external" },
      "chart": { "variant": ["bar","line"], "data": "[{label,value}] max10", "yLabel": "", "unit": "" },
      "widget": { "kind": ["slider","quiz","paramExplorer"], "params": "[{name,min,max,step,default}]", "compute": "tiny pure JS, no eval/fetch (max800)", "steps": "[{label,body}] max8" }
    }
  }
}
```
Reliability: callout Very High · chart High · before/after High · diagram Medium · widget Medium-Low (rủi ro nhất) · raw-SVG/animated multi-frame/absolute-layout = tránh.

## Q2 — Reliability/Guardrail (điểm dễ chết nhất)
1. Gen prompt: ép xuất `blocks` typed, ưu tiên data shape; SVG chỉ minimal valid viewBox, no script/external/foreignObject; <8-12kB/block; respect reduced-motion; mỗi block có `id`. Không làm được visual ổn → emit callout mạnh thay vì ép diagram.
2. Few-shot trong prompt (callout / bar chart / flow nodes / slider compute tốt).
3. ajv schema enforce (mở rộng validate-content.mjs) — fail file nếu sai type/size/enum.
4. Safety pass: size cap/block + tổng (<60kB); allowlist tag cho `svg` (svg,g,rect,circle,path,text,line,polyline,defs,linearGradient,style); cấm `on*`/`javascript:`/external url/foreignObject; `widget.compute` allowlist arithmetic+Math, chạy trong Function sandbox chỉ có params; palette qua CSS var, không hardcode màu.
5. Headless render-test (happy-dom/jsdom) cho file có blocks — lỗi → block error, không fail cả bài (~1-2s).
6. Fallback: block lỗi → strip + chèn text callout từ caption/body; cả layer hỏng → render contentMarkdown + note "Visuals temporarily degraded"; validate vẫn hard-fail CHỈ với security + schema root.
7. Idempotency: như hiện tại (daily JSON là source of truth).
8. Tone guard: "blocks must look like production artifacts — clean, precise, minimal chrome."

Fragility còn lại: geometry plausible-but-broken; widget compute là băng mỏng nhất; cumulative layout shift nếu caption dài. Không có silver bullet → P0 ship kèm few-shot tốt + cap chặt + degradation path rõ.

## Q3 — Layout
cover → meta+title+excerpt → **TL;DR/Key Takeaways (new, auto-gen `blog.tldr?: string[]`)** → body xen prose↔block → "skim vs deep" (desktop: pills "jump to visuals"; mobile: scroll tuần tự) → real AI entry (Q4) → footer CTA.
Static template: cover chrome, typography, reading progress, tags, nav/footer, reduced-motion, palette, block wrapper. Auto-gen: title/excerpt/tags/contentMarkdown (cũ) + tldr + blocks[].
Helper `renderBlocks(blocks, lang)`, class `.article-block`, giữ View Transitions + data-reveal.

## Q4 — Interactivity thật
P0 = **(b) widget client-only** (slider/quiz/paramExplorer) — true interactivity ngày 1, zero backend/cost, chính là evidence. P1 = (a) AI chat thật theo `ai-integration-spec` (Vercel hybrid, Grok cho voice match, ~$0.005-0.01/call, throttle+cache). Không làm (a) ở P0 vì thêm infra/key/Pro/cold-start trước khi visual layer chứng minh giá trị.

## Q5 — GIF/Visual
Giữ GIF cover decorative (brand, satori/resvg/gifenc đã có). Đẩy minh họa nội dung vào inline blocks (diagram/chart/step + tiny toggle script cycle frames — no GSAP). LinkedIn dựa hook+bullets+OG preview (giờ trang bài có visual mạnh). Content-derived card = defer.

## Q6 — LinkedIn dual-post
Hiện personal only (`w_member_social`, personUrn, ugcPosts, idempotent qua `linkedin.posted`).
Org cần: scope `w_organization_social` (restricted, LinkedIn duyệt) + role ADMINISTRATOR/DIRECT_SPONSORED_CONTENT_POSTER/CONTENT_ADMIN + author `urn:li:organization:{id}`. Risk: duyệt chậm/bị từ chối; phải admin thật; tone "as company" có rủi ro pháp lý/uy tín; 2 author cần idempotency tách (`linkedin.personal.posted`+`linkedin.company.posted`); mất admin → 403 im lặng.
Schema: thêm `linkedinPostOrg` (optional) hoặc `linkedinPosts:{personal,org}`. post-to-linkedin branch nếu có `LINKEDIN_ORG_URN`+scope. Voice org trung tính hơn. **Priority P2**, gate trên admin thật + scope duyệt + user chốt.

## Q7 — Phasing
- **P0 (~1 ngày, static-safe, auto-gen end-to-end)**: schema+content.ts cho `blocks` (4 type)+tldr · update gen-today prompt (contract+few-shot) · mở rộng validate-content (schema+size+allowlist+safety+fallback) · renderer `ContentBlock.astro` · redesign `[slug].astro` (cover+TL;DR+interleaved) · 1 widget live + callouts · log decisions. Lý do: thay đổi cảm nhận lớn nhất, zero infra, đập đúng complaint.
- **P1**: thêm block (before/after, tabbedCode, step giàu hơn) · harden widget (sandbox, multi-instance, a11y) · AI chat thật theo ai-integration-spec · i18n strings mới · test matrix.
- **P2**: company dual-post (sau khi scope+admin OK) · coverConcept richer card · full ai-integration · CI render smoke · block engagement analytics.

Risk register: LLM block quality variance (few-shot+fallback+golden examples) · widget JS fragility (data-driven+narrow compute) · org scope delay (đừng cược P0/P1) · perf nếu 10+ heavy blocks (cap+measure).

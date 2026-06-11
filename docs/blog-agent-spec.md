# Blog Agent Spec — Deep Technical Thesis Pipeline

> **Status**: Draft (Grok spec, 2026-06)  
> **Owner**: Grok (design) → Claude (implement after user approval)  
> **Related**: `gen-today.mjs`, `post-to-linkedin.mjs`, `linkedin-card.mjs`, `ContentBlocks.astro`, `content/schema.json`, `src/lib/content.ts`, `src/pages/blog/[slug].astro`, `validate-content.mjs`, `docs/decisions.md`, `CLAUDE.md` (triết lý: evidence of exceptional ability, no WebGL/Three/GSAP, satori+gifenc only).  
> **Philosophy (mandatory)**: Bài blog KHÔNG phải "tóm tắt tin hôm nay". Phải là **luận đề kỹ thuật sâu** về 1 chủ đề (mechanism, trade-off at production boundary, counter-intuitive behavior). Phải có diagram luồng cơ chế thật, HTML block mô tả logic, insight phản trực giác. GIF LinkedIn = vẽ CƠ CHẾ (sequence / circuit / dataflow animated), KHÔNG text animation hay decorative pulse.

---

## Value
- Tạo bề dày technical authority khác biệt so với daily "signal" posts (hiện tại 400-1000w, news-tied).
- Evidence: 1 bài sâu + 1 mechanism GIF chất lượng cao trên LinkedIn → engagement kỹ thuật (save, repost, comment từ engineers) đo được trong 3-7 ngày.
- Tách biệt rõ ràng: gen-today giữ nhịp hàng ngày (news + 1 insight ngắn); Blog Agent chạy theo chủ đề curated (từ inbox.md hoặc CLI), tần suất thấp hơn (1-2/tuần hoặc theo nhu cầu).

## Scope
**In**:
- Pipeline riêng (script entrypoint mới), input = chủ đề kỹ thuật (string hoặc topic file).
- Research (web_search + fetch), deep draft (thesis structure), enrich (mechanism blocks + GIF data), pure-Node GIF generation (satori + gifenc), write portfolio content, post LinkedIn với format khác.
- New block types + renderer support cho "mechanism explanation".
- GIF: animated sequence / circuit / flow với signal propagation, state transitions, timing.
- Reuse existing guardrails (validate, security scan, no sensitive terms, reduced-motion).

**Out (không làm)**:
- Không sửa/gen-today.mjs (riêng biệt hoàn toàn).
- Không thêm WebGL, Three.js, GSAP, browser/canvas, external icon libs.
- Không thay đổi daily news index structure cốt lõi.
- Không auto-schedule (chạy tay local như publish:today hiện tại).
- Không English variant P0 (giữ VI primary như daily).
- Không raw SVG escape hatch mới (dùng data-driven blocks).

## Architecture (Section A)

### Text-based flowchart (end-to-end)

```
[Input: Topic]
  |  (CLI: --topic="Agent payments idempotency + spending proofs at 3am" 
  |   hoặc curated line từ content/insights/inbox.md)
  v
┌─────────────────────────────┐
│ 1. Research (Grok spawn)    │  --tools: web_search, web_fetch, read (profile + past essays)
│    - Tìm spec, RFC, source  │     + deep papers / open impl / incident reports
│    - 3-6 nguồn chất lượng   │
│    - Xác minh số liệu/thực  │
└──────────────┬--------------┘
               v
┌─────────────────────────────┐
│ 2. Thesis Draft             │  Prompt chuyên biệt (khác gen-today):
│    - Vấn đề + tại sao khó   │  "Viết LUẬN ĐỀ KỸ THUẬT 1400-2200 từ. Phải có:
│    - Cơ chế cốt lõi (hỏi    │   (a) ít nhất 1 sequence/architecture block,
│      tại sao fail ở prod)   │   (b) 1 counter-intuitive insight,
│    - Trade-off + boundary   │   (c) prose H2 mô tả logic + data block xen kẽ.
│    - tldr (5-7 bullets)     │   Giọng: kỹ sư giải thích cho kỹ sư, không sáo rỗng."
└──────────────┬--------------┘
               v
┌─────────────────────────────┐
│ 3. Enrich + Block Planning  │  LLM emit:
│    - Chọn 4-8 blocks        │   blocks[] với type mới "sequence" | "architecture"
│    - Gắn id khớp H2         │   + diagramData (nodes/edges/events/timing)
│    - Sinh mechanism data    │   cho GIF generator (không phụ thuộc text)
└──────────────┬--------------┘
               |
       +-------+-------+
       |               |
       v               v
┌──────────────┐  ┌──────────────────────────┐
│ 4a. Write    │  │ 4b. Mechanism GIF Gen    │
│    content/  │  │    (scripts/mechanism-   │
│    essays/   │  │     gif.mjs)             │
│    <slug>.json│  │  - 6-10 frames satori   │
│  (BlogPost   │  │  - traveling signals,   │
│   + source   │  │    pulses, state change │
│   + gifPath) │  │  - encodeGif (gifenc)   │
│              │  │  - output .gif <350KB   │
└──────┬───────┘  └────────────┬─────────────┘
       |                       |
       v                       v
┌────────────────────────────────────────────┐
│ 5. Asset + Index                           │
│    - public/images/mechanism/<slug>.gif    │
│    - (optional) PNG static fallback        │
│    - Extend lib/content.ts + gen index     │
└────────────────────┬───────────────────────┘
                     v
┌────────────────────────────────────────────┐
│ 6. LinkedIn (khác daily)                   │
│    - Hook: "Cơ chế X mà hầu hết agent     │
│      builder bỏ qua khi scale"            │
│    - 3-4 bullets kỹ thuật (→ signal loss  │
│      tại boundary, idempotency key scope) │
│    - CTA: "Đọc breakdown + diagram: link" │
│    - Attach mechanism GIF (upload)        │
│    - Script: extend post-to-linkedin hoặc │
│      --deep flag / dedicated step         │
└────────────────────────────────────────────┘
```

**Pipeline entry**: `node scripts/gen-blog-agent.mjs --topic="..." [--dry] [--preview-gif]`

**Idempotency**: slug unique (validate). State marker optional (nếu cần re-gen).

## GIF Mechanism — Kỹ thuật (Section B)

### Approach (pure Node, satori + gifenc, no canvas/browser)

1. **Frame model**: Discrete phases (6-10 frames). Mỗi frame = 1 lần `satori(...)` → Resvg → pixels. Sau đó `gifenc` encode với per-frame `delay`.
2. **Animation primitives** (tính trong JS builder, trước khi build element tree):
   - **Parametric position**: `pos(t) = lerp(points[i], points[i+1], t_local)` cho traveling dot/signal.
   - **Progressive reveal**: edge `stroke-dasharray` + `stroke-dashoffset` mô phỏng bằng cách vẽ nhiều đoạn nhỏ (hoặc 2 path: base faint + active growing).
   - **State / pulse**: box `background` / `border-color` + inner glow (radial div hoặc SVG rect + opacity) thay đổi theo phase. Thêm "charge" line thickness hoặc small traveling rect.
   - **Sequence diagram**: vertical lifelines (fixed), horizontal message arrows xuất hiện dần (line length = f(frame)) + actor highlight (fill accent).
   - **Circuit / dataflow**: nodes là rounded rect + icon (Unicode hoặc path), edges là path. Một hoặc nhiều "token" (circle nhỏ) di chuyển dọc edge theo timeline events.
3. **Timing & hold**: 120-180ms cho motion frames, 1400-2200ms cho final "complete readable" frame. Viewer trên feed thấy rõ toàn bộ mechanism sau 1-2s.
4. **Data contract cho GIF**: block cung cấp `mechanism` data (nodes + timedEvents) + generator map phase → visual mutations. Tách biệt với prose.
5. **Perf/size**: Giới hạn 8 frames, 256 palette, target <350KB. Giống current `encodeGif` + quantize trong linkedin-card.mjs:256.
6. **Reduced motion**: GIF vẫn chạy (user expectation cho card), nhưng final frame hold rất dài + site inline diagram (nếu render) respect `@media (prefers-reduced-motion)` bằng static.

### Sample satori code snippet (mechanism flow with traveling signal)

```js
// scripts/mechanism-gif.mjs (excerpt — pattern giống linkedin-card build*Diagram)
function buildMechanismFlow(el, mech, accent, frame, totalFrames) {
  const t = Math.min(1, (frame + 1) / (totalFrames - 1)); // 0..1 progress
  const signals = mech.events.map(ev => {
    // ev = { fromId, toId, startPhase:0.1, endPhase:0.6, label:"token" }
    const localT = Math.max(0, Math.min(1, (t - ev.startPhase) / (ev.endPhase - ev.startPhase)));
    return { ...ev, progress: localT };
  });

  // Precompute node centers (layout deterministic, 3-6 nodes)
  const nodes = layoutNodes(mech.components); // returns [{id, x, y, w, h}]

  return el("div", { /* canvas wrapper light like current insight card */ }, [
    el("svg", { width: 620, height: 320, viewBox: "0 0 620 320" }, [
      // edges (base faint)
      ...mech.connections.map(c => {
        const a = nodes.find(n => n.id === c.from);
        const b = nodes.find(n => n.id === c.to);
        return el("line", {
          x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy,
          stroke: LIGHT.line, "stroke-width": 2, "stroke-dasharray": "6 4"
        });
      }),

      // active edges + traveling signals
      ...signals.map(sig => {
        if (sig.progress <= 0 || sig.progress >= 1) return null;
        const a = nodes.find(n => n.id === sig.fromId);
        const b = nodes.find(n => n.id === sig.toId);
        const sx = a.cx + (b.cx - a.cx) * sig.progress;
        const sy = a.cy + (b.cy - a.cy) * sig.progress;

        return [
          // active segment (grows with progress)
          el("line", {
            x1: a.cx, y1: a.cy,
            x2: sx, y2: sy,
            stroke: accent.a1, "stroke-width": 3.5, "stroke-linecap": "round"
          }),
          // traveling token (the "mechanism" feel)
          el("circle", {
            cx: sx, cy: sy, r: 7,
            fill: accent.a1,
            stroke: LIGHT.canvas, "stroke-width": 1.5
          }),
          // small label near token (nonce / proof / step)
          sig.label ? el("text", {
            x: sx + 12, y: sy - 8, fontSize: 11, fill: LIGHT.text, fontFamily: "JetBrains Mono"
          }, sig.label) : null
        ];
      }).filter(Boolean).flat(),

      // nodes (state boxes or services)
      ...nodes.map(n => {
        const isActive = isNodeActive(mech, n.id, t); // phase-based
        return el("g", {}, [
          el("rect", {
            x: n.x, y: n.y, width: n.w, height: n.h, rx: 8,
            fill: isActive ? hex(accent.a1, 0.12) : LIGHT.canvas,
            stroke: isActive ? accent.a1 : LIGHT.line,
            "stroke-width": isActive ? 2 : 1
          }),
          el("text", { x: n.cx, y: n.cy + 4, textAnchor: "middle", fontSize: 13, fontWeight: 600, fill: LIGHT.text }, n.label)
        ]);
      })
    ])
  ]);
}
```

**Ghi chú kỹ thuật**:
- `layoutNodes` đơn giản (grid hoặc force-lite 1-pass) — deterministic từ seed slug.
- Dùng `g` group, `line`/`polyline`/`path` (cho curve), `circle`/`rect`/`text`. satori hỗ trợ tốt.
- Pulse circuit: thêm `opacity` ramp trên edge segments hoặc 2-3 dots dọc path (phase offset).
- Sequence: thay line bằng actor vertical bars + message arrows (cùng interp logic).
- Re-use `rasterize` + `encodeGif` từ linkedin-card.mjs (DRY bằng import hoặc shared util mới).

## New Block Types (Section C)

Thêm vào `blog.blocks[]` (giữ nguyên contract: LLM emit **DATA** only; renderer vẽ).

**1. `sequence` (P0)** — Timed A→B→C / actor-message.
```json
{
  "type": "sequence",
  "id": "payment-nonce-flow",
  "title": "Idempotency + Nonce Lifecycle",
  "sequence": {
    "actors": [{"id":"agent","label":"Agent"}, {"id":"rail","label":"Payment Rail"}, {"id":"ledger","label":"Ledger"}],
    "events": [
      {"phase": 0, "from": "agent", "to": "rail", "label": "POST /pay {nonce, cap}", "kind": "request"},
      {"phase": 1, "from": "rail", "to": "ledger", "label": "check nonce + spend cap", "kind": "internal"},
      {"phase": 2, "from": "ledger", "to": "rail", "label": "ACK / 409", "kind": "response"}
    ]
  }
}
```

**2. `architecture` (P0)** — Components + connections (boxes + directed edges).
```json
{
  "type": "architecture",
  "id": "agent-harness-boundary",
  "title": "Step Functions + AgentCore Boundary",
  "architecture": {
    "components": [
      {"id":"sf", "label": "Step Functions", "kind": "orchestrator"},
      {"id":"agent", "label": "AgentCore", "kind": "reasoner"},
      {"id":"approval", "label": "Human Gate", "kind": "control"},
      {"id":"settle", "label": "Payment Executor", "kind": "side-effect"}
    ],
    "connections": [
      {"from": "sf", "to": "agent", "label": "invoke (state + context)", "type": "sync"},
      {"from": "agent", "to": "approval", "label": "propose action", "type": "event"},
      {"from": "approval", "to": "settle", "label": "approved", "type": "control"}
    ]
  }
}
```

**Schema delta** (content/schema.json):
- `"type": { "enum": ["callout", "chart", "comparison", "flow", "step", "sequence", "architecture"] }`
- Thêm `"sequence"` và `"architecture"` objects (giống flow/comparison hiện tại).
- `caption`, `title` dùng chung.

**Renderer** (ContentBlocks.astro):
- Thêm 2 nhánh `if (b.type === 'sequence')` và `'architecture'`.
- Vẽ SVG server-side (giống linePoints hiện tại cho chart). Tính geometry 1 lần.
- Hỗ trợ caption + reduced-motion (static view).
- Style: HUD-ish borders, accent lines, mono labels — khớp theme space + current cb-* classes.

**Optional future**: `state` (finite state + transition table) — merge vào architecture nếu cần.

## LinkedIn Post Format (Section D — khác gen-today)

**Daily (gen-today)**: "Daily Signal" — hook từ tin, 3 → findings thực tế ngắn, CTA "Chi tiết", 3-4 hashtag chung.

**Blog Agent (deep thesis)**:
- **Hook** (1-2 dòng đầu): Vấn đề production + insight phản trực giác về cơ chế.  
  Ví dụ: "Hầu hết agent payments fail không phải vì thiếu tiền — mà vì nonce collision + cap check xảy ra sau khi đã reserve."
- **Context** ngắn (1-2 câu): Tại sao boundary này quyết định 99% production incidents.
- **Findings** (3-4 dòng, → ):  
  → Nonce phải scope theo (agent_id + intent + deadline), không chỉ random UUID.  
  → Cap proof phải verifiable on-chain trước khi rail commit, không sau.  
  → Human gate trong harness chỉ đáng giá nếu state machine expose "what changed" rõ ràng.
- **CTA**: "Đọc full mechanism + diagrams (sequence + architecture): https://.../blog/slug/" (khuyến khích đọc sâu).
- **Hashtags**: Kỹ thuật hơn (#AgentPayments #Idempotency #StablecoinRails #SystemDesign #ProductionAI).
- **Visual**: Bắt buộc attach mechanism GIF (circuit/flow/sequence) — đây là điểm khác biệt cốt lõi so với insight-card reveal hiện tại.
- Giọng: thẳng thắn, boundary-focused, "engineer cho engineer". Không hỏi "bạn nghĩ sao?".

**Implementation**: 
- `linkedinPost` field vẫn dùng (Grok sinh theo template mới khi chạy Blog Agent).
- Hoặc post script detect `blog.depth === 'deep'` hoặc presence of `mechanismGif` → dùng builder khác + upload GIF thay vì (hoặc ngoài) insight card.
- Giữ idempotency marker `linkedin.posted` (hoặc `linkedin.deepPosted` nếu dual).

## Files cần tạo/sửa (Section D)

### Tạo mới
- `docs/blog-agent-spec.md` — file này (theo template).
- `scripts/gen-blog-agent.mjs` — orchestrator chính (spawn grok 1-2 lần với prompt research + thesis+enrich, write JSON, gọi GIF gen).
- `scripts/mechanism-gif.mjs` — GIF generator chuyên mechanism (buildSequenceDiagram, buildCircuitPulse, buildDataflow, layout helpers, reuse encodeGif). CLI `--preview` viết tmp/ frames + gif (giống linkedin-card).
- `content/essays/` (dir) — chứa `<slug>.json` standalone (shape tương thích BlogPost + `sourceTopic`, `mechanismGif?: string`, `depth: 'deep'`).
- (Optional) `scripts/post-deep-to-linkedin.mjs` — nếu không muốn extend post-to-linkedin (prefer extend 1 script).

### Sửa
- `content/schema.json`: thêm 2 type mới + shapes (sequence, architecture) vào blog.blocks.items (line ~155 enum + properties).
- `src/lib/content.ts`: 
  - Extend `ContentBlock` interface (add sequence?, architecture?).
  - Thêm glob cho essays + `getAllDeepPosts` / merge vào `getAllPosts` (hoặc union) để /blog/[slug] hoạt động ngay.
- `src/components/blog/ContentBlocks.astro`: 
  - 2 renderer mới + styles (SVG diagram + HUD brackets nhẹ).
  - Import type mở rộng.
- `scripts/validate-content.mjs`: 
  - Scan text fields trong sequence/architecture blocks (sensitive terms).
  - Cho phép depth/sourceTopic mới (không fail).
- `package.json`:
  - Scripts: `"gen:agent": "node scripts/gen-blog-agent.mjs", "mechanism:preview": "node scripts/mechanism-gif.mjs --preview"`.
  - (Optional) extend publish hoặc thêm `blog:publish` step.
- `src/pages/blog/[slug].astro` + index: hỗ trợ cover/blocks từ essays (nếu loader thay đổi) — rất ít hoặc không đổi.
- `scripts/post-to-linkedin.mjs` + `linkedin-card.mjs` (nhẹ):
  - Hỗ trợ `mechanismGif` path hoặc deep flag → ưu tiên upload GIF mechanism thay (hoặc song song) insight card.
  - `buildPostText` variant cho deep (hoặc đọc từ `linkedinPost`).
- `docs/decisions.md`: thêm ADR entry (sau implement) — quyết định storage essays/, GIF approach, tách pipeline.

**Không đụng**: `gen-today.mjs`, `content/news/*.json` (trừ khi test), daily index generator (có thể mở rộng sau).

## Edge cases & Constraints
- Chủ đề quá rộng → prompt ép "1 mechanism cốt lõi duy nhất + 1 counter-intuitive fact".
- GIF data quá phức tạp (>8 nodes) → generator cap + degrade về sequence/flow đơn giản + cảnh báo.
- No data points thật → không chart bịa (giữ nguyên guardrail); thay bằng sequence/architecture.
- Slug trùng → validate fail (như hiện tại).
- LinkedIn upload fail → fallback text-only + log (giống post-to-linkedin hiện tại, exit 0).
- Pure Node: mọi thứ qua satori element objects + JS math. Không `document`, không `canvas`.
- Voice: profile.json + past deep pieces (nếu có) làm few-shot/context. Giữ "Góc nhìn" thẳng thắn, anti-sycophancy.
- i18n: VI primary. EN/JA translation sau (giống blog hiện tại).

## Open Questions [OPEN]
- Storage: `content/essays/` (riêng biệt rõ) hay `content/news/<date>-deep-<slug>.json` (ít thay đổi loader nhất)? Khuyến nghị essays/ + adapter.
- Tần suất: user trigger khi nào (hàng tuần fixed hay theo topic quality)? 
- GIF frame count mặc định: 6 (nhanh) hay 8-10 (rõ mechanism)?
- Có cần "mechanism version" trong JSON để re-gen GIF mà không re-draft thesis không?

## Definition of Done (Section E)

1. **Spec** ✓ — `docs/blog-agent-spec.md` committed, theo template + đầy đủ A-E sections + concrete snippets + references file:line.
2. **Pipeline chạy được** — `node scripts/gen-blog-agent.mjs --topic="..." --dry` (hoặc --preview-gif) tạo JSON hợp lệ + GIF preview trong tmp/ mà không crash.
3. **Schema + render** ✓ — 1 test deep post với `sequence` + `architecture` block validate pass + render đúng trong `/blog/<slug>` (local dev build).
4. **GIF mechanism** ✓ — 1 GIF có visible traveling signal / state pulse / sequence timing (không phải text animation). `card:preview` style hoặc mechanism:preview cho thấy frames + final hold.
5. **LinkedIn format khác** ✓ — Ví dụ linkedinPost text (hoặc builder output) có hook "cơ chế ... bỏ qua", 3-4 → technical boundary bullets, CTA đọc breakdown + diagram, hashtags kỹ thuật. Khác rõ so với daily 3-findings.
6. **Không phá daily** ✓ — `npm run build` (validate + gen-index + astro) pass sạch trên repo hiện tại. gen-today vẫn chạy như cũ.
7. **Guardrail** ✓ — validate-content.mjs quét được text trong block mới; security scan (sensitive + metric) áp dụng.
8. **Evidence gate**:
   - Grounding: trích dẫn chính xác file hiện tại (gen-today:62 blog criteria, linkedin-card:297 pickCoverBlock + 380 buildFlow, schema:155 enum, ContentBlocks:89 flow renderer, post-to-linkedin:112 linkedinPost path).
   - Reproducibility: `node scripts/mechanism-gif.mjs --preview` + `npm run card:preview` (cho daily) đều chạy.
   - Falsifiability: "Sai nếu GIF không có traveling dot/signal hoặc state change rõ ràng theo frame".
   - Value trace: 1 bài deep publish → LinkedIn post có GIF mechanism → quan sát saves/comments từ technical audience (7 ngày).
9. **Decisions** ✓ — Ghi trade-off (tách pipeline, essays/ storage, GIF data-driven timing) vào `docs/decisions.md`.
10. **No new heavy deps** ✓ — Chỉ satori + gifenc + resvg (đã có).

**Verification commands**:
```bash
node scripts/validate-content.mjs
npm run build
node scripts/mechanism-gif.mjs --preview   # sau khi có test data
node scripts/gen-blog-agent.mjs --topic="..." --dry
# Sau publish test: node scripts/post-to-linkedin.mjs --repost (nếu cần)
```

---

**References** (evidence):
- Current daily blog contract & blocks: `scripts/gen-today.mjs:87` (VISUAL BLOCKS), `content/schema.json:146-202`, `src/lib/content.ts:22-33`, `src/components/blog/ContentBlocks.astro:89-116` (flow/step).
- GIF current: `scripts/linkedin-card.mjs:256` (encode), `297` (pick), `322-410` (build*Diagram + t/ease), `509` (generateCoverGif).
- LinkedIn post: `scripts/post-to-linkedin.mjs:107` (buildPostText + linkedinPost), `112` (use pre-crafted).
- Page render & interleave: `src/pages/blog/[slug].astro:100` (sections + blocks[i]).
- Guardrails & philosophy: `scripts/validate-content.mjs:32` (SENSITIVE), `CLAUDE.md:73` (Don'ts), `docs/blog-richness-spec.md` (data-driven win), `docs/decisions.md:204` (ADR-009 + GIF insight card).
- Satori usage: `package.json:29`, linkedin-card loadFonts + rasterize.

Spec này sẵn sàng review. Sau khi user approve → Claude implement theo đúng sections trên (ưu tiên files trong D, verify theo E).

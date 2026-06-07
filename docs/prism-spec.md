# Prism — Review & Spec (Multi-agent Brainstorming Engine)

> **Status**: Honest assessment + pivoted spec. Grok review phase. Không diplomatic.  
> **Context**: Product concept hoàn toàn tách biệt với portfolio. Viết theo yêu cầu user (Claude + user brainstorm).  
> **Guardrail**: Không hardcode key, không PII, không số liệu bịa. Chỉ public knowledge + reasoning.

---

## Executive Verdict (thẳng thắn)

**Concept có hạt nhân mạnh, nhưng bản đề xuất hiện tại over-engineered và nhắm sai vào "multi-model diversity" thay vì giá trị cốt lõi.**

**Cái hay thật**:
- Pain point "engineer chỉ nhìn từ 1-2 góc quen thuộc" là **thật và dai dẳng**. Confirmation bias + status quo bias + tool bias (những người hay dùng Claude thì output nghiêng Claude-style).
- "Thinking DNA" + bet mechanic là **differentiated hook** hiếm thấy. Hầu hết multi-agent tool tập trung vào automation/execution (CrewAI, LangGraph, AutoGen), không ai làm longitudinal self-awareness + shareable artifact đẹp cho cá nhân.
- Shareable perspective map có viral potential nếu visual thật sự đẹp (như "share your Spotify Wrapped for decision style").

**Vấn đề lớn**:
1. **Multi-model = complexity tax không đáng**. 2025-2026 evidence (Cognition "Don't Build Multi-Agents", production experience với LangGraph/CrewAI) cho thấy cross-agent context passing và proactive debate **rất fragile**. Khác model (Claude + GPT-4o + Grok) tạo **style difference** chứ không chắc tạo **perspective diversity** sâu hơn prompt engineering tốt trên 1-2 model mạnh. Chi phí ×5-6, latency, reliability, key management, rate limit — tất cả nhân lên. Time Traveler cần search capability (Grok có lợi thế thật), còn lại prompt + structure là 80% value.
2. **Spatial canvas cho MVP là premature**. Brainstorming flow thực tế của người ra quyết định: họ muốn **nhanh, đọc được nhiều text, so sánh dễ, drill-down khi cần**. React Flow + connection lines + highlight-to-fork nghe cool nhưng mobile disaster, onboarding cost cao, và reading long perspective trên node nhỏ rất tệ. "Find the signal" synthesis node nghe hay nhưng thực tế user cần 1 panel tổng hợp rõ ràng + actionable.
3. **Economics không rõ**. 5 agents + 1 synthesizer + cross-reaction round = dễ 6-10 LLM calls/session. Với model mix, cost/session có thể $0.4-1.2 (2026 pricing). User trả bao nhiêu? 10 sessions/tháng = $5-12. Churn cao nếu novelty mất sau 3-4 lần. Không có pricing model hoặc cost guardrail trong proposal.
4. **Retention ngoài novelty yếu**. Sau "wow 5 agents cùng trả lời", cái gì giữ user quay lại hàng tuần? "Thinking DNA profile" chỉ mạnh nếu **feedback loop chính xác và actionable** (bạn mù X, thử mode Y lần sau, và bạn thấy kết quả quyết định cải thiện). Hiện tại thiếu cơ chế ground truth cho "bạn nghĩ như advisor nào".

**Kết luận**: Concept **viable để test**, nhưng phải **pivot mạnh về scope và architecture** nếu muốn validate trong 2-3 tuần với 1 dev. Không build như Claude vẽ cho v1.

---

## 1. Viability — Pain, User, Competition, Gap

**Pain thật sự**: Kỹ sư / PM / founder ra quyết định kỹ thuật/product thường bị kẹt trong mental model mặc định (tech debt họ vừa fix, framework họ yêu thích, user họ nói chuyện gần nhất, deadline họ đang chịu). Họ biết "nên nghĩ nhiều góc" nhưng **không có công cụ forcing function** + **không có mirror** để thấy bias của chính mình theo thời gian.

**Primary user (thật)**:
- Indie hacker / solo founder (ra quyết định liên tục, không có team để debate).
- Tech lead / EM ở startup 10-50 người (cần align team nhanh, nhưng muốn thử "phá assumption" trước khi họp).
- Product manager technical (đặc biệt ở công ty VN/JP scale-up đang chuyển từ feature factory sang platform thinking).
- Không phải IC engineer thuần (họ ít khi "quyết định lớn" một mình; họ implement).

**Secondary**:
- Student / junior muốn train tư duy (học nhanh hơn bằng cách thấy 5 góc + tự chấm bias).
- Consultant / advisor muốn có "second brain" để generate góc nhìn cho client.

**Competition & thay thế**:
- ChatGPT/Claude "debate this from 5 perspectives" prompt — **zero friction**, miễn phí, đủ tốt cho 70% case. Prism phải **đáng kể hơn** cái này.
- CrewAI / AutoGen / LangGraph — framework cho dev build agent team. Enterprise/automation heavy, UI kém, không có personal profile hoặc shareable artifact.
- Custom GPTs / Claude Projects / "Council of advisors" prompt packs — tồn tại, nhưng thiếu **parallel stream đẹp**, thiếu **cross-reaction thật**, thiếu **longitudinal tracking**.
- Miro + sticky note + manual "6 thinking hats" — spatial nhưng manual, không AI.
- Không có sản phẩm consumer chính thức nào làm "bias profile over time" + bet + beautiful perspective map (search confirm: chỉ có old assessment "thinking DNA", mindmap AI, change management perspective map).

**Gap thật sự tồn tại**: 
- Một tool **đẹp, nhanh, ít suy nghĩ, có mirror** để user thấy "tôi hay thiên về X, bỏ qua Y" và **muốn quay lại** vì profile cải thiện hoặc ít nhất tò mò.
- Shareable artifact là differentiator thật (như "my decision DNA card" trên X/LinkedIn/Farcaster).

**Risk lớn nhất về PMF**: Người dùng có thể thấy "hữu ích 1-2 lần" rồi thôi, vì sau khi biết bias của mình, họ có thể tự prompt hoặc chỉ cần 1 model mạnh với checklist cá nhân.

**Verdict**: Worth a **lean validation** (1-2 tuần core loop). Không worth full architecture như đề xuất nếu không có signal rõ từ 50-100 real sessions.

---

## 2. Multi-agent Architecture — Honest Take

**Claude proposal**: 5 agents × 6 models khác nhau (Sonnet, GPT-4o, Grok, Haiku, Opus) + parallel dispatch + cross-reactions + final synth.

**Vấn đề**:
- **Diversity chủ yếu từ persona prompt + tool access**, không phải base model. Một Claude Sonnet 4.6 với 5 system prompt cực mạnh (Expansionist, Contrarian...) + explicit "you are in a room with 4 other advisors, read their Round 1 and attack" sẽ ra output đa dạng **gần bằng hoặc hơn** 5 model khác nhau. Khác model chủ yếu khác **style bề mặt** (Claude hay lịch sự, Grok edgy, GPT structured).
- **Cross-reaction quality thấp** theo evidence 2025 (Cognition blog): agents kém ở việc "chủ động giao tiếp context quan trọng" và "long-context proactive discourse". Chúng hay nói chuyện lòng vòng hoặc miss điểm chính của agent khác.
- **Cost & ops**: 5-6 provider calls = 5-6× surface area lỗi, cold start, key rotation, spend tracking. Time Traveler cần web search (Grok hoặc Perplexity tool) — chỉ agent đó cần capability đặc biệt.
- **Synthesizer dùng "Opus 4.8"**: giả sử tồn tại và đắt, thì gọi 1 lần cuối cũng tốn kém nếu session ngắn.

**Approach tốt hơn (và rẻ hơn)**:

| Agent | Model khuyến nghị (MVP) | Tool / Augmentation | Persona strength |
|-------|-------------------------|---------------------|------------------|
| Expansionist | Claude Sonnet 4.6 hoặc Grok 4 (fast) | None | "Make it 10x bigger, ignore resource for now" |
| Pragmatist | Claude Sonnet / GPT-4o structured | None hoặc light code execution | "MVP scope, 2-week constraint, existing team skill" |
| Contrarian | Grok 4 (real-time + X search) | Web/X search | "What's the worst realistic case? What's the sacred cow nobody questions?" |
| User Proxy | Claude Haiku/Sonnet (empathy) | None | "Talk to 5 real users in your head. What would they actually complain about in week 1?" |
| Time Traveler | Grok 4 (search advantage) | Web search + "2-3 years later" framing | "Assume this shipped. What actually happened in 2028?" |
| Synthesizer | Claude Sonnet 4.6 hoặc Grok 4 | Read all 5 + user bet | "Pattern match + emergent insight + explicit blind spots of this user over time" |

**Key decisions**:
- **1-2 providers max** cho v1 (Anthropic + xAI). Ưu tiên Anthropic cho reasoning chất lượng cao + structured output; xAI cho Contrarian/Time Traveler + search.
- **Parallel thật sự**: Dùng Promise.all + individual streaming (5 SSE hoặc 1 orchestrator chunked response). UX parallel stream quan trọng hơn model diversity.
- **Cross-reaction**: Làm **Round 2 optional** (user click "Let them argue"). Không default. Round 1 song song + synth nhanh là đủ cho 80% value.
- **Structured output**: Bắt buộc mọi agent trả JSON {headline, body, risks, assumptions, score?} để synthesis dễ parse + UI đẹp.
- **Synthesizer có memory**: Nếu user login (sau MVP), synth đọc "past 5 sessions bias profile" và gọi ra blind spot cụ thể của user này.

**Rejected**: Multi-vendor 6-model parallel cho v1. (Lý do: complexity/cost > marginal diversity gain. Build sau khi có 100+ paying users và rõ họ cần "edge" từ model X.)

---

## 3. UI/UX — Canvas vs Reality

**Vision Claude**: Spatial canvas (React Flow), 5 cards stream parallel, lines connect khi cross-react, click expand, highlight → fork thread, "Find the signal" node, export beautiful map.

**Vấn đề thực tế**:
- **Reading**: Perspective text thường 150-300 words mỗi advisor. Trên node nhỏ hoặc card co lại → user phải click open hết lần lượt → flow đứt.
- **Mobile**: 70%+ early users có thể test trên mobile (indie founder hay nghĩ trên điện thoại). Canvas pan/zoom + text dài = nightmare.
- **Friction đầu**: User paste problem (thường 1-3 câu) → mong đợi kết quả ngay. Bất kỳ "học cách dùng canvas" nào cũng làm drop-off.
- **Value ở đâu**: Value chính là **đọc 5 góc + thấy synthesis + thấy bias của mình**. Không phải "kéo thả node" hay "vẽ connection".
- **Export**: Cái user share được là **ảnh đẹp** (perspective map như infographic), không phải live canvas link (trừ khi collaborative mode sau).

**Recommendation cho flow thực**:

MVP UI (ưu tiên):
1. **Input**: Clean textarea + "Problem type" selector (technical / product / org / personal decision) + "Urgency" (5min / 30min / deep). + "My initial take (optional)" — cái này dùng để bet + surprise scoring.
2. **Parallel reveal**: 5 cards (grid 5-col desktop, stack mobile) xuất hiện gần như đồng thời, từng card stream text (hoặc skeleton + full khi xong). Mỗi card có: emoji/icon + tên advisor + 1-line stance + body ngắn (expandable) + "key assumption" chip.
3. **Bet mechanic**: Trước khi stream xong (hoặc ngay sau input), modal nhỏ hoặc bar: "Bạn nghĩ mình đang nghĩ như ai nhất?" → 5 nút (có thể multi-select hoặc single + confidence). Ghi lại trước khi user thấy output.
4. **Synthesis**: Sau 5 cards, 1 panel lớn hơn "Signal" (Synthesizer) với: patterns, emergent insight, "Your blind spots in this session", "What you likely missed", 1-2 câu "If you only do one thing...".
5. **Reflection**: "Your call" — user note nhanh "Tôi chọn perspective nào để đi tiếp?" + "Surprise level". Hệ thống update profile.
6. **Share**: Nút "Export perspective map" → generate ảnh đẹp (satori / Vercel OG or client html2canvas + nice template) + copy link (session public read-only hoặc snapshot). Card chia sẻ có "Thinking DNA snapshot" mini + link back.

**Canvas chỉ sau** (P3+):
- Nếu user retention cao và feedback "tôi muốn xem relationship giữa các góc nhìn" hoặc "muốn fork 1 thread".
- Lúc đó mới cân nhắc React Flow hoặc custom SVG canvas nhẹ (không full library nếu tránh được).
- Hoặc "map view" như read-only visualization của synthesis graph (nodes = advisors + signals, edges = agreements/disagreements).

**Friction cần loại bỏ cho MVP**:
- Không bắt user "học 6 modes" ngay. Mặc định 1 mode (Storm hoặc Build) + selector mode ở góc (nhỏ).
- Session modes: Ưu tiên **Storm** (parallel fast) và **Decide** (A vs B) cho MVP. Bỏ Stress Test / Socratic / Build cho sau (chúng chỉ khác system prompt + synthesis instruction).

**Polish quan trọng hơn canvas**:
- Beautiful typography cho long text (Be Vietnam + good line-height).
- "Key assumption" / "Risk" được highlight riêng (chip hoặc callout) để scan nhanh.
- "Compare to my initial take" (nếu user paste initial) — diff hoặc highlight phần nào agent đồng ý/khác.

---

## 4. Game Mechanic — "Thinking DNA" + Bet

**Bet trước khi thấy**: Hay. Tạo skin in the game + curiosity. "Tôi đoán mình 70% Pragmatist" rồi thấy thực tế → dopamine + self-reflection.

**Profile over time**: Đây là phần có potential thành "moat cảm xúc". Nếu sau 10 sessions user thấy "bạn 42% Contrarian, blind spot rõ nhất là User Proxy (bạn hay bỏ qua cảm xúc adopter đầu tiên)", và họ **thấy quyết định sau này tốt hơn**, họ sẽ quay lại.

**Vấn đề hiện tại**:
- Signal noisy: LLM đánh giá "bạn nghĩ như ai" dựa trên text user paste + response. Không phải ground truth.
- Không có "outcome tracking": user có thực sự áp dụng perspective không? Quyết định có tốt hơn không? (Hard, nhưng có thể hỏi "1 tuần sau, bạn vẫn nghĩ góc nhìn nào đúng?")

**Cải tiến / thay thế tốt hơn**:
- **Hybrid rating**: Sau synthesis, user chọn "Advisor nào giúp tôi nhất?" (không phải "tôi nghĩ như ai"). Kết hợp với "initial take" để compute surprise + alignment.
- **Blind spot callout mạnh**: Synthesizer (và sau này profile model) chủ động nói "Dựa trên lịch sử 7 session của bạn, bạn thường under-weight User Proxy. Lần này 4/5 advisors đều nhắc user friction — bạn có thấy không?"
- **Streak + insight unlock**: "Bạn đã train được 3 blind spot. Unlocked: 'Pre-mortem' mode." (nhẹ, không game hóa quá).
- **Alternative mechanic mạnh**: "Adoption log" — 1 tuần sau, user paste lại problem + "kết quả thực tế" + "góc nhìn nào mình đã dùng". Hệ thống so sánh prediction vs reality. Cái này mới thực sự "train thinking".

**Verdict**: Giữ bet + profile. Nhưng **đừng để bet là gate** (user phải bet mới xem kết quả). Làm optional hoặc "quick pick" để không chặn flow. Profile là feature P1, nhưng phải có data thật (ít nhất 5-7 sessions/user) trước khi show "DNA" — nếu không user sẽ thấy meaningless.

---

## 5. MVP Scope — 1 dev, 2-3 tuần, validate or kill

**Mục tiêu validate**: 
- Có người dùng paste real technical/product problem >1 lần?
- Sau khi dùng, họ có thấy "tôi bỏ qua góc nhìn X" không? (self-report)
- Họ có share artifact không? (proxy cho delight + viral)
- Cost/session có kiểm soát được dưới $0.3-0.5 không?

**Stack khuyến nghị (lean)**:

- **Framework**: Next.js 15 (App router) — vì shareable OG image, streaming, Vercel deploy dễ, và nếu sau muốn thêm auth (Clerk) thì sẵn. (Nếu cực lean: có thể Vite + Express, nhưng Next cho fullstack 1 repo tốt hơn.)
- **No React Flow, no heavy canvas lib**. Dùng CSS grid + framer-motion nhẹ cho card animation + 1 custom SVG cho "connection" giữa 5 cards nếu muốn (chỉ line đơn giản).
- **Auth**: **Bỏ hoàn toàn cho v1**. Session = UUID, lưu tạm server (Vercel KV hoặc Neon free tier) hoặc even client + share link với signed snapshot. Magic link / Clerk chỉ khi có user trả tiền hoặc muốn longitudinal profile thật.
- **DB**: Vercel KV (rate limit + ephemeral session) hoặc Neon Postgres (nếu cần query profile sau). Bắt đầu KV.
- **Streaming**: 1 API route orchestrator. Gọi 5 agents song song (Promise.all). Mỗi agent stream về client qua 1 EventSource hoặc 1 combined stream với delimiter. Hoặc đơn giản: gọi non-stream, đợi tất cả xong (với fast model <6-8s), render 1 lúc — vẫn nhanh hơn user tự prompt 5 lần.
- **Provider**: Anthropic primary (Sonnet cho chất lượng, Haiku cho nhanh). xAI cho 1-2 agent cần search (Grok). 1 key Anthropic + optional xAI.
- **Share image**: Satori (Vercel OG image gen) hoặc html-to-image lib. Template đẹp (space/HUD hoặc clean "prism map" style) với 5 mini cards + synthesis + user bet result.
- **No mode phức tạp**: Mặc định "Storm" (parallel fast + synth). Có 1 dropdown nhỏ "Mode" với 2-3 option (Storm, Decide A/B, Stress-test lite). Mỗi mode chỉ khác system prompt + synth instruction.

**Phases thực tế (2-3 tuần, part-time hoặc full 1 dev)**:

**Week 1 (Foundation + core loop)**:
- Next.js project + Tailwind + basic layout (dark, clean, accent teal/purple).
- Input form + "Run Prism" → POST /api/session.
- Orchestrator: 5 hard-coded personas (prompts trong code, versioned), gọi Anthropic song song (structured output JSON).
- UI: 5 cards grid, stream or batch render, basic synthesis panel.
- Bet bar: chọn advisor trước khi kết quả (hoặc ngay sau input).
- Session lưu (KV) + shareable URL (read-only).
- Cost log (token count + rough $).
- **Deliverable**: User paste problem → thấy 5 góc + synthesis + bet result. Chạy được <10s end-to-end.

**Week 2 (Polish + reflection + share)**:
- Structured output + nice card UI (stance, body, 2-3 chips: assumption/risk/why this matters).
- Synthesis với "your blind spot in this session" + "how this differs from your initial take" (nếu có).
- Export PNG (satori template với branding "Prism by [yourname]" hoặc generic).
- Basic profile page (nếu session có user id giả): list past sessions + "current DNA estimate" (simple % based on bet + self-rate).
- 2 modes: Storm + Decide (A vs B input).
- Error states, rate limit (IP + simple), loading skeletons.
- **Deliverable**: End-to-end flow có thể share được. 1 người lạ dùng được mà không cần giải thích nhiều.

**Week 3 (Validate + instrument)**:
- Logging (session count, avg cards read, bet vs self-rate alignment, export count, time to first insight).
- "After 1 week" email or in-app nudge: "Bạn đã áp dụng góc nhìn nào? Kết quả ra sao?" (giả manual hoặc form).
- Cost dashboard (admin view).
- Prompt iteration (chạy 10-20 real problems từ user/dev network, chỉnh persona cho "edge" rõ ràng).
- Landing page đơn (1 screen: value prop + "try free" → input). Không cần marketing site.
- **Deliverable**: 20-50 real sessions từ 10-20 users khác nhau. Dữ liệu để quyết "continue / pivot / kill".

**Cut list (không làm trong 3 tuần)**:
- Cross-reaction round (làm optional button "Let advisors argue" nếu thừa thời gian).
- Full 5 modes.
- React Flow / spatial.
- Clerk / real auth / accounts.
- Multi-provider cho mọi agent.
- Mobile canvas (mobile chỉ stack cards).
- Public gallery / viral feed.
- Payment.

**Definition of "validated" để tiếp tục** (user quyết):
- ≥15 users paste ≥2 problems thực.
- ≥40% self-report "thấy góc nhìn tôi thường bỏ qua".
- Avg cost < $0.40/session (với cache hoặc batch).
- ≥5 người share artifact (hoặc nói sẽ share nếu đẹp).

---

## 6. Missing trong Analysis của Claude

- **Cost & pricing reality**: Không chỉ "dùng model X", mà phải model selection matrix + caching + truncation + hard cap + user quota. Proposal không có.
- **Quality bar & eval**: Làm sao biết session "tốt"? Không có ground truth. Cần human eval (bạn + 5-10 founder) + rubric (coverage, actionability, surprise, non-obviousness). Không có plan cho iteration prompt.
- **Privacy / sensitivity**: Technical decision có thể chứa IP, roadmap, competitor analysis. User paste vào Prism = data đi qua Anthropic/xAI. Cần clear warning + option "local only" (chạy local model sau) hoặc "ephemeral, không lưu".
- **Onboarding to thinking, không chỉ output**: Tool mạnh nhất khi user **học cách tự hỏi những câu hỏi của 5 advisors**. Cần "replay" hoặc "what would Expansionist ask?" mini mode. Proposal tập trung show output, ít train skill.
- **Distribution & activation**: Ai biết Prism tồn tại? Indie hacker communities (X, Reddit r/startups, VN group), founder newsletter, "post your decision DNA". Landing page phải có 3-5 ví dụ real (anonymized) để user thấy value trước khi paste.
- **Mobile-first**: Proposal không nhắc mobile. Với founder, mobile là primary thinking device nhiều khi.
- **Outcome tracking**: "Thinking DNA" chỉ có ý nghĩa nếu liên kết với **kết quả thực tế** của quyết định. Không có loop này thì chỉ là personality test vui.
- **Legal / positioning**: Nếu Prism nói "bạn nên làm X", và user làm theo rồi fail, có liability? Position rõ "perspectives, not advice". "Synthesizer" không được phép đưa recommendation cụ thể (chỉ insight + pattern + câu hỏi).
- **Churn reason**: Sau 4-5 sessions, user có thể internalize 5 frames và tự làm (hoặc prompt 1 model với checklist cá nhân). Prism cần trở thành "gym cho tư duy" (có bài tập, progressive challenge, community) chứ không chỉ "máy xay góc nhìn".

---

## 7. Architecture Decision Record (cho Prism)

### ADR-P001 — Model Strategy: Prompt diversity + targeted tool augmentation thay vì multi-vendor model mix

**Date**: 2026-06  
**Status**: Proposed (chờ user approve)

**Quyết định**: v1 chỉ dùng 1-2 providers (Anthropic primary, xAI cho agent cần search). Mọi "advisor" là cùng model (Sonnet hoặc tương đương) với system prompt cực mạnh + structured output. Chỉ Contrarian/Time Traveler được augment search tool.

**Lý do**:
- Evidence 2025-2026: multi-agent debate chất lượng thấp hơn kỳ vọng vì context passing yếu (Cognition, production LangGraph/CrewAI case).
- Perspective diversity đạt được chủ yếu qua **role prompt + explicit critique instruction + user initial take injection**.
- Giảm surface area ops (key, rate, latency, error) từ 6 xuống 2.
- Grok real-time + X search là unique advantage — chỉ dùng cho agent cần (Contrarian/Time Traveler), không phải toàn bộ.

**Trade-off**:
- Mất "model personality" surface (Claude lịch sự vs Grok trực tiếp). Bù lại bằng prompt "voice" riêng cho từng advisor.
- Synthesizer không dùng "siêu model" (Opus). Nếu cần, có thể A/B 1-2 tuần sau khi có data.
- Ít "demo wow" cho người thích multi-model story. Nhưng user thật quan tâm kết quả, không phải architecture.

**Rejected**:
- Full 6-model parallel như proposal ban đầu (cost × latency × fragility > gain).

### ADR-P002 — UI Foundation: Card grid + synthesis panel thay vì spatial canvas cho MVP

**Date**: 2026-06  
**Status**: Proposed

**Quyết định**: MVP dùng 5 cards (grid responsive) + 1 synthesis panel lớn. Stream parallel. Export image đẹp. Canvas / React Flow chỉ xem xét sau khi có signal từ 50+ users rằng họ cần spatial relationship view.

**Lý do**:
- Core value = đọc nhanh 5 góc + thấy synthesis + thấy bias của mình. Card cho phép text đầy đủ, scan nhanh (chips), expand khi cần.
- Mobile experience quyết định activation ban đầu. Stack cards đơn giản, không pan/zoom.
- Time-to-value: user paste → 8-12s sau thấy kết quả → đọc 3-5 phút → share. Bất kỳ "học canvas interaction" nào cũng thêm friction.
- Build cost: React Flow + state management + mobile handling + connection logic + fork threads = 2-3× effort so với grid + SVG lines đơn giản.

**Trade-off**:
- Mất "wow spatial" trong pitch/demo. Bù bằng visual polish trên card (holo border, stream animation, đẹp typography, gradient accent per advisor).
- Nếu user sau này kêu "tôi muốn thấy connection giữa Expansionist và Contrarian", mới build view map (có thể chỉ read-only).

**Rejected**:
- React Flow + full canvas cho v1 (premature; risk highest drop-off ở onboarding).

### ADR-P003 — Auth & Persistence: Ephemeral + share link cho v1, longitudinal profile sau

**Date**: 2026-06  
**Status**: Proposed

**Quyết định**: Không auth (Clerk hay tự roll) trong 3 tuần đầu. Mỗi session có UUID. User có thể "claim" session bằng cách paste email hoặc sau này login. Profile "Thinking DNA" build từ anonymous session + optional user id. Share = public snapshot URL (read-only, snapshot at share time).

**Lý do**:
- Friction auth làm giảm thử nghiệm ban đầu (indie founder ghét sign up để "thử 1 ý tưởng").
- Validate value trước khi build account system, billing, data model phức tạp.
- Longitudinal vẫn có thể: session có "fingerprint" (IP hash + browser) hoặc user paste "my handle" để group.

**Trade-off**:
- Không có "my history" đẹp cho user lần đầu. Họ phải tự lưu link. (Có thể làm "recent sessions" localStorage + claim sau.)
- Không thể show "bạn 42% Contrarian over 12 sessions" ngay. Phải sau khi user có 5+ sessions và claim.

**Rejected**:
- Clerk + full user account cho MVP (scope creep, chặn test nhanh).

---

## 8. MVP Checklist (Cụ thể, ưu tiên, có done criteria)

**P0 — Core loop (tuần 1, phải chạy được)**
- [ ] Next.js 15 project, clean dark UI (tokens: bg #0a0c14, accent teal/purple/gold, font stack tốt).
- [ ] 5 advisor prompts (JSON hoặc TS const) với distinct voice + constraints. Versioned.
- [ ] 1 orchestrator endpoint `/api/prism/run` nhận `{problem, initialTake?, mode?, lang?}`.
- [ ] Gọi 5 agents parallel (Promise.all, structured output zod/JSON mode). Fallback nếu 1 agent fail.
- [ ] UI: input + run button → loading state (5 skeletons) → 5 cards render (có stream hoặc batch).
- [ ] Bet UI: trước hoặc ngay sau run, user pick "tôi nghĩ như ai" (single hoặc multi). Lưu với session.
- [ ] Synthesis panel render sau 5 cards (có "blind spot this session").
- [ ] Basic rate limit + cost log (token + est $ per session).
- [ ] Error boundary + "try again" không mất input.
- **Done**: 1 người paste problem kỹ thuật thật → thấy 5 góc + synth + bet result trong <15s. Không crash.

**P1 — Usable & shareable (tuần 2)**
- [ ] Card polish: icon/emoji per advisor, 1-sentence stance, body, 2-3 chips (assumption, risk, why it matters), "expand" cho full.
- [ ] "Compare to my initial take" (nếu có): highlight overlap / conflict.
- [ ] Export: 1 nút → generate PNG đẹp (satori template: 5 mini cards + synth + "Prism session" + bet result) → download + copy link.
- [ ] Share URL: public read-only view của session (snapshot JSON). OG image cho link share.
- [ ] 2 modes: Storm (default), Decide (2 textareas A/B + 5 advisors vote hoặc compare).
- [ ] Basic profile stub: nếu user "save as my session" (local + optional handle), list past 3-5, simple % bar (dựa bet + self-rate).
- [ ] Mobile: stack cards, text readable, no horizontal scroll.
- [ ] Loading states đẹp (progress per card, "agents thinking..." flavor text).
- **Done**: User có thể chạy, đọc, export ảnh, share link. 5-10 real sessions từ network. Cost < $0.50/session avg.

**P2 — Validate & instrument (tuần 3)**
- [ ] Logging (anonymized): sessions, problems length, mode, bet alignment, cards expanded, export/share count, time from run to first share.
- [ ] "1 week later" nudge (in-app or manual): form "bạn áp dụng góc nào? kết quả? còn mù gì không?".
- [ ] Prompt iteration log: 10-20 problems test, chỉnh prompt, re-run, note improvement.
- [ ] Landing: 1-screen với 3-4 ví dụ (anonymized technical + product decision) + "Try Prism" dẫn thẳng input.
- [ ] Cost guard: hard cap tokens/response, alert nếu daily spend > $X (Vercel).
- [ ] Privacy note rõ ở input: "Session có thể được lưu để cải thiện. Không paste secret/company IP."
- [ ] Admin view (simple): list sessions + cost total (chỉ owner).
- **Done**: 20-50 sessions, ≥10 users có ≥2 runs, self-report data, cost data. Quyết định continue/pivot/kill dựa số.

**Out of scope cho 3 tuần**:
- Cross-reaction UI.
- Full 5 modes (chỉ Storm + Decide).
- Spatial canvas / React Flow.
- Real auth (Clerk), accounts, billing.
- Multi-provider cho mọi agent.
- Public feed / gallery.
- Mobile app / PWA.
- RAG trên past user sessions cho synth (chỉ rule-based profile %).

---

## 9. Risks & Mitigations (ngắn)

- **Cost overrun**: Throttle aggressive (5 sessions/IP/ngày free), cache synthesis nếu problem tương tự, cap output length, monitor daily.
- **Quality không ổn định**: Prompt guard + few-shot + structured output + human eval vòng lặp nhanh (bạn + 3-5 founder test hàng tuần).
- **User không quay lại**: Profile + "blind spot callout" + "1 week outcome log" là must. Nếu sau P2 <20% repeat rate → pivot sang "single powerful advisor + user checklist" hoặc "template for self-debate".
- **Privacy incident**: Warning rõ + ephemeral default + "delete session" button. Không train trên user data.
- **Churn sau novelty**: Xem outcome tracking. Nếu không có, Prism chỉ là personality quiz. Phải build loop "train → apply → reflect → see improvement".

---

## 10. Recommendation & Immediate Next

**Khuyến nghị**: 
- **Tiến hành lean validation** với scope pivot như trên (card grid, 1-2 providers, no canvas, no auth, 2 modes, strong instrumentation).
- 1 dev (Claude) implement theo checklist P0-P2. Grok hỗ trợ prompt engineering + review output chất lượng + cost analysis.
- Sau 3 tuần: user + team review data thật → quyết "invest thêm / kill / pivot thành single-advisor + personal prompt gym".

**Nếu user muốn full vision (canvas + multi-model + 5 modes + profile sâu)**: Nói thẳng — cần **2-3× effort** (6-9 tuần 1 dev) + burn rate cao hơn (cost test + infra). Không recommend cho phase validate.

**Next concrete steps** (sau khi user approve spec này):
1. User review + tie-break: lean MVP vs full vision? Ưu tiên user segment nào trước (indie VN, founder US, PM technical...)?
2. Grok viết prompt draft cho 5 advisors + synthesizer (với structured output schema) + 2 modes.
3. Claude spike nhỏ: Next.js + 1 endpoint + 5 cards render (có thể dùng mock response trước khi có key thật).
4. Cùng nhau chạy 5-10 real problems (của user + network) → iterate prompt 1 vòng → lock persona cho P0.
5. Update `docs/decisions.md` (ADR-P00x) nếu proceed.

---

**Cuối cùng**: Prism có tiềm năng trở thành "mirror cho tư duy" chứ không chỉ "máy sinh góc nhìn". Muốn thành công, phải **bắt đầu cực kỳ nhỏ, đo lường sự thay đổi trong đầu user**, và chỉ mở rộng infra khi có signal retention + willingness-to-pay. Đừng để "multi-agent architecture đẹp" che mất "liệu user có thực sự nghĩ khác sau 10 lần dùng không".

File này là spec để implement, không phải pitch deck. Mọi thay đổi lớn sau P2 phải có data.

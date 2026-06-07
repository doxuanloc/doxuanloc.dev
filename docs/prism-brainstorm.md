# Prism — Brainstorm Log

> **Format**: Versioned ideas + open questions. Dùng làm nguồn chung cho Grok chat, Grok CLI, Claude.  
> **Cập nhật**: 2026-06-07  
> **Status**: Brainstorming phase — chưa commit build.

---

## Core Problem

Engineer khi ra quyết định kỹ thuật quan trọng thường chỉ nhìn từ 1-2 góc quen thuộc.  
Confirmation bias + status quo bias + tool bias luôn hiện diện.  
Không có công cụ nào giúp **thấy bias của chính mình** + **training multi-perspective thinking** theo thời gian.

---

## Idea v0.1 — "Multi-advisor parallel engine" *(nguồn gốc)*

**Concept**: User paste bài toán → AI triệu tập 5 advisor với lens khác nhau → trả lời song song → tranh luận → synthesis.

**5 Advisors**:
- 🔵 Expansionist — làm ý tưởng lớn hơn, táo bạo hơn
- 🟡 Pragmatist — MVP thực tế, resource constraint
- 🔴 Contrarian — phá assumption, worst-case
- 🟢 User Proxy — con người thực sự muốn gì
- 🟣 Time Traveler — nhìn từ 2-3 năm sau

**Game mechanic**: Trước khi thấy kết quả → user đặt cược "tôi đang nghĩ như ai?" → track pattern → "Thinking DNA" profile over time.

**Shareable**: Perspective map của từng decision → beautiful card → viral loop.

**Vấn đề phát hiện** *(Grok review)*:
- Multi-model 6 providers = complexity tax không đáng. Diversity từ prompt, không từ model.
- Spatial canvas premature → card grid đủ cho MVP.
- Retention sau novelty yếu nếu không có outcome tracking.
- Không có pricing model hay cost guardrail.

---

## Idea v0.2 — "Lean validation pivot" *(Grok CLI spec)*

**Pivot từ v0.1**:
- 1-2 providers thay vì 6 models (Anthropic primary + xAI cho agent cần search)
- Card grid thay vì spatial canvas
- No auth cho MVP — session UUID + share link
- 2 modes: Storm + Decide (A vs B)
- Strong instrumentation từ đầu (log sessions, bet alignment, export count)

**Outcome tracking** (điểm mới):
- "1 tuần sau" nudge: "Bạn áp dụng góc nhìn nào? Kết quả ra sao?"
- Prism chỉ meaningful nếu có loop: train → apply → reflect → see improvement

**MVP scope 3 tuần**:
- Week 1: Core loop (5 cards + synthesis + bet)
- Week 2: Polish + share + export image
- Week 3: Instrument + 20-50 real sessions → data để quyết continue/kill

**Validated criteria**:
- ≥15 users, ≥2 problems thực
- ≥40% thấy "góc nhìn mình thường bỏ qua"
- Cost < $0.40/session
- ≥5 người share artifact

---

## Open Questions (chưa có câu trả lời)

### Product
- [ ] **Primary user thật sự là ai?** Indie hacker? Tech lead VN/JP startup? PM kỹ thuật? Student?
- [ ] **Vertical hay horizontal?** Chỉ technical decision hay mở rộng product/org/personal?
- [ ] **Retention mechanism thật sự là gì?** "Thinking DNA" đủ hấp dẫn không sau novelty?
- [ ] **Distribution?** Kênh nào reach được primary user? X? Reddit? VN dev community?
- [ ] **Pricing?** Freemium (N sessions/ngày)? Pay-per-use? Subscription?

### UX
- [ ] **Onboarding?** User đầu tiên paste gì? Cần example hay blank canvas?
- [ ] **Session modes:** Có cần nhiều hơn Storm + Decide không? Socratic mode có real demand?
- [ ] **Mobile flow?** Stack cards đơn giản hay có gì tốt hơn?
- [ ] **Share artifact?** Image card đủ không hay cần live link + embed?

### Tech
- [ ] **Cross-reaction có cần thiết?** Hay synthesis từ Round 1 là đủ?
- [ ] **Structured output schema?** Mỗi advisor trả gì ngoài body text?
- [ ] **Caching strategy?** Có thể cache synthesis của problem tương tự không?
- [ ] **Rate limit?** IP-based đủ không hay cần session fingerprint?

### Business
- [ ] **Build trong repo mới hay tách hoàn toàn?**
- [ ] **Stack?** Next.js 15 hay Svelte? Vercel hay Cloudflare?
- [ ] **Timeline thực tế?** Part-time hay full focus?

---

## Directions chưa explore

Những hướng chưa được thảo luận sâu — để ngỏ cho Grok chat brainstorm:

### D1 — "Prism as thinking gym" (not just tool)
Thay vì "dùng khi cần", Prism là **daily practice**. Daily challenge, streak, progressive difficulty. Gamified như Duolingo nhưng cho engineering judgment.

### D2 — "Collaborative Prism" (team mode)
Nhiều người cùng brainstorm 1 topic. Mỗi người được assign 1 advisor lens (hoặc pick). AI là facilitator. Kết hợp human perspective + AI expansion. Async hoặc realtime.

### D3 — "Prism for specific verticals"
Không general — chuyên cho 1 domain: AI product decisions, startup fundraising decisions, system architecture. Advisor personas được tune cực sâu cho domain đó.

### D4 — "Prism as journaling"
Ghi lại quyết định theo thời gian. Không chỉ brainstorm — còn review lại "6 tháng trước mình đã think như thế nào, kết quả ra sao". Decision journal với AI reflection layer.

### D5 — "Prism as interview prep"
Dùng để luyện system design interview. 5 advisors = 5 kiểu interviewer khác nhau. Feedback + bias profile giúp candidate biết "mình hay bỏ qua scalability, mạnh ở pragmatics".

### D6 — "Anti-Prism" (single hyper-critic)
Thay vì 5 balanced advisors, chỉ có 1 agent cực kỳ skeptical. Mục tiêu: stress-test ý tưởng trước khi present. "Convince the harshest critic."

### D7 — "Prism OS" (ambient thinking layer)
Không phải app mở khi cần. Là browser extension hoặc IDE plugin. Khi user viết PR description, design doc, Slack message quan trọng → Prism inject các góc nhìn vào bên cạnh. Ambient advisor, không cần switch context.

---

## Decisions đã lock (từ Grok CLI spec)

| # | Decision | Lý do |
|---|----------|-------|
| ADR-P001 | Prompt diversity + targeted tool thay vì multi-vendor model | Complexity tax > marginal gain |
| ADR-P002 | Card grid thay vì spatial canvas cho MVP | Onboarding friction + mobile |
| ADR-P003 | No auth, ephemeral + share link cho v1 | Validate value trước infra |

---

## Tham khảo

- `docs/prism-spec.md` — Grok CLI full product spec + ADRs
- `docs/ai-integration-spec.md` — AI integration plan cho portfolio (context riêng, tách biệt)
- `docs/home-implementation-spec.md` — Home UI renewal (portfolio, không liên quan Prism)

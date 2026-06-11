# Context for Deep Essays: Voice Summarize + Voicebot Pipelines

> Extracted for writing "Agentic Governance" and "Grok x Claude Portfolio Pipeline" essays with real production depth.
> Source: ECOSYSTEM.md, amazon-connect-voice-summarize docs, auto-call README, .claude memory (as of 2026-06).
> Focus on governance patterns, orchestration, multi-model routing, human-in-loop, cost/reliability, data contracts — to generalize for Step Functions + AgentCore and multi-AI content pipeline.

## 1. Voice Summarize Pipeline (Core Real Experience)

**Pain Point (before):**
- IS/FS calls required manual QA review after every call.
- Cost: ~$20,000/month labor + external APIs (~$572/mo for STT/diarization/summarize).
- Volume: ~6,000 audio files/month (150-200/day), ~4,500 IS + 1,500 FS.
- No scalable insights for improving Autocall, OSM scoring, or agent performance.

**Solution (Production since ~2025, major refactor April 2026):**
- Full self-hosted ML pipeline on SageMaker (no ElevenLabs, no Pyannote).
- End-to-end: Audio ingestion (Amazon Connect auto + FS manual upload) → STT + Diarization (self-hosted) → Batch Summarization + Structured Extraction (Gemini) → Data Warehouse (S3 Tables Iceberg) → Dashboard + Feedback loop.
- Real cost: **$77/month** (87% reduction). Payback ~1 month.
- Processing: ~35s/file avg, 99.7% success, 200+ files/day capacity.

**Detailed Flow & Governance-Relevant Patterns:**

1. **Ingestion & Trigger (decoupled, reliable)**
   - S3 (CallRecordings/ for Connect, AudioUploads/{offer_id}/ for FS).
   - S3 Event Notifications → SQS AudioQueue (with DLQ, visibility timeout).
   - STT Trigger Lambda validates offer_id (CRM), invokes SageMaker async endpoint.
   - Async for long-running (no API Gateway timeout issues).

2. **Self-Hosted STT + Diarization (control + cost)**
   - SageMaker ml.g5.2xlarge (A10G), PyTorch 2.3 + Python 3.11 stable.
   - Whisper Large-v3 (int8_float16 quantized, faster-whisper) for STT: segments with timestamps.
   - NeMo TitaNet + NME-SC for diarization (speaker embeddings + clustering, on-device, no external API).
   - Merge in Lambda: assign speakers, format "HH:MM:SS - speaker N: text".
   - Output to S3 + SNS notification.
   - **Governance pattern**: Self-host for cost control and no vendor lock. Fallbacks, validation of output format (anti-fabrication: check timestamp count vs original).

3. **Batch Summarization + Cleaning (efficiency + reliability)**
   - SummarizeQueue (SQS, batch size 10, max batch window 30s).
   - Audio Batch Worker Lambda (up to 15min timeout, X-Ray tracing).
   - Clean transcript first (remove fillers, fix speaker attribution errors with Gemini, anti-hallucination rules).
   - Batch prompt: 1 system prompt + 10 transcripts (90% token reduction vs 100 individual calls).
   - Different prompts per persona:
     - IS (Inside Sales): sentiment (1-10), cross-sell asked/timing/outcome, objections, call outcome.
     - FS (Field Sales): visit summary, trade-in items/value, policy compliance (Yes/No/Partial), customer concerns, next steps.
   - Partial failure handling: report batch item failures, failed items go back to queue (idempotent safe?).
   - Save summaries to S3 (CallSummaries/{offer_id}/...).

4. **Structured Extraction + Data Warehouse (contract + analytics)**
   - S3 event → Parser Queue → S3 Table Parser (Docker Lambda for heavy deps).
   - Gemini 2.5 Flash "thinking mode" for high-accuracy structured output (Pydantic schemas enforced).
   - Two tables in S3 Tables (Iceberg, ACID, schema evolution, queryable by Athena/PyIceberg/Spark):
     - inside_sales (16 fields): CallId, OfferId, AgentName, Date, Duration, Sentiment (1-10), CrossSell_IsAsked, CrossSell_StatusLabel ("Accepted"/"Rejected"/...), Policy? etc.
     - field_sales (17 fields): similar + Category (Initial/Follow-up/Closing), Trade_Of_Used_Goods, Policy, etc.
   - Route by call_type (IS/FS).
   - **Key governance**: Type-safe schemas from the start (Pydantic). 100% valid JSON, no regex parsing hell. Data lineage from raw audio → transcript → summary → structured row. Enables BI queries (cross-sell rate by agent, sentiment trend, policy compliance by FS, trade-in conversion by category).

5. **Human-in-the-Loop & Feedback (production reality)**
   - Dashboard (Next.js frontend): query S3 Tables, view transcripts/summaries, admin edits (delete/append pattern for corrections).
   - Feedback API: users flag/edit (e.g., wrong speaker, missing info) → stored for future LoRA fine-tuning.
   - Admin can correct in UI.
   - This is the "compensation" and learning loop: errors in STT/diarization/summary are caught by humans and fed back.
   - **Governance insight**: Even with 95%+ accuracy, you design for the 5% — human review path, audit trail, data for model improvement. Not "set and forget".

**Production Hardening & Patterns (directly relevant to Agentic Governance):**
- **Orchestration/Decoupling**: Heavy use of SQS for async, batching, partial failures, DLQ everywhere (100% coverage). No lost messages. Visibility timeout = Lambda timeout + buffer to prevent duplicate processing.
- **Idempotency**: Job tracking in DynamoDB (status, progress, result, TTL). Async pattern (202 Accepted + poll) to handle long jobs without client retries causing dups. Keys like offer_id + timestamps for dedup.
- **Retries & Compensation**: Auto-retry (3x), DLQ for manual. For summarization failures: return to queue. Human corrections act as "compensation" or override.
- **Multi-Model Routing (analogous to Grok/Claude)**: Self-hosted Whisper/NeMo (cost/control for heavy audio) + Gemini for summarization/extraction (reasoning). Batch for efficiency. "Thinking mode" for hard extraction.
- **Observability**: X-Ray tracing end-to-end (S3 → Lambda → SageMaker → SQS → ...). CloudWatch metrics/alarms (errors, DLQ, cold starts). Annotations for function, record_count, offer_id.
- **Cost & Scale Reality**: Real numbers (from $572 + $20k labor to $77). Batch 10x efficiency. Self-host SageMaker vs API. Volume-based (200/day).
- **Data Contracts**: Strict schemas (Pydantic + S3 Tables). Separation: raw audio, formatted transcript, summary text, structured rows. Enables downstream (dashboard, LoRA, insights for Autocall/OSM).
- **Human Feedback as Core**: Not afterthought. Feedback collection → training data. Admin tools for corrections. This is the "governance" layer for LLM outputs in production.
- **Failure Modes Addressed**: Speaker attribution errors (LLM correction + future voice profiles), hallucinations (anti-fab validation on timestamps), missing offer_id (retry with delay), cold starts (provisioning?), concurrent (batch handling).
- **Evolution**: From monolithic to microservices (split transcription-parser into query/admin/feedback for security/isolation/scaling). From external APIs to self-hosted. From per-file to batch. From simple storage to Iceberg lakehouse.

**Voicebot (amazon-connect-auto-call / v-voicebot):**
- Inbound voicebot for customer interactions (collect sales info, conversational AI).
- Part of larger Autocall system (outbound for leads, debt, reuse outreach).
- Production on separate account (real data: hundreds of registrations/sessions).
- Integrates with the buyback flow (initial contact before IS/FS).
- Challenges: 2-account split (staging vs prod data — critical for analysis, use correct profile/bucket), real customer data handling (anonymize for AI).
- Governance angle: Voicebot is early "agent" in the pipeline — routes to human IS when needed (human-in-loop), collects structured info, must be reliable for high-volume inbound. Likely evolves toward more agentic (see buyback-ai-agent using LangGraph for full buyback orchestration).
- Ties to summarize: Call recordings from voicebot/Autocall feed into voice-summarize for QA/insights → improve the bot (FAQ patterns from IS calls used for v-voicebot).

**Cross-Project Governance Lessons (for the Essay):**
- Real agentic/voice pipelines have the same problems as "demo" agentic: happy path works, but production has timeouts, hallucinations, speaker errors, missing context, human approval needs, cost explosions, data lineage gaps.
- Solutions that worked: State-machine-like decoupling (queues), batch for efficiency, self-host for control/cost, strict contracts/schemas, human feedback as first-class (not bolt-on), observability (tracing), idempotency keys, partial failure handling, data warehouse for closed-loop improvement (insights → better Autocall/OSM/bot).
- Even without literal Step Functions here, the patterns (orchestration of long-running steps, HITL with tokens/callbacks conceptually, compensation via overrides/feedback, per-step "idempotency" via offer_id + status) map directly. Future work (buyback-ai-agent, more agentic voice) will use explicit state machines like Step Functions + AgentCore for tool routing/memory/identity + workflow governance.
- Multi-AI analogy: In voice, "Grok-like" for heavy lifting (self-hosted STT/diarization on SageMaker — realtime? no, but reliable grounding on audio) + "Claude-like" for reasoning/extraction (Gemini with schemas). Routing by capability (audio vs language understanding). Shared "brain" via prompts in layers + schemas.
- The portfolio's Grok/Claude daily pipeline mirrors this: research (grounding) + execution/validation (guardrails, smallest diff, schema). The voice project shows why the guardrails + separation + feedback are non-negotiable in production.

**For Essay Depth (do not fabricate numbers or PII):**
- Use patterns: "In a production voice pipeline processing 6k calls/mo, manual QA was $20k/mo; self-hosted + batch + structured extraction dropped system cost to $77/mo while enabling analytics that improve upstream systems (Autocall, OSM)."
- "Human feedback loop was essential — even at 95%+ STT, speaker errors and ambiguities required admin overrides and data collection for continuous improvement (LoRA prep)."
- "Orchestration relied on queues for decoupling long steps (SageMaker async 15min+), batching for cost (10x token efficiency), DLQ + retries for reliability, schemas for contract enforcement across STT/summarize/extract/write."
- Tie to governance: These are the real reasons you need state machines (Step Functions), agent governance (AgentCore for memory/identity/tools), compensation flows, per-step idempotency from day 1 — not as "nice to have" but as survival requirements when money, compliance, and customer experience are on the line.
- For portfolio pipeline: The same principles (capability routing by superpower, schema as security boundary, guardrails before deploy, feedback via user edits/insights, data-driven rendering) applied to content gen make daily updates sustainable and trustworthy.

Use this to ground the essays in real, observable production trade-offs without leaking customer data or internal metrics beyond the anonymized patterns above.

**Sources (for your reference, not to commit PII):**
- ECOSYSTEM.md (cross-project)
- amazon-connect-voice-summarize/docs/* (ARCHITECTURE_SUMMARY, BUSINESS_FLOW, TECHNICAL_ARCHITECTURE, etc.)
- amazon-connect-auto-call/README + .claude memory for voicebot prod stats/account split.
- Related: buyback-ai-agent for future agentic direction.

Write the essays with this depth — show the "what demos never mention" (timeouts on long audio, speaker confusion, token cost explosions, the need for human overrides even after "95% accuracy", the closed loop from call data back to improving the call system itself).

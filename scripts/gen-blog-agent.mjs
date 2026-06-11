#!/usr/bin/env node
/**
 * gen-blog-agent.mjs — deep-dive blog + LinkedIn pipeline.
 * Separate from gen-today: produces a focused technical essay on a given topic.
 *
 * Flow: topic → Grok research → Grok thesis+blocks → validate → GIF → write → [LinkedIn]
 *
 * CLI:
 *   node scripts/gen-blog-agent.mjs --topic="RAG vs fine-tuning"
 *   node scripts/gen-blog-agent.mjs --topic="..." --linkedin    (also post to LinkedIn)
 *   node scripts/gen-blog-agent.mjs --topic="..." --dry         (validate only, no write)
 */
import { execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { generateMechanismGif, saveMechanismGif, pickMechanismBlock } from "./mechanism-gif.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const today = new Date().toISOString().slice(0, 10);

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag) => {
  const a = args.find((x) => x.startsWith(`${flag}=`));
  return a ? a.slice(flag.length + 1) : null;
};
const hasFlag = (flag) => args.includes(flag);

const topic = getArg("--topic");
const DRY = hasFlag("--dry");
const POST_LINKEDIN = hasFlag("--linkedin");

if (!topic) {
  console.error("Usage: node scripts/gen-blog-agent.mjs --topic=\"<your topic>\" [--linkedin] [--dry]");
  process.exit(1);
}

// ── Schema (reuse blog shape from content/schema.json) ────────────────────────

const fullSchema = JSON.parse(readFileSync(join(root, "content", "schema.json"), "utf8"));
const blogSchema = {
  ...fullSchema.properties.blog,
  type: "object",
  required: ["slug", "title", "excerpt", "contentMarkdown", "tags"],
};
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateBlog = ajv.compile(blogSchema);

// ── Security guardrails ───────────────────────────────────────────────────────
const SENSITIVE_TERMS = ["marketenterprise", "market enterprise", "message management tool", "confidential", "proprietary", "client data", "customer data", "production data"];
const hasSensitive = (text) => {
  const s = String(text).toLowerCase();
  return SENSITIVE_TERMS.filter((t) => s.includes(t));
};
function checkSecurity(blog) {
  const errors = [];
  const scan = (path, text) => {
    const hits = hasSensitive(text ?? "");
    if (hits.length) errors.push(`${path}: sensitive terms (${hits.join(", ")})`);
  };
  scan("title", blog.title);
  scan("excerpt", blog.excerpt);
  scan("contentMarkdown", blog.contentMarkdown);
  for (let i = 0; i < (blog.tldr ?? []).length; i++) scan(`tldr[${i}]`, blog.tldr[i]);
  for (const b of blog.blocks ?? []) {
    [b.title, b.body, b.caption].forEach((t) => t && scan(`block.${b.id}`, t));
    for (const p of b.comparison?.left?.points ?? []) scan(`block.${b.id}.left`, p);
    for (const p of b.comparison?.right?.points ?? []) scan(`block.${b.id}.right`, p);
    for (const s of b.architecture?.components ?? []) scan(`block.${b.id}.component`, s.label);
    for (const e of b.sequence?.events ?? []) scan(`block.${b.id}.event`, e.label);
  }
  return errors;
}

// ── Grok call helper ──────────────────────────────────────────────────────────

function callGrok(prompt) {
  console.log("  → calling grok...");
  const result = spawnSync("grok", ["-p", prompt], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 180_000,
  });
  if (result.error) throw new Error(`grok spawn error: ${result.error.message}`);
  const out = (result.stdout ?? "") + (result.stderr ?? "");
  return out.trim();
}

/** Extract JSON code block from LLM output. */
function extractJson(text) {
  // Try ```json ... ``` first
  const jsonBlock = text.match(/```json\s*([\s\S]+?)```/);
  if (jsonBlock) return JSON.parse(jsonBlock[1]);
  // Try first { ... } spanning multiple lines
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  throw new Error("No JSON found in output");
}

// ── Phase 1: Research ─────────────────────────────────────────────────────────

const RESEARCH_PROMPT = `Bạn là research agent cho blog kỹ thuật thuần senior.

**Chủ đề**: "${topic}"

Nhiệm vụ:
1. Tìm 3-5 nguồn thật (RFC, paper, incident report, benchmark, doc chính thức) với web_search + web_fetch.
2. Tóm tắt những điểm phi hiển nhiên (counter-intuitive), boundary condition, và trade-off thực tế mà junior dev thường bỏ qua.
3. Đề xuất 1 **thesis** sắc bén (claim có thể đúng/sai được, không phải mô tả chung chung).
4. Xác định 1 cơ chế cốt lõi cần giải thích bằng diagram.

Output format (text thuần, không JSON):
SOURCES: [list URL + 1 dòng mô tả]
COUNTER_INTUITIVE: [3-5 điểm]
THESIS: [1 câu claim sắc]
MECHANISM: [tên cơ chế + mô tả ngắn để vẽ diagram]`;

// ── Phase 2: Thesis + Blocks ───────────────────────────────────────────────────

function buildThesisPrompt(researchOutput) {
  return `Bạn là senior engineer viết deep-dive blog post.

**Research đã có:**
${researchOutput}

**Triết lý bắt buộc**: "evidence of exceptional ability" — mỗi claim phải có grounding (source/example/mechanism), không opinion chung chung.

**Yêu cầu**:
- Blog 1200-2000 từ, 4-6 H2 sections, giọng peer-to-peer (CTO/principal reader)
- Tối thiểu 1 insight phản trực giác được lập luận rõ
- TL;DR 4-6 bullets, mỗi bullet là takeaway, không phải tóm tắt câu
- Blocks bắt buộc:
  - 1 \`architecture\` HOẶC \`sequence\` block (cho mechanism GIF)
  - 1-2 block khác (callout/comparison/flow/step)
  - KHÔNG chart trừ khi có ≥3 data points cùng đơn vị
- LinkedIn post: hook = cơ chế/insight phản trực giác, 3 → kỹ thuật bullets, CTA = "full breakdown + diagrams", 2-3 hashtag kỹ thuật, ~600-900 ký tự

**Format output — JSON ONLY, no prose**:
\`\`\`json
{
  "slug": "YYYY-MM-DD-kebab-topic",
  "title": "...",
  "excerpt": "...",
  "contentMarkdown": "...",
  "tags": ["tag1","tag2","tag3"],
  "readingTimeMin": 8,
  "tldr": ["bullet1","bullet2","bullet3","bullet4"],
  "blocks": [
    {
      "type": "architecture",
      "id": "arch-main",
      "title": "...",
      "caption": "...",
      "architecture": {
        "components": [{"id":"a","label":"Component A","kind":"orchestrator"},...],
        "connections": [{"from":"a","to":"b","label":"calls","type":"sync"},...]
      }
    },
    ...more blocks...
  ],
  "linkedinPost": "..."
}
\`\`\`

Constraints: không tên công ty nội bộ, không số liệu bịa, slug bắt đầu bằng ngày ${today}.`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nBlog Agent — topic: "${topic}"\n`);

  // Phase 1: Research
  console.log("Phase 1: Research...");
  let researchOutput;
  try {
    researchOutput = callGrok(RESEARCH_PROMPT);
    console.log(`  ✓ research (${researchOutput.length} chars)\n`);
  } catch (err) {
    console.error(`  ✗ research failed: ${err.message}`);
    process.exit(1);
  }

  // Phase 2: Thesis + blocks
  console.log("Phase 2: Draft + blocks...");
  let blogData;
  try {
    const raw = callGrok(buildThesisPrompt(researchOutput));
    blogData = extractJson(raw);
    console.log(`  ✓ draft: "${blogData.title}"\n`);
  } catch (err) {
    console.error(`  ✗ draft failed: ${err.message}`);
    process.exit(1);
  }

  // Validate
  console.log("Validating...");
  if (!validateBlog(blogData)) {
    console.error("  ✗ schema errors:");
    for (const e of validateBlog.errors ?? []) console.error(`    ${e.instancePath} ${e.message}`);
    process.exit(1);
  }
  const secErrors = checkSecurity(blogData);
  if (secErrors.length) {
    console.error("  ✗ security violations:");
    for (const e of secErrors) console.error(`    ${e}`);
    process.exit(1);
  }
  console.log("  ✓ valid\n");

  if (DRY) { console.log("--dry: stopping before write."); return; }

  // Generate mechanism GIF
  const mechBlock = pickMechanismBlock(blogData);
  if (mechBlock) {
    console.log(`Generating mechanism GIF (${mechBlock.type}: ${mechBlock.title ?? mechBlock.id})...`);
    try {
      const gif = await generateMechanismGif(blogData);
      if (gif) {
        const gifPath = saveMechanismGif(blogData, gif);
        blogData.mechanismGif = gifPath;
        console.log(`  ✓ GIF → ${gifPath} (${Math.round(gif.length / 1024)}KB)\n`);
      }
    } catch (err) {
      console.warn(`  ⚠ GIF failed (${err.message}) — continuing without\n`);
    }
  }

  // Write essay
  const essaysDir = join(root, "content", "essays");
  mkdirSync(essaysDir, { recursive: true });
  const outPath = join(essaysDir, `${blogData.slug}.json`);
  const essay = {
    date: today,
    type: "essay",
    sourceTopic: topic,
    blog: blogData,
  };
  writeFileSync(outPath, JSON.stringify(essay, null, 2) + "\n", "utf8");
  console.log(`Essay written → content/essays/${blogData.slug}.json`);

  // Regenerate index
  try {
    execSync("node scripts/gen-news-index.mjs", { cwd: root, stdio: "inherit" });
  } catch {}

  // Validate full build
  try {
    execSync("node scripts/validate-content.mjs", { cwd: root, stdio: "inherit" });
  } catch (err) {
    console.warn("validate-content failed — check essay manually");
  }

  if (POST_LINKEDIN) {
    console.log("\nPosting to LinkedIn...");
    // Temporarily create a daily-like wrapper for the LinkedIn poster
    const tmpDate = `${today}-essay-${blogData.slug.slice(11, 20)}`;
    const tmpPath = join(root, "content", "news", `${today}.json`);
    const existingDaily = existsSync(tmpPath) ? JSON.parse(readFileSync(tmpPath, "utf8")) : { date: today };
    existingDaily.blog = blogData;
    writeFileSync(tmpPath, JSON.stringify(existingDaily, null, 2) + "\n", "utf8");
    try {
      execSync("node scripts/post-to-linkedin.mjs", { cwd: root, stdio: "inherit" });
    } catch (err) {
      console.warn("LinkedIn post failed:", err.message);
    }
  }

  console.log(`\n✓ Done — ${blogData.slug}`);
  console.log(`  Preview: npm run build && open dist/blog/${blogData.slug}/index.html`);
}

main().catch((err) => { console.error("Unexpected error:", err.message); process.exit(1); });

#!/usr/bin/env node
/**
 * Guardrail chống hallucination cho auto-publish.
 * Chạy TRƯỚC astro build (xem package.json). Nếu content lỗi -> exit 1 -> build fail -> KHÔNG deploy.
 *
 * Kiểm tra:
 *  - Mỗi file content/news/*.json đúng JSON Schema (content/schema.json)
 *  - news[].source là URL http(s) thật (chặn bịa nguồn)
 *  - Không trùng blog slug giữa các ngày (chống lặp)
 *  - Tên file khớp field "date"
 *  - GUARDRAIL BẢO MẬT (chặn mạnh): chặn lộ thông tin công ty trong nội dung
 *    Grok tự sinh — expUpdate là "skill snapshot", KHÔNG được chứa tên công ty/
 *    khách/dự án nội bộ, số liệu cụ thể, hay từ khoá nhạy cảm. Mỗi highlight phải
 *    có "động từ kỹ năng". Quét cả blog. Vi phạm → fail build → KHÔNG deploy.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const newsDir = join(root, "content", "news");
const schema = JSON.parse(
  readFileSync(join(root, "content", "schema.json"), "utf8"),
);

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

// ── GUARDRAIL BẢO MẬT (chặn mạnh) ─────────────────────────────────────────────
// Tên công ty / khách / dự án nội bộ — KHÔNG được xuất hiện trong nội dung auto.
// Thêm tên mới vào đây khi cần (lowercase). profile.json KHÔNG bị quét (do bạn tự duyệt).
const SENSITIVE_TERMS = [
  "marketenterprise",
  "market enterprise",
  "message management tool",
  "confidential",
  "proprietary",
  "under nda",
  "client data",
  "customer data",
  "production data",
  "internal codename",
];
// Động từ kỹ năng — mỗi highlight của expUpdate phải có ít nhất 1 (đảm bảo "skill-only").
const SKILL_VERBS = [
  "thiết kế",
  "tối ưu",
  "triển khai",
  "áp dụng",
  "xây dựng",
  "dựng",
  "cải thiện",
  "nâng cấp",
  "tích hợp",
  "làm chủ",
  "thành thạo",
  "refactor",
  "design",
  "implement",
  "optim",
  "appl",
  "build",
  "built",
  "integrat",
  "improv",
  "deepen",
  "demonstrat",
  "migrat",
  "automat",
  "configur",
  "architect",
];
// Số liệu cụ thể (đơn vị rõ) — ≥2 trong cùng 1 câu = nghi "before→after" của hệ thống thật.
const METRIC_RE = /\d+\s?(ms|µs|ns|s|%|rps|qps|gbps|gb|mb|tb)\b/gi;

const hasSensitive = (t) => {
  const s = String(t).toLowerCase();
  return SENSITIVE_TERMS.filter((term) => s.includes(term));
};
const hasSkillVerb = (t) => {
  const s = String(t).toLowerCase();
  return SKILL_VERBS.some((v) => s.includes(v));
};
const tooManyMetrics = (t) => (String(t).match(METRIC_RE) ?? []).length >= 2;

/** Quét 1 khối nội dung auto; trả về danh sách vi phạm dạng string. */
function scanSafety(file, data) {
  const v = [];
  const exp = data.expUpdate;
  if (exp && typeof exp === "object") {
    const fields = [
      ["expUpdate.summary", exp.summary],
      ...(exp.skills ?? []).map((s, i) => [`expUpdate.skills[${i}]`, s]),
      ...(exp.highlights ?? []).map((h, i) => [
        `expUpdate.highlights[${i}]`,
        h,
      ]),
    ];
    for (const [path, text] of fields) {
      if (!text) continue;
      const hits = hasSensitive(text);
      if (hits.length)
        v.push(
          `[${file}] ${path}: lộ thông tin nhạy cảm (${hits.join(", ")}) — đây là phần auto, chỉ được nêu kỹ năng chung.`,
        );
      if (tooManyMetrics(text))
        v.push(
          `[${file}] ${path}: chứa số liệu cụ thể (nghi before→after của hệ thống thật) — bỏ số, chỉ nêu kỹ năng.`,
        );
    }
    for (let i = 0; i < (exp.highlights ?? []).length; i++) {
      if (!hasSkillVerb(exp.highlights[i])) {
        v.push(
          `[${file}] expUpdate.highlights[${i}]: thiếu động từ kỹ năng (thiết kế/tối ưu/triển khai…) — skill snapshot phải mô tả NĂNG LỰC, không kể việc.`,
        );
      }
    }
  }
  // Blog do Grok viết — không được lộ tên công ty/khách.
  const blog = data.blog;
  if (blog && typeof blog === "object") {
    for (const [path, text] of [
      ["blog.title", blog.title],
      ["blog.excerpt", blog.excerpt],
      ["blog.contentMarkdown", blog.contentMarkdown],
    ]) {
      const hits = hasSensitive(text);
      if (hits.length)
        v.push(
          `[${file}] ${path}: lộ thông tin nhạy cảm (${hits.join(", ")}).`,
        );
    }
    // tldr + blocks (data-driven) cũng do Grok sinh → quét toàn bộ text fields.
    for (let i = 0; i < (blog.tldr ?? []).length; i++) {
      const hits = hasSensitive(blog.tldr[i]);
      if (hits.length)
        v.push(`[${file}] blog.tldr[${i}]: lộ thông tin nhạy cảm (${hits.join(", ")}).`);
    }
    for (let i = 0; i < (blog.blocks ?? []).length; i++) {
      const b = blog.blocks[i] ?? {};
      const texts = [
        b.title, b.body, b.caption,
        ...(b.comparison ? [b.comparison.left?.title, b.comparison.right?.title,
          ...(b.comparison.left?.points ?? []), ...(b.comparison.right?.points ?? [])] : []),
        ...(b.flow ? b.flow.steps.flatMap((s) => [s.label, s.desc]) : []),
        ...(b.step ? b.step.items.flatMap((s) => [s.label, s.body]) : []),
        ...(b.chart ? [b.chart.unit, ...b.chart.data.map((d) => d.label)] : []),
        ...(b.sequence ? [
          ...b.sequence.actors.map((a) => a.label),
          ...b.sequence.events.map((e) => e.label),
        ] : []),
        ...(b.architecture ? [
          ...b.architecture.components.map((c) => c.label),
          ...b.architecture.connections.map((c) => c.label).filter(Boolean),
        ] : []),
      ].filter(Boolean);
      for (const text of texts) {
        const hits = hasSensitive(text);
        if (hits.length)
          v.push(`[${file}] blog.blocks[${i}] (${b.type}/${b.id}): lộ thông tin nhạy cảm (${hits.join(", ")}).`);
      }
    }
  }
  return v;
}

const errors = [];
const slugSeen = new Map();

if (!existsSync(newsDir)) {
  console.log(
    "⚠️  content/news/ chưa tồn tại — bỏ qua (chưa có nội dung nào).",
  );
  process.exit(0);
}

const files = readdirSync(newsDir).filter((f) => f.endsWith(".json") && f !== "index.json");
if (files.length === 0) {
  console.log("⚠️  content/news/ rỗng — bỏ qua.");
  process.exit(0);
}

for (const file of files) {
  const path = join(newsDir, file);
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    errors.push(`[${file}] JSON không hợp lệ: ${e.message}`);
    continue;
  }

  if (!validate(data)) {
    for (const err of validate.errors ?? []) {
      errors.push(`[${file}] ${err.instancePath || "(root)"} ${err.message}`);
    }
  }

  const expectedDate = basename(file, ".json");
  if (data.date && data.date !== expectedDate) {
    errors.push(
      `[${file}] field "date"=${data.date} không khớp tên file ${expectedDate}.json`,
    );
  }

  if (data.blog && data.blog.slug) {
    if (slugSeen.has(data.blog.slug)) {
      errors.push(
        `[${file}] blog slug "${data.blog.slug}" trùng với ${slugSeen.get(data.blog.slug)}`,
      );
    } else {
      slugSeen.set(data.blog.slug, file);
    }
  }

  // Guardrail bảo mật (chặn mạnh).
  errors.push(...scanSafety(file, data));
}

if (errors.length) {
  console.error(`\n❌ Content validation FAILED (${errors.length} lỗi):\n`);
  for (const e of errors) console.error("  • " + e);
  console.error("\n→ Build bị chặn, sẽ KHÔNG deploy nội dung lỗi.\n");
  process.exit(1);
}

console.log(`✅ Content OK — ${files.length} file hợp lệ.`);

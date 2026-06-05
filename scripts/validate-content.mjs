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
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const newsDir = join(root, 'content', 'news');
const schema = JSON.parse(readFileSync(join(root, 'content', 'schema.json'), 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const errors = [];
const slugSeen = new Map();

if (!existsSync(newsDir)) {
  console.log('⚠️  content/news/ chưa tồn tại — bỏ qua (chưa có nội dung nào).');
  process.exit(0);
}

const files = readdirSync(newsDir).filter((f) => f.endsWith('.json'));
if (files.length === 0) {
  console.log('⚠️  content/news/ rỗng — bỏ qua.');
  process.exit(0);
}

for (const file of files) {
  const path = join(newsDir, file);
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    errors.push(`[${file}] JSON không hợp lệ: ${e.message}`);
    continue;
  }

  if (!validate(data)) {
    for (const err of validate.errors ?? []) {
      errors.push(`[${file}] ${err.instancePath || '(root)'} ${err.message}`);
    }
  }

  const expectedDate = basename(file, '.json');
  if (data.date && data.date !== expectedDate) {
    errors.push(`[${file}] field "date"=${data.date} không khớp tên file ${expectedDate}.json`);
  }

  if (data.blog && data.blog.slug) {
    if (slugSeen.has(data.blog.slug)) {
      errors.push(`[${file}] blog slug "${data.blog.slug}" trùng với ${slugSeen.get(data.blog.slug)}`);
    } else {
      slugSeen.set(data.blog.slug, file);
    }
  }
}

if (errors.length) {
  console.error(`\n❌ Content validation FAILED (${errors.length} lỗi):\n`);
  for (const e of errors) console.error('  • ' + e);
  console.error('\n→ Build bị chặn, sẽ KHÔNG deploy nội dung lỗi.\n');
  process.exit(1);
}

console.log(`✅ Content OK — ${files.length} file hợp lệ.`);

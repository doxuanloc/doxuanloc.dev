#!/usr/bin/env node
/**
 * Sinh nội dung hôm nay bằng Grok Build CLI (headless).
 * Grok dùng web_search/web_fetch (realtime) để quét tin công nghệ + viết blog,
 * rồi tự ghi content/news/YYYY-MM-DD.json theo schema.
 *
 * Dùng: node scripts/gen-today.mjs
 * Yêu cầu: `grok` trong PATH và đã auth (local OAuth hoặc XAI_API_KEY trong CI).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
const outFile = `content/news/${today}.json`;

// Tóm tắt profile để Grok viết đúng "chất" của chủ portfolio.
const profile = JSON.parse(readFileSync(join(root, 'content', 'profile.json'), 'utf8'));
const focus = [
  ...(profile.skills?.backend ?? []),
  ...(profile.skills?.cloud_devops ?? []),
  ...(profile.skills?.ai_ml ?? []),
].slice(0, 8).join(', ');

const schema = readFileSync(join(root, 'content', 'schema.json'), 'utf8');

// expUpdate chỉ sinh 2-3 lần/tuần (Thứ 2 / 4 / 6 UTC) để giảm áp lực nội dung & rủi ro lộ tin.
const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=CN..6=T7
const wantExp = [1, 3, 5].includes(weekday);

const expInstruction = wantExp
  ? `3. SKILL SNAPSHOT (expUpdate): viết 1 "snapshot kỹ năng" — CHỈ thể hiện NĂNG LỰC mà Lộc làm được, dạng chung & an toàn.
   - skills[]: 2-4 kỹ năng/technique (vd "RAG retrieval optimization", "AWS cost optimization", "event-driven architecture").
   - highlights[]: 1-3 câu, MỖI câu bắt đầu bằng động từ kỹ năng (Thiết kế/Tối ưu/Triển khai/Áp dụng/Xây dựng…) mô tả năng lực CHUNG.
   - TUYỆT ĐỐI CẤM: tên công ty/khách/dự án nội bộ (vd MarketEnterprise, Oikura…), số liệu cụ thể (vd "420ms→87ms"), các từ "internal/confidential/client data/khách hàng cụ thể". Diễn đạt kiểu "tôi GIỎI làm X", KHÔNG phải "hôm nay tôi làm X cho công ty".`
  : `3. KHÔNG sinh expUpdate hôm nay — đặt "expUpdate": null. (Skill snapshot chỉ cập nhật Thứ 2/4/6.)`;

const prompt = `Bạn là content-engine cho portfolio của Đỗ Xuân Lộc (AI & System Optimization Engineer; stack: ${focus}).

NHIỆM VỤ HÔM NAY (${today}):
1. Dùng web_search để tìm 3-5 tin công nghệ ĐÁNG CHÚ Ý trong 24-48h qua, ưu tiên: AI/LLM, cloud/AWS, web framework (Next.js/Astro/Node), DevOps. MỖI tin PHẢI có source URL thật (đã verify bằng web_fetch nếu cần). Tóm tắt bằng tiếng Việt, giọng riêng, KHÔNG copy nguyên văn.
2. Viết 1 blog post tiếng Việt (300-800 từ, Markdown) bàn sâu 1 chủ đề từ tin trên hoặc liên quan stack của tôi. slug dạng "${today}-tieu-de-khong-dau". Blog KHÔNG được nhắc tên công ty/khách/dự án nội bộ.
${expInstruction}

GHI KẾT QUẢ: tạo file ${outFile} đúng JSON Schema sau (KHÔNG thêm field lạ, KHÔNG markdown fence quanh JSON):
${schema}

QUAN TRỌNG: field "date" = "${today}". Mỗi news.source bắt buộc là URL http(s) có thật. Nội dung vi phạm quy tắc bảo mật ở trên sẽ bị guardrail chặn deploy. Ghi xong thì dừng.`;

console.log(`▶ Grok đang sinh nội dung cho ${today}...`);

const res = spawnSync(
  'grok',
  ['-p', prompt, '--always-approve', '--tools', 'web_search,web_fetch,read,write', '--disallowed-tools', 'run_terminal_cmd'],
  { cwd: root, stdio: 'inherit', env: process.env }
);

if (res.error) {
  console.error('❌ Không chạy được grok:', res.error.message);
  process.exit(1);
}

if (!existsSync(join(root, outFile))) {
  console.error(`❌ Grok không tạo ${outFile}. Hủy (không deploy).`);
  process.exit(1);
}

console.log(`✅ Đã tạo ${outFile}`);

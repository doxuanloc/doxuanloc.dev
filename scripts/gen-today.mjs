#!/usr/bin/env node
/**
 * Sinh nội dung hôm nay bằng Grok Build CLI (headless).
 * Grok dùng web_search/web_fetch (realtime) để quét tin công nghệ + viết blog,
 * rồi tự ghi content/news/YYYY-MM-DD.json theo schema.
 *
 * Dùng: node scripts/gen-today.mjs
 * Yêu cầu: `grok` trong PATH và đã auth (local OAuth hoặc XAI_API_KEY trong CI).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
const outFile = `content/news/${today}.json`;

// Tóm tắt profile để Grok viết đúng "chất" của chủ portfolio.
const profile = JSON.parse(
  readFileSync(join(root, "content", "profile.json"), "utf8"),
);
const focus = [
  ...(profile.skills?.backend ?? []),
  ...(profile.skills?.cloud_devops ?? []),
  ...(profile.skills?.ai_ml ?? []),
]
  .slice(0, 8)
  .join(", ");

const schema = readFileSync(join(root, "content", "schema.json"), "utf8");

// expUpdate chỉ sinh 2-3 lần/tuần (Thứ 2 / 4 / 6 UTC) để giảm áp lực nội dung & rủi ro lộ tin.
const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=CN..6=T7
const wantExp = [1, 3, 5].includes(weekday);

const expInstruction = wantExp
  ? `3. SKILL SNAPSHOT (expUpdate): viết 1 "snapshot kỹ năng" — CHỈ thể hiện NĂNG LỰC mà Lộc làm được, dạng chung & an toàn.
   - skills[]: 2-4 kỹ năng/technique (vd "RAG retrieval optimization", "AWS cost optimization", "event-driven architecture").
   - highlights[]: 1-3 câu, MỖI câu bắt đầu bằng động từ kỹ năng (Thiết kế/Tối ưu/Triển khai/Áp dụng/Xây dựng…) mô tả năng lực CHUNG.
   - TUYỆT ĐỐI CẤM: tên công ty/khách/dự án nội bộ (vd MarketEnterprise, …), số liệu cụ thể (vd "420ms→87ms"), các từ "internal/confidential/client data/khách hàng cụ thể". Diễn đạt kiểu "tôi GIỎI làm X", KHÔNG phải "hôm nay tôi làm X cho công ty".`
  : `3. KHÔNG sinh expUpdate hôm nay — đặt "expUpdate": null. (Skill snapshot chỉ cập nhật Thứ 2/4/6.)`;

const prompt = `Bạn là content-engine cho portfolio của Đỗ Xuân Lộc (AI & System Optimization Engineer; stack: ${focus}).

NHIỆM VỤ HÔM NAY (${today}):

PHONG CÁCH INSIGHT: Với mỗi tin và bài blog, bạn là người PHÂN TÍCH có quan điểm — không chỉ tóm tắt. Hãy thêm 1 câu "Góc nhìn:" cuối mỗi summary, chỉ ra ý nghĩa thực tế, xu hướng ẩn, hoặc trade-off quan trọng mà developer/engineer cần biết. Giọng thẳng thắn, súc tích, không nịnh.

1. TECH NEWS — Dùng web_search tìm 4-6 tin công nghệ ĐÁNG CHÚ Ý trong 24-72h qua.
   Ưu tiên (theo thứ tự): AI agents / LLM mới / open-source models, AI tools & developer productivity, cloud/AWS/GCP/Azure, web framework & runtime (Next.js/Astro/Bun/Node), DevOps/Kubernetes/IaC, Web3/blockchain/DeFi protocol, hardware & chip (NVIDIA/Apple Silicon/Qualcomm), startup ecosystem & product launch.
   MỖI tin PHẢI có source URL thật (dùng web_fetch verify nếu cần). Tóm tắt tiếng Việt, giọng phân tích riêng, có câu "Góc nhìn:" cuối summary. KHÔNG copy nguyên văn. Ghi vào field "news".
   QUAN TRỌNG: mỗi summary KHÔNG được vượt quá 600 ký tự (kể cả khoảng trắng). Đếm kỹ trước khi ghi.

2. BLOG POST — Viết 1 bài tiếng Việt (400-1000 từ, Markdown) bàn sâu 1 chủ đề từ tin trên hoặc xu hướng liên quan stack.
   Góc độ ưu tiên: AI agent workflow, system optimization & trade-off thực tế, emerging tech, fintech + công nghệ, Web3 & DeFi use-case thực tế, developer productivity, macro kinh tế ảnh hưởng đến công nghệ.
   Bài phải có: (a) vấn đề cụ thể, (b) phân tích sâu có góc nhìn riêng, (c) kết luận thực dụng — "nên/không nên làm gì". slug dạng "${today}-tieu-de-khong-dau". Blog KHÔNG nhắc tên công ty/khách/dự án nội bộ.

   SEO OPTIMIZATION (bắt buộc):
   - Bước 1: Dùng web_search tìm 3-5 keyword/phrase mà engineer/developer thực sự search liên quan chủ đề (ví dụ: "claude api tool use 2026", "build agentic ai python", "openai o3 vs claude cost"). Chọn keyword có search intent cao nhất.
   - Title: chứa primary keyword tự nhiên, dạng câu hỏi hoặc how-to nếu phù hợp (ví dụ: "Xây Agent Đa Bước với Claude: Trade-off Thực Tế Bạn Phải Biết").
   - excerpt (= meta description): ĐÚNG 120-155 ký tự, chứa primary keyword, trả lời rõ "bài này giải quyết vấn đề gì cho người đọc". Đếm ký tự kỹ.
   - tags[]: PHẢI bao gồm actual search terms người dùng gõ (ví dụ: "ai agent", "claude api", "llm optimization", "aws bedrock", "openai"), không chỉ generic label.
   - contentMarkdown: H2 headings dạng câu hỏi hoặc từ khóa rõ ràng (ví dụ: "## Tại sao Agent Đa Bước Thường Fail?"). Mỗi H2 trả lời 1 sub-question để tăng featured snippet.

3. FINANCE & FINTECH NEWS — Dùng web_search tìm 3-5 tin tài chính & công nghệ tài chính ĐÁNG CHÚ Ý trong 24-72h qua.
   Ưu tiên: fintech product & regulation, crypto/DeFi (Bitcoin/Ethereum/altcoin), VC funding & startup valuation (tech focus), thị trường chứng khoán tech (NASDAQ, big-tech earnings), macro kinh tế ảnh hưởng tech (Fed rate, inflation, AI investment wave), M&A & IPO tech.
   MỖI tin PHẢI có source URL thật. Tóm tắt tiếng Việt, có câu "Góc nhìn:" cuối summary phân tích tác động đến investor/builder/engineer. Ghi vào field "financeNews", mỗi item cần thêm "category" (một trong: fintech | crypto | vc-startup | market | macro).

${expInstruction}

GHI KẾT QUẢ: tạo file ${outFile} đúng JSON Schema sau (KHÔNG thêm field lạ, KHÔNG markdown fence quanh JSON):
${schema}

QUAN TRỌNG: field "date" = "${today}". Mỗi source URL bắt buộc là http(s) có thật. Nội dung vi phạm quy tắc bảo mật sẽ bị guardrail chặn deploy. Ghi xong thì dừng.`;

console.log(`▶ Grok đang sinh nội dung cho ${today}...`);

const res = spawnSync(
  "grok",
  [
    "-p",
    prompt,
    "--always-approve",
    "--tools",
    "web_search,web_fetch,read,write",
    "--disallowed-tools",
    "run_terminal_cmd",
  ],
  { cwd: root, stdio: "inherit", env: process.env },
);

if (res.error) {
  console.error("❌ Không chạy được grok:", res.error.message);
  process.exit(1);
}

if (!existsSync(join(root, outFile))) {
  console.error(`❌ Grok không tạo ${outFile}. Hủy (không deploy).`);
  process.exit(1);
}

console.log(`✅ Đã tạo ${outFile}`);

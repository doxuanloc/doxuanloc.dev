# Discovery — Portfolio cá nhân hoá (auto-update)

> Tài liệu này để **paste cho Grok** làm spec. Claude soạn phần Discovery, Grok quyết architecture.

## 1. Mục tiêu

Portfolio cá nhân tự cập nhật **Experience** và **Blog** hàng ngày, vận hành theo mô hình multi-AI:

- **Grok** = nguồn nội dung. Dùng realtime + quyền cập nhật tin công nghệ hàng ngày để viết bản tin / blog / gợi ý update exp. Xuất ra theo contract cố định.
- **Claude** = implement site, UI, pipeline ingest + auto-deploy.
- **User** = priority, value, tie-breaker.

## 2. Quyết định đã chốt (User)

| Hạng mục | Quyết định |
|----------|-----------|
| Update flow | AI tự sinh hàng ngày (Grok generate) |
| Publish mode | **Tự động đăng** (no manual approval) |
| Design | Dùng template có sẵn, customize |
| Tech stack | **Để Grok quyết** (xem mục 4) |
| Nguồn nội dung | Grok realtime tech-news + tự viết blog |

## 3. Contract Grok → Claude (đã có draft)

File: `content/schema.example.json`. Grok xuất `content/news/YYYY-MM-DD.json` mỗi ngày theo đúng schema này. 3 khối: `news[]`, `blog{}`, `expUpdate{}`.

> Grok review schema này: thiếu field gì không? (vd: `relatedLinks`, `mood`, `lang`?)

## 4. Câu hỏi cần Grok quyết (architecture)

1. **Stack**: Astro vs Next.js vs khác? Tiêu chí: content-heavy, build nhanh, deploy free, dễ render Markdown từ JSON contract.
2. **Pipeline tự động**: cơ chế nào để file content hàng ngày vào repo & auto-deploy?
   - Option A — **xAI/Grok API + GitHub Action cron**: action chạy mỗi ngày, gọi Grok API, ghi file JSON, commit, trigger deploy. (Fully auto, đúng yêu cầu "tự động đăng".)
   - Option B — Grok ghi qua webhook/endpoint riêng.
   - Option C — manual paste (fallback).
   - → Grok recommend + nêu trade-off.
3. **Hosting**: Vercel / Netlify / GitHub Pages / Cloudflare Pages?
4. **Chống hallucination** (vì auto-publish): cần guardrail gì? (vd: bắt buộc có `source` cho mỗi news item, validate JSON schema trước khi build, giới hạn độ dài).
5. **Cấu trúc trang**: Home / Experience / Blog list / Blog detail / News feed — sitemap đề xuất?

## 5. Ràng buộc

- **Security**: API key (xAI) để trong GitHub Secrets / env, KHÔNG commit, KHÔNG paste vào chat.
- Auto-publish ⇒ phải có schema validation chặn content lỗi trước khi deploy.
- Template có sẵn ⇒ ưu tiên license MIT/open-source.

## 6. Output mong đợi từ Grok

- Mini-spec: stack + sitemap + pipeline đã chọn (kèm lý do).
- Contract final (chỉnh schema nếu cần).
- ADR ngắn cho 2 quyết định lớn: stack & pipeline.

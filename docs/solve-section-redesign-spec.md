# Spec: Solve Section Redesign — "Telemetry Dossier"

> Status: APPROVED (user delegated tie-break to Claude, 2026-06-11)
> Mode: parallel độc lập (Grok "Telemetry Ledger" + Claude "Case Dossier") → synthesis
> Implementer: Claude · Design reviewer: Grok (quick-review sau implement)

## Quyết định synthesis

Lấy **layout ledger strips của Grok** + **structured data fields của Claude**. Insight then chốt:
tách field `decision` ra khỏi `approach` khiến phần `detail` còn lại ngắn đi đáng kể →
**không cần line-clamp/hover-expand nữa** — giải quyết đồng thời điểm yếu của cả 2 take:
- Grok's weakness: hover-only readers (mobile, scan nhanh) mất nội dung sau dòng 3
- Claude's weakness: 2× vertical space vì full paragraph không cắt

## Schema migration (profile.json + profile.en.json)

```json
{
  "problem":  "giữ nguyên — 1-2 câu",
  "decision": "MỚI — 1 câu: quyết định kỹ thuật then chốt + lý do chọn",
  "detail":   "MỚI — phần còn lại của approach (supporting moves)",
  "outcome":  "MỚI — 1 dòng ngắn kiểu HUD readout, observable result",
  "stack":    "giữ nguyên"
}
```

`approach` cũ bị thay bằng `decision` + `detail`. Code đọc `s.approach` phải đổi.
Fallback: nếu entry chỉ có `approach` (chưa migrate) → render như cũ (backward compatible).

## Layout

**Desktop (>680px)** — single column, 5 ledger strips full-width, không grid:

```
┌──────────────────────────────────────────────────────────────┐
│ 01 ┃  PROBLEM HEADLINE (38%)   │ ▸ Decision line (accent,600) │
│    ┃  max ~40ch, 700 weight    │ Detail text (dim, full)      │
│    ┃  ghost num bleed top      │ >> outcome readout (mono)    │
│    ┃  charge bar left rule     │ [chip] [chip] [chip]         │
└──────────────────────────────────────────────────────────────┘
```

- Grid: `[56px rail | 38% problem zone | 1fr reasoning zone]`, divider dọc mảnh giữa 2 zone
- Rail: số `01-05` mono + charge bar (giữ `data-chargeable` + `--charge` hiện có)
- Problem zone: headline 1.18rem/700, luôn visible
- Reasoning zone:
  - Decision: marker `▸` + accent color (`--sc`) + 600 weight — luôn visible, đây là "evidence"
  - Detail: 0.93rem dim, full text, KHÔNG clamp
  - Outcome: dòng mono nhỏ `>> ...` màu accent-3, kiểu HUD readout
  - Chips: footer hàng ngang, mono nhỏ

**Mobile (≤680px)**: stack dọc — num+problem band trên, decision/detail/outcome/chips dưới.

## Interaction

- KHÔNG expand/collapse — toàn bộ text luôn hiển thị
- Scroll: `data-reveal` stagger giữ nguyên; charge bar fill theo scroll (`data-chargeable`)
- Hover desktop: charge → 1.0, decision line glow nhẹ, chips border sáng accent, giữ `data-tilt` nhẹ
- `prefers-reduced-motion`: charge bar static full, không tilt, không transition

## Accent

Giữ cycle `solveAccents` hiện có qua `--sc` per strip (rule, ghost num, decision marker, chips).

## Files touched

| File | Thay đổi |
|------|----------|
| `content/profile.json` | 5 solves: `approach` → `decision`+`detail`+`outcome` |
| `content/profile.en.json` | như trên (EN) |
| `src/pages/index.astro` | markup section solve + CSS ledger strips |
| `src/lib/scroll.ts` | không đổi (5 items đã đúng) |

## Trade-offs chấp nhận

1. Vertical space ~1.5× grid cũ — đáng giá cho line-length 64-72ch và full visibility
2. Mất "five cards" colorful glance — đổi lấy triage scan dọc nhanh hơn
3. Content migration 2 file × 5 entries — one-time, Claude tự tách vì chính Claude viết approach

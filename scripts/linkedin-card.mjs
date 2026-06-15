#!/usr/bin/env node
/**
 * LinkedIn card generator — PNG (blog cover) + animated GIF (LinkedIn post).
 * PNG: dark decorative cover, saved to public/images/blog/{slug}.png (site theme).
 * GIF: animated insight card — best content block rendered as light-editorial
 * infographic, 4-frame eased reveal. Falls back to orbital pulse when the post
 * has no cover-worthy block. (docs/decisions.md 2026-06-11)
 *
 * CLI: node scripts/linkedin-card.mjs --preview  (writes tmp/ files, no upload)
 */
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = join(root, "node_modules/@fontsource");
const W = 1200, H = 630;

// ── palette ──────────────────────────────────────────────────────────────────

const CARD = {
  bg: "#04060e", bgSoft: "#0a1020",
  text: "#eef4ff", textDim: "#a3b3d1", textMute: "#697b9c",
  blue: "#5b8cff", teal: "#36d6c3", purple: "#b58cff", gold: "#f0b232",
};

const COMBOS = [
  { g1: CARD.blue,   g2: CARD.teal,   g3: CARD.purple },
  { g1: CARD.teal,   g2: CARD.purple, g3: CARD.blue   },
  { g1: CARD.purple, g2: CARD.blue,   g3: CARD.teal   },
  { g1: CARD.blue,   g2: CARD.gold,   g3: CARD.teal   },
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

function pickPalette(slug) {
  const h = hashStr(slug);
  return {
    ...COMBOS[h % COMBOS.length],
    angle: 108 + (h % 60) - 30,
    r1: 42 + (h % 18),
    r2: 62 + ((h >> 4) % 18),
    ox: 55 + (h % 20),
    oy: 30 + (h % 25),
  };
}

function genStars(slug) {
  let seed = hashStr(slug);
  function rand() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 0xffffffff;
  }
  return Array.from({ length: 40 }, () => ({
    x: Math.round(rand() * W),
    y: Math.round(rand() * H),
    size: 1 + Math.round(rand() * 1.5),
    opacity: +(0.12 + rand() * 0.3).toFixed(2),
  }));
}

function truncate(text, max) {
  if (!text) return "";
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

function truncateWords(text, max) {
  if (!text || text.length <= max) return text ?? "";
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + "…";
}

// ── fonts ─────────────────────────────────────────────────────────────────────

let _fonts = null;
function loadFonts() {
  if (_fonts) return _fonts;
  const read = (pkg, file) => readFileSync(join(FONT_DIR, pkg, "files", file));
  _fonts = [
    { name: "Be Vietnam Pro", data: read("be-vietnam-pro", "be-vietnam-pro-vietnamese-400-normal.woff"), weight: 400 },
    { name: "Be Vietnam Pro", data: read("be-vietnam-pro", "be-vietnam-pro-vietnamese-700-normal.woff"), weight: 700 },
    { name: "Tektur",         data: read("tektur",          "tektur-latin-600-normal.woff"),           weight: 600 },
    { name: "JetBrains Mono", data: read("jetbrains-mono",  "jetbrains-mono-latin-500-normal.woff"),   weight: 500 },
  ];
  return _fonts;
}

// ── element tree ──────────────────────────────────────────────────────────────

function hex(color, alpha) {
  // Append 2-char hex alpha to 6-char hex color
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return color + a;
}

function buildCardElement(blog, { avatarDataUri, palette, stars, glowFactor = 1 }) {
  const { g1, g2, g3, angle, r1, r2, ox, oy } = palette;
  const title   = truncate(blog.title ?? "", 92);
  const excerpt = truncate(blog.excerpt ?? "", 155);
  const tags    = (blog.tags ?? []).slice(0, 3);
  const kw      = blog.coverKeywords?.[0] ?? "";
  const readLabel = blog.readingTimeMin ? `${blog.readingTimeMin} MIN READ` : "";

  const orbOpacity = (0.35 * glowFactor).toFixed(2);
  const glowShadow = `0 0 ${Math.round(60 * glowFactor)}px ${hex(g1, 0.4 * glowFactor)}`;

  const el = (tag, style, children, extras = {}) => ({
    type: tag, props: { style, children, ...extras },
  });

  return el("div", {
    width: W, height: H, display: "flex", flexDirection: "column",
    position: "relative", background: CARD.bg, fontFamily: "Be Vietnam Pro",
    overflow: "hidden",
  }, [
    // nebula wash
    el("div", { position: "absolute", inset: 0,
      background: `radial-gradient(ellipse 70% 55% at 85% 15%, ${hex(g2, 0.18)}, transparent 65%)` }),
    // dot grid
    el("div", { position: "absolute", inset: 0,
      backgroundImage: `linear-gradient(${hex(g1, 0.06)} 1px, transparent 1px), linear-gradient(90deg, ${hex(g1, 0.06)} 1px, transparent 1px)`,
      backgroundSize: "24px 24px" }),
    // scan lines
    el("div", { position: "absolute", inset: 0, opacity: 0.45,
      backgroundImage: `repeating-linear-gradient(${angle}deg, transparent 0 18px, ${hex(g1, 0.05)} 18px 19px)` }),
    // orbital ring 1
    el("div", { position: "absolute", top: `${oy}%`, left: `${ox + 20}%`,
      width: `${r1}%`, height: `${r1}%`, borderRadius: "50%",
      border: `1px solid ${hex(g1, 0.28)}`, transform: "translate(-50%,-50%)" }),
    // orbital ring 2
    el("div", { position: "absolute", top: `${oy}%`, left: `${ox + 20}%`,
      width: `${r2}%`, height: `${r2}%`, borderRadius: "50%",
      border: `1px solid ${hex(g2, 0.16)}`, transform: "translate(-50%,-50%)" }),
    // central orb
    el("div", { position: "absolute", top: `${oy}%`, left: `${ox + 20}%`,
      width: "22%", height: "22%", borderRadius: "50%",
      transform: "translate(-50%,-50%)",
      background: `radial-gradient(circle at 35% 30%, ${hex(g1, Math.min(1, 0.9 * glowFactor))}, ${hex(g2, 0.55 * glowFactor)} 55%, transparent 80%)`,
      boxShadow: glowShadow }),
    // stars
    ...stars.map(s => el("div", {
      position: "absolute", left: s.x, top: s.y,
      width: s.size, height: s.size, borderRadius: "50%",
      background: `rgba(255,255,255,${s.opacity})`,
    })),
    // bottom vignette
    el("div", { position: "absolute", inset: 0,
      background: `linear-gradient(transparent 55%, ${hex(CARD.bg, 0.85)} 100%)` }),
    // HUD bracket TL
    el("div", { position: "absolute", top: 28, left: 28, width: 22, height: 22,
      borderTop: `2px solid ${hex(g1, 0.7)}`, borderLeft: `2px solid ${hex(g1, 0.7)}` }),
    // HUD bracket BR
    el("div", { position: "absolute", bottom: 28, right: 28, width: 22, height: 22,
      borderBottom: `2px solid ${hex(g1, 0.7)}`, borderRight: `2px solid ${hex(g1, 0.7)}` }),

    // ── content column ──
    el("div", {
      display: "flex", flexDirection: "column", flex: 1,
      padding: "72px 80px 0", position: "relative",
    }, [
      // eyebrow
      el("div", {
        fontFamily: "Tektur", fontSize: 13, fontWeight: 600,
        letterSpacing: "3px", textTransform: "uppercase",
        color: g2, marginBottom: 20,
      }, "BLOG · DAILY SIGNAL"),
      // title
      el("div", {
        fontSize: 48, fontWeight: 700, lineHeight: 1.15,
        color: CARD.text, letterSpacing: "-0.02em", maxWidth: 820,
      }, title),
      // accent bar
      el("div", {
        width: 120, height: 3, marginTop: 22, marginBottom: 18,
        background: `linear-gradient(90deg, ${g1}, ${g2}, ${g3})`,
        borderRadius: 2,
      }),
      // excerpt
      el("div", {
        fontSize: 21, fontWeight: 400, lineHeight: 1.45,
        color: CARD.textDim, maxWidth: 760,
      }, excerpt),
      // tag chips row
      el("div", { display: "flex", gap: 10, marginTop: 26, flexWrap: "wrap" },
        tags.map(tag => el("div", {
          fontFamily: "JetBrains Mono", fontSize: 11, fontWeight: 500,
          letterSpacing: "1.5px", textTransform: "uppercase",
          color: g1, padding: "6px 14px", borderRadius: 6,
          border: `1px solid ${hex(g1, 0.25)}`,
          background: hex(g1, 0.12),
        }, tag))
      ),
    ]),

    // keyword hint
    ...(kw ? [el("div", {
      position: "absolute", bottom: 100, left: 80,
      fontFamily: "JetBrains Mono", fontSize: 10, letterSpacing: "3px",
      textTransform: "uppercase", color: hex(g1, 0.4),
    }, kw)] : []),

    // ── bottom bar ──
    el("div", {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 72, padding: "0 80px",
      borderTop: `1px solid ${hex(g1, 0.13)}`,
      background: hex(CARD.bg, 0.6),
      position: "relative",
    }, [
      el("div", { display: "flex", alignItems: "center", gap: 14 }, [
        avatarDataUri
          ? { type: "img", props: { src: avatarDataUri, width: 36, height: 36,
              style: { borderRadius: 9999, border: `2px solid ${hex(g1, 0.55)}` } } }
          : el("div", {
              width: 36, height: 36, borderRadius: 9999, display: "flex",
              alignItems: "center", justifyContent: "center",
              fontFamily: "Tektur", fontWeight: 700, fontSize: 18, color: g1,
              border: `2px solid ${hex(g1, 0.55)}`, background: CARD.bgSoft,
            }, "L"),
        el("div", { fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 500, color: CARD.textDim },
          "doxuanloc.space"),
      ]),
      readLabel ? el("div", {
        fontFamily: "JetBrains Mono", fontSize: 14, color: CARD.textMute,
      }, readLabel) : null,
    ].filter(Boolean)),
  ]);
}

// ── render helpers ────────────────────────────────────────────────────────────

async function rasterize(element) {
  const fonts = loadFonts();
  const svg = await satori(element, { width: W, height: H, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: W } });
  const rendered = resvg.render();
  return {
    png: Buffer.from(rendered.asPng()),
    pixels: rendered.pixels, // raw RGBA Uint8Array
    width: rendered.width,
    height: rendered.height,
  };
}

async function renderFrame(blog, { avatarDataUri, palette, stars, glowFactor = 1 }) {
  return rasterize(buildCardElement(blog, { avatarDataUri, palette, stars, glowFactor }));
}

async function encodeGif(frames) {
  const { default: gifenc } = await import("gifenc");
  const { GIFEncoder, quantize, applyPalette } = gifenc;
  const gif = GIFEncoder();
  for (const { pixels, width, height, delay } of frames) {
    const pal = quantize(pixels, 256);
    const idx = applyPalette(pixels, pal);
    gif.writeFrame(idx, width, height, { palette: pal, delay, repeat: 0 });
  }
  gif.finish();
  return Buffer.from(gif.bytesView());
}

function loadAvatar() {
  const p = join(root, "public/images/avatar.png");
  if (!existsSync(p)) return null;
  return `data:image/png;base64,${readFileSync(p).toString("base64")}`;
}

// ── Story GIF — dark, narrative, one message per frame ───────────────────────

const STORY_ACCENTS = [
  { a1: "#5b8cff", a2: "#36d6c3" },
  { a1: "#36d6c3", a2: "#b58cff" },
  { a1: "#b58cff", a2: "#5b8cff" },
  { a1: "#5b8cff", a2: "#f0b232" },
];

const CAPS = { chartBars: 5, comparisonPoints: 4, flowSteps: 5 };

const validBarData = chart =>
  (chart?.data ?? []).filter(d => typeof d.value === "number" && isFinite(d.value) && d.value >= 0);

// Normalize blocks that Grok sometimes generates with flat schema (b.left/right/steps)
// vs nested schema (b.comparison.left, b.flow.steps). Accept both.
function compSides(b) {
  const c = b.comparison ?? b; // nested: b.comparison.left; flat: b.left
  return { left: c.left, right: c.right };
}
function flowSteps(b) {
  return b.flow?.steps ?? b.steps ?? []; // nested: b.flow.steps; flat: b.steps
}

/** Pick the most cover-worthy block: bar chart (≥2 pts) > comparison > flow. */
export function pickCoverBlock(blog) {
  const blocks = blog?.blocks ?? [];
  const chart = blocks.find(b => b.type === "chart" && b.chart?.variant === "bar" && validBarData(b.chart).length >= 2);
  if (chart) return {
    type: "chart", title: chart.title ?? chart.caption ?? "",
    chart: { ...chart.chart, data: validBarData(chart.chart).slice(0, CAPS.chartBars) },
  };
  const comp = blocks.find(b => {
    const { left, right } = compSides(b);
    return b.type === "comparison" && left?.points?.length >= 2 && right?.points?.length >= 2;
  });
  if (comp) {
    const { left, right } = compSides(comp);
    return {
      type: "comparison", title: comp.title ?? comp.caption ?? "",
      comparison: {
        left:  { title: left.title,  points: left.points.slice(0, CAPS.comparisonPoints) },
        right: { title: right.title, points: right.points.slice(0, CAPS.comparisonPoints) },
      },
    };
  }
  const flow = blocks.find(b => b.type === "flow" && flowSteps(b).length >= 2);
  if (flow) return {
    type: "flow", title: flow.title ?? flow.caption ?? "",
    flow: { steps: flowSteps(flow).slice(0, CAPS.flowSteps) },
  };
  return null;
}

// Shared element builder for story frames
function sel(tag, style, children, extras = {}) {
  return { type: tag, props: { style, children, ...extras } };
}

// Shared footer strip: avatar + domain + right label
function storyFooter(accent, avatarDataUri, rightLabel = "") {
  return sel("div", {
    height: 60, padding: "0 72px", display: "flex",
    alignItems: "center", justifyContent: "space-between",
    borderTop: `1px solid ${hex(CARD.bgSoft, 0.9)}`,
  }, [
    sel("div", { display: "flex", alignItems: "center", gap: 12 }, [
      avatarDataUri
        ? { type: "img", props: { src: avatarDataUri, width: 30, height: 30,
            style: { borderRadius: 9999, border: `2px solid ${hex(accent.a1, 0.55)}` } } }
        : sel("div", {
            width: 30, height: 30, borderRadius: 9999, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontFamily: "Tektur", fontWeight: 700, fontSize: 15, color: accent.a1,
            border: `2px solid ${hex(accent.a1, 0.55)}`, background: CARD.bgSoft,
          }, "L"),
      sel("div", {
        fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 500, color: CARD.textMute,
      }, "doxuanloc.space"),
    ]),
    rightLabel ? sel("div", {
      fontFamily: "Tektur", fontSize: 11, letterSpacing: "2.5px",
      textTransform: "uppercase", color: hex(accent.a2, 0.55),
    }, rightLabel) : null,
  ].filter(Boolean));
}

// Progress bar strip at bottom of content area — solid color (no gradient: GIF 256-color)
function storyProgress(accent, progress) {
  return sel("div", { height: 4, display: "flex", alignItems: "stretch", background: hex(CARD.bgSoft, 0.8) }, [
    sel("div", {
      height: 4,
      width: `${Math.round(progress * 100)}%`,
      background: accent.a1,
      borderRadius: 2,
    }),
  ]);
}

// Shared outer wrapper (dark bg, content + progress + footer)
function storyCard(accent, avatarDataUri, progress, rightLabel, contentEl) {
  return sel("div", {
    width: W, height: H, display: "flex", flexDirection: "column",
    position: "relative",
    background: CARD.bg, fontFamily: "Be Vietnam Pro", overflow: "hidden",
  }, [
    // nebula wash top-right
    sel("div", { position: "absolute", inset: 0,
      background: `radial-gradient(ellipse 55% 45% at 90% 0%, ${hex(accent.a1, 0.10)}, transparent 65%)` }),
    // HUD bracket TL
    sel("div", { position: "absolute", top: 24, left: 24, width: 20, height: 20,
      borderTop: `2px solid ${hex(accent.a1, 0.55)}`,
      borderLeft: `2px solid ${hex(accent.a1, 0.55)}` }),
    // HUD bracket BR
    sel("div", { position: "absolute", bottom: 68, right: 24, width: 20, height: 20,
      borderBottom: `2px solid ${hex(accent.a2, 0.4)}`,
      borderRight: `2px solid ${hex(accent.a2, 0.4)}` }),
    // content
    sel("div", { display: "flex", flexDirection: "column", flex: 1, position: "relative" }, [contentEl]),
    storyProgress(accent, progress),
    storyFooter(accent, avatarDataUri, rightLabel),
  ]);
}

// Strip leading "1. " / "2) " step number — number is rendered as a circle.
const stripStepNum = s => (s ?? "").replace(/^\s*\d+\s*[.)]\s*/, "");

// Compact header (kicker + title hook) — persists across all diagram frames
// so context survives the loop's jump-cut restart.
function diagramHeader(blog, accent, kicker) {
  const title = truncateWords(blog.title ?? "", 64);
  return sel("div", { display: "flex", flexDirection: "column", marginBottom: 18 }, [
    sel("div", {
      fontFamily: "Tektur", fontSize: 12, fontWeight: 600,
      letterSpacing: "3px", textTransform: "uppercase",
      color: accent.a2, marginBottom: 10,
    }, kicker),
    sel("div", {
      fontSize: title.length > 52 ? 25 : 29, fontWeight: 700,
      lineHeight: 1.2, color: CARD.text, letterSpacing: "-0.02em", maxWidth: 1040,
    }, title),
  ]);
}

// ── animated diagram builders (one frame per animState) ──────────────────────
// animState carries which parts are revealed; the GIF plan steps it forward.

// FLOW — vertical step stack; reveals one step per frame, active step glows.
function buildFlowDiagram(blog, block, anim, progress, accent, avatarDataUri) {
  const steps = block.flow.steps;
  const N = steps.length;

  const stepEl = (s, i) => {
    const shown = i < anim.visible;
    const active = (i + 1) === anim.active;
    return sel("div", {
      display: "flex", alignItems: "center", gap: 16, opacity: shown ? 1 : 0.13,
      padding: "11px 20px", borderRadius: 12,
      border: `1.5px solid ${hex(accent.a1, active ? 0.6 : 0.2)}`,
      background: hex(accent.a1, active ? 0.13 : 0.05),
    }, [
      sel("div", {
        width: 38, height: 38, borderRadius: 9999, display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
        fontFamily: "Tektur", fontSize: 16, fontWeight: 700,
        color: active ? CARD.bg : accent.a1,
        background: active ? accent.a1 : CARD.bgSoft,
        border: `1.5px solid ${hex(accent.a1, 0.5)}`,
        boxShadow: active ? `0 0 20px ${hex(accent.a1, 0.55)}` : "none",
      }, String(i + 1)),
      sel("div", { display: "flex", flexDirection: "column", flex: 1 }, [
        sel("div", { fontSize: 18, fontWeight: 700, color: CARD.text, lineHeight: 1.2 },
          truncate(stripStepNum(s.label), 38)),
        s.desc ? sel("div", { fontSize: 13, color: CARD.textDim, lineHeight: 1.3, marginTop: 2 },
          truncate(s.desc, 66)) : null,
      ].filter(Boolean)),
    ]);
  };

  return storyCard(accent, avatarDataUri, progress, `FLOW · ${Math.min(anim.visible, N)}/${N}`,
    sel("div", { display: "flex", flexDirection: "column", flex: 1, padding: "34px 72px 20px" }, [
      diagramHeader(blog, accent, "WORKFLOW"),
      sel("div", { display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 9 },
        steps.map((s, i) => stepEl(s, i))),
    ])
  );
}

// COMPARISON — two columns; points reveal alternately, winner column highlights.
function buildComparisonDiagram(blog, block, anim, progress, accent, avatarDataUri) {
  const { left, right } = block.comparison;

  const col = (side, color, count, highlighted) => sel("div", {
    display: "flex", flexDirection: "column", flex: 1, gap: 11,
    padding: "18px 22px", borderRadius: 14,
    border: `1.5px solid ${hex(color, highlighted ? 0.62 : 0.3)}`,
    background: hex(color, highlighted ? 0.14 : 0.06),
  }, [
    sel("div", {
      fontFamily: "Tektur", fontSize: 18, fontWeight: 600, color,
      paddingBottom: 10, borderBottom: `1px solid ${hex(color, 0.28)}`, lineHeight: 1.2,
    }, truncate(side.title, 26)),
    ...side.points.map((p, i) => sel("div", {
      display: "flex", gap: 11, alignItems: "flex-start", opacity: i < count ? 1 : 0.12,
    }, [
      sel("div", { width: 7, height: 7, borderRadius: 9999, background: color, marginTop: 8, flexShrink: 0 }),
      sel("div", { fontSize: 14, lineHeight: 1.4, color: CARD.textDim, flex: 1 }, truncate(p, 58)),
    ])),
  ]);

  return storyCard(accent, avatarDataUri, progress, "TRADE-OFF",
    sel("div", { display: "flex", flexDirection: "column", flex: 1, padding: "30px 56px 20px" }, [
      diagramHeader(blog, accent, "COMPARE"),
      sel("div", { display: "flex", flex: 1, alignItems: "stretch", gap: 18 }, [
        col(left, accent.a1, anim.leftCount, anim.highlight === "left"),
        sel("div", { display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2px" },
          sel("div", {
            width: 38, height: 38, borderRadius: 9999, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontFamily: "Tektur", fontSize: 12, fontWeight: 600,
            color: CARD.text, background: CARD.bgSoft, border: `1px solid ${hex(accent.a1, 0.25)}`,
          }, "VS")),
        col(right, accent.a2, anim.rightCount, anim.highlight === "right"),
      ]),
    ])
  );
}

// CHART — bars grow up fraction-by-fraction; value label appears when full.
function buildChartDiagram(blog, block, anim, progress, accent, avatarDataUri) {
  const data = block.chart.data;
  const max = Math.max(...data.map(d => d.value), 1);
  const AREA_H = 290;
  const colW = Math.min(190, Math.floor((W - 220) / Math.max(data.length, 3)));

  return storyCard(accent, avatarDataUri, progress, block.chart.unit ? `DATA · ${block.chart.unit}` : "DATA",
    sel("div", { display: "flex", flexDirection: "column", flex: 1, padding: "32px 72px 22px" }, [
      diagramHeader(blog, accent, "DATA"),
      sel("div", { display: "flex", flex: 1, alignItems: "flex-end", justifyContent: "center", gap: 34 },
        data.map((d, i) => {
          const fill = anim.barFill[i] ?? 0;
          const barH = Math.max(4, Math.round(AREA_H * (d.value / max) * fill));
          const color = i % 2 === 0 ? accent.a1 : accent.a2;
          const full = fill >= 1;
          return sel("div", { display: "flex", flexDirection: "column", alignItems: "center", width: colW, gap: 10 }, [
            sel("div", {
              fontFamily: "JetBrains Mono", fontSize: 22, fontWeight: 500,
              color: full ? CARD.text : "transparent",
            }, `${d.value}`),
            sel("div", { width: Math.round(colW * 0.62), height: barH, borderRadius: 8, background: color }),
            sel("div", {
              fontSize: 13, fontWeight: 600, color: CARD.textDim,
              textAlign: "center", width: "100%", lineHeight: 1.3,
            }, truncateWords(d.label, 20)),
          ]);
        })),
    ])
  );
}

function buildDiagramFrame(blog, block, anim, progress, accent, avatarDataUri) {
  if (block.type === "flow")       return buildFlowDiagram(blog, block, anim, progress, accent, avatarDataUri);
  if (block.type === "comparison") return buildComparisonDiagram(blog, block, anim, progress, accent, avatarDataUri);
  return buildChartDiagram(blog, block, anim, progress, accent, avatarDataUri);
}

// Pick the block to ANIMATE in the GIF. Priority differs from PNG cover:
// flow/comparison tell a story when built progressively; a 2-bar chart doesn't.
export function pickGifBlock(blog) {
  const blocks = blog?.blocks ?? [];
  const flow = blocks.find(b => b.type === "flow" && flowSteps(b).length >= 3);
  if (flow) return { type: "flow", flow: { steps: flowSteps(flow).slice(0, CAPS.flowSteps) } };
  const comp = blocks.find(b => {
    const { left, right } = compSides(b);
    return b.type === "comparison" && left?.points?.length >= 2 && right?.points?.length >= 2;
  });
  if (comp) {
    const { left, right } = compSides(comp);
    return { type: "comparison", comparison: {
      left:  { title: left.title,  points: left.points.slice(0, CAPS.comparisonPoints) },
      right: { title: right.title, points: right.points.slice(0, CAPS.comparisonPoints) },
    } };
  }
  const chart = blocks.find(b => b.type === "chart" && b.chart?.variant === "bar" && validBarData(b.chart).length >= 2);
  if (chart) return { type: "chart", chart: { ...chart.chart, data: validBarData(chart.chart).slice(0, CAPS.chartBars) } };
  return null;
}

// Build the frame plan (animState + delay each). Build frames are fast (feel
// animated); the final state is held ~2.4s so viewers can read; then the GIF
// loops back to the near-empty first frame (intentional rebuild jump-cut).
const HOLD = 1500, HOLD2 = 1350;
function buildGifPlan(block) {
  if (block.type === "flow") {
    const N = block.flow.steps.length;
    const specs = [];
    for (let i = 1; i <= N; i++) specs.push({ state: { visible: i, active: i }, delay: 520 });
    specs.push({ state: { visible: N, active: 0 }, delay: HOLD });
    specs.push({ state: { visible: N, active: 0 }, delay: HOLD2 });
    return specs;
  }
  if (block.type === "comparison") {
    const L = block.comparison.left.points.length;
    const R = block.comparison.right.points.length;
    const specs = [{ state: { leftCount: 0, rightCount: 0, highlight: null }, delay: 480 }];
    let lc = 0, rc = 0;
    for (let i = 0; i < Math.max(L, R); i++) {
      if (i < L) { lc++; specs.push({ state: { leftCount: lc, rightCount: rc, highlight: null }, delay: 440 }); }
      if (i < R) { rc++; specs.push({ state: { leftCount: lc, rightCount: rc, highlight: null }, delay: 440 }); }
    }
    specs.push({ state: { leftCount: L, rightCount: R, highlight: "right" }, delay: HOLD });
    specs.push({ state: { leftCount: L, rightCount: R, highlight: "right" }, delay: HOLD2 });
    return specs;
  }
  // chart — grow each bar 0 → 55% → 100%
  const N = block.chart.data.length;
  const fills = new Array(N).fill(0);
  const specs = [{ state: { barFill: [...fills] }, delay: 360 }];
  for (let b = 0; b < N; b++) {
    fills[b] = 0.55; specs.push({ state: { barFill: [...fills] }, delay: 320 });
    fills[b] = 1;    specs.push({ state: { barFill: [...fills] }, delay: 400 });
  }
  specs.push({ state: { barFill: fills.map(() => 1) }, delay: HOLD });
  specs.push({ state: { barFill: fills.map(() => 1) }, delay: HOLD2 });
  return specs;
}

// ── public API ────────────────────────────────────────────────────────────────

/** Generate static PNG — used as blog cover image. Returns Buffer. */
export async function generateCoverPng(blog) {
  const palette = pickPalette(blog.slug);
  const stars = genStars(blog.slug);
  const avatarDataUri = loadAvatar();
  const { png } = await renderFrame(blog, { avatarDataUri, palette, stars, glowFactor: 1 });
  return png;
}

/** Generate animated GIF for LinkedIn: a single diagram that builds up
 *  progressively (flow steps / comparison points / chart bars), holds the
 *  complete state ~2.4s, then loops back to the start (rebuild jump-cut).
 *  Diagram-first, minimal text — readable when autoplayed muted in-feed.
 *  Falls back to the orbital pulse when no diagrammable block exists. */
export async function generateCoverGif(blog) {
  const block = pickGifBlock(blog);
  if (!block) return generateOrbitalGif(blog);

  const accent = STORY_ACCENTS[hashStr(blog.slug) % STORY_ACCENTS.length];
  const avatarDataUri = loadAvatar();
  const specs = buildGifPlan(block);
  const total = specs.length;
  const rendered = [];

  for (let fi = 0; fi < total; fi++) {
    const progress = (fi + 1) / total;
    const element = buildDiagramFrame(blog, block, specs[fi].state, progress, accent, avatarDataUri);
    const r = await rasterize(element);
    rendered.push({ ...r, delay: specs[fi].delay });
  }
  return encodeGif(rendered);
}

/** Fallback GIF (3-frame orbital pulse) for posts without a cover-worthy block. */
async function generateOrbitalGif(blog) {
  const palette = pickPalette(blog.slug);
  const stars = genStars(blog.slug);
  const avatarDataUri = loadAvatar();

  // 3 frames: dim → bright → mid (creates pulsing orb effect)
  const FRAMES = [
    { glowFactor: 0.7, delay: 250 },
    { glowFactor: 1.0, delay: 200 },
    { glowFactor: 0.85, delay: 220 },
  ];

  const rendered = [];
  for (const f of FRAMES) {
    const r = await renderFrame(blog, { avatarDataUri, palette, stars, glowFactor: f.glowFactor });
    rendered.push({ ...r, delay: f.delay });
  }
  return encodeGif(rendered);
}

/** Save PNG as blog cover. Returns the public path (/images/blog/{slug}.png). */
export function saveBlogCover(blog, png) {
  const dir = join(root, "public/images/blog");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${blog.slug}.png`);
  writeFileSync(file, png);
  return `/images/blog/${blog.slug}.png`;
}

// ── CLI preview mode ──────────────────────────────────────────────────────────

if (process.argv.includes("--preview")) {
  const today = new Date().toISOString().slice(0, 10);
  const jsonPath = join(root, "content", "news", `${today}.json`);

  if (!existsSync(jsonPath)) {
    console.error(`No content file for ${today}`);
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(jsonPath, "utf8"));
  if (!data.blog?.slug) { console.error("No blog in today's content"); process.exit(1); }

  const tmpDir = join(root, "tmp");
  mkdirSync(tmpDir, { recursive: true });

  console.log(`Generating preview for "${data.blog.title}"...`);

  const png = await generateCoverPng(data.blog);
  const pngPath = join(tmpDir, "linkedin-card-preview.png");
  writeFileSync(pngPath, png);
  console.log(`PNG → ${pngPath} (${Math.round(png.length / 1024)}KB)`);

  const gifBlock = pickGifBlock(data.blog);
  console.log(`GIF block: ${gifBlock ? gifBlock.type : "none → orbital fallback"}`);

  if (gifBlock) {
    const accent = STORY_ACCENTS[hashStr(data.blog.slug) % STORY_ACCENTS.length];
    const avatarDataUri = loadAvatar();
    const specs = buildGifPlan(gifBlock);
    console.log(`Plan: ${specs.length} frames`);
    for (let i = 0; i < specs.length; i++) {
      const el = buildDiagramFrame(data.blog, gifBlock, specs[i].state, (i + 1) / specs.length, accent, avatarDataUri);
      const { png: fpng } = await rasterize(el);
      writeFileSync(join(tmpDir, `story-frame-${String(i).padStart(2, "0")}.png`), fpng);
    }
    console.log(`Story frames → ${tmpDir}/story-frame-{00..${String(specs.length - 1).padStart(2, "0")}}.png`);
  }

  console.log("Generating GIF...");
  const gif = await generateCoverGif(data.blog);
  const gifPath = join(tmpDir, "linkedin-card-preview.gif");
  writeFileSync(gifPath, gif);
  console.log(`GIF → ${gifPath} (${Math.round(gif.length / 1024)}KB)`);
}

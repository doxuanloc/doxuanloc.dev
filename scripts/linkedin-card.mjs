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
    const pal = quantize(pixels, 256, { format: "rgba4444", oneBitAlpha: false });
    const idx = applyPalette(pixels, pal, "rgba4444");
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

/** Pick the most cover-worthy block: bar chart (≥3 pts) > comparison > flow. */
export function pickCoverBlock(blog) {
  const blocks = blog?.blocks ?? [];
  const chart = blocks.find(b => b.type === "chart" && b.chart?.variant === "bar" && validBarData(b.chart).length >= 3);
  if (chart) return {
    type: "chart", title: chart.title ?? "",
    chart: { ...chart.chart, data: validBarData(chart.chart).slice(0, CAPS.chartBars) },
  };
  const comp = blocks.find(b => b.type === "comparison" && b.comparison?.left?.points?.length >= 2 && b.comparison?.right?.points?.length >= 2);
  if (comp) return {
    type: "comparison", title: comp.title ?? "",
    comparison: {
      left:  { title: comp.comparison.left.title,  points: comp.comparison.left.points.slice(0, CAPS.comparisonPoints) },
      right: { title: comp.comparison.right.title, points: comp.comparison.right.points.slice(0, CAPS.comparisonPoints) },
    },
  };
  const flow = blocks.find(b => b.type === "flow" && (b.flow?.steps?.length ?? 0) >= 2);
  if (flow) return {
    type: "flow", title: flow.title ?? "",
    flow: { steps: flow.flow.steps.slice(0, CAPS.flowSteps) },
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

// Progress bar strip at bottom of content area
function storyProgress(accent, progress) {
  return sel("div", { height: 4, display: "flex", alignItems: "stretch", background: hex(CARD.bgSoft, 0.8) }, [
    sel("div", {
      height: 4,
      width: `${Math.round(progress * 100)}%`,
      background: `linear-gradient(90deg, ${accent.a1}, ${accent.a2})`,
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

// Frame 1: Title — large, clean, brand entry
function buildTitleFrame(blog, progress, accent, avatarDataUri) {
  const title = truncate(blog.title ?? "", 88);
  const readLabel = blog.readingTimeMin ? `${blog.readingTimeMin} MIN READ` : "DAILY INSIGHT";
  return storyCard(accent, avatarDataUri, progress, readLabel,
    sel("div", { display: "flex", flexDirection: "column", flex: 1, padding: "68px 80px 40px", justifyContent: "flex-end" }, [
      sel("div", {
        fontFamily: "Tektur", fontSize: 12, fontWeight: 600,
        letterSpacing: "3.5px", textTransform: "uppercase",
        color: accent.a2, marginBottom: 26,
      }, "BLOG · AI ENGINEER"),
      sel("div", {
        fontSize: title.length > 70 ? 46 : 52, fontWeight: 700,
        lineHeight: 1.13, color: CARD.text,
        letterSpacing: "-0.025em", maxWidth: 960,
      }, title),
      sel("div", {
        width: 100, height: 3, marginTop: 28,
        background: `linear-gradient(90deg, ${accent.a1}, ${accent.a2}, ${accent.a1}33)`,
        borderRadius: 2,
      }),
    ])
  );
}

// Frame N: Insight — ghost number + single key point large
function buildInsightFrame(blog, insightIndex, progress, accent, avatarDataUri) {
  const tldr = blog.tldr ?? [];
  const point = tldr[insightIndex] ?? "";
  const num = String(insightIndex + 1).padStart(2, "0");
  const totalInsights = Math.min(tldr.length, 4);
  const rightLabel = `${insightIndex + 1} / ${totalInsights}`;

  return storyCard(accent, avatarDataUri, progress, rightLabel,
    sel("div", { display: "flex", flexDirection: "column", flex: 1,
      padding: "48px 80px 36px", position: "relative" }, [
      // ghost number
      sel("div", {
        position: "absolute", top: 28, left: 64,
        fontFamily: "Tektur", fontSize: 180, fontWeight: 700, lineHeight: 1,
        color: hex(accent.a1, 0.09),
      }, num),
      // accent number label
      sel("div", {
        fontFamily: "Tektur", fontSize: 13, fontWeight: 600,
        letterSpacing: "3px", color: accent.a1, marginBottom: 28,
        textTransform: "uppercase",
      }, `INSIGHT ${num}`),
      // point text
      sel("div", {
        fontSize: point.length > 80 ? 33 : point.length > 60 ? 37 : 42,
        fontWeight: 700, lineHeight: 1.38, color: CARD.text,
        letterSpacing: "-0.015em", maxWidth: 980, flex: 1,
        display: "flex", alignItems: "center",
      }, point),
    ])
  );
}

// Visual frame: full-canvas dark-theme block (chart / comparison / flow)
function buildVisualChartFrame(blog, block, progress, accent, avatarDataUri) {
  const data = block.chart.data;
  const max = Math.max(...data.map(d => d.value), 1);
  const AREA_H = 330;

  return storyCard(accent, avatarDataUri, progress, "DATA",
    sel("div", { display: "flex", flexDirection: "column", flex: 1, padding: "48px 72px 28px" }, [
      block.title ? sel("div", {
        fontFamily: "Tektur", fontSize: 13, letterSpacing: "2.5px",
        textTransform: "uppercase", color: accent.a2, marginBottom: 32,
      }, truncate(block.title, 60)) : null,
      sel("div", { display: "flex", flex: 1, alignItems: "flex-end", gap: 24 },
        data.map((d, i) => {
          const barH = Math.max(12, Math.round(AREA_H * (d.value / max)));
          const color = i % 2 === 0 ? accent.a1 : accent.a2;
          return sel("div", { display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 10 }, [
            sel("div", {
              fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 500, color: CARD.text,
            }, `${d.value}`),
            sel("div", {
              width: "100%", maxWidth: 120, height: barH, borderRadius: 8,
              background: `linear-gradient(to top, ${hex(color, 0.9)}, ${hex(color, 0.55)})`,
              boxShadow: `0 0 24px ${hex(color, 0.3)}`,
            }),
            sel("div", {
              fontSize: 14, fontWeight: 600, color: CARD.textDim,
              textAlign: "center", width: "100%", lineHeight: 1.3,
            }, truncateWords(d.label, 18)),
          ]);
        })),
      block.chart.unit ? sel("div", {
        fontFamily: "JetBrains Mono", fontSize: 12, letterSpacing: "2px",
        textTransform: "uppercase", color: CARD.textMute, marginTop: 18,
      }, `UNIT: ${block.chart.unit}`) : null,
    ].filter(Boolean))
  );
}

function buildVisualComparisonFrame(blog, block, progress, accent, avatarDataUri) {
  const col = (side, color) => sel("div", {
    display: "flex", flexDirection: "column", flex: 1, gap: 14,
    padding: "22px 26px", borderRadius: 14,
    border: `1.5px solid ${hex(color, 0.40)}`,
    background: hex(color, 0.07),
  }, [
    sel("div", {
      fontFamily: "Tektur", fontSize: 18, fontWeight: 600, color,
      paddingBottom: 12, borderBottom: `1px solid ${hex(color, 0.28)}`,
      lineHeight: 1.2,
    }, truncate(side.title, 28)),
    ...side.points.map(p => sel("div", { display: "flex", gap: 12, alignItems: "flex-start" }, [
      sel("div", {
        width: 8, height: 8, borderRadius: 9999, background: color,
        marginTop: 8, flexShrink: 0,
        boxShadow: `0 0 8px ${hex(color, 0.6)}`,
      }),
      sel("div", {
        fontSize: 15, lineHeight: 1.45, color: CARD.textDim, flex: 1,
      }, truncate(p, 72)),
    ])),
  ]);

  return storyCard(accent, avatarDataUri, progress, "COMPARE",
    sel("div", { display: "flex", flexDirection: "column", flex: 1, padding: "44px 60px 28px" }, [
      block.title ? sel("div", {
        fontFamily: "Tektur", fontSize: 13, letterSpacing: "2.5px",
        textTransform: "uppercase", color: accent.a2, marginBottom: 28,
      }, truncate(block.title, 60)) : null,
      sel("div", { display: "flex", flex: 1, alignItems: "stretch", gap: 20 }, [
        col(block.comparison.left, accent.a1),
        sel("div", { display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" },
          sel("div", {
            width: 40, height: 40, borderRadius: 9999, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontFamily: "Tektur", fontSize: 13, fontWeight: 600,
            color: CARD.text, background: CARD.bgSoft,
            border: `1px solid ${hex(accent.a1, 0.2)}`,
          }, "VS")),
        col(block.comparison.right, accent.a2),
      ]),
    ].filter(Boolean))
  );
}

function buildVisualFlowFrame(blog, block, progress, accent, avatarDataUri) {
  return storyCard(accent, avatarDataUri, progress, "FLOW",
    sel("div", { display: "flex", flexDirection: "column", flex: 1, padding: "44px 72px 28px", justifyContent: "center", gap: 0 }, [
      block.title ? sel("div", {
        fontFamily: "Tektur", fontSize: 13, letterSpacing: "2.5px",
        textTransform: "uppercase", color: accent.a2, marginBottom: 28,
      }, truncate(block.title, 60)) : null,
      ...block.flow.steps.flatMap((s, i) => {
        const isLast = i === block.flow.steps.length - 1;
        return [
          sel("div", {
            display: "flex", alignItems: "center", gap: 20,
            padding: "14px 20px", borderRadius: 12,
            border: `1.5px solid ${hex(accent.a1, 0.25)}`,
            background: hex(accent.a1, 0.06),
          }, [
            sel("div", {
              width: 38, height: 38, borderRadius: 9999, display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
              fontFamily: "Tektur", fontSize: 16, fontWeight: 700,
              color: CARD.bg, background: accent.a1,
              boxShadow: `0 0 16px ${hex(accent.a1, 0.45)}`,
            }, String(i + 1)),
            sel("div", { display: "flex", flexDirection: "column", flex: 1 }, [
              sel("div", { fontSize: 18, fontWeight: 700, color: CARD.text, lineHeight: 1.25 }, truncate(s.label, 36)),
              s.desc ? sel("div", { fontSize: 14, color: CARD.textDim, lineHeight: 1.35, marginTop: 3 }, truncate(s.desc, 72)) : null,
            ].filter(Boolean)),
          ]),
          !isLast ? sel("div", { display: "flex", justifyContent: "flex-start", paddingLeft: 38, paddingTop: 4, paddingBottom: 4 },
            sel("div", { width: 2, height: 14, background: hex(accent.a2, 0.5), borderRadius: 2 })) : null,
        ].filter(Boolean);
      }),
    ].filter(Boolean))
  );
}

function buildVisualFrame(blog, block, progress, accent, avatarDataUri) {
  if (block.type === "chart") return buildVisualChartFrame(blog, block, progress, accent, avatarDataUri);
  if (block.type === "comparison") return buildVisualComparisonFrame(blog, block, progress, accent, avatarDataUri);
  return buildVisualFlowFrame(blog, block, progress, accent, avatarDataUri);
}

// Outro frame: final insight as pull-quote + CTA
function buildOutroFrame(blog, progress, accent, avatarDataUri) {
  const tldr = blog.tldr ?? [];
  const pullQuote = truncateWords(tldr[tldr.length - 1] ?? blog.excerpt ?? "", 120);
  const readLabel = blog.readingTimeMin ? `${blog.readingTimeMin} MIN READ` : "";

  return storyCard(accent, avatarDataUri, progress, readLabel,
    sel("div", { display: "flex", flexDirection: "column", flex: 1,
      padding: "56px 80px 36px", justifyContent: "space-between" }, [
      // pull quote
      sel("div", { display: "flex", flexDirection: "column", gap: 20, flex: 1, justifyContent: "center" }, [
        sel("div", { width: 4, height: 40, borderRadius: 2,
          background: `linear-gradient(to bottom, ${accent.a1}, ${accent.a2})` }),
        sel("div", {
          fontSize: pullQuote.length > 100 ? 28 : 33,
          fontWeight: 400, lineHeight: 1.55,
          color: CARD.textDim, maxWidth: 900,
        }, `"${pullQuote}"`),
      ]),
      // CTA row
      sel("div", { display: "flex", alignItems: "center", gap: 20, marginTop: 32 }, [
        sel("div", {
          fontFamily: "Tektur", fontSize: 20, fontWeight: 600,
          color: accent.a1, letterSpacing: "-0.01em",
        }, "// Đọc phân tích đầy đủ"),
        sel("div", { width: 1, height: 20, background: hex(accent.a1, 0.25) }),
        sel("div", {
          fontFamily: "JetBrains Mono", fontSize: 14, color: CARD.textMute,
        }, `doxuanloc.space/blog/${blog.slug}/`),
      ]),
    ])
  );
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

/** Generate animated GIF for LinkedIn: dark story-format narrative animation.
 *  Title → key insights (numbered) → visual block → outro pull-quote.
 *  ~5-7 seconds total, one clear message per frame. */
export async function generateCoverGif(blog) {
  const block = pickCoverBlock(blog);
  const accent = STORY_ACCENTS[hashStr(blog.slug) % STORY_ACCENTS.length];
  const avatarDataUri = loadAvatar();
  const tldr = (blog.tldr ?? []).slice(0, 4);

  // Build ordered spec list: title + insights interleaved with visual block + outro
  const specs = [
    { type: "title",   delay: 600 },
    ...tldr.slice(0, 2).map((_, i) => ({ type: "insight", i, delay: 700 })),
    ...(block ? [{ type: "visual", delay: 1100 }] : []),
    ...tldr.slice(2, 4).map((_, i) => ({ type: "insight", i: i + 2, delay: 700 })),
    { type: "outro",   delay: 1600 },
  ];

  const total = specs.length;
  const rendered = [];

  for (let fi = 0; fi < total; fi++) {
    const spec = specs[fi];
    const progress = (fi + 1) / total;
    let element;
    if (spec.type === "title")   element = buildTitleFrame(blog, progress, accent, avatarDataUri);
    else if (spec.type === "insight") element = buildInsightFrame(blog, spec.i, progress, accent, avatarDataUri);
    else if (spec.type === "visual")  element = buildVisualFrame(blog, block, progress, accent, avatarDataUri);
    else                         element = buildOutroFrame(blog, progress, accent, avatarDataUri);

    const r = await rasterize(element);
    rendered.push({ ...r, delay: spec.delay });
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

  const block = pickCoverBlock(data.blog);
  console.log(`Cover block: ${block ? block.type : "none → orbital fallback"}`);

  if (block) {
    const accent = STORY_ACCENTS[hashStr(data.blog.slug) % STORY_ACCENTS.length];
    const avatarDataUri = loadAvatar();
    const previewFrames = [
      buildTitleFrame(data.blog, 0.2, accent, avatarDataUri),
      buildInsightFrame(data.blog, 0, 0.4, accent, avatarDataUri),
      buildVisualFrame(data.blog, block, 0.7, accent, avatarDataUri),
      buildOutroFrame(data.blog, 1.0, accent, avatarDataUri),
    ];
    for (let i = 0; i < previewFrames.length; i++) {
      const { png: fpng } = await rasterize(previewFrames[i]);
      writeFileSync(join(tmpDir, `story-frame-${i}.png`), fpng);
    }
    console.log(`Story frames → ${tmpDir}/story-frame-{0..3}.png`);
  }

  console.log("Generating GIF...");
  const gif = await generateCoverGif(data.blog);
  const gifPath = join(tmpDir, "linkedin-card-preview.gif");
  writeFileSync(gifPath, gif);
  console.log(`GIF → ${gifPath} (${Math.round(gif.length / 1024)}KB)`);
}

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

// ── animated insight card (light editorial infographic) ──────────────────────

const LIGHT = {
  bg: "#f4f6f8", canvas: "#ffffff",
  text: "#13151a", textDim: "#4b5563", textMute: "#8b95a5",
  line: "#e3e7ee",
};

const LIGHT_ACCENTS = [
  { a1: "#1e40af", a2: "#0f766e" },
  { a1: "#0f766e", a2: "#6d28d9" },
  { a1: "#6d28d9", a2: "#1e40af" },
  { a1: "#1e40af", a2: "#b45309" },
];

// Feed legibility caps — never trust LLM-emitted block density.
const CAPS = { chartBars: 4, comparisonPoints: 3, flowSteps: 4 };

const validBarData = chart =>
  (chart?.data ?? []).filter(d => typeof d.value === "number" && isFinite(d.value) && d.value >= 0);

/** Pick the most cover-worthy block: bar chart (≥3 pts) > comparison > flow. */
export function pickCoverBlock(blog) {
  const blocks = blog?.blocks ?? [];
  const chart = blocks.find(b => b.type === "chart" && b.chart?.variant === "bar" && validBarData(b.chart).length >= 3);
  if (chart) return {
    type: "chart", title: chart.title,
    chart: { ...chart.chart, data: validBarData(chart.chart).slice(0, CAPS.chartBars) },
  };
  const comp = blocks.find(b => b.type === "comparison" && b.comparison?.left?.points?.length >= 2 && b.comparison?.right?.points?.length >= 2);
  if (comp) return {
    type: "comparison", title: comp.title,
    comparison: {
      left:  { title: comp.comparison.left.title,  points: comp.comparison.left.points.slice(0, CAPS.comparisonPoints) },
      right: { title: comp.comparison.right.title, points: comp.comparison.right.points.slice(0, CAPS.comparisonPoints) },
    },
  };
  const flow = blocks.find(b => b.type === "flow" && (b.flow?.steps?.length ?? 0) >= 2);
  if (flow) return {
    type: "flow", title: flow.title,
    flow: { steps: flow.flow.steps.slice(0, CAPS.flowSteps) },
  };
  return null;
}

const easeOut = t => 1 - Math.pow(1 - t, 3);

function buildChartDiagram(el, chart, accent, t) {
  const max = Math.max(...chart.data.map(d => d.value), 1);
  const AREA_H = 270;
  return el("div", { display: "flex", flexDirection: "column", flex: 1 }, [
    el("div", { display: "flex", flex: 1, alignItems: "flex-end", gap: 28, paddingTop: 8 },
      chart.data.map((d, i) => {
        const barH = Math.max(6, Math.round(AREA_H * (d.value / max) * t));
        const color = i % 2 === 0 ? accent.a1 : accent.a2;
        return el("div", { display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 8 }, [
          el("div", {
            fontFamily: "JetBrains Mono", fontSize: 16, fontWeight: 500,
            color: LIGHT.text, opacity: t >= 1 ? 1 : 0.25,
          }, `${d.value}`),
          el("div", { width: "100%", maxWidth: 96, height: barH, borderRadius: 6, background: color }),
          el("div", {
            fontSize: 13, fontWeight: 700, color: LIGHT.textDim, textAlign: "center",
            width: "100%", lineHeight: 1.25,
          }, truncateWords(d.label, 16)),
        ]);
      })),
    chart.unit ? el("div", {
      fontFamily: "JetBrains Mono", fontSize: 11, letterSpacing: "2px",
      textTransform: "uppercase", color: LIGHT.textMute, marginTop: 14,
    }, `UNIT: ${chart.unit}`) : null,
  ].filter(Boolean));
}

function buildComparisonDiagram(el, comparison, accent, revealed) {
  const col = (side, color) => el("div", {
    display: "flex", flexDirection: "column", flex: 1, gap: 12,
    padding: "20px 22px", borderRadius: 12,
    border: `1.5px solid ${hex(color, 0.35)}`, background: hex(color, 0.05),
  }, [
    el("div", {
      fontFamily: "Tektur", fontSize: 17, fontWeight: 600, color,
      paddingBottom: 10, borderBottom: `1px solid ${hex(color, 0.25)}`,
    }, truncate(side.title, 26)),
    ...side.points.map((p, i) => el("div", {
      display: "flex", gap: 10, opacity: i < revealed ? 1 : 0.08,
    }, [
      el("div", { width: 8, height: 8, borderRadius: 9999, background: color, marginTop: 7, flexShrink: 0 }),
      el("div", { fontSize: 15, lineHeight: 1.4, color: LIGHT.text, flex: 1 }, truncate(p, 64)),
    ])),
  ]);
  return el("div", { display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" },
    el("div", { display: "flex", alignItems: "stretch", gap: 14 }, [
      col(comparison.left, accent.a1),
      el("div", { display: "flex", alignItems: "center" },
        el("div", {
          width: 42, height: 42, borderRadius: 9999, display: "flex",
          alignItems: "center", justifyContent: "center",
          fontFamily: "Tektur", fontSize: 14, fontWeight: 600, color: LIGHT.canvas,
          background: LIGHT.text,
        }, "VS")),
      col(comparison.right, accent.a2),
    ]));
}

function buildFlowDiagram(el, flow, accent, activeStep) {
  return el("div", { display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 6 },
    flow.steps.map((s, i) => {
      const active = i === activeStep;
      const shown = i <= activeStep;
      return el("div", { display: "flex", flexDirection: "column", opacity: shown ? 1 : 0.12 }, [
        el("div", {
          display: "flex", alignItems: "center", gap: 16,
          padding: "12px 18px", borderRadius: 10,
          border: `1.5px solid ${active ? accent.a1 : LIGHT.line}`,
          background: active ? hex(accent.a1, 0.07) : LIGHT.canvas,
        }, [
          el("div", {
            width: 34, height: 34, borderRadius: 9999, display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
            fontFamily: "Tektur", fontSize: 15, fontWeight: 600,
            color: active ? LIGHT.canvas : accent.a1,
            background: active ? accent.a1 : hex(accent.a1, 0.1),
          }, String(i + 1)),
          el("div", { display: "flex", flexDirection: "column", flex: 1 }, [
            el("div", { fontSize: 17, fontWeight: 700, color: LIGHT.text }, truncate(s.label, 32)),
            s.desc ? el("div", { fontSize: 13.5, color: LIGHT.textDim, lineHeight: 1.35 }, truncate(s.desc, 70)) : null,
          ].filter(Boolean)),
        ]),
        i < flow.steps.length - 1
          ? el("div", { display: "flex", justifyContent: "center", padding: "2px 0" },
              el("div", { width: 2.5, height: 12, background: hex(accent.a2, 0.55), borderRadius: 2 }))
          : null,
      ].filter(Boolean));
    }));
}

function buildInsightCardElement(blog, block, { avatarDataUri, accent, frame, frames }) {
  const el = (tag, style, children, extras = {}) => ({
    type: tag, props: { style, children, ...extras },
  });

  const t = easeOut((frame + 1) / frames);
  const revealed = frame + 1; // comparison: bullets shown per side (≥1 from frame 0)
  const title = truncateWords(blog.title ?? "", 100);
  const excerpt = truncateWords(blog.excerpt ?? "", 95);
  const readLabel = blog.readingTimeMin ? `${blog.readingTimeMin} MIN READ` : "";

  let diagram;
  if (block.type === "chart") diagram = buildChartDiagram(el, block.chart, accent, t);
  else if (block.type === "comparison") diagram = buildComparisonDiagram(el, block.comparison, accent, revealed);
  else diagram = buildFlowDiagram(el, block.flow, accent, Math.min(frame, block.flow.steps.length - 1));

  return el("div", {
    width: W, height: H, display: "flex", flexDirection: "column",
    position: "relative", background: LIGHT.bg, fontFamily: "Be Vietnam Pro",
  }, [
    el("div", { position: "absolute", top: 24, left: 24, width: 18, height: 18,
      borderTop: `2.5px solid ${accent.a1}`, borderLeft: `2.5px solid ${accent.a1}` }),
    el("div", { position: "absolute", bottom: 24, right: 24, width: 18, height: 18,
      borderBottom: `2.5px solid ${accent.a1}`, borderRight: `2.5px solid ${accent.a1}` }),

    el("div", { display: "flex", flex: 1, padding: "48px 56px 24px" }, [
      // left: editorial header
      el("div", { display: "flex", flexDirection: "column", width: 380, paddingRight: 40, paddingTop: 12 }, [
        el("div", {
          fontFamily: "Tektur", fontSize: 12, fontWeight: 600,
          letterSpacing: "3px", textTransform: "uppercase",
          color: accent.a2, marginBottom: 18,
        }, "BLOG · DAILY SIGNAL"),
        el("div", {
          fontSize: title.length > 72 ? 30 : 33, fontWeight: 700, lineHeight: 1.18,
          color: LIGHT.text, letterSpacing: "-0.02em",
        }, title),
        el("div", {
          width: 90, height: 3, marginTop: 18, marginBottom: 16,
          background: `linear-gradient(90deg, ${accent.a1}, ${accent.a2})`,
          borderRadius: 2,
        }),
        el("div", { fontSize: 16, lineHeight: 1.5, color: LIGHT.textDim }, excerpt),
      ]),
      // right: diagram canvas
      el("div", {
        display: "flex", flexDirection: "column", flex: 1,
        background: LIGHT.canvas, borderRadius: 16,
        border: `1px solid ${LIGHT.line}`, padding: "26px 30px",
      }, [
        block.title ? el("div", {
          fontFamily: "Tektur", fontSize: 14, fontWeight: 600,
          letterSpacing: "1.5px", textTransform: "uppercase",
          color: LIGHT.textMute, marginBottom: 14,
        }, truncate(block.title, 48)) : null,
        diagram,
      ].filter(Boolean)),
    ]),

    el("div", {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 62, padding: "0 56px",
      borderTop: `1px solid ${LIGHT.line}`, background: LIGHT.canvas,
    }, [
      el("div", { display: "flex", alignItems: "center", gap: 12 }, [
        avatarDataUri
          ? { type: "img", props: { src: avatarDataUri, width: 32, height: 32,
              style: { borderRadius: 9999, border: `2px solid ${hex(accent.a1, 0.6)}` } } }
          : el("div", {
              width: 32, height: 32, borderRadius: 9999, display: "flex",
              alignItems: "center", justifyContent: "center",
              fontFamily: "Tektur", fontWeight: 600, fontSize: 16, color: accent.a1,
              border: `2px solid ${hex(accent.a1, 0.6)}`, background: LIGHT.bg,
            }, "L"),
        el("div", { fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 500, color: LIGHT.textDim },
          "doxuanloc.space"),
      ]),
      readLabel ? el("div", {
        fontFamily: "JetBrains Mono", fontSize: 13, color: LIGHT.textMute,
      }, readLabel) : null,
    ].filter(Boolean)),
  ]);
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

/** Generate animated GIF for LinkedIn: insight-card reveal when the post has a
 *  cover-worthy block, orbital pulse otherwise. Returns Buffer. */
export async function generateCoverGif(blog) {
  const block = pickCoverBlock(blog);
  if (!block) return generateOrbitalGif(blog);

  const accent = LIGHT_ACCENTS[hashStr(blog.slug) % LIGHT_ACCENTS.length];
  const avatarDataUri = loadAvatar();
  const FRAMES = 4;
  // reveal beats + long hold on the complete state so the diagram is readable
  const DELAYS = [240, 220, 220, 1400];

  const rendered = [];
  for (let frame = 0; frame < FRAMES; frame++) {
    const r = await rasterize(buildInsightCardElement(blog, block, { avatarDataUri, accent, frame, frames: FRAMES }));
    rendered.push({ ...r, delay: DELAYS[frame] });
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
    const accent = LIGHT_ACCENTS[hashStr(data.blog.slug) % LIGHT_ACCENTS.length];
    const avatarDataUri = loadAvatar();
    for (let frame = 0; frame < 4; frame++) {
      const { png: fpng } = await rasterize(buildInsightCardElement(data.blog, block, { avatarDataUri, accent, frame, frames: 4 }));
      writeFileSync(join(tmpDir, `insight-frame-${frame}.png`), fpng);
    }
    console.log(`Frames → ${tmpDir}/insight-frame-{0..3}.png`);
  }

  console.log("Generating GIF...");
  const gif = await generateCoverGif(data.blog);
  const gifPath = join(tmpDir, "linkedin-card-preview.gif");
  writeFileSync(gifPath, gif);
  console.log(`GIF → ${gifPath} (${Math.round(gif.length / 1024)}KB)`);
}

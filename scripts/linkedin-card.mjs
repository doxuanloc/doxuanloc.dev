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

// ── public API ────────────────────────────────────────────────────────────────

/** Generate static PNG — used as blog cover image. Returns Buffer. */
export async function generateCoverPng(blog) {
  const palette = pickPalette(blog.slug);
  const stars = genStars(blog.slug);
  const avatarDataUri = loadAvatar();
  const { png } = await renderFrame(blog, { avatarDataUri, palette, stars, glowFactor: 1 });
  return png;
}

/** Generate animated GIF (3-frame orbital pulse) — used for LinkedIn post. Returns Buffer. */
export async function generateCoverGif(blog) {
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

  const { default: gifenc } = await import("gifenc");
  const { GIFEncoder, quantize, applyPalette } = gifenc;

  const gif = GIFEncoder();
  for (const { pixels, width, height, delay } of rendered) {
    const pal = quantize(pixels, 256, { format: "rgba4444", oneBitAlpha: false });
    const idx = applyPalette(pixels, pal, "rgba4444");
    gif.writeFrame(idx, width, height, { palette: pal, delay, repeat: 0 });
  }
  gif.finish();

  return Buffer.from(gif.bytesView());
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

  console.log("Generating GIF (3 frames)...");
  const gif = await generateCoverGif(data.blog);
  const gifPath = join(tmpDir, "linkedin-card-preview.gif");
  writeFileSync(gifPath, gif);
  console.log(`GIF → ${gifPath} (${Math.round(gif.length / 1024)}KB)`);
}

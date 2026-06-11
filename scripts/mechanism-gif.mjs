#!/usr/bin/env node
/**
 * mechanism-gif.mjs — animated mechanism GIF for deep-dive blog posts.
 * Renders architecture/sequence block data into a traveling-signal animation.
 * Pure Node.js: satori + @resvg/resvg-js + gifenc. No browser, no canvas.
 *
 * CLI:
 *   node scripts/mechanism-gif.mjs --preview <slug|date>
 *   node scripts/mechanism-gif.mjs --slug <slug>   (writes to public/images/mechanism/)
 */
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = join(root, "node_modules/@fontsource");

// ── Canvas ──────────────────────────────────────────────────────────────────
const W = 1200, H = 630;

// Palette — editorial light panel for diagram, dark panel for label
const P = {
  bg:      "#04060e",
  bgPanel: "#07091a",
  panel:   "#0e1428",   // diagram panel bg
  border:  "#1e2d4a",
  text:    "#eef4ff",
  textDim: "#a3b3d1",
  textMu:  "#4a5d80",
  blue:    "#5b8cff",
  teal:    "#36d6c3",
  purple:  "#b58cff",
  gold:    "#f0b232",
  red:     "#ff6b7a",
  green:   "#4ddb8a",
};

const ACCENT_BY_KIND = {
  orchestrator: P.blue,
  reasoner:     P.purple,
  control:      P.teal,
  "side-effect": P.gold,
  storage:      P.textDim,
  external:     P.textMu,
  request:      P.blue,
  response:     P.teal,
  event:        P.gold,
  internal:     P.purple,
};

function hex(color, alpha) {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return color + a;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp01(t) { return Math.max(0, Math.min(1, t)); }

// ── Font ──────────────────────────────────────────────────────────────────────
let _fonts = null;
function loadFonts() {
  if (_fonts) return _fonts;
  const read = (pkg, file) => readFileSync(join(FONT_DIR, pkg, "files", file));
  _fonts = [
    { name: "Be Vietnam Pro", data: read("be-vietnam-pro", "be-vietnam-pro-vietnamese-400-normal.woff"), weight: 400 },
    { name: "Be Vietnam Pro", data: read("be-vietnam-pro", "be-vietnam-pro-vietnamese-700-normal.woff"), weight: 700 },
    { name: "Tektur",         data: read("tektur",          "tektur-latin-600-normal.woff"),              weight: 600 },
    { name: "JetBrains Mono", data: read("jetbrains-mono",  "jetbrains-mono-latin-500-normal.woff"),      weight: 500 },
  ];
  return _fonts;
}

// ── Layout ────────────────────────────────────────────────────────────────────

const DIAG_X = 440; // diagram panel starts here
const DIAG_W = W - DIAG_X;
const DIAG_H = H;

/** Layout N components into a grid within the diagram panel. */
function layoutComponents(components) {
  const n = components.length;
  const cols = n <= 3 ? n : n <= 6 ? Math.ceil(n / 2) : 4;
  const rows = Math.ceil(n / cols);
  const CW = 130, CH = 46;
  const hGap = Math.max(20, (DIAG_W - 60 - cols * CW) / (cols > 1 ? cols - 1 : 1));
  const vGap = Math.max(30, (DIAG_H - 80 - rows * CH) / (rows > 1 ? rows - 1 : 1));
  const startX = DIAG_X + 30;
  const startY = (DIAG_H - (rows * CH + (rows - 1) * vGap)) / 2;

  return components.map((c, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = startX + col * (CW + hGap);
    const y = startY + row * (CH + vGap);
    return { ...c, x, y, w: CW, h: CH, cx: x + CW / 2, cy: y + CH / 2 };
  });
}

/** Layout actors as vertical lifelines for sequence diagram. */
function layoutActors(actors) {
  const n = actors.length;
  const AW = 110, AH = 40;
  const gap = Math.max(30, (DIAG_W - 50 - n * AW) / (n > 1 ? n - 1 : 1));
  const startX = DIAG_X + 25;
  const topY = 24;
  return actors.map((a, i) => ({
    ...a,
    x: startX + i * (AW + gap),
    y: topY,
    w: AW, h: AH,
    cx: startX + i * (AW + gap) + AW / 2,
    topCy: topY + AH,
    bottomY: H - 20,
  }));
}

// ── Element builder ───────────────────────────────────────────────────────────

const el = (tag, style, children, extras = {}) => ({
  type: tag, props: { style, children: children ?? null, ...extras },
});

function truncate(s, max) { return !s ? "" : s.length <= max ? s : s.slice(0, max - 1) + "…"; }

// ── Architecture frame builder ─────────────────────────────────────────────────

function buildArchitectureFrame(block, frameT, blog) {
  const { components, connections } = block.architecture;
  const nodes = layoutComponents(components);

  const totalConns = connections.length;
  const signals = connections.map((c, i) => {
    const startPhase = i / totalConns;
    const endPhase = (i + 1) / totalConns;
    const progress = clamp01((frameT - startPhase) / (endPhase - startPhase || 0.001));
    return { ...c, progress, startPhase, endPhase, started: frameT >= startPhase, done: frameT >= endPhase };
  });

  const getNode = (id) => nodes.find((n) => n.id === id) ?? { cx: 0, cy: 0, x: 0, y: 0, w: 0, h: 0 };

  const geoChildren = [];  // SVG geometric elements only (no text)
  const textLabels = [];   // HTML div overlays for text

  // Faint base connections
  for (const s of signals) {
    const a = getNode(s.from), b = getNode(s.to);
    geoChildren.push({
      type: "line",
      props: {
        x1: a.cx - DIAG_X, y1: a.cy, x2: b.cx - DIAG_X, y2: b.cy,
        stroke: hex(P.border, 0.8), strokeWidth: 1.5,
        strokeDasharray: s.type === "async" || s.type === "event" ? "6 4" : undefined,
      },
    });
  }

  // Active signal dots + trails
  for (const s of signals) {
    if (!s.started) continue;
    const a = getNode(s.from), b = getNode(s.to);
    const sx = lerp(a.cx - DIAG_X, b.cx - DIAG_X, s.progress);
    const sy = lerp(a.cy, b.cy, s.progress);
    const accent = ACCENT_BY_KIND[s.type ?? "sync"] ?? P.blue;

    geoChildren.push({
      type: "line",
      props: { x1: a.cx - DIAG_X, y1: a.cy, x2: sx, y2: sy, stroke: accent, strokeWidth: 2.5 },
    });

    if (!s.done) {
      geoChildren.push({
        type: "circle",
        props: { cx: sx, cy: sy, r: 7, fill: accent, stroke: P.bg, strokeWidth: 1.5 },
      });
      if (s.label) {
        textLabels.push(el("div", {
          position: "absolute",
          left: Math.round(sx + 10), top: Math.max(4, Math.round(sy - 22)),
          fontSize: 9, fontFamily: "JetBrains Mono", color: P.textDim,
          background: hex(P.bg, 0.85), padding: "2px 5px", borderRadius: 3, display: "flex",
        }, truncate(s.label, 18)));
      }
    } else {
      const dx = b.cx - a.cx, dy = b.cy - a.cy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len, uy = dy / len;
      const tip = { x: b.cx - DIAG_X - ux * b.w / 2, y: b.cy - uy * b.h / 2 };
      const arrow = `${tip.x},${tip.y} ${tip.x - ux * 10 + uy * 5},${tip.y - uy * 10 - ux * 5} ${tip.x - ux * 10 - uy * 5},${tip.y - uy * 10 + ux * 5}`;
      geoChildren.push({ type: "polygon", props: { points: arrow, fill: accent } });
    }
  }

  // Node boxes (geometric rect) + text label overlay
  for (const n of nodes) {
    const accent = ACCENT_BY_KIND[n.kind ?? ""] ?? P.border;
    const isActive = signals.some((s) => (s.from === n.id || s.to === n.id) && s.started);
    geoChildren.push({
      type: "rect",
      props: {
        x: n.x - DIAG_X, y: n.y, width: n.w, height: n.h, rx: 8,
        fill: isActive ? hex(accent, 0.15) : hex(P.panel, 0.95),
        stroke: isActive ? accent : P.border,
        strokeWidth: isActive ? 2 : 1.2,
      },
    });
    textLabels.push(el("div", {
      position: "absolute",
      left: Math.round(n.x - DIAG_X), top: Math.round(n.y),
      width: n.w, height: n.h,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, fontFamily: "Be Vietnam Pro",
      color: isActive ? P.text : P.textDim,
      textAlign: "center", padding: "0 4px",
    }, truncate(n.label, 14)));
  }

  return buildFrame(blog, block.title ?? "Architecture", geoChildren, textLabels, frameT);
}

// ── Sequence frame builder ─────────────────────────────────────────────────────

function buildSequenceFrame(block, frameT, blog) {
  const { actors, events } = block.sequence;
  const laidActors = layoutActors(actors);
  const totalEvents = events.length;
  const rowH = Math.min(50, (H - 100) / totalEvents);

  const getActor = (id) => laidActors.find((a) => a.id === id) ?? { cx: DIAG_X + 100, topCy: 80 };

  const geoChildren = [];  // SVG geometric elements only
  const textLabels = [];   // HTML div overlays

  // Actor lifelines + boxes
  for (const a of laidActors) {
    geoChildren.push({
      type: "line",
      props: { x1: a.cx - DIAG_X, y1: a.topCy, x2: a.cx - DIAG_X, y2: H - 20, stroke: hex(P.border, 0.7), strokeWidth: 1, strokeDasharray: "4 3" },
    });
    geoChildren.push({
      type: "rect",
      props: { x: a.x - DIAG_X, y: a.y, width: a.w, height: a.h, rx: 6, fill: hex(P.panel, 0.95), stroke: P.blue, strokeWidth: 1.5 },
    });
    textLabels.push(el("div", {
      position: "absolute",
      left: Math.round(a.x - DIAG_X), top: Math.round(a.y),
      width: a.w, height: a.h,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 10, fontWeight: 600, fontFamily: "JetBrains Mono", color: P.text,
      textAlign: "center", padding: "0 3px",
    }, truncate(a.label, 12)));
  }

  // Events
  const sortedEvents = events.slice().sort((a, b) => a.phase - b.phase);
  for (let i = 0; i < sortedEvents.length; i++) {
    const ev = sortedEvents[i];
    if (frameT < ev.phase) break;
    const progress = clamp01((frameT - ev.phase) / (1 / totalEvents));
    const y = 70 + i * rowH;
    const a = getActor(ev.from);
    const b = ev.to ? getActor(ev.to) : a;
    const x1 = a.cx - DIAG_X;
    const x2 = b.cx - DIAG_X;
    const isSelf = x1 === x2;
    const accent = ACCENT_BY_KIND[ev.kind ?? "request"] ?? P.blue;
    const curX = isSelf ? x1 + 36 : lerp(x1, x2, progress);

    geoChildren.push({
      type: "line",
      props: { x1, y1: y, x2: curX, y2: y, stroke: accent, strokeWidth: 2 },
    });
    if (progress < 1) {
      geoChildren.push({ type: "circle", props: { cx: curX, cy: y, r: 5, fill: accent } });
    } else {
      const tipX = x2 + (x1 < x2 ? -6 : 6);
      const arrow = `${tipX},${y} ${tipX + (x1 < x2 ? -8 : 8)},${y - 5} ${tipX + (x1 < x2 ? -8 : 8)},${y + 5}`;
      geoChildren.push({ type: "polygon", props: { points: arrow, fill: accent } });
    }
    // Event label as HTML overlay
    const midX = Math.round((x1 + x2) / 2);
    textLabels.push(el("div", {
      position: "absolute",
      left: Math.max(2, midX - 50), top: Math.max(4, Math.round(y - 18)),
      width: 100, display: "flex", justifyContent: "center",
      fontSize: 9, fontFamily: "JetBrains Mono", color: P.textDim,
    }, truncate(ev.label, 20)));
  }

  return buildFrame(blog, block.title ?? "Sequence", geoChildren, textLabels, frameT);
}

// ── Frame shell ───────────────────────────────────────────────────────────────

function buildFrame(blog, mechTitle, geoChildren, textLabels, frameT) {
  const title = truncate(blog.title ?? "", 55);
  const mechLabel = truncate(mechTitle, 30);
  const progress = Math.round(frameT * 100);

  const gridDots = Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 14 }, (_, col) => ({
      type: "circle",
      props: { cx: 20 + col * 54, cy: 20 + row * 80, r: 1, fill: hex(P.border, 0.4) },
    }))
  ).flat();

  return el("div", {
    width: W, height: H, display: "flex", flexDirection: "row",
    background: P.bg, fontFamily: "Be Vietnam Pro", overflow: "hidden",
  }, [
    // Left: label panel
    el("div", {
      width: 440, height: H, display: "flex", flexDirection: "column",
      padding: "56px 40px 40px",
      borderRight: `1px solid ${hex(P.border, 0.8)}`,
      background: P.bgPanel,
    }, [
      el("div", { fontFamily: "Tektur", fontSize: 11, fontWeight: 600, letterSpacing: "3px", color: P.teal, marginBottom: 18, textTransform: "uppercase" }, "MECHANISM"),
      el("div", { fontSize: 26, fontWeight: 700, lineHeight: 1.2, color: P.text, marginBottom: 16 }, title),
      el("div", {
        fontSize: 13, fontFamily: "JetBrains Mono", color: P.blue,
        background: hex(P.blue, 0.08), border: `1px solid ${hex(P.blue, 0.2)}`,
        borderRadius: 8, padding: "8px 14px", marginTop: 8, display: "flex", alignSelf: "flex-start",
      }, mechLabel),
      el("div", { marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }, [
        el("div", { fontSize: 10, fontFamily: "JetBrains Mono", color: P.textMu, letterSpacing: "2px" }, `SIGNAL TRACE · ${progress}%`),
        el("div", { height: 3, background: hex(P.border, 0.6), borderRadius: 2, display: "flex" }, [
          el("div", { height: 3, width: `${progress}%`, background: `linear-gradient(90deg, ${P.blue}, ${P.teal})`, borderRadius: 2 }),
        ]),
        el("div", { fontSize: 10, fontFamily: "JetBrains Mono", color: P.textMu }, "doxuanloc.space"),
      ]),
    ]),

    // Right: diagram panel — SVG (geometric) + HTML div overlays (text labels)
    el("div", {
      position: "relative", width: DIAG_W, height: H, display: "flex", overflow: "hidden",
    }, [
      {
        type: "svg",
        props: {
          width: DIAG_W, height: H,
          viewBox: `0 0 ${DIAG_W} ${H}`,
          style: { position: "absolute", top: 0, left: 0 },
          children: [
            { type: "rect", props: { x: 0, y: 0, width: DIAG_W, height: H, fill: P.panel } },
            ...gridDots,
            ...geoChildren.filter(Boolean),
          ],
        },
      },
      ...textLabels,
    ]),
  ]);
}

// ── GIF encoder ───────────────────────────────────────────────────────────────

async function renderFrame(element) {
  const fonts = loadFonts();
  const svg = await satori(element, { width: W, height: H, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: W } });
  const rendered = resvg.render();
  return { pixels: rendered.pixels, width: rendered.width, height: rendered.height };
}

/** Pick the best block for mechanism animation: architecture > sequence > null. */
export function pickMechanismBlock(blog) {
  const blocks = blog.blocks ?? [];
  return blocks.find((b) => b.type === "architecture") ??
         blocks.find((b) => b.type === "sequence") ??
         null;
}

/**
 * Generate mechanism GIF for a blog post.
 * Returns Buffer or null if no mechanism block found.
 */
export async function generateMechanismGif(blog) {
  const block = pickMechanismBlock(blog);
  if (!block) return null;

  const TOTAL_FRAMES = 8;
  const DELAYS = [180, 160, 160, 160, 160, 160, 160, 1400]; // last frame holds

  const frames = [];
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const t = i / (TOTAL_FRAMES - 1);
    let element;
    if (block.type === "architecture") {
      element = buildArchitectureFrame(block, t, blog);
    } else {
      element = buildSequenceFrame(block, t, blog);
    }
    const rendered = await renderFrame(element);
    frames.push({ ...rendered, delay: DELAYS[i] });
  }

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

/** Save mechanism GIF. Returns public path. */
export function saveMechanismGif(blog, gif) {
  const dir = join(root, "public", "images", "mechanism");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${blog.slug}.gif`);
  writeFileSync(file, gif);
  return `/images/mechanism/${blog.slug}.gif`;
}

// ── CLI preview ────────────────────────────────────────────────────────────────

if (process.argv.includes("--preview")) {
  const arg = process.argv[process.argv.indexOf("--preview") + 1];
  const newsDir = join(root, "content", "news");
  const essaysDir = join(root, "content", "essays");

  let data = null;
  // Try essays first, then news
  for (const dir of [essaysDir, newsDir]) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "index.json")) {
      try {
        const d = JSON.parse(readFileSync(join(dir, file), "utf8"));
        const blog = d.blog ?? d;
        if (!arg || file.includes(arg) || blog.slug?.includes(arg)) {
          data = d;
          break;
        }
      } catch {}
    }
    if (data) break;
  }

  if (!data?.blog && !data?.slug) { console.error("No blog found"); process.exit(1); }
  const blog = data.blog ?? data;
  const block = pickMechanismBlock(blog);
  if (!block) { console.error(`No mechanism block (architecture/sequence) in "${blog.slug}"`); process.exit(1); }

  console.log(`Generating mechanism GIF for "${blog.title}" (${block.type})...`);
  const gif = await generateMechanismGif(blog);
  const tmpDir = join(root, "tmp");
  mkdirSync(tmpDir, { recursive: true });
  const out = join(tmpDir, `mechanism-preview-${blog.slug}.gif`);
  writeFileSync(out, gif);
  console.log(`GIF → ${out} (${Math.round(gif.length / 1024)}KB)`);
}

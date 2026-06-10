#!/usr/bin/env node
/**
 * Posts today's blog to LinkedIn via ugcPosts API.
 * Reads LINKEDIN_* from .env, guards against missing blog or duplicate post,
 * refreshes access token, builds post text, calls API, marks JSON on success.
 *
 * Always exits 0 — never blocks publish:today pipeline.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const today = new Date().toISOString().slice(0, 10);
const LINKEDIN_VERSION = "202507";
const BLOG_BASE_URL = "https://doxuanloc.space/blog/";

// ── env ──────────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

function isConfigured() {
  return !!(
    process.env.LINKEDIN_CLIENT_ID &&
    process.env.LINKEDIN_CLIENT_SECRET &&
    process.env.LINKEDIN_REFRESH_TOKEN
  );
}

// ── content ──────────────────────────────────────────────────────────────────

function dailyJsonPath(date) {
  return join(root, "content", "news", `${date}.json`);
}

function readDailyJson(date) {
  const p = dailyJsonPath(date);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

function writeDailyJson(date, data) {
  writeFileSync(dailyJsonPath(date), JSON.stringify(data, null, 2) + "\n", "utf8");
}

// ── post builder ─────────────────────────────────────────────────────────────

function extractBullets(contentMarkdown, maxBullets = 3) {
  const bullets = [];
  const headingRegex = /^#{2,3}\s+(.+)$/gm;
  const positions = [];
  let m;

  while ((m = headingRegex.exec(contentMarkdown)) !== null) {
    positions.push({ end: m.index + m[0].length });
  }

  for (let i = 0; i < positions.length && bullets.length < maxBullets; i++) {
    const start = positions[i].end;
    const end = positions[i + 1]?.end
      ? contentMarkdown.lastIndexOf("\n##", positions[i + 1].end - 1)
      : contentMarkdown.length;

    const raw = contentMarkdown
      .slice(start, end > start ? end : contentMarkdown.length)
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`[^`]*`/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^[-*+]\s+/gm, "")
      .trim();

    const para = raw.split(/\n\n/)[0] ?? "";
    const sentence = para.split(/(?<=[.!?])\s/)[0].trim();

    if (sentence.length > 20) {
      bullets.push(sentence.length > 100 ? sentence.slice(0, 97) + "…" : sentence);
    }
  }

  // Fallback: split excerpt by period
  return bullets;
}

function buildHashtags(tags = []) {
  const fromTags = tags.slice(0, 4).map(
    t => "#" + t.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("")
  );
  const evergreen = ["#SystemDesign", "#Engineering", "#AI"];
  return [...new Set([...fromTags, ...evergreen])].slice(0, 7).join(" ");
}

function buildPostText(blog) {
  const { title, excerpt, contentMarkdown, tags, slug } = blog;
  const url = `${BLOG_BASE_URL}${slug}/`;

  const hook = title.length <= 120 ? title : title.slice(0, 117) + "...";
  const excerptLine = excerpt
    ? excerpt.slice(0, 180) + (excerpt.length > 180 ? "..." : "")
    : "";

  const bullets = contentMarkdown ? extractBullets(contentMarkdown) : [];

  let post = `🚀 ${hook}\n\n`;
  if (excerptLine) post += `${excerptLine}\n\n`;
  if (bullets.length > 0) {
    post += "Thực tế khi scale:\n";
    for (const b of bullets) post += `• ${b}\n`;
    post += "\n";
  }
  post += `Phân tích chi tiết: ${url}\n\n`;
  post += "Bạn đang xử lý vấn đề này như thế nào? Comment bên dưới 👇\n\n";
  post += buildHashtags(tags);

  // Safety truncate (LinkedIn limit ~3000)
  return post.length > 2800 ? post.slice(0, 2797) + "..." : post;
}

// ── LinkedIn API ──────────────────────────────────────────────────────────────

async function refreshAccessToken() {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: process.env.LINKEDIN_REFRESH_TOKEN,
    client_id: process.env.LINKEDIN_CLIENT_ID,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    const hint =
      res.status === 400 || res.status === 401
        ? " — refresh token expired. Re-run: node scripts/setup-linkedin-auth.mjs"
        : "";
    throw new Error(`Token refresh failed (${res.status})${hint}`);
  }

  const json = await res.json();
  return json.access_token;
}

async function fetchPersonUrn(accessToken) {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": LINKEDIN_VERSION,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch person URN (${res.status})`);
  const data = await res.json();
  return `urn:li:person:${data.sub}`;
}

async function postUgc(text, authorUrn, accessToken) {
  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": LINKEDIN_VERSION,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) return { ok: false, status: res.status, body: raw };

  let shareUrn = null;
  try { shareUrn = JSON.parse(raw).id ?? null; } catch {}
  return { ok: true, shareUrn };
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();

  if (!isConfigured()) {
    console.log(
      "LinkedIn: not configured (no LINKEDIN_* env). Skipping.\n" +
      "  → Run: node scripts/setup-linkedin-auth.mjs"
    );
    return;
  }

  const data = readDailyJson(today);
  if (!data) {
    console.log(`LinkedIn: No content file for ${today} — skipping.`);
    return;
  }

  if (!data.blog?.slug || !data.blog?.title) {
    console.log(`LinkedIn: No blog for ${today} — skipping.`);
    return;
  }

  if (data.linkedin?.posted) {
    console.log(`LinkedIn: Already posted on ${data.linkedin.postedAt} — skipping.`);
    return;
  }

  let accessToken;
  try {
    accessToken = await refreshAccessToken();
  } catch (err) {
    console.error(`LinkedIn auth error: ${err.message}`);
    return;
  }

  let personUrn = process.env.LINKEDIN_PERSON_URN || "";
  if (!personUrn) {
    try {
      personUrn = await fetchPersonUrn(accessToken);
      console.log(`LinkedIn: fetched person URN. Add to .env: LINKEDIN_PERSON_URN=${personUrn}`);
    } catch (err) {
      console.error(`LinkedIn: failed to fetch person URN — ${err.message}`);
      return;
    }
  }

  const postText = buildPostText(data.blog);
  console.log(`LinkedIn: posting "${data.blog.title}" (${postText.length} chars)...`);

  let result;
  try {
    result = await postUgc(postText, personUrn, accessToken);
  } catch (err) {
    console.error(`LinkedIn: network error — ${err.message}`);
    return;
  }

  if (!result.ok) {
    const hint =
      result.status === 429 ? "Rate limited — try again later." :
      result.status === 401 || result.status === 403 ? "Auth/scope error — re-run setup-linkedin-auth.mjs." :
      `HTTP ${result.status}`;
    console.error(`LinkedIn: post failed — ${hint}`);
    return;
  }

  data.linkedin = {
    posted: true,
    postedAt: new Date().toISOString(),
    urn: result.shareUrn ?? null,
  };
  writeDailyJson(today, data);

  console.log(`LinkedIn: ✓ posted${result.shareUrn ? ` — ${result.shareUrn}` : ""}`);
}

main().catch(err => {
  // Never surface raw errors with token data; keep pipeline unblocked
  console.error("LinkedIn: unexpected error —", err.message);
});

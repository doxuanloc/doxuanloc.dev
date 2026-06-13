#!/usr/bin/env node
/**
 * Posts today's blog to LinkedIn via ugcPosts API.
 * Generates animated GIF card (orbital pulse) for LinkedIn attachment.
 * Saves static PNG as blog cover image (public/images/blog/{slug}.png).
 * Reads LINKEDIN_* from .env, guards against missing blog or duplicate post,
 * refreshes access token, builds post text, calls API, marks JSON on success.
 *
 * Always exits 0 — never blocks publish:today pipeline.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateCoverPng, generateCoverGif, saveBlogCover } from "./linkedin-card.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const today = new Date().toISOString().slice(0, 10);
const LINKEDIN_VERSION = "202507";
const BLOG_BASE_URL = "https://doxuanloc.space/blog/";
const REPOST = process.argv.includes("--repost"); // delete existing post + repost (e.g. after a card fix)

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
  return tags.slice(0, 4)
    .map(t => "#" + t.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(""))
    .join(" ");
}

function buildPostText(blog) {
  const { title, excerpt, contentMarkdown, tags, slug, linkedinPost } = blog;
  const url = `${BLOG_BASE_URL}${slug}/`;

  // Use Grok-generated post if available.
  // Strip blog URL from body — LinkedIn suppresses reach ~25-50% for external links in text.
  // URL is posted separately as first comment after publishing.
  if (linkedinPost && linkedinPost.trim().length > 100) {
    const post = linkedinPost
      .replace(/Chi tiết:[^\n]*/g, "")            // remove "Chi tiết: <url>" line
      .replace(/https?:\/\/doxuanloc\.space\/blog\/[^\s)]*/g, "") // any remaining blog URL
      .replace(/\n{3,}/g, "\n\n")                 // collapse excess blank lines
      .trim();
    return post.length > 2800 ? post.slice(0, 2797) + "..." : post;
  }

  // Fallback: extract key findings from "Kết Luận" or "Nên làm" section
  const findings = extractFindings(contentMarkdown ?? "");
  const hashtags = buildHashtags(tags);
  const hook = (excerpt ?? title).split(/[.!?]/)[0].trim();

  let post = `${hook}\n\n`;
  if (findings.length > 0) {
    for (const f of findings) post += `→ ${f}\n`;
    post += "\n";
  }
  post += `Chi tiết: ${url}\n\n`;
  post += hashtags;

  return post.length > 2800 ? post.slice(0, 2797) + "..." : post;
}

function extractFindings(md) {
  const findings = [];
  // Priority 1: lines starting with → in the markdown
  const arrowLines = (md.match(/^→.+$/gm) ?? []).slice(0, 3);
  if (arrowLines.length >= 2) {
    return arrowLines.map(l => l.replace(/^→\s*/, "").replace(/\*\*/g, "").trim().slice(0, 100));
  }
  // Priority 2: bullet items after "Nên làm" / "Kết Luận" / "Thực tế"
  const conclusionMatch = md.match(/(?:nên làm|kết luận|thực dụng|takeaway)[^\n]*\n([\s\S]{0,800})/i);
  const section = conclusionMatch ? conclusionMatch[1] : md.slice(-800);
  const bullets = section.match(/^[-*•]\s+.+$/gm) ?? [];
  for (const b of bullets.slice(0, 3)) {
    const clean = b.replace(/^[-*•]\s+/, "").replace(/\*\*/g, "").trim();
    if (clean.length > 20) findings.push(clean.slice(0, 100));
  }
  return findings;
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

async function uploadImageToLinkedIn(buffer, mimeType, accessToken, ownerUrn) {
  // Step 1: register upload
  const regBody = {
    registerUploadRequest: {
      recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
      owner: ownerUrn,
      serviceRelationships: [{
        relationshipType: "OWNER",
        identifier: "urn:li:userGeneratedContent",
      }],
    },
  };

  const regRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": LINKEDIN_VERSION,
    },
    body: JSON.stringify(regBody),
  });

  if (!regRes.ok) throw new Error(`registerUpload failed (${regRes.status})`);
  const reg = await regRes.json();
  const uploadUrl = reg.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
  const assetUrn  = reg.value.asset;

  // Step 2: upload binary (no Authorization header — URL is pre-signed)
  const upRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: buffer,
  });

  if (!upRes.ok) throw new Error(`Image upload failed (${upRes.status})`);
  return assetUrn;
}

async function postUgc(text, authorUrn, accessToken, imageAssetUrn = null) {
  const shareContent = {
    shareCommentary: { text },
    shareMediaCategory: imageAssetUrn ? "IMAGE" : "NONE",
  };

  if (imageAssetUrn) {
    shareContent.media = [{
      status: "READY",
      description: { text: "" },
      media: imageAssetUrn,
      title: { text: "" },
    }];
  }

  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
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

async function postFirstComment(postUrn, commentText, authorUrn, accessToken) {
  const res = await fetch(
    `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": LINKEDIN_VERSION,
      },
      body: JSON.stringify({
        actor: authorUrn,
        message: { text: commentText },
      }),
    },
  );
  if (!res.ok) return { ok: false, status: res.status, body: await res.text() };
  return { ok: true };
}

async function deleteUgcPost(urn, accessToken) {
  // Try the stored urn; share-urn and ugcPost-urn share the numeric id, so retry the alt form.
  const variants = [urn];
  if (urn.includes(":share:")) variants.push(urn.replace(":share:", ":ugcPost:"));
  for (const u of variants) {
    const res = await fetch(`https://api.linkedin.com/v2/ugcPosts/${encodeURIComponent(u)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": LINKEDIN_VERSION,
      },
    });
    if (res.ok || res.status === 204) return { ok: true, urn: u };
    if (res.status !== 404) return { ok: false, status: res.status, body: await res.text() };
  }
  return { ok: false, status: 404 };
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

  if (data.linkedin?.posted && !REPOST) {
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

  if (REPOST && data.linkedin?.urn) {
    console.log(`LinkedIn: --repost → deleting ${data.linkedin.urn}...`);
    const del = await deleteUgcPost(data.linkedin.urn, accessToken);
    if (del.ok) console.log(`LinkedIn: deleted ${del.urn}`);
    else console.warn(`LinkedIn: delete failed (${del.status}) — sẽ đăng bài mới, bạn xóa bài cũ thủ công nếu cần.`);
    data.linkedin = undefined;
  }

  // ── generate visuals ──────────────────────────────────────────────────────

  // PNG → save as blog cover (for the site)
  let coverPath = null;
  try {
    console.log("LinkedIn: generating cover PNG...");
    const png = await generateCoverPng(data.blog);
    coverPath = saveBlogCover(data.blog, png);
    data.blog.coverImage = coverPath;
    console.log(`LinkedIn: cover saved → ${coverPath}`);
  } catch (err) {
    console.warn(`LinkedIn: cover PNG failed — ${err.message}`);
  }

  // GIF → animated card for LinkedIn (fallback to PNG)
  let imageAssetUrn = null;
  try {
    console.log("LinkedIn: generating animated GIF card...");
    const gif = await generateCoverGif(data.blog);
    console.log(`LinkedIn: uploading GIF (${Math.round(gif.length / 1024)}KB)...`);
    imageAssetUrn = await uploadImageToLinkedIn(gif, "image/gif", accessToken, personUrn);
    console.log(`LinkedIn: GIF uploaded — ${imageAssetUrn}`);
  } catch (err) {
    // Fallback: try PNG if GIF fails
    console.warn(`LinkedIn: GIF failed (${err.message}) — trying PNG fallback...`);
    try {
      const png = await generateCoverPng(data.blog);
      imageAssetUrn = await uploadImageToLinkedIn(png, "image/png", accessToken, personUrn);
      console.log(`LinkedIn: PNG fallback uploaded — ${imageAssetUrn}`);
    } catch (err2) {
      console.warn(`LinkedIn: image upload failed — posting text-only. (${err2.message})`);
    }
  }

  // ── post ──────────────────────────────────────────────────────────────────

  const postText = buildPostText(data.blog);
  console.log(`LinkedIn: posting "${data.blog.title}" (${postText.length} chars)...`);

  let result;
  try {
    result = await postUgc(postText, personUrn, accessToken, imageAssetUrn);
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
    hasImage: !!imageAssetUrn,
    imageAssetUrn: imageAssetUrn ?? null,
  };
  writeDailyJson(today, data);

  console.log(`LinkedIn: ✓ posted${result.shareUrn ? ` — ${result.shareUrn}` : ""}`);

  // Post URL as first comment — LinkedIn suppresses reach for external links in body.
  if (result.shareUrn) {
    const blogUrl = `${BLOG_BASE_URL}${data.blog.slug}/`;
    try {
      const commentResult = await postFirstComment(
        result.shareUrn,
        `Chi tiết: ${blogUrl}`,
        personUrn,
        accessToken,
      );
      if (commentResult.ok) console.log(`LinkedIn: ✓ first comment posted — ${blogUrl}`);
      else console.warn(`LinkedIn: first comment failed (${commentResult.status}) — post link manually.`);
    } catch (err) {
      console.warn(`LinkedIn: first comment error — ${err.message}`);
    }
  }
}

main().catch(err => {
  // Never surface raw errors with token data; keep pipeline unblocked
  console.error("LinkedIn: unexpected error —", err.message);
});

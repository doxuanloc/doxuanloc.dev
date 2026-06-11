#!/usr/bin/env node
/**
 * Generates content/news/index.json — slim metadata for all daily posts.
 * Run after validate-content.mjs, before astro build.
 * Used by blog listing and news listing to avoid loading full daily JSONs.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const newsDir = join(root, "content", "news");
const essaysDir = join(root, "content", "essays");
const outPath = join(newsDir, "index.json");

const dailyFiles = readdirSync(newsDir)
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .sort()
  .reverse(); // newest first

const essayFiles = existsSync(essaysDir)
  ? readdirSync(essaysDir).filter((f) => f.endsWith(".json") && f !== ".gitkeep")
  : [];

const posts = [];
const newsIndex = [];

for (const file of dailyFiles) {
  const date = file.replace(".json", "");
  let data;
  try {
    data = JSON.parse(readFileSync(join(newsDir, file), "utf8"));
  } catch {
    console.warn(`  skip ${file} (invalid JSON)`);
    continue;
  }

  // Slim blog post metadata — no contentMarkdown, no blocks, no tldr
  if (data.blog?.slug) {
    const b = data.blog;
    posts.push({
      date,
      slug: b.slug,
      title: b.title ?? "",
      excerpt: b.excerpt ?? "",
      tags: b.tags ?? [],
      readingTimeMin: b.readingTimeMin ?? null,
      coverImage: b.coverImage ?? null,
      coverKeywords: b.coverKeywords ?? [],
      isEssay: false,
    });
  }

  // Slim news index — date + count + top tags only
  const allNews = [...(data.news ?? []), ...(data.financeNews ?? [])];
  const tagCount = {};
  for (const n of allNews) for (const t of n.tags ?? []) tagCount[t] = (tagCount[t] ?? 0) + 1;
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);

  newsIndex.push({
    date,
    newsCount: (data.news ?? []).length,
    financeCount: (data.financeNews ?? []).length,
    topTags,
  });
}

// Essay posts (deep-dive, standalone)
for (const file of essayFiles) {
  let data;
  try {
    data = JSON.parse(readFileSync(join(essaysDir, file), "utf8"));
  } catch {
    console.warn(`  skip essay ${file} (invalid JSON)`);
    continue;
  }
  const b = data.blog;
  if (b?.slug) {
    posts.push({
      date: data.date ?? file.slice(0, 10),
      slug: b.slug,
      title: b.title ?? "",
      excerpt: b.excerpt ?? "",
      tags: b.tags ?? [],
      readingTimeMin: b.readingTimeMin ?? null,
      coverImage: b.coverImage ?? b.mechanismGif ?? null,
      coverKeywords: b.coverKeywords ?? [],
      isEssay: true,
    });
  }
}

// Sort by date descending
posts.sort((a, b) => (a.date < b.date ? 1 : -1));

const index = {
  updatedAt: new Date().toISOString().slice(0, 10),
  totalDays: dailyFiles.length,
  totalEssays: essayFiles.length,
  posts,
  newsIndex,
};

writeFileSync(outPath, JSON.stringify(index, null, 2) + "\n", "utf8");
console.log(`✅ news/index.json — ${posts.length} posts, ${newsIndex.length} days`);

import rss from '@astrojs/rss';
import { getAllPosts, getAllNews, profile } from '../lib/content';

export function GET(context) {
  const site = context.site ?? 'https://doxuanloc.space';

  const posts = getAllPosts().map((p) => ({
    title: p.title,
    description: p.excerpt ?? '',
    link: `/blog/${p.slug}/`,
    pubDate: new Date(p.date),
    categories: p.tags ?? [],
  }));

  // News đưa vào feed dưới dạng item ngắn, link ra nguồn gốc.
  const news = getAllNews().map((n) => ({
    title: `[Tech radar] ${n.title}`,
    description: n.summary ?? '',
    link: n.source,
    pubDate: new Date(n.date),
    categories: n.tags ?? [],
  }));

  const items = [...posts, ...news].sort((a, b) => b.pubDate - a.pubDate);

  return rss({
    title: `${profile.identity.nameEn} — Blog & Tech radar`,
    description: profile.summary,
    site,
    items,
    customData: `<language>vi</language>`,
  });
}

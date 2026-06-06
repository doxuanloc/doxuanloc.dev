/**
 * Journey Data Utilities
 * Functions for resolving images and preparing milestone data
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import type {
  Milestone,
  MilestoneRaw,
  MilestoneKind,
  JourneyView,
  JourneyChapter,
} from "./types";
import { KIND_META, DEFAULT_KIND_META } from "./types";

const IMAGE_EXTENSIONS = ["webp", "jpg", "jpeg", "png", "avif"];

/**
 * Check if a public path exists
 */
export function resolvePublicPath(publicPath?: string): string | null {
  if (!publicPath) return null;
  const cleanPath = publicPath.replace(/^\//, "");
  const fullPath = join(process.cwd(), "public", cleanPath);
  return existsSync(fullPath) ? publicPath : null;
}

/**
 * Find journey image by ID (tries multiple extensions)
 */
export function resolveJourneyImage(id: string): string | null {
  for (const ext of IMAGE_EXTENSIONS) {
    const relativePath = `/images/journey/${id}.${ext}`;
    const fullPath = join(process.cwd(), "public", relativePath.slice(1));
    if (existsSync(fullPath)) {
      return relativePath;
    }
  }
  return null;
}

/**
 * Get kind metadata with fallback
 */
export function getKindMeta(kind: MilestoneKind | string) {
  return KIND_META[kind as MilestoneKind] ?? DEFAULT_KIND_META;
}

/**
 * Transform raw milestone data to enriched Milestone with resolved paths
 */
export function prepareMilestone(raw: MilestoneRaw, index: number): Milestone {
  return {
    ...raw,
    index,
    meta: getKindMeta(raw.kind),
    num: String(index + 1).padStart(2, "0"),
    resolvedPhoto: resolvePublicPath(raw.photo),
    resolvedImage: resolveJourneyImage(raw.id),
  };
}

/**
 * Prepare all milestones from raw data
 */
export function prepareMilestones(rawMilestones: MilestoneRaw[]): Milestone[] {
  return rawMilestones.map((m, i) => prepareMilestone(m, i));
}

// =====================================================
// New helpers for spatial story redesign (pure, view-aware)
// =====================================================

export interface ChapterGroup {
  chapter: { id: string; label: string; narrative?: string };
  beats: Milestone[];
}

/**
 * Parse a loose year string for sorting (handles "2018–2021", "2024–nay", "Tương lai").
 * Falls back to index if unparsable.
 */
function parseYearForSort(year: string): number {
  const m = year.match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : 9999;
}

/** Stable sort for strict chronological Timeline view. */
export function sortForTimeline(items: Milestone[]): Milestone[] {
  return [...items].sort((a, b) => {
    const ao = a.order ?? 9999;
    const bo = b.order ?? 9999;
    if (ao !== bo) return ao - bo;
    const ya = parseYearForSort(a.year);
    const yb = parseYearForSort(b.year);
    if (ya !== yb) return ya - yb;
    return (a.index ?? 0) - (b.index ?? 0);
  });
}

/**
 * Group prepared milestones into story chapters (primary "Story Chapters" view).
 * Chapters are derived from item.chapter (preferred) or a provided config.
 * Unassigned items go into an "uncategorized" bucket at the end (should be rare).
 */
export function groupByChapter(
  items: Milestone[],
  chapterConfig?: JourneyChapter[]
): ChapterGroup[] {
  const byId = new Map<string, Milestone[]>();

  for (const m of items) {
    const ch = m.chapter || "uncategorized";
    if (!byId.has(ch)) byId.set(ch, []);
    byId.get(ch)!.push(m);
  }

  const result: ChapterGroup[] = [];

  // If explicit config provided, respect its order
  if (chapterConfig && chapterConfig.length > 0) {
    for (const cfg of chapterConfig) {
      const beats = byId.get(cfg.id) || [];
      if (beats.length) {
        // within chapter, still respect order/year for narrative flow
        result.push({
          chapter: { id: cfg.id, label: cfg.label, narrative: cfg.narrative },
          beats: sortForTimeline(beats),
        });
        byId.delete(cfg.id);
      }
    }
  }

  // Any remaining chapters (from data only, no config entry)
  const remaining = Array.from(byId.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [id, beats] of remaining) {
    const label = id === "uncategorized" ? "Other" : id;
    result.push({
      chapter: { id, label },
      beats: sortForTimeline(beats),
    });
  }

  return result;
}

/**
 * Compute directed story connections for filament rendering.
 * Uses explicit `connectsTo` when present; otherwise falls back to
 * "previous beat in the current ordered list" for a continuous thread.
 */
export function computeConnections(
  orderedBeats: Milestone[]
): Array<{ fromId: string; toId: string; explicit: boolean }> {
  const conns: Array<{ fromId: string; toId: string; explicit: boolean }> = [];
  const idToBeat = new Map(orderedBeats.map((b) => [b.id, b]));

  for (const beat of orderedBeats) {
    if (beat.connectsTo && beat.connectsTo.length > 0) {
      for (const targetId of beat.connectsTo) {
        if (idToBeat.has(targetId)) {
          conns.push({ fromId: targetId, toId: beat.id, explicit: true });
        }
      }
    } else {
      // implicit previous for flow (only if we have a prior in this list)
      const idx = orderedBeats.indexOf(beat);
      if (idx > 0) {
        const prev = orderedBeats[idx - 1];
        conns.push({ fromId: prev.id, toId: beat.id, explicit: false });
      }
    }
  }
  return conns;
}

/**
 * Lightweight derivation helper (for editing aid / docs).
 * Scans profile experience + education + personalProjects and suggests
 * candidate raw beats that a curator can turn into proper narrative entries.
 * Does NOT auto-insert — keeps narrative ownership in journey[].
 */
export function suggestBeatsFromProfile(profile: any): Partial<MilestoneRaw>[] {
  const suggestions: Partial<MilestoneRaw>[] = [];

  // Education as foundation beats
  (profile.education ?? []).forEach((ed: any, i: number) => {
    suggestions.push({
      id: `edu-${i}`,
      year: ed.period || "",
      kind: "education",
      title: ed.degree || ed.school,
      narrative: `Foundation at ${ed.school}.`,
      tags: ["Education"],
    });
  });

  // Experience projects (flattened)
  (profile.experience ?? []).forEach((exp: any) => {
    (exp.projects ?? []).forEach((p: any) => {
      suggestions.push({
        id: `proj-${(p.name || "").toLowerCase().replace(/\s+/g, "-")}`,
        year: exp.start ? `${exp.start}${exp.end ? `–${exp.end}` : ""}` : "",
        kind: "fullstack", // curator can refine
        title: p.name,
        narrative: p.summary || "",
        tags: (p.stack ?? []).slice(0, 4),
      });
    });
  });

  // Personal projects
  (profile.personalProjects ?? []).forEach((pp: any) => {
    suggestions.push({
      id: `personal-${(pp.name || "").toLowerCase().replace(/\s+/g, "-")}`,
      year: pp.period || "",
      kind: "personal",
      title: pp.name,
      narrative: pp.summary || "",
      tags: (pp.stack ?? []).slice(0, 4),
    });
  });

  return suggestions;
}

/**
 * Journey Data Utilities
 * Functions for resolving images and preparing milestone data
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Milestone, MilestoneRaw, MilestoneKind } from "./types";
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

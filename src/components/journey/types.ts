/**
 * Journey Milestone Type Definitions
 * Centralized types for the Journey page components
 */

export type MilestoneKind =
  | "education"
  | "frontend"
  | "fullstack"
  | "blockchain"
  | "ai"
  | "future"
  | "personal"
  | "transition"; // added for finer-grained story beats (optional use)

export interface MilestoneRaw {
  id: string;
  year: string;
  kind: MilestoneKind;
  title: string;
  narrative: string;
  bullets?: string[];
  tags?: string[];
  imageConcept?: string;
  photo?: string;
  photoAlt?: string;
  codename?: string;

  // === New optional fields for spatial story redesign (non-breaking) ===
  /** Narrative chapter / sector id, e.g. "origins" | "forge" | "systems" | "intelligence" */
  chapter?: string;
  /** Story arc for filament/thread coloring and grouping, e.g. "foundation" | "build" | "scale" | "ai" */
  arc?: string;
  /** Explicit story connections: ids of prior beats this directly builds upon (drives filaments) */
  connectsTo?: string[];
  /** Explicit sort key (falls back to array order / year parsing) */
  order?: number;
  /** Visual weight for spatial emphasis (1 = normal, 1.5 = beacon, etc.) */
  weight?: number;
}

export interface KindMeta {
  /** Primary gradient color */
  c1: string;
  /** Secondary gradient color */
  c2: string;
  /** Emoji icon for placeholder visual */
  icon: string;
  /** Optional label for the kind */
  label?: string;
}

export interface Milestone extends MilestoneRaw {
  /** Kind metadata (colors, icon) */
  meta: KindMeta;
  /** Zero-padded index number (01, 02, etc.) */
  num: string;
  /** Index in the *current rendered list* (view-dependent) */
  index: number;
  /** Resolved photo path (null if not found) */
  resolvedPhoto: string | null;
  /** Resolved journey image path (null if not found) */
  resolvedImage: string | null;
}

/** Supported view modes for the journey page (user selectable) */
export type JourneyView = "chapters" | "timeline";

/** Lightweight chapter config (can also be derived from items' chapter field) */
export interface JourneyChapter {
  id: string;
  label: string; // localized or use mapping
  narrative?: string;
}

/**
 * Kind metadata configuration
 * Easy to customize colors and icons for each milestone type
 */
export const KIND_META: Record<MilestoneKind, KindMeta> = {
  education: {
    c1: "#5b8cff",
    c2: "#36d6c3",
    icon: "🎓",
    label: "Education",
  },
  frontend: {
    c1: "#36d6c3",
    c2: "#5b8cff",
    icon: "🎨",
    label: "Frontend",
  },
  fullstack: {
    c1: "#b58cff",
    c2: "#5b8cff",
    icon: "🧩",
    label: "Full-Stack",
  },
  blockchain: {
    c1: "#f0b232",
    c2: "#b58cff",
    icon: "⛓️",
    label: "Blockchain",
  },
  ai: {
    c1: "#b58cff",
    c2: "#36d6c3",
    icon: "🧠",
    label: "AI/ML",
  },
  future: {
    c1: "#5b8cff",
    c2: "#b58cff",
    icon: "🚀",
    label: "Future",
  },
  personal: {
    c1: "#f0b232",
    c2: "#36d6c3",
    icon: "🛠️",
    label: "Personal",
  },
  transition: {
    c1: "#b58cff",
    c2: "#f0b232",
    icon: "↗",
    label: "Transition",
  },
};

/**
 * Default kind meta fallback
 */
export const DEFAULT_KIND_META: KindMeta = KIND_META.fullstack;

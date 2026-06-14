// Shared types for the poker guide. No "server-only" here so client
// components (nav, progress) can import the shapes too.

export type Tier = "nybegynner" | "viderekommen" | "avansert";

export const TIER_ORDER: Tier[] = [
  "nybegynner",
  "viderekommen",
  "avansert",
];

export const TIER_META: Record<
  Tier,
  { label: string; blurb: string; suit: string }
> = {
  nybegynner: {
    label: "Nybegynner",
    blurb: "Reglene, hånd­rangeringen og hvordan en runde faktisk spilles.",
    suit: "♠",
  },
  viderekommen: {
    label: "Viderekommen",
    blurb: "Posisjon, pot odds, outs og hvordan du leser et bord.",
    suit: "♥",
  },
  avansert: {
    label: "Avansert",
    blurb: "Ranges, GTO-tankegang, bankroll og mental disiplin.",
    suit: "♦",
  },
};

// A single interactive widget referenced from markdown via a fenced block:
//   ```widget
//   hand-rankings
//   ```
export type WidgetName =
  | "hand-rankings"
  | "odds-calculator"
  | "position-trainer"
  | "quiz";

// Frontmatter parsed off the top of each lesson file.
export type LessonMeta = {
  slug: string;
  title: string;
  tier: Tier;
  order: number;
  summary: string;
  minutes: number;
};

export type Lesson = LessonMeta & {
  body: string; // markdown after the frontmatter
};

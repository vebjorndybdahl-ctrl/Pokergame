import "server-only";
import { readdir, readFile } from "fs/promises";
import path from "path";
import {
  type Lesson,
  type LessonMeta,
  type Tier,
  TIER_ORDER,
} from "./guide-types";

const GUIDE_DIR = path.join(process.cwd(), "src", "content", "guide");

// Minimal, dependency-free frontmatter parser. We control the content, so we
// only support the simple `key: value` lines we actually use -- no nested YAML.
// This keeps the build lean (no gray-matter) and the input is trusted.
function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!match) return { data: {}, body: raw };

  const data: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return { data, body: raw.slice(match[0].length) };
}

const VALID_TIERS = new Set<string>(TIER_ORDER);

function toLesson(filename: string, raw: string): Lesson {
  const { data, body } = parseFrontmatter(raw);
  const slug = filename.replace(/\.md$/, "");

  const tier = data.tier;
  if (!VALID_TIERS.has(tier)) {
    throw new Error(`Lesson "${slug}" has invalid tier: ${tier}`);
  }

  return {
    slug,
    title: data.title ?? slug,
    tier: tier as Tier,
    order: Number(data.order ?? 999),
    summary: data.summary ?? "",
    minutes: Number(data.minutes ?? 5),
    body: body.trim(),
  };
}

// Cache the parsed lessons for the lifetime of the server process. Content is
// static at build/run time, so we never need to re-read from disk per request.
let cache: Lesson[] | null = null;

async function loadAll(): Promise<Lesson[]> {
  if (cache) return cache;

  const files = (await readdir(GUIDE_DIR)).filter((f) => f.endsWith(".md"));
  const lessons = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(GUIDE_DIR, file), "utf8");
      return toLesson(file, raw);
    }),
  );

  // Sort by tier, then by the explicit `order` field within a tier.
  const tierIndex = new Map(TIER_ORDER.map((t, i) => [t, i]));
  lessons.sort((a, b) => {
    const ta = tierIndex.get(a.tier) ?? 99;
    const tb = tierIndex.get(b.tier) ?? 99;
    if (ta !== tb) return ta - tb;
    return a.order - b.order;
  });

  cache = lessons;
  return lessons;
}

export async function getAllLessons(): Promise<Lesson[]> {
  return loadAll();
}

// Lightweight list (no bodies) for nav / hub listings.
export async function getLessonIndex(): Promise<LessonMeta[]> {
  const all = await loadAll();
  return all.map((lesson) => {
    const { slug, title, tier, order, summary, minutes } = lesson;
    return { slug, title, tier, order, summary, minutes };
  });
}

export async function getLessonsByTier(): Promise<Record<Tier, LessonMeta[]>> {
  const index = await getLessonIndex();
  const grouped = { nybegynner: [], viderekommen: [], avansert: [] } as Record<
    Tier,
    LessonMeta[]
  >;
  for (const lesson of index) grouped[lesson.tier].push(lesson);
  return grouped;
}

export async function getLesson(slug: string): Promise<Lesson | null> {
  const all = await loadAll();
  return all.find((l) => l.slug === slug) ?? null;
}

// Previous / next within the full ordered sequence, for in-lesson navigation.
export async function getAdjacent(
  slug: string,
): Promise<{ prev: LessonMeta | null; next: LessonMeta | null }> {
  const index = await getLessonIndex();
  const i = index.findIndex((l) => l.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? index[i - 1] : null,
    next: i < index.length - 1 ? index[i + 1] : null,
  };
}

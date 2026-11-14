import fs from "node:fs";
import path from "node:path";

export type Post = {
  slug: string;
  title: string;
  /** ISO date, used for ordering and for the sitemap. */
  date: string;
  /** First paragraph, used as the index-page teaser and the OG description. */
  excerpt: string;
  paragraphs: string[];
  file: string;
};

/**
 * Posts live as plain-prose Markdown under `docs/`: first non-empty line is the
 * title, every other non-empty line is a paragraph.
 */
// Articles live in docs/articles/ and are listed here only once the file exists and has been reviewed.
const SOURCES: { slug: string; date: string; file: string }[] = [];

function read(source: (typeof SOURCES)[number]): Post {
  const raw = fs.readFileSync(path.join(process.cwd(), "docs", source.file), "utf8") as string;
  const lines = raw.trim().split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
  const [title, ...paragraphs] = lines;
  return { ...source, title, paragraphs, excerpt: paragraphs[0] ?? "" };
}

/**
 * Newest first. Posts published on the same day keep the order they are declared in.
 */
export function allPosts(): Post[] {
  // Article drafts may be absent from a source-only checkout. Do not publish
  // routes for content that is not present.
  return SOURCES.filter(source => fs.existsSync(path.join(process.cwd(), "docs", source.file))).map(read)
    .map((post, i) => ({ post, i }))
    .sort((a, b) => b.post.date.localeCompare(a.post.date) || a.i - b.i)
    .map(({ post }) => post);
}

export function postBySlug(slug: string): Post | undefined {
  const source = SOURCES.find((s) => s.slug === slug);
  return source && fs.existsSync(path.join(process.cwd(), "docs", source.file)) ? read(source) : undefined;
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { ASPECT_DEFINITIONS, type AspectSlug } from "@vibe-founder/shared";

interface LoadedNote {
  slug: AspectSlug;
  title: string;
  rawMarkdown: string;
  frontmatter: Record<string, unknown>;
}

let cachedNotes: LoadedNote[] | null = null;

function getNotesDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "data"),
    path.resolve(process.cwd(), "../../data"),
    path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      "../../../../data"
    ),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }

  throw new Error(
    `Could not find data/ directory. Tried: ${candidates.join(", ")}`
  );
}

function findFileByPrefix(dir: string, prefix: string): string | null {
  const files = fs.readdirSync(dir);
  const match = files.find((f) => f.startsWith(prefix) && f.endsWith(".md"));
  return match ? path.join(dir, match) : null;
}

const ASPECT_FILE_PREFIXES: Record<AspectSlug, string> = {
  "product-service": "1.",
  "customers-distribution": "2.",
  "business-model": "3.",
  "operations": "4.",
  "people-organization": "5.",
  "mission-principles-culture": "6.",
  "finance-capital": "7.",
};

export function loadFoundersNotes(): LoadedNote[] {
  if (cachedNotes) return cachedNotes;

  const notesDir = getNotesDir();

  cachedNotes = ASPECT_DEFINITIONS.map((def) => {
    const prefix = ASPECT_FILE_PREFIXES[def.slug];
    const filePath = findFileByPrefix(notesDir, prefix);

    if (!filePath) {
      throw new Error(
        `Could not find markdown file for aspect "${def.slug}" with prefix "${prefix}" in ${notesDir}`
      );
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    return {
      slug: def.slug,
      title: def.title,
      rawMarkdown: content || raw,
      frontmatter: data as Record<string, unknown>,
    };
  });

  return cachedNotes;
}

export function loadAspectBySlug(slug: AspectSlug): LoadedNote | undefined {
  const notes = loadFoundersNotes();
  return notes.find((n) => n.slug === slug);
}

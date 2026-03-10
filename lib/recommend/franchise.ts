import "server-only";

import fs from "node:fs";
import path from "node:path";
import { appDataPaths } from "@/lib/recommend/data-paths";
import type { AnimeId } from "@/lib/types";

const LINK_RELATIONS = new Set([
  "Sequel",
  "Prequel",
  "Alternative version",
  "Alternative setting",
  "Side story",
  "Parent story",
  "Full story",
  "Summary",
  "Spin-off",
]);

type RelationEntry = {
  mal_id?: number;
  type?: string;
};

type RelationGroup = {
  relation?: string;
  entry?: RelationEntry[];
};

type JikanFull = {
  data?: {
    mal_id?: number;
    relations?: RelationGroup[];
  };
};

const parent = new Map<AnimeId, AnimeId>();

function find(id: AnimeId): AnimeId {
  let root = id;

  while (parent.has(root) && parent.get(root) !== root) {
    root = parent.get(root)!;
  }

  let current = id;
  while (current !== root) {
    const next = parent.get(current)!;
    parent.set(current, root);
    current = next;
  }

  return root;
}

function union(a: AnimeId, b: AnimeId) {
  const rootA = find(a);
  const rootB = find(b);

  if (rootA !== rootB) {
    parent.set(rootB, rootA);
  }
}

let built = false;

function ensureBuilt() {
  if (built) return;
  built = true;

  const files = fs
    .readdirSync(appDataPaths.jikanDir)
    .filter((f) => f.endsWith("_full.json"))
    .sort();

  for (const file of files) {
    const match = file.match(/^anime_(\d+)_full\.json$/);
    if (!match) continue;

    const malId = Number(match[1]);
    if (!parent.has(malId)) {
      parent.set(malId, malId);
    }

    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(appDataPaths.jikanDir, file), "utf8"),
      ) as JikanFull;

      const relations = raw.data?.relations ?? [];

      for (const group of relations) {
        if (!group.relation || !LINK_RELATIONS.has(group.relation)) continue;

        for (const entry of group.entry ?? []) {
          if (entry.type !== "anime" || !entry.mal_id) continue;

          if (!parent.has(entry.mal_id)) {
            parent.set(entry.mal_id, entry.mal_id);
          }

          union(malId, entry.mal_id);
        }
      }
    } catch {
      // skip malformed files
    }
  }
}

export function getFranchiseId(id: AnimeId): AnimeId {
  ensureBuilt();

  if (!parent.has(id)) {
    return id;
  }

  return find(id);
}

export function sameFranchise(a: AnimeId, b: AnimeId): boolean {
  ensureBuilt();
  return getFranchiseId(a) === getFranchiseId(b);
}

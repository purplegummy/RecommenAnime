import "server-only";

import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { appDataPaths } from "@/lib/recommend/data-paths";
import type { AnimeCatalogEntry, AnimeId, SearchAnimeResult } from "@/lib/types";

type CsvRow = Record<string, string>;

type JikanAnime = {
  mal_id?: number;
  title?: string | null;
  title_english?: string | null;
  title_japanese?: string | null;
  images?: {
    jpg?: {
      image_url?: string | null;
      large_image_url?: string | null;
    };
    webp?: {
      image_url?: string | null;
      large_image_url?: string | null;
    };
  };
  trailer?: {
    youtube_id?: string | null;
    url?: string | null;
    embed_url?: string | null;
  };
  year?: number | null;
  episodes?: number | null;
  status?: string | null;
  source?: string | null;
  synopsis?: string | null;
  score?: number | null;
  rating?: string | null;
  genres?: Array<{ name?: string | null }>;
  themes?: Array<{ name?: string | null }>;
  demographics?: Array<{ name?: string | null }>;
  studios?: Array<{ name?: string | null }>;
  titles?: Array<{ title?: string | null }>;
};

let catalogPromise: Promise<Map<AnimeId, AnimeCatalogEntry>> | null = null;

function readCsvRows(filePath: string): CsvRow[] {
  const contents = fs.readFileSync(filePath, "utf8");
  return parse(contents, {
    columns: true,
    skip_empty_lines: true,
  }) as CsvRow[];
}

function parseAnimeId(rawKey: string) {
  const match = rawKey.match(/anime_(\d+)/);
  return match ? Number(match[1]) : null;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function chooseImage(entry: JikanAnime) {
  return (
    entry.images?.webp?.large_image_url ??
    entry.images?.webp?.image_url ??
    entry.images?.jpg?.large_image_url ??
    entry.images?.jpg?.image_url ??
    null
  );
}

const SEQUEL_SUFFIX = /(?:\s+(?:2nd|3rd|\d+(?:st|nd|rd|th))\s+season|\s+season\s+\d+|\s+part\s+\d+|\s+cour\s+\d+|\s+(?:II|III|IV|V|VI|VII|VIII|IX|X)(?:\s|$)|\s+\d+$)/i;

function isSequelLikeTitle(title: string | null) {
  if (!title) return false;
  return SEQUEL_SUFFIX.test(title);
}

function normalizeJikanEntry(entry: JikanAnime): Partial<AnimeCatalogEntry> | null {
  if (!entry.mal_id) {
    return null;
  }

  const searchableTitles = uniqueStrings([
    entry.title_english,
    entry.title,
    entry.title_japanese,
    ...(entry.titles ?? []).map((title) => title.title ?? null),
  ]);

  return {
    id: entry.mal_id,
    rawKey: `anime_${entry.mal_id}`,
    title: entry.title ?? entry.title_english ?? "Unknown title",
    titleEnglish: entry.title_english ?? null,
    titleJapanese: entry.title_japanese ?? null,
    imageUrl: chooseImage(entry),
    coverImageUrl: chooseImage(entry),
    trailerUrl: entry.trailer?.embed_url ?? entry.trailer?.url ?? null,
    year: entry.year ?? null,
    episodes: entry.episodes ?? null,
    status: entry.status ?? null,
    source: entry.source ?? null,
    synopsis: entry.synopsis ?? null,
    score: entry.score ?? null,
    rating: entry.rating ?? null,
    genres: uniqueStrings((entry.genres ?? []).map((genre) => genre.name ?? null)),
    themes: uniqueStrings((entry.themes ?? []).map((theme) => theme.name ?? null)),
    demographics: uniqueStrings(
      (entry.demographics ?? []).map((item) => item.name ?? null),
    ),
    studios: uniqueStrings((entry.studios ?? []).map((studio) => studio.name ?? null)),
    searchableTitles,
  };
}

function mergeCatalogEntries(
  base: AnimeCatalogEntry,
  next: Partial<AnimeCatalogEntry>,
): AnimeCatalogEntry {
  const merged: AnimeCatalogEntry = {
    ...base,
    ...next,
    title: next.title ?? base.title,
    titleEnglish: next.titleEnglish ?? base.titleEnglish,
    titleJapanese: next.titleJapanese ?? base.titleJapanese,
    imageUrl: next.imageUrl ?? base.imageUrl,
    coverImageUrl: next.coverImageUrl ?? base.coverImageUrl,
    trailerUrl: next.trailerUrl ?? base.trailerUrl,
    year: next.year ?? base.year,
    episodes: next.episodes ?? base.episodes,
    status: next.status ?? base.status,
    source: next.source ?? base.source,
    synopsis: next.synopsis ?? base.synopsis,
    score: next.score ?? base.score,
    rating: next.rating ?? base.rating,
    genres: uniqueStrings([...base.genres, ...(next.genres ?? [])]),
    themes: uniqueStrings([...base.themes, ...(next.themes ?? [])]),
    demographics: uniqueStrings([
      ...base.demographics,
      ...(next.demographics ?? []),
    ]),
    studios: uniqueStrings([...base.studios, ...(next.studios ?? [])]),
    searchableTitles: uniqueStrings([
      ...base.searchableTitles,
      ...(next.searchableTitles ?? []),
    ]),
  };

  return merged;
}

async function loadJikanIndex() {
  const map = new Map<AnimeId, Partial<AnimeCatalogEntry>>();
  const files = fs
    .readdirSync(appDataPaths.jikanDir)
    .filter((file) => {
      if (!file.endsWith(".json")) {
        return false;
      }

      return (
        file.endsWith("_full.json") ||
        /^top_page_\d+\.json$/.test(file) ||
        /^season_\d{4}_(winter|spring|summer|fall)_page_\d+\.json$/.test(file)
      );
    })
    .sort();

  for (const file of files) {
    const filePath = path.join(appDataPaths.jikanDir, file);
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
      data?: JikanAnime[] | JikanAnime;
    };

    const items = Array.isArray(parsed.data)
      ? parsed.data
      : parsed.data
        ? [parsed.data]
        : [];

    for (const item of items) {
      const normalized = normalizeJikanEntry(item);

      if (!normalized) {
        continue;
      }

      const existing = map.get(normalized.id!);
      map.set(
        normalized.id!,
        existing
          ? mergeCatalogEntries(existing as AnimeCatalogEntry, normalized)
          : (normalized as AnimeCatalogEntry),
      );
    }
  }

  return map;
}

async function buildCatalog() {
  const animeRows = readCsvRows(appDataPaths.animeEmbeddingsCsv);
  const jikanIndex = await loadJikanIndex();
  const catalog = new Map<AnimeId, AnimeCatalogEntry>();

  for (const row of animeRows) {
    const id = parseAnimeId(row.raw_key);

    if (!id) {
      continue;
    }

    const baseEntry: AnimeCatalogEntry = {
      id,
      rawKey: row.raw_key,
      title: row.name,
      titleEnglish: null,
      titleJapanese: null,
      imageUrl: null,
      coverImageUrl: null,
      trailerUrl: null,
      year: null,
      episodes: null,
      status: null,
      source: null,
      synopsis: null,
      score: null,
      rating: null,
      genres: [],
      themes: [],
      demographics: [],
      studios: [],
      searchableTitles: uniqueStrings([row.name]),
    };

    const metadata = jikanIndex.get(id);
    catalog.set(
      id,
      metadata
        ? mergeCatalogEntries(baseEntry, metadata as AnimeCatalogEntry)
        : baseEntry,
    );
  }

  return catalog;
}

export async function getCatalog() {
  if (!catalogPromise) {
    catalogPromise = buildCatalog();
  }

  return catalogPromise;
}

export async function getCatalogEntry(id: AnimeId) {
  const catalog = await getCatalog();
  return catalog.get(id) ?? null;
}

export async function searchCatalog(query: string, limit = 12) {
  const catalog = await getCatalog();
  const normalizedQuery = query.trim().toLowerCase();

  const results = Array.from(catalog.values())
    .map((entry) => {
      const haystack = [
        entry.titleEnglish,
        entry.title,
        entry.titleJapanese,
        ...entry.searchableTitles,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      let score = 0;

      if (entry.titleEnglish?.toLowerCase().startsWith(normalizedQuery)) {
        score += 8;
      }

      if (entry.title.toLowerCase().startsWith(normalizedQuery)) {
        score += 7;
      }

      if (haystack.includes(normalizedQuery)) {
        score += 4;
      }

      if (entry.titleEnglish?.toLowerCase().includes(normalizedQuery)) {
        score += 2;
      }

      if (entry.year) {
        score += Math.max(0, (entry.year - 1990) / 100);
      }

      if (entry.imageUrl) {
        score += 0.25;
      }

      return {
        entry,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .filter((item) => !isSequelLikeTitle(item.entry.titleEnglish ?? item.entry.title))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((item) => item.entry);

  return results satisfies SearchAnimeResult[];
}

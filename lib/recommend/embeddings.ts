import "server-only";

import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { appDataPaths } from "@/lib/recommend/data-paths";
import type { AnimeId } from "@/lib/types";

type CsvRow = Record<string, string>;
type VectorMap = Map<string, Float32Array>;

let animeEmbeddingsPromise: Promise<Map<AnimeId, Float32Array>> | null = null;
let tagEmbeddingsPromise: Promise<VectorMap> | null = null;

function readCsvRows(filePath: string): CsvRow[] {
  const contents = fs.readFileSync(filePath, "utf8");
  return parse(contents, {
    columns: true,
    skip_empty_lines: true,
  }) as CsvRow[];
}

function embeddingColumns(row: CsvRow) {
  return Object.keys(row)
    .filter((column) => column.startsWith("embedding_"))
    .sort();
}

function parseVector(row: CsvRow, columns: string[]) {
  return Float32Array.from(columns.map((column) => Number(row[column] ?? "0")));
}

function parseAnimeId(rawKey: string) {
  const match = rawKey.match(/anime_(\d+)/);
  return match ? Number(match[1]) : null;
}

function normalizeKey(name: string) {
  return name.trim().toLowerCase();
}

function unitNormalize(vector: Float32Array): Float32Array {
  let magnitude = 0;

  for (const value of vector) {
    magnitude += value * value;
  }

  const norm = Math.sqrt(magnitude) || 1;
  const result = new Float32Array(vector.length);

  for (let i = 0; i < vector.length; i += 1) {
    result[i] = vector[i] / norm;
  }

  return result;
}

async function loadAnimeEmbeddings() {
  const rows = readCsvRows(appDataPaths.animeEmbeddingsCsv);
  const columns = rows.length > 0 ? embeddingColumns(rows[0]) : [];
  const vectors = new Map<AnimeId, Float32Array>();

  for (const row of rows) {
    const id = parseAnimeId(row.raw_key);

    if (!id) {
      continue;
    }

    vectors.set(id, unitNormalize(parseVector(row, columns)));
  }

  return vectors;
}

async function loadTagEmbeddings() {
  const vectors = new Map<string, Float32Array>();
  const files = [
    "theme.csv",
    "demographic.csv",
    "source_material.csv",
    "studio.csv",
  ];

  for (const file of files) {
    const rows = readCsvRows(`${appDataPaths.embeddingsDir}/${file}`);
    const columns = rows.length > 0 ? embeddingColumns(rows[0]) : [];

    for (const row of rows) {
      const vector = parseVector(row, columns);
      vectors.set(normalizeKey(row.name), vector);
    }
  }

  return vectors;
}

export async function getAnimeEmbeddings() {
  if (!animeEmbeddingsPromise) {
    animeEmbeddingsPromise = loadAnimeEmbeddings();
  }

  return animeEmbeddingsPromise;
}

export async function getAnimeEmbedding(id: AnimeId) {
  const embeddings = await getAnimeEmbeddings();
  return embeddings.get(id) ?? null;
}

export async function getTagEmbeddings() {
  if (!tagEmbeddingsPromise) {
    tagEmbeddingsPromise = loadTagEmbeddings();
  }

  return tagEmbeddingsPromise;
}

export async function getTagEmbedding(name: string) {
  const tags = await getTagEmbeddings();
  return tags.get(normalizeKey(name)) ?? null;
}

export function getVectorDimension() {
  return 64;
}

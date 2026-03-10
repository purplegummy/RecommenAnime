import { FEATURED_TAGS } from "@/lib/recommend/config";
import { getCatalog, getCatalogEntry } from "@/lib/recommend/catalog";
import { getAnimeEmbeddings } from "@/lib/recommend/embeddings";
import { getFranchiseId } from "@/lib/recommend/franchise";
import {
  applyFeedback,
  buildBaseQuery,
  cosineSimilarity,
} from "@/lib/recommend/query";
import type {
  AnimeCatalogEntry,
  HardFilters,
  RecommendRequest,
  RecommendResponse,
  RecommendationResult,
} from "@/lib/types";

function normalizeStatus(status: string | null) {
  const value = status?.toLowerCase() ?? "";

  if (value.includes("currently")) {
    return "airing";
  }

  if (value.includes("finished")) {
    return "complete";
  }

  if (value.includes("not yet")) {
    return "upcoming";
  }

  return "all";
}

function matchesFilters(anime: AnimeCatalogEntry, filters: HardFilters) {
  if (filters.status !== "all" && normalizeStatus(anime.status) !== filters.status) {
    return false;
  }

  if (filters.minEpisodes !== null) {
    if (anime.episodes === null || anime.episodes < filters.minEpisodes) {
      return false;
    }
  }

  if (filters.maxEpisodes !== null) {
    if (anime.episodes === null || anime.episodes > filters.maxEpisodes) {
      return false;
    }
  }

  if (filters.minYear !== null) {
    if (anime.year === null || anime.year < filters.minYear) {
      return false;
    }
  }

  if (filters.maxYear !== null) {
    if (anime.year === null || anime.year > filters.maxYear) {
      return false;
    }
  }

  return true;
}

function matchesTagFilter(anime: AnimeCatalogEntry, tags: string[]) {
  if (tags.length === 0) {
    return true;
  }

  const haystack = new Set<string>([
    ...anime.genres,
    ...anime.themes,
    ...anime.demographics,
    anime.source ?? "",
  ]);

  for (const tag of tags) {
    if (haystack.has(tag)) {
      return true;
    }
  }

  return false;
}

function isSeedFranchise(
  animeId: number,
  seedFranchiseIds: Set<number>,
): boolean {
  return seedFranchiseIds.has(getFranchiseId(animeId));
}

function buildExplanation(
  anime: AnimeCatalogEntry,
  seeds: AnimeCatalogEntry[],
  request: RecommendRequest,
) {
  const reasons = new Set<string>();

  if (request.tags.length > 0) {
    for (const tag of request.tags) {
      if (
        anime.genres.includes(tag) ||
        anime.themes.includes(tag) ||
        anime.demographics.includes(tag) ||
        anime.source === tag
      ) {
        reasons.add(`Matches your ${tag} preference`);
      }
    }
  }

  for (const seed of seeds.slice(0, 3)) {
    const overlap = [...anime.genres, ...anime.themes].filter(
      (tag) => seed.genres.includes(tag) || seed.themes.includes(tag),
    );

    if (overlap.length > 0) {
      reasons.add(`Shares ${overlap[0]} energy with ${seed.titleEnglish ?? seed.title}`);
      break;
    }
  }

  if (reasons.size === 0 && anime.source) {
    reasons.add(`Notable ${anime.source.toLowerCase()} adaptation`);
  }

  const reasonList = Array.from(reasons).slice(0, 3);
  const explanation =
    reasonList[0] ??
    "Lives close to your current taste profile, with enough variety to avoid clone picks.";

  return {
    explanation,
    reasons: reasonList,
  };
}

function buildSummary(request: RecommendRequest) {
  const summary: string[] = [];

  if (request.seedIds.length > 0) {
    summary.push(`${request.seedIds.length} seed anchors`);
  }

  if (request.tags.length > 0) {
    summary.push(...request.tags.slice(0, 4));
  }

  if (request.feedback.upvotedIds.length > 0) {
    summary.push("Feedback applied");
  }

  return summary.slice(0, 6);
}

function buildSeedFranchiseIds(seeds: AnimeCatalogEntry[]): Set<number> {
  const ids = new Set<number>();

  for (const seed of seeds) {
    ids.add(getFranchiseId(seed.id));
  }

  return ids;
}

export async function recommendAnime(
  request: RecommendRequest,
): Promise<RecommendResponse> {
  const catalog = await getCatalog();
  const isPopularMode = request.seedIds.length === 0 && request.tags.length === 0;

  if (isPopularMode) {
    const popular = Array.from(catalog.values())
      .filter(
        (anime) =>
          anime.imageUrl &&
          matchesFilters(anime, request.filters),
      )
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, request.pageSize)
      .map((anime) => {
        const scoreNormalized = anime.score
          ? Math.max(0, Math.min(1, (anime.score - 5) / 4))
          : 0.5;

        return {
          anime,
          matchScore: scoreNormalized,
          explanation: anime.synopsis
            ? anime.synopsis.split(".").slice(0, 2).join(".") + "."
            : "A highly rated title from the catalog.",
          reasons: ["Popular pick"],
        } satisfies RecommendationResult;
      });

    return {
      results: popular,
      total: popular.length,
      page: 1,
      pageSize: request.pageSize,
      querySummary: ["Popular right now"],
      availableTags: [...FEATURED_TAGS],
    };
  }

  const embeddings = await getAnimeEmbeddings();

  const seedEntries = await Promise.all(
    request.seedIds.map((id) => getCatalogEntry(id)),
  );
  const activeSeeds = seedEntries.filter(
    (entry): entry is AnimeCatalogEntry => entry !== null,
  );

  const seedFranchiseIds = buildSeedFranchiseIds(activeSeeds);

  const baseQuery = await buildBaseQuery(request.seedIds, request.tags);
  const query = await applyFeedback(baseQuery, request.feedback);

  const excludedIds = new Set<number>([
    ...request.seedIds,
    ...request.feedback.downvotedIds,
  ]);

  const scoredCandidates = Array.from(embeddings.entries())
    .map(([id, embedding]) => {
      const anime = catalog.get(id);

      if (
        !anime ||
        excludedIds.has(id) ||
        !matchesFilters(anime, request.filters) ||
        (request.tags.length > 0 && !matchesTagFilter(anime, request.tags)) ||
        isSeedFranchise(id, seedFranchiseIds)
      ) {
        return null;
      }

      const score = cosineSimilarity(query, embedding);

      return {
        id,
        item: anime,
        embedding,
        score,
      };
    })
    .filter(
      (candidate): candidate is NonNullable<typeof candidate> =>
        candidate !== null,
    )
    .sort((left, right) => right.score - left.score);

  const seenFranchises = new Set(seedFranchiseIds);
  const deduped: typeof scoredCandidates = [];

  for (const candidate of scoredCandidates) {
    const fid = getFranchiseId(candidate.id);

    if (seenFranchises.has(fid)) {
      continue;
    }

    seenFranchises.add(fid);
    deduped.push(candidate);
  }

  const targetCount = Math.max(request.page * request.pageSize, request.pageSize);
  const trimmed = deduped.slice(0, targetCount);
  const pageStart = (request.page - 1) * request.pageSize;
  const pageResults = trimmed.slice(pageStart, pageStart + request.pageSize);

  const results: RecommendationResult[] = pageResults.map((candidate) => {
    const explanation = buildExplanation(candidate.item, activeSeeds, request);

    return {
      anime: candidate.item,
      matchScore: Math.max(0, Math.min(0.99, candidate.score)),
      explanation: explanation.explanation,
      reasons: explanation.reasons,
    };
  });

  if (results.length === 0) {
    const fallback = Array.from(catalog.values())
      .filter(
        (anime) =>
          matchesFilters(anime, request.filters) &&
          !excludedIds.has(anime.id) &&
          !isSeedFranchise(anime.id, seedFranchiseIds),
      )
      .sort((left, right) => {
        const leftScore = (left.score ?? 0) + (left.year ?? 0) / 10000;
        const rightScore = (right.score ?? 0) + (right.year ?? 0) / 10000;
        return rightScore - leftScore;
      })
      .slice(pageStart, pageStart + request.pageSize)
      .map((anime) => ({
        anime,
        matchScore: 0.66,
        explanation:
          "A strong fallback pick from the broader catalog while your profile is still sparse.",
        reasons: ["Cold-start fallback", "Popular catalog entry"],
      }));

    return {
      results: fallback,
      total: fallback.length,
      page: request.page,
      pageSize: request.pageSize,
      querySummary: buildSummary(request),
      availableTags: [...FEATURED_TAGS],
    };
  }

  return {
    results,
    total: deduped.length,
    page: request.page,
    pageSize: request.pageSize,
    querySummary: buildSummary(request),
    availableTags: [...FEATURED_TAGS],
  };
}

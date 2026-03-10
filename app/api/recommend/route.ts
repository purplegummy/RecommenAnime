import { NextResponse } from "next/server";
import { DEFAULT_FILTERS } from "@/lib/recommend/config";
import { recommendAnime } from "@/lib/recommend/service";
import type { RecommendRequest } from "@/lib/types";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function coerceNumber(value: unknown, fallback: number | null = null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return value;
}

function coerceRequest(payload: unknown): RecommendRequest {
  const input = (payload ?? {}) as Partial<RecommendRequest>;

  return {
    seedIds: Array.isArray(input.seedIds)
      ? input.seedIds.filter((value): value is number => typeof value === "number")
      : [],
    tags: Array.isArray(input.tags)
      ? input.tags.filter((value): value is string => typeof value === "string")
      : [],
    filters: {
      status:
        input.filters?.status === "airing" ||
        input.filters?.status === "complete" ||
        input.filters?.status === "upcoming"
          ? input.filters.status
          : DEFAULT_FILTERS.status,
      minEpisodes: coerceNumber(input.filters?.minEpisodes, null),
      maxEpisodes: coerceNumber(input.filters?.maxEpisodes, null),
      minYear: coerceNumber(input.filters?.minYear, DEFAULT_FILTERS.minYear),
      maxYear: coerceNumber(input.filters?.maxYear, DEFAULT_FILTERS.maxYear),
    },
    feedback: {
      upvotedIds: Array.isArray(input.feedback?.upvotedIds)
        ? input.feedback.upvotedIds.filter(
            (value): value is number => typeof value === "number",
          )
        : [],
      downvotedIds: Array.isArray(input.feedback?.downvotedIds)
        ? input.feedback.downvotedIds.filter(
            (value): value is number => typeof value === "number",
          )
        : [],
      focusAnimeId: coerceNumber(input.feedback?.focusAnimeId, null),
      avoidAnimeId: coerceNumber(input.feedback?.avoidAnimeId, null),
    },
    page: Math.max(1, Math.floor(coerceNumber(input.page, 1) ?? 1)),
    pageSize: clamp(
      Math.floor(coerceNumber(input.pageSize, 9) ?? 9),
      6,
      24,
    ),
  };
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const safeRequest = coerceRequest(payload);
    const results = await recommendAnime(safeRequest);

    return NextResponse.json(results);
  } catch (error) {
    console.error("recommend failed", error);
    return NextResponse.json(
      {
        message: "Unable to build recommendations right now.",
      },
      {
        status: 500,
      },
    );
  }
}

export function GET() {
  return NextResponse.json({
    message: "Use POST with your taste profile to request recommendations.",
  });
}

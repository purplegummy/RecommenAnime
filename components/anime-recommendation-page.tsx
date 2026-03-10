"use client";

import { useEffect, useMemo, useState } from "react";
import { ResultsView } from "@/components/results-view";
import { TasteSidebar } from "@/components/taste-sidebar";
import { DEFAULT_FILTERS } from "@/lib/recommend/config";
import type {
  RecommendRequest,
  RecommendResponse,
  RecommendationFeedback,
  SearchAnimeResult,
} from "@/lib/types";

const EMPTY_FEEDBACK: RecommendationFeedback = {
  upvotedIds: [],
  downvotedIds: [],
  focusAnimeId: null,
  avoidAnimeId: null,
};

export function AnimeRecommendationPage() {
  const [selectedSeeds, setSelectedSeeds] = useState<SearchAnimeResult[]>([]);
  const [response, setResponse] = useState<RecommendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoverAccent, setHoverAccent] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<RecommendationFeedback>(EMPTY_FEEDBACK);
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const requestBody: RecommendRequest = useMemo(
    () => ({
      seedIds: selectedSeeds.map((seed) => seed.id),
      tags: selectedTags,
      filters: DEFAULT_FILTERS,
      feedback,
      page,
      pageSize: 8,
    }),
    [selectedSeeds, selectedTags, feedback, page],
  );

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function fetchRecs() {
      try {
        setLoading(true);
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Recommendation request failed");

        const data = (await res.json()) as RecommendResponse;
        if (!cancelled) setResponse(data);
      } catch (error) {
        if ((error as Error).name !== "AbortError" && !cancelled) {
          setResponse(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRecs();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [requestBody]);

  function addSeed(anime: SearchAnimeResult) {
    setPage(1);
    setSelectedSeeds((current) => {
      if (current.some((seed) => seed.id === anime.id)) return current;
      return [...current, anime];
    });
  }

  function moveSeed(fromIndex: number, toIndex: number) {
    setPage(1);
    setSelectedSeeds((current) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= current.length ||
        toIndex >= current.length
      ) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }

  function toggleTag(tag: string) {
    setPage(1);
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag],
    );
  }

  function removeAnime(id: number) {
    setPage(1);
    setFeedback((current) => {
      if (current.downvotedIds.includes(id)) {
        return current;
      }

      return {
        ...current,
        downvotedIds: [...current.downvotedIds, id],
      };
    });
  }

  return (
    <main className="main-layout">
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          transition: "background 0.8s ease",
          background: hoverAccent
            ? `radial-gradient(ellipse 60% 60% at 65% 50%, ${hoverAccent}28 0%, transparent 70%)`
            : "none",
          zIndex: 0,
        }}
      />

      {!sidebarOpen && (
        <button
          type="button"
          className="sidebar-toggle"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
      )}

      <div
        className={`sidebar-overlay${sidebarOpen ? " visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <TasteSidebar
        selectedSeeds={selectedSeeds}
        onAddSeed={addSeed}
        onRemoveSeed={(id) => {
          setPage(1);
          setSelectedSeeds((current) =>
            current.filter((anime) => anime.id !== id),
          );
        }
        }
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
        onReorderSeeds={moveSeed}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <ResultsView
        loading={loading}
        results={response?.results ?? []}
        total={response?.total ?? 0}
        page={page}
        pageSize={requestBody.pageSize}
        selectedSeeds={selectedSeeds}
        onHoverAccent={setHoverAccent}
        onRemove={removeAnime}
        onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
        onNextPage={() =>
          setPage((current) => {
            const totalPages = Math.max(
              1,
              Math.ceil((response?.total ?? 0) / (response?.pageSize ?? requestBody.pageSize)),
            );
            return Math.min(totalPages, current + 1);
          })
        }
      />
    </main>
  );
}

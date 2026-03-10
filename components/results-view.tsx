"use client";

import { useState } from "react";
import Image from "next/image";
import type { RecommendationResult, SearchAnimeResult } from "@/lib/types";

type ResultsViewProps = {
  loading: boolean;
  results: RecommendationResult[];
  total: number;
  page: number;
  pageSize: number;
  selectedSeeds: SearchAnimeResult[];
  onHoverAccent: (color: string | null) => void;
  onRemove: (id: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

const PALETTE = [
  "#8B1A1A",
  "#1A4A6B",
  "#2D1B4E",
  "#4A3000",
  "#1A3A2A",
  "#4A2618",
  "#3A2B12",
  "#2B364E",
];

export function ResultsView({
  loading,
  results,
  total,
  page,
  pageSize,
  selectedSeeds,
  onHoverAccent,
  onRemove,
  onPreviousPage,
  onNextPage,
}: ResultsViewProps) {
  const [expandedSynopsis, setExpandedSynopsis] = useState<{
    title: string;
    synopsis: string;
    score: number | null;
    rating: string | null;
    year: number | null;
    episodes: number | null;
    status: string | null;
    genres: string[];
    themes: string[];
    studios: string[];
    trailerUrl: string | null;
  } | null>(null);
  const headline =
    selectedSeeds.length === 0
      ? "Popular right now"
      : `Because you liked ${selectedSeeds[0]?.titleEnglish ?? selectedSeeds[0]?.title}${
          selectedSeeds.length > 1 ? ` +${selectedSeeds.length - 1}` : ""
        }`;

  const canPrev = page > 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canNext = page < totalPages;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <div
      style={{
        flex: 1,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "40px 36px 64px",
        minWidth: 0,
        position: "relative",
        zIndex: 5,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display), 'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: 15,
            color: "rgba(255,255,255,0.42)",
          }}
        >
          {headline}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.2)",
              letterSpacing: "0.06em",
              minWidth: 60,
              textAlign: "right",
            }}
          >
            {total > 0 ? `${rangeStart}-${rangeEnd} of ${total}` : ""}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={onPreviousPage}
              disabled={!canPrev}
              aria-label="Previous recommendations"
              title="Previous recommendations"
              style={{
                minWidth: 76,
                height: 28,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "transparent",
                color: canPrev ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)",
                fontSize: 11,
                padding: "0 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                letterSpacing: "0.04em",
                cursor: canPrev ? "pointer" : "not-allowed",
              }}
            >
              <span aria-hidden="true">←</span>
              <span>Prev</span>
            </button>
            <button
              type="button"
              onClick={onNextPage}
              disabled={!canNext}
              aria-label="More recommendations"
              title="More recommendations"
              style={{
                minWidth: 76,
                height: 28,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "transparent",
                color: canNext ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)",
                fontSize: 11,
                padding: "0 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                letterSpacing: "0.04em",
                cursor: canNext ? "pointer" : "not-allowed",
              }}
            >
              <span>More</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gridAutoRows: "auto",
            alignItems: "stretch",
            gap: 12,
            minHeight: 0,
          }}
        >
          {Array.from({ length: pageSize }).map((_, index) => (
            <div
              key={index}
              style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: 4,
                animation: "pulse 1.8s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.25)",
            fontSize: 14,
          }}
        >
          No results found.
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gridAutoRows: "auto",
            alignItems: "stretch",
            gap: 12,
            minHeight: 0,
          }}
        >
          {results.slice(0, 8).map(({ anime, matchScore, explanation }, index) => (
            <article
              key={anime.id}
              className="card"
              onMouseEnter={() => onHoverAccent(PALETTE[index % PALETTE.length])}
              onMouseLeave={() => onHoverAccent(null)}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: `${Math.round(matchScore * 100)}%`,
                  height: 2,
                  background: "var(--accent)",
                  zIndex: 3,
                  borderRadius: "0 1px 1px 0",
                  opacity: 0.8,
                }}
              />

              {anime.coverImageUrl ?? anime.imageUrl ? (
                <Image
                  src={anime.coverImageUrl ?? anime.imageUrl ?? ""}
                  alt={anime.titleEnglish ?? anime.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="card-img"
                  unoptimized
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "#1e1a16",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  No cover
                </div>
              )}

              <div className="card-overlay">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(anime.id);
                  }}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 20,
                    height: 20,
                    borderRadius: "999px",
                    border: "none",
                    background: "rgba(0,0,0,0.6)",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
                <div
                  style={{
                    fontFamily: "var(--font-display), 'Playfair Display', serif",
                    fontSize: 15,
                    lineHeight: 1.25,
                    color: "white",
                    fontWeight: 500,
                  }}
                >
                  {anime.titleEnglish ?? anime.title}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: "rgba(255,255,255,0.88)",
                    textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                  }}
                >
                  {anime.year ?? "Unknown"}
                  {[...anime.genres, ...anime.themes].length > 0
                    ? ` · ${[...anime.genres, ...anime.themes].slice(0, 2).join(" · ")}`
                    : ""}
                </div>
                {explanation ? (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: "rgba(255,255,255,0.82)",
                      textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                      overflow: "hidden",
                    }}
                  >
                    {explanation}
                  </div>
                ) : null}
                {anime.synopsis ? (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 10,
                      lineHeight: 1.4,
                      color: "rgba(255,255,255,0.88)",
                      textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                      maxHeight: 44,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                    }}
                  >
                    {anime.synopsis}
                  </div>
                ) : null}
                {anime.synopsis ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setExpandedSynopsis({
                        title: anime.titleEnglish ?? anime.title,
                        synopsis: anime.synopsis ?? "",
                        score: anime.score,
                        rating: anime.rating,
                        year: anime.year,
                        episodes: anime.episodes,
                        status: anime.status,
                        genres: anime.genres,
                        themes: anime.themes,
                        studios: anime.studios,
                        trailerUrl: anime.trailerUrl ?? null,
                      });
                    }}
                    style={{
                      marginTop: 6,
                      alignSelf: "flex-start",
                      fontSize: 10,
                      color: "rgba(255,255,255,0.6)",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      textDecoration: "underline",
                      textDecorationThickness: "0.5px",
                      textUnderlineOffset: 2,
                    }}
                  >
                    View more
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
      {expandedSynopsis ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
          }}
          onClick={() => setExpandedSynopsis(null)}
        >
          <div
            style={{
              width: "min(640px, 90vw)",
              maxHeight: "80vh",
              background: "rgba(18,18,18,0.98)",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 20px 80px rgba(0,0,0,0.9)",
              padding: "18px 18px 16px",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {expandedSynopsis.trailerUrl ? (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  paddingBottom: "56.25%",
                  marginBottom: 10,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.16)",
                }}
              >
                <iframe
                  src={expandedSynopsis.trailerUrl}
                  title={`${expandedSynopsis.title} trailer`}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display), 'Playfair Display', serif",
                  fontSize: 16,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.96)",
                }}
              >
                {expandedSynopsis.title}
              </div>
              <button
                type="button"
                onClick={() => setExpandedSynopsis(null)}
                aria-label="Close"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: "none",
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                rowGap: 4,
                marginBottom: 10,
                fontSize: 11,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {expandedSynopsis.score != null && (
                <span>Score: {expandedSynopsis.score.toFixed(1)}</span>
              )}
              {expandedSynopsis.rating && <span>Rating: {expandedSynopsis.rating}</span>}
              {expandedSynopsis.year && <span>Year: {expandedSynopsis.year}</span>}
              {expandedSynopsis.episodes && (
                <span>
                  Episodes: {expandedSynopsis.episodes}
                </span>
              )}
              {expandedSynopsis.status && <span>Status: {expandedSynopsis.status}</span>}
              {[...expandedSynopsis.genres, ...expandedSynopsis.themes].length > 0 && (
                <span>
                  Tags:{" "}
                  {[...expandedSynopsis.genres, ...expandedSynopsis.themes]
                    .slice(0, 4)
                    .join(" · ")}
                </span>
              )}
              {expandedSynopsis.studios.length > 0 && (
                <span>Studio: {expandedSynopsis.studios.slice(0, 2).join(" · ")}</span>
              )}
            </div>
            <div
              style={{
                fontSize: 12,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.82)",
                overflowY: "auto",
              }}
              className="subtle-scrollbar"
            >
              {expandedSynopsis.synopsis}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { SearchAnimeResult } from "@/lib/types";
import { FEATURED_TAGS } from "@/lib/recommend/config";

type TasteSidebarProps = {
  selectedSeeds: SearchAnimeResult[];
  onAddSeed: (anime: SearchAnimeResult) => void;
  onRemoveSeed: (id: number) => void;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onReorderSeeds: (fromIndex: number, toIndex: number) => void;
  isOpen: boolean;
  onClose: () => void;
};

export function TasteSidebar({
  selectedSeeds,
  onAddSeed,
  onRemoveSeed,
  selectedTags,
  onToggleTag,
  onReorderSeeds,
  isOpen,
  onClose,
}: TasteSidebarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchAnimeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/search-anime?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const payload = (await response.json()) as SearchAnimeResult[];
        setResults(payload);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  const seedIds = useMemo(
    () => new Set(selectedSeeds.map((seed) => seed.id)),
    [selectedSeeds],
  );

  const remainingResults = results.filter((result) => !seedIds.has(result.id));

  return (
    <div
      className={`sidebar${isOpen ? " sidebar-open" : ""} subtle-scrollbar`}
    >
      <div style={{ marginBottom: 48 }}>
        <div
          style={{
            fontFamily: "var(--font-display), 'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: 20,
            color: "rgba(255,255,255,0.9)",
            letterSpacing: "-0.3px",
            lineHeight: 1,
          }}
        >
          RecommenAnime
        </div>
        <div
          style={{
            width: 24,
            height: 1,
            background: "rgba(255,160,60,0.5)",
            marginTop: 8,
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.3)",
            marginBottom: 10,
            fontWeight: 500,
          }}
        >
          Seed titles
        </div>

        <div
          style={{
            position: "relative",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 3,
            background: "rgba(255,255,255,0.04)",
            transition: "border-color 0.2s",
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search anime..."
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              padding: "9px 12px",
              fontSize: 13,
              color: "rgba(255,255,255,0.8)",
              fontFamily: "inherit",
            }}
          />
        </div>

        {loading ? (
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "rgba(255,255,255,0.25)",
            }}
          >
            searching...
          </div>
        ) : null}

        {remainingResults.length > 0 ? (
          <div
            style={{
              marginTop: 4,
              background: "#1a1916",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            {remainingResults.slice(0, 4).map((anime) => (
              <button
                key={anime.id}
                onClick={() => {
                  onAddSeed(anime);
                  setQuery("");
                  setResults([]);
                }}
                className="suggestion-item"
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: 10,
                  textAlign: "left",
                  background: "none",
                  border: "none",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 28,
                    height: 38,
                    flexShrink: 0,
                    overflow: "hidden",
                    background: "#1e1a17",
                    borderRadius: 2,
                  }}
                >
                  {anime.imageUrl ?? anime.coverImageUrl ? (
                    <Image
                      src={anime.imageUrl ?? anime.coverImageUrl ?? ""}
                      alt={anime.titleEnglish ?? anime.title}
                      fill
                      sizes="28px"
                      style={{ objectFit: "cover" }}
                      unoptimized
                    />
                  ) : null}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.8)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {anime.titleEnglish ?? anime.title}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    {anime.year ?? "—"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {selectedSeeds.length > 0 ? (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {selectedSeeds.map((seed, index) => (
            <button
              key={seed.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex === null || dragIndex === index) return;
                onReorderSeeds(dragIndex, index);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className="seed-tag"
              style={{
                justifyContent: "space-between",
                opacity: dragIndex === index ? 0.6 : 1,
                cursor: "grab",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                {index === 0 ? "primary" : index === 1 ? "secondary" : `seed ${index + 1}`}
              </span>
              <span
                style={{
                  flex: 1,
                  marginLeft: 8,
                  marginRight: 8,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  textAlign: "left",
                }}
              >
                {seed.titleEnglish ?? seed.title}
              </span>
              <span
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveSeed(seed.id);
                }}
                style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}
              >
                ✕
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div style={{ marginTop: 24 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.3)",
            marginBottom: 10,
            fontWeight: 500,
          }}
        >
          Tag filter
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {FEATURED_TAGS.slice(0, 14).map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => onToggleTag(tag)}
                className="seed-tag"
                style={{
                  fontSize: 11,
                  padding: "3px 9px",
                  background: active
                    ? "rgba(255,160,60,0.18)"
                    : "rgba(255,255,255,0.06)",
                  borderColor: active
                    ? "rgba(255,160,60,0.9)"
                    : "rgba(255,255,255,0.14)",
                  color: active
                    ? "rgba(255,255,255,0.9)"
                    : "rgba(255,255,255,0.7)",
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.18)",
          lineHeight: 1.6,
        }}
      >
        Pick a title.
        <br />
        Hover a card.
        <br />
        That&apos;s it.
      </div>
    </div>
  );
}

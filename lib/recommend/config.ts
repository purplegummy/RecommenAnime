import type { HardFilters } from "@/lib/types";

export const FEATURED_TAGS = [
  "Action",
  "Adventure",
  "Drama",
  "Suspense",
  "Psychological",
  "Supernatural",
  "Romance",
  "Comedy",
  "Fantasy",
  "Isekai",
  "Mecha",
  "Slice of Life",
  "School",
  "Historical",
  "Shounen",
  "Seinen",
  "Shoujo",
  "Josei",
  "Original",
  "Manga",
  "Light novel",
  "Visual novel",
  "Game",
] as const;

export const TAG_GROUPS = [
  {
    id: "tone",
    tags: [
      "Psychological",
      "Suspense",
      "Drama",
      "Comedy",
      "Romance",
      "Slice of Life",
      "Supernatural",
    ],
  },
  {
    id: "world",
    tags: [
      "Fantasy",
      "Isekai",
      "Mecha",
      "Historical",
      "Adventure",
      "Action",
      "School",
    ],
  },
  {
    id: "audience",
    tags: ["Shounen", "Seinen", "Shoujo", "Josei"],
  },
  {
    id: "source",
    tags: ["Original", "Manga", "Light novel", "Visual novel", "Game"],
  },
] as const;

export const TAG_RELATIONSHIPS: Record<string, string[]> = {
  Action: ["Adventure", "Shounen", "Mecha"],
  Adventure: ["Fantasy", "Action", "Historical"],
  Psychological: ["Suspense", "Seinen", "Supernatural"],
  Romance: ["Slice of Life", "School", "Shoujo"],
  Comedy: ["Slice of Life", "School", "Shounen"],
  Fantasy: ["Adventure", "Isekai", "Original"],
  Isekai: ["Fantasy", "Light novel", "Adventure"],
  Mecha: ["Action", "Psychological", "Original"],
  "Slice of Life": ["Romance", "Comedy", "School"],
  School: ["Romance", "Comedy", "Slice of Life"],
  Historical: ["Drama", "Action", "Seinen"],
  Suspense: ["Psychological", "Drama", "Seinen"],
  Supernatural: ["Psychological", "Fantasy", "Josei"],
  Shounen: ["Action", "Adventure", "Comedy"],
  Seinen: ["Psychological", "Drama", "Historical"],
  Shoujo: ["Romance", "School", "Comedy"],
  Josei: ["Romance", "Slice of Life", "Supernatural"],
  Original: ["Mecha", "Fantasy"],
  Manga: ["Shounen", "Seinen", "Drama"],
  "Light novel": ["Isekai", "Fantasy", "Action"],
  "Visual novel": ["Psychological", "Romance", "Supernatural"],
  Game: ["Fantasy", "Action", "Adventure"],
};


export const DEFAULT_FILTERS: HardFilters = {
  status: "all",
  minEpisodes: null,
  maxEpisodes: null,
  minYear: null,
  maxYear: null,
};

// No additional soft preferences at the moment; all ranking is purely
// driven by the embedding similarity and hard filters.

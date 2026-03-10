export type AnimeId = number;

export type HardFilters = {
  status: "all" | "airing" | "complete" | "upcoming";
  minEpisodes: number | null;
  maxEpisodes: number | null;
  minYear: number | null;
  maxYear: number | null;
};

export type RecommendationFeedback = {
  upvotedIds: AnimeId[];
  downvotedIds: AnimeId[];
  focusAnimeId: AnimeId | null;
  avoidAnimeId: AnimeId | null;
};

export type AnimeCatalogEntry = {
  id: AnimeId;
  rawKey: string;
  title: string;
  titleEnglish: string | null;
  titleJapanese: string | null;
  imageUrl: string | null;
  coverImageUrl: string | null;
  trailerUrl: string | null;
  year: number | null;
  episodes: number | null;
  status: string | null;
  source: string | null;
  synopsis: string | null;
  score: number | null;
  rating: string | null;
  genres: string[];
  themes: string[];
  demographics: string[];
  studios: string[];
  searchableTitles: string[];
};

export type SearchAnimeResult = Pick<
  AnimeCatalogEntry,
  | "id"
  | "title"
  | "titleEnglish"
  | "titleJapanese"
  | "imageUrl"
  | "coverImageUrl"
  | "year"
  | "genres"
  | "themes"
  | "studios"
>;

export type RecommendationResult = {
  anime: AnimeCatalogEntry;
  matchScore: number;
  explanation: string;
  reasons: string[];
};

export type RecommendRequest = {
  seedIds: AnimeId[];
  tags: string[];
  filters: HardFilters;
  feedback: RecommendationFeedback;
  page: number;
  pageSize: number;
};

export type RecommendResponse = {
  results: RecommendationResult[];
  total: number;
  page: number;
  pageSize: number;
  querySummary: string[];
  availableTags: string[];
};

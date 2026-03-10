import path from "node:path";

const dataRoot = path.join(process.cwd(), "data");

export const appDataPaths = {
  root: dataRoot,
  embeddingsDir: path.join(dataRoot, "embeddings"),
  jikanDir: path.join(dataRoot, "jikan"),
  animeEmbeddingsCsv: path.join(dataRoot, "embeddings", "anime.csv"),
};

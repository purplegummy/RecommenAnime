import { getAnimeEmbedding, getTagEmbedding, getVectorDimension } from "@/lib/recommend/embeddings";
import type { RecommendationFeedback } from "@/lib/types";

export function createEmptyVector() {
  return new Float32Array(getVectorDimension());
}

export function cloneVector(vector: Float32Array) {
  return Float32Array.from(vector);
}

export function addScaledVector(
  target: Float32Array,
  source: Float32Array,
  scale: number,
) {
  for (let index = 0; index < target.length; index += 1) {
    target[index] += source[index] * scale;
  }

  return target;
}

export function averageVectors(vectors: Float32Array[]) {
  if (vectors.length === 0) {
    return createEmptyVector();
  }

  const sum = createEmptyVector();
  for (const vector of vectors) {
    addScaledVector(sum, vector, 1);
  }

  return scaleVector(sum, 1 / vectors.length);
}

export function scaleVector(vector: Float32Array, scale: number) {
  const next = cloneVector(vector);
  for (let index = 0; index < next.length; index += 1) {
    next[index] *= scale;
  }

  return next;
}

export function normalizeVector(vector: Float32Array) {
  let magnitude = 0;

  for (const value of vector) {
    magnitude += value * value;
  }

  const safeMagnitude = Math.sqrt(magnitude) || 1;
  const next = cloneVector(vector);

  for (let index = 0; index < next.length; index += 1) {
    next[index] /= safeMagnitude;
  }

  return next;
}

export function cosineSimilarity(left: Float32Array, right: Float32Array) {
  let sum = 0;

  for (let index = 0; index < left.length; index += 1) {
    sum += left[index] * right[index];
  }

  return sum;
}

export async function buildBaseQuery(seedIds: number[], tags: string[]) {
  const query = createEmptyVector();
  const seedVectors: { vector: Float32Array; weight: number }[] = [];
  const selectedTagVectors: Float32Array[] = [];

  const totalSeeds = seedIds.length;

  for (let index = 0; index < totalSeeds; index += 1) {
    const seedId = seedIds[index];
    const vector = await getAnimeEmbedding(seedId);
    if (vector) {
      const weight = totalSeeds - index;
      seedVectors.push({ vector, weight });
    }
  }

  for (const tag of tags) {
    const vector = await getTagEmbedding(tag);
    if (vector) {
      selectedTagVectors.push(vector);
    }
  }

  if (seedVectors.length > 0) {
    const combined = createEmptyVector();
    let totalWeight = 0;

    for (const { vector, weight } of seedVectors) {
      addScaledVector(combined, vector, weight);
      totalWeight += weight;
    }

    const averaged = totalWeight > 0 ? scaleVector(combined, 1 / totalWeight) : combined;
    addScaledVector(query, averaged, 1);
  }

  if (selectedTagVectors.length > 0) {
    addScaledVector(query, averageVectors(selectedTagVectors), 0.5);
  }

  return normalizeVector(query);
}

export async function applyFeedback(
  baseQuery: Float32Array,
  feedback: RecommendationFeedback,
) {
  // Feedback is only used for explicit exclusions in the service layer.
  // The query direction remains the same as the base query.
  void feedback;
  return normalizeVector(baseQuery);
}

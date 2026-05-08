/**
 * Vector search using pre-computed page embeddings + runtime query embedding.
 *
 * At build time, scripts/embed-wiki.mjs generates wiki-embeddings.json.
 * At runtime, this module computes the query embedding via DashScope API,
 * then does cosine similarity against stored vectors.
 */

import * as fs from "fs"
import * as path from "path"
import type { VectorSearchResult, SearchResult, FusedSearchResult } from "./types"

// DashScope embedding config
const DASHSCOPE_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings"
const MODEL = "text-embedding-v4"

// RRF constant (same as llm_wiki)
const RRF_K = 60

interface EmbeddingData {
  hash: string
  vector: number[]
}

interface EmbeddingsFile {
  version: 1
  embeddings: Record<string, EmbeddingData>
}

/** Cosine similarity between two vectors. */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

/** Fetch query embedding from DashScope API. */
async function fetchQueryEmbedding(query: string, apiKey: string): Promise<number[]> {
  const resp = await fetch(DASHSCOPE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, input: [query] }),
  })

  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`DashScope embedding API ${resp.status}: ${body}`)
  }

  const json = await resp.json()
  return json.data[0].embedding
}

/** Search pre-computed page embeddings by cosine similarity. */
export function searchByVectors(
  queryVector: number[],
  storedEmbeddings: Record<string, EmbeddingData>,
  topK: number = 10,
): VectorSearchResult[] {
  const results: VectorSearchResult[] = []

  for (const [id, data] of Object.entries(storedEmbeddings)) {
    const similarity = cosineSimilarity(queryVector, data.vector)
    results.push({ id, similarity })
  }

  results.sort((a, b) => b.similarity - a.similarity)
  return results.slice(0, topK)
}

/**
 * RRF fusion of token search results and vector search results.
 * Same algorithm as llm_wiki: score = sum(1 / (K + rank)) for each list.
 */
export function fuseResults(
  tokenResults: SearchResult[],
  vectorResults: VectorSearchResult[],
  pageTitles: Map<string, string>,
  pageSnippets: Map<string, string>,
): FusedSearchResult[] {
  // Build rank maps (1-indexed)
  const tokenRankMap = new Map<string, number>()
  tokenResults.forEach((r, i) => tokenRankMap.set(r.id, i + 1))

  const vectorRankMap = new Map<string, number>()
  vectorResults.forEach((r, i) => vectorRankMap.set(r.id, i + 1))

  // Collect all unique IDs
  const allIds = new Set([...tokenRankMap.keys(), ...vectorRankMap.keys()])

  const fused: FusedSearchResult[] = []

  for (const id of allIds) {
    const tokenRank = tokenRankMap.get(id)
    const vectorRank = vectorRankMap.get(id)

    let rrfScore = 0
    if (tokenRank !== undefined) rrfScore += 1 / (RRF_K + tokenRank)
    if (vectorRank !== undefined) rrfScore += 1 / (RRF_K + vectorRank)

    const tokenResult = tokenResults.find((r) => r.id === id)

    fused.push({
      id,
      title: tokenResult?.title ?? pageTitles.get(id) ?? id,
      snippet: tokenResult?.snippet ?? pageSnippets.get(id) ?? "",
      titleMatch: tokenResult?.titleMatch ?? false,
      rrfScore,
      tokenRank,
      vectorRank,
    })
  }

  fused.sort((a, b) => b.rrfScore - a.rrfScore)
  return fused
}

/** Load pre-computed embeddings from wiki-embeddings.json via fs (avoids TS type-checking the 1MB+ JSON). */
export async function loadEmbeddings(): Promise<Record<string, EmbeddingData> | null> {
  try {
    const filePath = path.join(process.cwd(), "data", "wiki-embeddings.json")
    const raw = fs.readFileSync(filePath, "utf-8")
    const file = JSON.parse(raw) as EmbeddingsFile
    return file.embeddings
  } catch {
    return null
  }
}

/** Main entry: compute query embedding + vector search. Returns null if embedding unavailable. */
export async function vectorSearch(
  query: string,
  storedEmbeddings: Record<string, EmbeddingData>,
  apiKey: string,
  topK: number = 10,
): Promise<VectorSearchResult[]> {
  const queryVector = await fetchQueryEmbedding(query, apiKey)
  return searchByVectors(queryVector, storedEmbeddings, topK)
}

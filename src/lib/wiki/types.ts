/** A single page in the pre-built wiki index. */
export interface WikiPage {
  id: string
  title: string
  type: string
  path: string
  sources: string[]
  tags: string[]
  related: string[]
  content: string
  outLinks: string[]
  inLinks: string[]
}

/** Pre-built wiki index loaded at runtime from JSON. */
export interface WikiPageIndex {
  version: 1
  builtAt: string
  pages: WikiPage[]
  graph: {
    adjacency: Record<string, string[]>
    neighbors: Record<string, { id: string; relevance: number }[]>
  }
  indexContent: string
  overviewContent: string
}

/** Token search result (no vector/RRF in v1). */
export interface SearchResult {
  id: string
  title: string
  snippet: string
  titleMatch: boolean
  score: number
}

/** Vector search result from embedding similarity. */
export interface VectorSearchResult {
  id: string
  similarity: number
}

/** RRF-fused search result combining token + vector signals. */
export interface FusedSearchResult {
  id: string
  title: string
  snippet: string
  titleMatch: boolean
  rrfScore: number
  tokenRank?: number
  vectorRank?: number
}

/** Chat message shape for the API. */
export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

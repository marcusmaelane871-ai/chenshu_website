/**
 * Token search for wiki pages — adapted from llm_wiki/src/lib/search.ts.
 *
 * Key changes from the original:
 *   - searchWiki() takes a WikiPageIndex object instead of projectPath + Tauri readFile
 *   - No vector search or RRF fusion (v1: token-only)
 *   - Scoring constants are exported for use by build script
 *   - No ImageRef (not needed for chat API)
 */

import type { WikiPageIndex, SearchResult } from "./types"

// ── Scoring weights (exported for build script) ────────────────────────────
export const FILENAME_EXACT_BONUS = 200
export const PHRASE_IN_TITLE_BONUS = 50
export const PHRASE_IN_CONTENT_PER_OCC = 20
export const MAX_PHRASE_OCC_COUNTED = 10
export const TITLE_TOKEN_WEIGHT = 5
export const CONTENT_TOKEN_WEIGHT = 1

const MAX_RESULTS = 20
const SNIPPET_CONTEXT = 80

const STOP_WORDS = new Set([
  "的", "是", "了", "什么", "在", "有", "和", "与", "对", "从",
  "the", "is", "a", "an", "what", "how", "are", "was", "were",
  "do", "does", "did", "be", "been", "being", "have", "has", "had",
  "it", "its", "in", "on", "at", "to", "for", "of", "with", "by",
  "this", "that", "these", "those",
])

export function tokenizeQuery(query: string): string[] {
  const rawTokens = query
    .toLowerCase()
    .split(/[\s,，。！？、；：""''（）()\-_/\\·~～…]+/)
    .filter((t) => t.length > 1)
    .filter((t) => !STOP_WORDS.has(t))

  const tokens: string[] = []

  for (const token of rawTokens) {
    const hasCJK = /[一-鿿㐀-䶿]/.test(token)

    if (hasCJK && token.length > 2) {
      const chars = [...token]
      for (let i = 0; i < chars.length - 1; i++) {
        tokens.push(chars[i] + chars[i + 1])
      }
      for (const ch of chars) {
        if (!STOP_WORDS.has(ch)) {
          tokens.push(ch)
        }
      }
      tokens.push(token)
    } else {
      tokens.push(token)
    }
  }

  return [...new Set(tokens)]
}

function tokenMatchScore(text: string, tokens: readonly string[]): number {
  const lower = text.toLowerCase()
  let score = 0
  for (const token of tokens) {
    if (lower.includes(token)) score += 1
  }
  return score
}

export function countOccurrences(haystackLower: string, needleLower: string): number {
  if (!needleLower || needleLower.length === 0) return 0
  let count = 0
  let pos = 0
  while (true) {
    const idx = haystackLower.indexOf(needleLower, pos)
    if (idx === -1) break
    count++
    pos = idx + needleLower.length
  }
  return count
}

export function extractTitle(content: string, fallbackName: string): string {
  const frontmatterMatch = content.match(/^---\n[\s\S]*?^title:\s*["']?(.+?)["']?\s*$/m)
  if (frontmatterMatch) return frontmatterMatch[1].trim()

  const headingMatch = content.match(/^#\s+(.+)$/m)
  if (headingMatch) return headingMatch[1].trim()

  return fallbackName.replace(/\.md$/, "").replace(/-/g, " ")
}

function buildSnippet(content: string, query: string): string {
  const lower = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lower.indexOf(lowerQuery)
  if (idx === -1) return content.slice(0, SNIPPET_CONTEXT * 2).replace(/\n/g, " ")

  const start = Math.max(0, idx - SNIPPET_CONTEXT)
  const end = Math.min(content.length, idx + query.length + SNIPPET_CONTEXT)
  let snippet = content.slice(start, end).replace(/\n/g, " ")
  if (start > 0) snippet = "..." + snippet
  if (end < content.length) snippet = snippet + "..."
  return snippet
}

const TRIM_PUNCT_RE =
  /^[\s,，。！？、；：""''（）()\-_/\\·~～…]+|[\s,，。！？、；：""''（）()\-_/\\·~～…]+$/g

/**
 * Search wiki pages by token matching. Returns results sorted by score descending.
 */
export function searchWiki(index: WikiPageIndex, query: string): SearchResult[] {
  if (!query.trim()) return []

  const tokens = tokenizeQuery(query)
  const effectiveTokens = tokens.length > 0 ? tokens : [query.trim().toLowerCase()]
  const queryPhrase = query.trim().toLowerCase().replace(TRIM_PUNCT_RE, "")

  const results: SearchResult[] = []

  for (const page of index.pages) {
    const titleText = `${page.title} ${page.id}`
    const titleLower = titleText.toLowerCase()
    const contentLower = page.content.toLowerCase()
    const fileStem = page.id.toLowerCase()

    const filenameExact = fileStem === queryPhrase
    const titleHasPhrase =
      queryPhrase.length > 0 && titleLower.includes(queryPhrase)
    const contentPhraseOcc = Math.min(
      countOccurrences(contentLower, queryPhrase),
      MAX_PHRASE_OCC_COUNTED,
    )

    const titleTokenScore = tokenMatchScore(titleText, effectiveTokens)
    const contentTokenScore = tokenMatchScore(page.content, effectiveTokens)

    if (
      !filenameExact &&
      !titleHasPhrase &&
      contentPhraseOcc === 0 &&
      titleTokenScore === 0 &&
      contentTokenScore === 0
    ) {
      continue
    }

    const score =
      (filenameExact ? FILENAME_EXACT_BONUS : 0) +
      (titleHasPhrase ? PHRASE_IN_TITLE_BONUS : 0) +
      contentPhraseOcc * PHRASE_IN_CONTENT_PER_OCC +
      titleTokenScore * TITLE_TOKEN_WEIGHT +
      contentTokenScore * CONTENT_TOKEN_WEIGHT

    const isTitleMatch = titleTokenScore > 0 || titleHasPhrase

    const snippetAnchor =
      contentPhraseOcc > 0
        ? queryPhrase
        : effectiveTokens.find((t) => contentLower.includes(t)) ?? query

    results.push({
      id: page.id,
      title: page.title,
      snippet: buildSnippet(page.content, snippetAnchor),
      titleMatch: isTitleMatch,
      score,
    })
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.id.localeCompare(b.id)
  })

  return results.slice(0, MAX_RESULTS)
}

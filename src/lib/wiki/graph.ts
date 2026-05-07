/**
 * Graph relevance — adapted from llm_wiki/src/lib/graph-relevance.ts.
 *
 * Key changes:
 *   - calculateRelevance() operates on WikiPage + adjacency data (no RetrievalGraph)
 *   - getRelatedNodes() reads from pre-computed index.graph.neighbors (no runtime traversal)
 *   - extractFrontmatter, extractWikilinks, resolveTarget exported for build script
 *   - No Tauri readFile/listDirectory
 */

import type { WikiPage, WikiPageIndex } from "./types"

// ── Constants ──────────────────────────────────────────────────────────────

export const WIKILINK_REGEX = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g

const WEIGHTS = {
  directLink: 3.0,
  sourceOverlap: 4.0,
  commonNeighbor: 1.5,
  typeAffinity: 1.0,
} as const

const TYPE_AFFINITY: Record<string, Record<string, number>> = {
  entity: { concept: 1.2, entity: 0.8, source: 1.0, synthesis: 1.0, query: 0.8 },
  concept: { entity: 1.2, concept: 0.8, source: 1.0, synthesis: 1.2, query: 1.0 },
  source: { entity: 1.0, concept: 1.0, source: 0.5, query: 0.8, synthesis: 1.0 },
  query: { concept: 1.0, entity: 0.8, synthesis: 1.0, source: 0.8, query: 0.5 },
  synthesis: { concept: 1.2, entity: 1.0, source: 1.0, query: 1.0, synthesis: 0.8 },
}

// ── Helpers exported for build script ──────────────────────────────────────

export function extractFrontmatter(content: string): { title: string; type: string; sources: string[] } {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  const fm = fmMatch ? fmMatch[1] : ""

  const titleMatch = fm.match(/^title:\s*["']?(.+?)["']?\s*$/m)
  const typeMatch = fm.match(/^type:\s*["']?(.+?)["']?\s*$/m)

  const sources: string[] = []
  const sourcesBlockMatch = fm.match(/^sources:\s*\n((?:\s+-\s+.+\n?)*)/m)
  if (sourcesBlockMatch) {
    const lines = sourcesBlockMatch[1].split("\n")
    for (const line of lines) {
      const itemMatch = line.match(/^\s+-\s+["']?(.+?)["']?\s*$/)
      if (itemMatch) {
        sources.push(itemMatch[1])
      }
    }
  } else {
    const inlineMatch = fm.match(/^sources:\s*\[([^\]]*)\]/m)
    if (inlineMatch) {
      const items = inlineMatch[1].split(",")
      for (const item of items) {
        const trimmed = item.trim().replace(/^["']|["']$/g, "")
        if (trimmed) sources.push(trimmed)
      }
    }
  }

  let title = titleMatch ? titleMatch[1].trim() : ""
  if (!title) {
    const headingMatch = content.match(/^#\s+(.+)$/m)
    title = headingMatch ? headingMatch[1].trim() : ""
  }

  return {
    title,
    type: typeMatch ? typeMatch[1].trim().toLowerCase() : "other",
    sources,
  }
}

export function extractWikilinks(content: string): string[] {
  const links: string[] = []
  const regex = new RegExp(WIKILINK_REGEX.source, "g")
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1].trim())
  }
  return links
}

export function resolveTarget(
  raw: string,
  nodeIds: ReadonlySet<string>,
): string | null {
  if (nodeIds.has(raw)) return raw

  const normalized = raw.toLowerCase().replace(/\s+/g, "-")
  for (const id of nodeIds) {
    const idLower = id.toLowerCase()
    if (idLower === normalized) return id
    if (idLower === raw.toLowerCase()) return id
    if (idLower.replace(/\s+/g, "-") === normalized) return id
  }
  return null
}

// ── Core relevance calculation (used at build time) ────────────────────────

function getNeighborIds(page: WikiPage): Set<string> {
  const neighbors = new Set<string>()
  for (const id of page.outLinks) neighbors.add(id)
  for (const id of page.inLinks) neighbors.add(id)
  return neighbors
}

function getNodeDegree(page: WikiPage): number {
  return page.outLinks.length + page.inLinks.length
}

export function calculateRelevance(
  pageA: WikiPage,
  pageB: WikiPage,
  pagesById: ReadonlyMap<string, WikiPage>,
): number {
  if (pageA.id === pageB.id) return 0

  // Signal 1: Direct links
  const forwardLinks = pageA.outLinks.includes(pageB.id) ? 1 : 0
  const backwardLinks = pageB.outLinks.includes(pageA.id) ? 1 : 0
  const directLinkScore = (forwardLinks + backwardLinks) * WEIGHTS.directLink

  // Signal 2: Source overlap
  const sourcesA = new Set(pageA.sources)
  let sharedSourceCount = 0
  for (const src of pageB.sources) {
    if (sourcesA.has(src)) sharedSourceCount += 1
  }
  const sourceOverlapScore = sharedSourceCount * WEIGHTS.sourceOverlap

  // Signal 3: Common neighbors — Adamic-Adar
  const neighborsA = getNeighborIds(pageA)
  const neighborsB = getNeighborIds(pageB)
  let adamicAdar = 0
  for (const neighborId of neighborsA) {
    if (neighborsB.has(neighborId)) {
      const neighbor = pagesById.get(neighborId)
      if (neighbor) {
        const degree = getNodeDegree(neighbor)
        adamicAdar += 1 / Math.log(Math.max(degree, 2))
      }
    }
  }
  const commonNeighborScore = adamicAdar * WEIGHTS.commonNeighbor

  // Signal 4: Type affinity
  const affinityMap = TYPE_AFFINITY[pageA.type]
  const typeAffinityScore = (affinityMap?.[pageB.type] ?? 0.5) * WEIGHTS.typeAffinity

  return directLinkScore + sourceOverlapScore + commonNeighborScore + typeAffinityScore
}

// ── Runtime: get related nodes from pre-computed index ─────────────────────

export function getRelatedNodes(
  nodeId: string,
  index: WikiPageIndex,
  minRelevance: number = 2.0,
  limit: number = 3,
): ReadonlyArray<{ id: string; relevance: number }> {
  const neighbors = index.graph.neighbors[nodeId]
  if (!neighbors) return []

  return neighbors
    .filter((n) => n.relevance >= minRelevance)
    .slice(0, limit)
}

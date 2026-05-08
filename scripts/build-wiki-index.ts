/**
 * Build-time wiki index generator.
 *
 * Reads all .md files from self_knowledgev1/wiki, extracts metadata + wikilinks,
 * builds a bidirectional link graph, pre-computes neighbor relevance scores,
 * and outputs src/data/wiki-index.json for runtime consumption.
 */

import * as fs from "fs"
import * as path from "path"

// Inline types + helpers from src/lib/wiki (can't import TS with path aliases in tsx)
// These must stay in sync with the runtime modules.

interface WikiPage {
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

interface WikiPageIndex {
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

// ── Helpers (duplicated from graph.ts — no path alias available in tsx) ────

const WIKILINK_REGEX = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g

function extractFrontmatter(content: string): { title: string; type: string; sources: string[]; tags: string[]; related: string[] } {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  const fm = fmMatch ? fmMatch[1] : ""

  const titleMatch = fm.match(/^title:\s*["']?(.+?)["']?\s*$/m)
  const typeMatch = fm.match(/^type:\s*["']?(.+?)["']?\s*$/m)

  const sources: string[] = []
  const sourcesBlockMatch = fm.match(/^sources:\s*\n((?:\s+-\s+.+\n?)*)/m)
  if (sourcesBlockMatch) {
    for (const line of sourcesBlockMatch[1].split("\n")) {
      const itemMatch = line.match(/^\s+-\s+["']?(.+?)["']?\s*$/)
      if (itemMatch) sources.push(itemMatch[1])
    }
  } else {
    const inlineMatch = fm.match(/^sources:\s*\[([^\]]*)\]/m)
    if (inlineMatch) {
      for (const item of inlineMatch[1].split(",")) {
        const trimmed = item.trim().replace(/^["']|["']$/g, "")
        if (trimmed) sources.push(trimmed)
      }
    }
  }

  const tags: string[] = []
  const tagsMatch = fm.match(/^tags:\s*\[([^\]]*)\]/m)
  if (tagsMatch) {
    for (const item of tagsMatch[1].split(",")) {
      const trimmed = item.trim().replace(/^["']|["']$/g, "")
      if (trimmed) tags.push(trimmed)
    }
  }

  const related: string[] = []
  const relatedMatch = fm.match(/^related:\s*\[([^\]]*)\]/m)
  if (relatedMatch) {
    for (const item of relatedMatch[1].split(",")) {
      const trimmed = item.trim().replace(/^["']|["']$/g, "")
      if (trimmed) related.push(trimmed)
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
    tags,
    related,
  }
}

function extractWikilinks(content: string): string[] {
  const links: string[] = []
  const regex = new RegExp(WIKILINK_REGEX.source, "g")
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1].trim())
  }
  return links
}

function resolveTarget(raw: string, nodeIds: Set<string>): string | null {
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

function extractTitle(content: string, fallbackName: string): string {
  const frontmatterMatch = content.match(/^---\n[\s\S]*?^title:\s*["']?(.+?)["']?\s*$/m)
  if (frontmatterMatch) return frontmatterMatch[1].trim()
  const headingMatch = content.match(/^#\s+(.+)$/m)
  if (headingMatch) return headingMatch[1].trim()
  return fallbackName.replace(/\.md$/, "").replace(/-/g, " ")
}

// ── Relevance calculation (from graph.ts) ──────────────────────────────────

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

function getNeighborIds(page: WikiPage): Set<string> {
  const neighbors = new Set<string>()
  for (const id of page.outLinks) neighbors.add(id)
  for (const id of page.inLinks) neighbors.add(id)
  return neighbors
}

function getNodeDegree(page: WikiPage): number {
  return page.outLinks.length + page.inLinks.length
}

function calculateRelevance(
  pageA: WikiPage,
  pageB: WikiPage,
  pagesById: Map<string, WikiPage>,
): number {
  if (pageA.id === pageB.id) return 0

  const forwardLinks = pageA.outLinks.includes(pageB.id) ? 1 : 0
  const backwardLinks = pageB.outLinks.includes(pageA.id) ? 1 : 0
  const directLinkScore = (forwardLinks + backwardLinks) * WEIGHTS.directLink

  const sourcesA = new Set(pageA.sources)
  let sharedSourceCount = 0
  for (const src of pageB.sources) {
    if (sourcesA.has(src)) sharedSourceCount += 1
  }
  const sourceOverlapScore = sharedSourceCount * WEIGHTS.sourceOverlap

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

  const affinityMap = TYPE_AFFINITY[pageA.type]
  const typeAffinityScore = (affinityMap?.[pageB.type] ?? 0.5) * WEIGHTS.typeAffinity

  return directLinkScore + sourceOverlapScore + commonNeighborScore + typeAffinityScore
}

// ── Main ───────────────────────────────────────────────────────────────────

function collectMdFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectMdFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath)
    }
  }
  return files
}

function main() {
  const projectRoot = path.resolve(__dirname, "..")
  const wikiDir = path.join(projectRoot, "self_knowledgev1", "wiki")
  const outputDir = path.join(projectRoot, "src", "data")
  const outputFile = path.join(outputDir, "wiki-index.json")

  // Ensure output directory
  fs.mkdirSync(outputDir, { recursive: true })

  if (!fs.existsSync(wikiDir)) {
    console.log(`Wiki directory not found: ${wikiDir} — skipping index build (likely a Vercel deployment)`)
    return
  }

  const mdFiles = collectMdFiles(wikiDir)
  console.log(`Found ${mdFiles.length} markdown files in ${wikiDir}`)

  // Phase 1: Read all files and extract metadata
  const rawNodes: Array<{
    id: string
    title: string
    type: string
    relPath: string
    sources: string[]
    tags: string[]
    related: string[]
    content: string
    rawLinks: string[]
  }> = []

  for (const filePath of mdFiles) {
    const fileName = path.basename(filePath)
    const id = fileName.replace(/\.md$/, "")
    const content = fs.readFileSync(filePath, "utf-8")
    const fm = extractFrontmatter(content)
    const relPath = path.relative(projectRoot, filePath).replace(/\\/g, "/")

    rawNodes.push({
      id,
      title: fm.title || extractTitle(content, fileName),
      type: fm.type,
      relPath,
      sources: fm.sources,
      tags: fm.tags,
      related: fm.related,
      content,
      rawLinks: extractWikilinks(content),
    })
  }

  const nodeIds = new Set(rawNodes.map((n) => n.id))

  // Phase 2: Build bidirectional link graph
  const outLinksMap = new Map<string, string[]>()
  const inLinksMap = new Map<string, string[]>()

  for (const id of nodeIds) {
    outLinksMap.set(id, [])
    inLinksMap.set(id, [])
  }

  for (const raw of rawNodes) {
    for (const linkTarget of raw.rawLinks) {
      const resolvedId = resolveTarget(linkTarget, nodeIds)
      if (resolvedId === null || resolvedId === raw.id) continue
      outLinksMap.get(raw.id)!.push(resolvedId)
      inLinksMap.get(resolvedId)!.push(raw.id)
    }
  }

  // Build WikiPage objects
  const pages: WikiPage[] = rawNodes.map((raw) => ({
    id: raw.id,
    title: raw.title,
    type: raw.type,
    path: raw.relPath,
    sources: raw.sources,
    tags: raw.tags,
    related: raw.related,
    content: raw.content,
    outLinks: outLinksMap.get(raw.id) ?? [],
    inLinks: inLinksMap.get(raw.id) ?? [],
  }))

  const pagesById = new Map(pages.map((p) => [p.id, p]))

  // Phase 3: Pre-compute graph adjacency and neighbor relevance
  const adjacency: Record<string, string[]> = {}
  const neighbors: Record<string, { id: string; relevance: number }[]> = {}

  for (const page of pages) {
    const nodeNeighbors = new Set<string>()
    for (const id of page.outLinks) nodeNeighbors.add(id)
    for (const id of page.inLinks) nodeNeighbors.add(id)
    adjacency[page.id] = [...nodeNeighbors]

    // Calculate relevance to all other nodes, keep top 5
    const scored: { id: string; relevance: number }[] = []
    for (const other of pages) {
      if (other.id === page.id) continue
      const rel = calculateRelevance(page, other, pagesById)
      if (rel > 0) scored.push({ id: other.id, relevance: Math.round(rel * 100) / 100 })
    }
    scored.sort((a, b) => b.relevance - a.relevance)
    neighbors[page.id] = scored.slice(0, 5)
  }

  // Read index.md and overview.md
  const indexContent = fs.readFileSync(path.join(wikiDir, "index.md"), "utf-8")
  const overviewContent = fs.readFileSync(path.join(wikiDir, "overview.md"), "utf-8")

  const index: WikiPageIndex = {
    version: 1,
    builtAt: new Date().toISOString(),
    pages,
    graph: { adjacency, neighbors },
    indexContent,
    overviewContent,
  }

  fs.writeFileSync(outputFile, JSON.stringify(index, null, 2), "utf-8")

  const sizeKB = Math.round(Buffer.byteLength(JSON.stringify(index), "utf-8") / 1024)
  console.log(`Generated wiki-index.json: ${pages.length} pages, ${sizeKB}KB`)
  console.log(`  Graph: ${Object.keys(adjacency).length} nodes with adjacency data`)
  console.log(`  Neighbors: ${Object.keys(neighbors).length} nodes with pre-computed relevance`)
  console.log(`  Output: ${outputFile}`)
}

main()

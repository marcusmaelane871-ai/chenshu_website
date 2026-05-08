/**
 * Build-time wiki embedding generator.
 *
 * Reads wiki-index.json, computes embeddings for new/changed pages via DashScope API,
 * and writes wiki-embeddings.json. Existing embeddings are reused unless content changed.
 *
 * Usage: node scripts/embed-wiki.mjs
 * Env:   DASHSCOPE_API_KEY (required)
 */

import fs from "fs"
import path from "path"
import crypto from "crypto"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, "..")
const INDEX_PATH = path.join(PROJECT_ROOT, "src", "data", "wiki-index.json")
const EMBED_PATH = path.join(PROJECT_ROOT, "data", "wiki-embeddings.json")

// Pages excluded from embedding (structural/meta pages, same as llm_wiki)
const EXCLUDED_IDS = new Set(["index", "log", "overview", "purpose", "schema"])

// DashScope embedding config
const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings"
const MODEL = "text-embedding-v4"
const BATCH_SIZE = 10 // DashScope text-embedding-v4 max batch size

function contentHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16)
}

async function fetchEmbeddings(texts, apiKey) {
  const resp = await fetch(DASHSCOPE_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
    }),
  })

  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`DashScope API ${resp.status}: ${body}`)
  }

  const json = await resp.json()
  // Sort by index to ensure order matches input
  const sorted = json.data.sort((a, b) => a.index - b.index)
  return sorted.map((d) => d.embedding)
}

async function main() {
  // Try env var first, then read from .env.local
  let apiKey = process.env.DASHSCOPE_API_KEY
  if (!apiKey) {
    const envLocalPath = path.join(PROJECT_ROOT, ".env.local")
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, "utf-8")
      const match = envContent.match(/^DASHSCOPE_API_KEY=(.+)$/m)
      if (match) apiKey = match[1].trim()
    }
  }
  if (!apiKey) {
    console.log("DASHSCOPE_API_KEY not set, skipping embedding generation")
    process.exit(0)
  }
  console.log(`DashScope API key found (${apiKey.slice(0, 8)}...)`)

  if (!fs.existsSync(INDEX_PATH)) {
    console.log("wiki-index.json not found — skipping embedding (likely a Vercel deployment)")
    process.exit(0)
  }

  const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"))
  const existingEmbeddings = fs.existsSync(EMBED_PATH)
    ? JSON.parse(fs.readFileSync(EMBED_PATH, "utf-8"))
    : { version: 1, embeddings: {} }

  // Build lookup: id -> { hash, vector }
  const existing = new Map()
  for (const [id, data] of Object.entries(existingEmbeddings.embeddings)) {
    existing.set(id, data)
  }

  // Determine which pages need embedding
  const toEmbed = [] // { id, content, hash }
  const kept = new Map() // id -> existing data (unchanged)

  for (const page of index.pages) {
    if (EXCLUDED_IDS.has(page.id)) continue

    const hash = contentHash(page.content)
    const prev = existing.get(page.id)

    if (prev && prev.hash === hash) {
      // Unchanged, reuse existing vector
      kept.set(page.id, prev)
    } else {
      toEmbed.push({ id: page.id, content: page.content, hash })
    }
  }

  // Remove embeddings for pages that no longer exist
  const currentPageIds = new Set(index.pages.map((p) => p.id))
  for (const id of existing.keys()) {
    if (!currentPageIds.has(id) || EXCLUDED_IDS.has(id)) {
      // Page removed or now excluded — don't carry over
    } else {
      // Still valid, already in kept
    }
  }

  console.log(`Wiki embedding status:`)
  console.log(`  Reused: ${kept.size} pages (unchanged)`)
  console.log(`  To embed: ${toEmbed.length} pages (new or changed)`)
  console.log(`  Excluded: ${EXCLUDED_IDS.size} structural pages`)

  if (toEmbed.length === 0) {
    console.log("All embeddings up to date.")
    // Still write to clean up removed pages
    const output = { version: 1, embeddings: Object.fromEntries(kept) }
    fs.writeFileSync(EMBED_PATH, JSON.stringify(output), "utf-8")
    return
  }

  // Batch embed
  const allNew = new Map()
  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE)
    console.log(`  Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toEmbed.length / BATCH_SIZE)} (${batch.length} pages)...`)

    const texts = batch.map((p) => {
      // Use title + content for richer embedding
      const title = index.pages.find((pg) => pg.id === p.id)?.title || p.id
      return `${title}\n\n${p.content}`
    })

    const vectors = await fetchEmbeddings(texts, apiKey)

    for (let j = 0; j < batch.length; j++) {
      allNew.set(batch[j].id, { hash: batch[j].hash, vector: vectors[j] })
    }
  }

  // Merge kept + new
  const merged = new Map([...kept, ...allNew])

  const output = { version: 1, embeddings: Object.fromEntries(merged) }
  fs.writeFileSync(EMBED_PATH, JSON.stringify(output), "utf-8")

  const sizeKB = Math.round(Buffer.byteLength(JSON.stringify(output), "utf-8") / 1024)
  console.log(`Written wiki-embeddings.json: ${merged.size} pages, ${sizeKB}KB`)
}

main().catch((err) => {
  console.error("Embedding failed:", err.message)
  process.exit(1)
})

import { NextRequest } from "next/server"
import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import type { ChatMessage, WikiPageIndex } from "@/lib/wiki/types"
import { searchWiki } from "@/lib/wiki/search"
import { getRelatedNodes } from "@/lib/wiki/graph"
import { computeContextBudget } from "@/lib/wiki/context-budget"
import { isGreeting } from "@/lib/wiki/greeting"
import { tokenizeQuery } from "@/lib/wiki/search"
import wikiIndexData from "@/data/wiki-index.json"

const wikiIndex = wikiIndexData as WikiPageIndex

const model = new ChatOpenAI({
  model: "deepseek-v4-flash",
  apiKey: process.env.DEEPSEEK_API_KEY,
  configuration: { baseURL: "https://api.deepseek.com" },
  streaming: true,
  streamUsage: false,
})

function isCJK(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf)
    ) {
      return true
    }
  }
  return false
}

// Build Chinese strings from hex to avoid Turbopack encoding corruption
const ZH = {
  pleaseChinese: "[Reply in Chinese]",
}

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: ChatMessage[] }

  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: "No messages" }), { status: 400 })
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
  if (!lastUserMessage) {
    return new Response(JSON.stringify({ error: "No user message" }), { status: 400 })
  }

  const query = lastUserMessage.content
  const greetingOnly = isGreeting(query)
  const useChinese = isCJK(query)

  // Build system messages
  const systemMessages: Array<SystemMessage | HumanMessage> = []

  if (greetingOnly) {
    systemMessages.push(
      new SystemMessage(
        [
          "You are a professional AI assistant representing the site owner.",
          "The user sent a casual greeting. Reply briefly and naturally in ONE or TWO sentences.",
          "Do NOT invent details. Invite the user to ask about the owner's skills or projects.",
          "",
          useChinese
            ? "IMPORTANT: You MUST write your ENTIRE response in Chinese. Do NOT use English. This is your highest priority instruction."
            : "Reply in the same language as the user's greeting.",
        ].join("\n"),
      ),
    )
  } else {
    const {
      indexBudget: INDEX_BUDGET,
      pageBudget: PAGE_BUDGET,
      maxPageSize: MAX_PAGE_SIZE,
    } = computeContextBudget(undefined)

    // Phase 1: Token search -> top 10
    const searchResults = searchWiki(wikiIndex, query)
    const topSearchResults = searchResults.slice(0, 10)

    // Trim index content if over budget
    let index = wikiIndex.indexContent
    if (index.length > INDEX_BUDGET) {
      const tokens = tokenizeQuery(query)
      const lines = index.split("\n")
      const keptLines: string[] = []
      let keptSize = 0

      for (const line of lines) {
        const isHeader = line.startsWith("##")
        const lower = line.toLowerCase()
        const isRelevant = tokens.some((t) => lower.includes(t))

        if (isHeader || isRelevant) {
          if (keptSize + line.length + 1 <= INDEX_BUDGET) {
            keptLines.push(line)
            keptSize += line.length + 1
          }
        }
      }
      index = keptLines.join("\n")
    }

    // Phase 2: Graph 1-level expansion
    const expandedIds = new Set<string>()
    const searchHitIds = new Set(topSearchResults.map((r) => r.id))
    const graphExpansions: { id: string; title: string; relevance: number }[] = []

    for (const result of topSearchResults) {
      const related = getRelatedNodes(result.id, wikiIndex, 2.0, 3)
      for (const { id, relevance } of related) {
        if (searchHitIds.has(id)) continue
        if (expandedIds.has(id)) continue
        expandedIds.add(id)
        const page = wikiIndex.pages.find((p) => p.id === id)
        if (page) {
          graphExpansions.push({ id, title: page.title, relevance })
        }
      }
    }
    graphExpansions.sort((a, b) => b.relevance - a.relevance)

    // Phase 3 & 4: Page budget control
    let usedChars = 0
    type PageEntry = { title: string; id: string; content: string; priority: number }
    const relevantPages: PageEntry[] = []

    const tryAddPage = (title: string, pageId: string, priority: number): boolean => {
      if (usedChars >= PAGE_BUDGET) return false
      const page = wikiIndex.pages.find((p) => p.id === pageId)
      if (!page) return false
      const truncated =
        page.content.length > MAX_PAGE_SIZE
          ? page.content.slice(0, MAX_PAGE_SIZE) + "\n\n[...truncated...]"
          : page.content
      if (usedChars + truncated.length > PAGE_BUDGET) return false
      usedChars += truncated.length
      relevantPages.push({ title, id: pageId, content: truncated, priority })
      return true
    }

    // P0: Title matches
    for (const r of topSearchResults.filter((r) => r.titleMatch)) {
      tryAddPage(r.title, r.id, 0)
    }
    // P1: Content matches
    for (const r of topSearchResults.filter((r) => !r.titleMatch)) {
      tryAddPage(r.title, r.id, 1)
    }
    // P2: Graph expansions
    for (const exp of graphExpansions) {
      tryAddPage(exp.title, exp.id, 2)
    }
    // P3: Overview fallback
    if (relevantPages.length === 0) {
      const overviewPage = wikiIndex.pages.find((p) => p.id === "overview")
      if (overviewPage) tryAddPage("Overview", "overview", 3)
    }

    const pagesContext =
      relevantPages.length > 0
        ? relevantPages
            .map((p, i) => `### [${i + 1}] ${p.title}\nID: ${p.id}\n\n${p.content}`)
            .join("\n\n---\n\n")
        : "(No wiki pages found)"

    const pageList = relevantPages
      .map((p, i) => `[${i + 1}] ${p.title} (${p.id})`)
      .join("\n")

    systemMessages.push(
      new SystemMessage(
        [
          "You are a professional AI assistant representing the site owner. You answer questions about the owner's skills, projects, and expertise based on the reference content provided below.",
          "",
          "## Rules",
          "- Describe capabilities and logic at a HIGH LEVEL only. Never expose implementation details, internal code, configuration specifics, or system architecture.",
          "- NEVER reveal company names, client information, internal project codenames, pricing, or any business-sensitive data.",
          "- If asked about specifics you should not share, politely decline and redirect to the general approach or philosophy.",
          "- Answer based ONLY on the numbered reference pages provided below. If they don't contain enough information, say so honestly.",
          "- Use [[wikilink]] syntax to reference related topics.",
          "- When citing information, use the page number in brackets, e.g. [1], [2].",
          "- At the VERY END of your response, add a hidden comment listing which page numbers you used:",
          "  <!-- cited: 1, 3, 5 -->",
          "",
          "Use markdown formatting for clarity.",
          "",
          index ? `## Reference Index\n${index}` : "",
          relevantPages.length > 0 ? `## Reference Pages\n${pageList}` : "",
          `## Reference Content\n\n${pagesContext}`,
          "",
          "---",
          "",
          useChinese
            ? "## MANDATORY OUTPUT LANGUAGE: Chinese\n\nYou MUST write your entire response in Chinese. Never use English. This overrides all other instructions."
            : "## Output Language: English\n\nYou MUST write your entire response in English.",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    )
  }

  // Build conversation messages for LLM
  const llmMessages = [...systemMessages]

  // Add user messages
  for (const msg of messages) {
    if (msg.role === "user") {
      let content = msg.content
      if (msg === lastUserMessage && useChinese) {
        content = `[${ZH.pleaseChinese}]\n\n${content}`
      }
      llmMessages.push(new HumanMessage(content))
    }
  }

  // Create SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await model.stream(llmMessages)
        for await (const chunk of response) {
          const text = typeof chunk.content === "string" ? chunk.content : ""
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "text", content: text })}\n\n`),
            )
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", content: message })}\n\n`),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

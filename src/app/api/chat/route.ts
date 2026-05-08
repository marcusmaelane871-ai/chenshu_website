import * as fs from "fs"
import * as path from "path"
import { NextRequest } from "next/server"
import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages"
import { traceable, getCurrentRunTree } from "langsmith/traceable"
import type { ChatMessage, WikiPageIndex, FusedSearchResult, SearchResult, VectorSearchResult } from "@/lib/wiki/types"
import { searchWiki } from "@/lib/wiki/search"
import { getRelatedNodes } from "@/lib/wiki/graph"
import { computeContextBudget } from "@/lib/wiki/context-budget"
import { isGreeting } from "@/lib/wiki/greeting"
import { tokenizeQuery } from "@/lib/wiki/search"
import { loadEmbeddings, vectorSearch, fuseResults } from "@/lib/wiki/vector-search"

let _wikiIndex: WikiPageIndex | null = null
function getWikiIndex(): WikiPageIndex {
  if (!_wikiIndex) {
    const raw = fs.readFileSync(path.join(process.cwd(), "src", "data", "wiki-index.json"), "utf-8")
    _wikiIndex = JSON.parse(raw) as WikiPageIndex
  }
  return _wikiIndex!
}

const EXCLUDED_IDS = new Set(["index", "log", "overview", "purpose", "schema"])
const MAX_PAGES = 25

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

const ZH = {
  pleaseChinese: "[Reply in Chinese]",
}

// ── LangSmith-traced RAG steps ──────────────────────────────────────────

const tracedTokenSearch = traceable(
  (query: string): SearchResult[] => {
    return searchWiki(getWikiIndex(), query)
  },
  { name: "token_search", run_type: "retriever" },
)

const tracedVectorSearch = traceable(
  async (query: string, storedEmbeddings: Record<string, any>, apiKey: string): Promise<VectorSearchResult[]> => {
    return vectorSearch(query, storedEmbeddings, apiKey, 10)
  },
  { name: "vector_search", run_type: "retriever" },
)

const tracedRRFFusion = traceable(
  (
    tokenResults: SearchResult[],
    vectorResults: VectorSearchResult[],
  ): FusedSearchResult[] => {
    const pageTitles = new Map(getWikiIndex().pages.map((p) => [p.id, p.title]))
    const pageSnippets = new Map(getWikiIndex().pages.map((p) => [p.id, p.content.slice(0, 160)]))
    return fuseResults(tokenResults, vectorResults, pageTitles, pageSnippets)
  },
  { name: "rrf_fusion", run_type: "tool" },
)

const tracedGraphExpansion = traceable(
  (topResults: FusedSearchResult[]): { id: string; title: string; relevance: number }[] => {
    const expandedIds = new Set<string>()
    const searchHitIds = new Set(topResults.map((r) => r.id))
    const graphExpansions: { id: string; title: string; relevance: number }[] = []

    for (const result of topResults) {
      const related = getRelatedNodes(result.id, getWikiIndex(), 2.0, 3)
      for (const { id, relevance } of related) {
        if (EXCLUDED_IDS.has(id)) continue
        if (searchHitIds.has(id)) continue
        if (expandedIds.has(id)) continue
        expandedIds.add(id)
        const page = getWikiIndex().pages.find((p) => p.id === id)
        if (page) {
          graphExpansions.push({ id, title: page.title, relevance })
        }
      }
    }
    graphExpansions.sort((a, b) => b.relevance - a.relevance)
    return graphExpansions
  },
  { name: "graph_expansion", run_type: "tool" },
)

const tracedContextAssembly = traceable(
  (
    topResults: FusedSearchResult[],
    graphExpansions: { id: string; title: string; relevance: number }[],
    indexBudget: number,
    pageBudget: number,
    maxPageSize: number,
  ): { index: string; relevantPages: { title: string; id: string; content: string; priority: number }[] } => {
    // Trim index content
    let index = getWikiIndex().indexContent
    if (index.length > indexBudget) {
      const tokens = tokenizeQuery(topResults[0]?.id ?? "")
      const lines = index.split("\n")
      const keptLines: string[] = []
      let keptSize = 0
      for (const line of lines) {
        const isHeader = line.startsWith("##")
        const lower = line.toLowerCase()
        const isRelevant = tokens.some((t) => lower.includes(t))
        if (isHeader || isRelevant) {
          if (keptSize + line.length + 1 <= indexBudget) {
            keptLines.push(line)
            keptSize += line.length + 1
          }
        }
      }
      index = keptLines.join("\n")
    }

    // Page budget control
    let usedChars = 0
    type PageEntry = { title: string; id: string; content: string; priority: number }
    const relevantPages: PageEntry[] = []

    const tryAddPage = (title: string, pageId: string, priority: number): boolean => {
      if (relevantPages.length >= MAX_PAGES) return false
      if (usedChars >= pageBudget) return false
      const page = getWikiIndex().pages.find((p) => p.id === pageId)
      if (!page) return false
      const truncated =
        page.content.length > maxPageSize
          ? page.content.slice(0, maxPageSize) + "\n\n[...truncated...]"
          : page.content
      if (usedChars + truncated.length > pageBudget) return false
      usedChars += truncated.length
      relevantPages.push({ title, id: pageId, content: truncated, priority })
      return true
    }

    for (const r of topResults.filter((r) => r.titleMatch)) tryAddPage(r.title, r.id, 0)
    for (const r of topResults.filter((r) => !r.titleMatch)) tryAddPage(r.title, r.id, 1)
    for (const exp of graphExpansions) tryAddPage(exp.title, exp.id, 2)
    if (relevantPages.length === 0) {
      const overviewPage = getWikiIndex().pages.find((p) => p.id === "overview")
      if (overviewPage) tryAddPage("Overview", "overview", 3)
    }

    return { index, relevantPages }
  },
  { name: "context_assembly", run_type: "tool" },
)

// ── Traced full pipeline: RAG + LLM in one trace ──────────────────────

const tracedChatPipeline = traceable(
  async (
    messages: ChatMessage[],
    query: string,
    useChinese: boolean,
    threadId?: string,
  ) => {
    if (threadId) {
      const run = getCurrentRunTree()
      if (run) {
        run.extra.metadata = { ...run.extra.metadata, thread_id: threadId }
      }
    }

    // Build system message (greeting or RAG)
    const systemMessages: Array<SystemMessage | HumanMessage> = []
    const greetingOnly = isGreeting(query)

    if (greetingOnly) {
      systemMessages.push(
        new SystemMessage(
          [
            "你是一个专业的AI助手，代表网站主人。",
            "用户发了一条日常问候，请用一两句话简短自然地回复。",
            "不要编造细节，邀请用户询问主人的技能或项目。",
            "",
            useChinese
              ? "你必须用中文回复。"
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

      const tokenResults = await tracedTokenSearch(query)

      let fusedResults: FusedSearchResult[]
      const storedEmbeddings = await loadEmbeddings()
      const dashScopeKey = process.env.DASHSCOPE_API_KEY

      if (storedEmbeddings && dashScopeKey) {
        try {
          const vectorResults = await tracedVectorSearch(query, storedEmbeddings, dashScopeKey)
          fusedResults = await tracedRRFFusion(tokenResults, vectorResults)
        } catch {
          fusedResults = tokenResults.map((r) => ({
            id: r.id,
            title: r.title,
            snippet: r.snippet,
            titleMatch: r.titleMatch,
            rrfScore: 0,
            tokenRank: undefined,
          }))
        }
      } else {
        fusedResults = tokenResults.map((r) => ({
          id: r.id,
          title: r.title,
          snippet: r.snippet,
          titleMatch: r.titleMatch,
          rrfScore: 0,
          tokenRank: undefined,
        }))
      }

      const topResults = fusedResults
        .filter((r) => !EXCLUDED_IDS.has(r.id))
        .slice(0, 10)

      const graphExpansions = await tracedGraphExpansion(topResults)
      const { index, relevantPages } = await tracedContextAssembly(
        topResults,
        graphExpansions,
        INDEX_BUDGET,
        PAGE_BUDGET,
        MAX_PAGE_SIZE,
      )

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
            "你是陈树的个人AI助手，代表他回答关于他的技能、项目和专业能力的问题。",
            "",
            "## 关于陈树",
            "陈树是一名AI产品经理和Agent工程师，擅长第一性原理分析问题、复利思维追踪长期目标、系统化构建思维模型。他设计并落地AI系统，不是调API——从0到1落地3个不同类型的AI系统：即时探需、插件化服务架构、跟进策略推荐。",
            "",
            "## 回答风格",
            "- 通俗易懂、简洁明了，不要长篇大论。能用一句话说清的，不用一段话。",
            "- 语气亲切自然，像朋友聊天，但保持专业。",
            "- 不要过度格式化：避免不必要的标题、列表、加粗，除非确实有助于理解。用自然语言组织回答，而非堆砌结构。",
            "- 不要使用 emoji。",
            "",
            "## 规则",
            "- 绝对不要提及任何行业、领域或业务场景（如旅游、零售、酒店等）。始终用通用语言描述，如「销售团队」「客户」「客户互动」替代行业特定表述。",
            "- 绝对不要透露公司名、品牌名、客户信息、内部项目代号、价格或任何商业敏感数据。",
            "- 只描述项目的功能和价值，重点说「做了什么」和「为什么重要」，不要透露内部实现细节。",
            "- 不要透露实现细节、内部代码、配置参数、技术框架选型或系统架构。",
            "- 被问到不应该分享的细节时，礼貌地拒绝并引导到整体思路或方法论。",
            "- 仅基于下方提供的编号参考页面回答。如果参考内容不足，如实说明。",
            "- 使用 [[wikilink]] 语法引用相关话题。",
            "- 引用信息时用页码标注，如 [1]、[2]。",
            "- 在回答最末尾加一个隐藏注释列出使用的页码：",
            "  <!-- cited: 1, 3, 5 -->",
            "",
            index ? `## Reference Index\n${index}` : "",
            relevantPages.length > 0 ? `## Reference Pages\n${pageList}` : "",
            `## Reference Content\n\n${pagesContext}`,
            "",
            "---",
            "",
            useChinese
              ? "## 输出语言：中文\n\n你必须用中文回答，不要使用英文。"
              : "## Output Language: English\n\nYou MUST write your entire response in English.",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      )
    }

    // Build full LLM messages (multi-turn)
    const llmMessages = [...systemMessages]
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")

    for (const msg of messages) {
      if (msg.role === "user") {
        let content = msg.content
        if (msg === lastUserMessage && useChinese) {
          content = `[${ZH.pleaseChinese}]\n\n${content}`
        }
        llmMessages.push(new HumanMessage(content))
      } else if (msg.role === "assistant") {
        llmMessages.push(new AIMessage(msg.content))
      }
    }

    // LLM call (auto-traced by LangChain)
    return model.stream(llmMessages)
  },
  { name: "chat_pipeline", run_type: "chain" },
)

// ── Main handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { messages, threadId } = (await req.json()) as { messages: ChatMessage[]; threadId?: string }

  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: "No messages" }), { status: 400 })
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
  if (!lastUserMessage) {
    return new Response(JSON.stringify({ error: "No user message" }), { status: 400 })
  }

  const query = lastUserMessage.content
  const useChinese = isCJK(query)

  try {
    const response = await tracedChatPipeline(messages, query, useChinese, threadId)

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
}

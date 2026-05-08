"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Image from "next/image"
import ChatMessageComponent from "./chat-message"
import type { ChatMessage } from "@/lib/wiki/types"

// Generate a stable thread ID for this browser session
function generateThreadId(): string {
  if (typeof window === "undefined") return "server"
  const KEY = "chat_thread_id"
  let id = sessionStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(KEY, id)
  }
  return id
}

const QUICK_PROMPTS = [
  "你擅长什么？",
  "做过哪些项目？",
  "AI系统怎么设计的？",
]

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "你好！我是**陈树**，AI系统设计型产品经理。设计并落地AI系统，不是调API。\n\n从0到1落地3个不同类型的AI系统——即时探需、插件化服务架构、跟进策略推荐。\n\n想了解什么，直接问我吧！",
}

export default function ChatHero() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const threadId = useRef(generateThreadId())
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent, thinking])

  // Focus input on mount & prevent body scroll
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
    document.documentElement.style.overflow = "hidden"
    return () => {
      document.documentElement.style.overflow = ""
    }
  }, [])

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim()
      if (!content || streaming) return

      setInput("")
      const userMessage: ChatMessage = { role: "user", content }
      setMessages((prev) => [...prev, userMessage])
      setStreaming(true)
      setThinking(true)
      setStreamingContent("")

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const allMessages = [...messages, userMessage]
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: allMessages, threadId: threadId.current }),
          signal: controller.signal,
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const reader = res.body?.getReader()
        if (!reader) throw new Error("No response body")

        const decoder = new TextDecoder()
        let accumulated = ""
        let buffer = ""
        let firstToken = true

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const jsonStr = line.slice(6)
            try {
              const event = JSON.parse(jsonStr)
              if (event.type === "text") {
                if (firstToken) {
                  setThinking(false)
                  firstToken = false
                }
                accumulated += event.content
                setStreamingContent(accumulated)
              } else if (event.type === "error") {
                accumulated += `\n\n**Error:** ${event.content}`
                setStreamingContent(accumulated)
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: accumulated },
        ])
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled — keep whatever we streamed so far
          if (streamingContent) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: streamingContent },
            ])
          }
        } else {
          const msg = err instanceof Error ? err.message : "Unknown error"
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `**Error:** ${msg}` },
          ])
        }
      } finally {
        setStreaming(false)
        setThinking(false)
        setStreamingContent("")
        abortRef.current = null
        inputRef.current?.focus()
      }
    },
    [input, messages, streaming, streamingContent],
  )

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const showQuickPrompts = messages.length <= 1 && !streaming

  return (
    <section className="flex flex-col h-full max-w-3xl mx-auto px-4">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-6 space-y-4 scroll-smooth"
      >
        {messages.map((msg, i) => (
          <ChatMessageComponent key={i} message={msg} />
        ))}

        {/* Thinking indicator */}
        {thinking && (
          <div className="flex justify-start gap-2.5">
            <Image
              src="/avatar.jpg"
              alt="AI"
              width={32}
              height={32}
              className="rounded-full flex-shrink-0 mt-0.5 w-8 h-8 object-cover"
            />
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-[#f8fafc] border border-[#e2e8f0] px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block w-2 h-2 rounded-full bg-gray-400"
                  style={{
                    animation: "thinking-dot 1.4s infinite",
                    animationDelay: `${i * 0.16}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Streaming content */}
        {streaming && streamingContent && !thinking && (
          <ChatMessageComponent
            message={{ role: "assistant", content: streamingContent }}
          />
        )}
      </div>

      {/* Quick prompts */}
      {showQuickPrompts && (
        <div className="flex flex-wrap gap-2 pb-3">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="rounded-full border border-[#e2e8f0] px-4 py-1.5 text-sm text-[#1e3a5f] hover:bg-[#f8fafc] hover:border-[#2563eb] hover:text-[#2563eb] transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="pb-4 pt-2">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="问我任何问题..."
            disabled={streaming}
            rows={1}
            className="flex-1 rounded-xl border border-[#e2e8f0] px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[#2563eb] disabled:opacity-50 max-h-32"
          />
          {streaming ? (
            <button
              onClick={handleStop}
              className="rounded-xl bg-red-500 px-4 py-2.5 text-sm text-white hover:bg-red-600 transition-colors flex-shrink-0"
            >
              停止
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-sm text-white hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              发送
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

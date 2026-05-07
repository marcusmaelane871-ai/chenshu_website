"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import ChatMessageComponent from "./chat-message"
import type { ChatMessage } from "@/lib/wiki/types"

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  // Focus input when opening
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    setInput("")
    const userMessage: ChatMessage = { role: "user", content: text }
    setMessages((prev) => [...prev, userMessage])
    setStreaming(true)
    setStreamingContent("")

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let accumulated = ""
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        // Keep the last incomplete line in buffer
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const jsonStr = line.slice(6)
          try {
            const event = JSON.parse(jsonStr)
            if (event.type === "text") {
              accumulated += event.content
              setStreamingContent(accumulated)
            } else if (event.type === "done") {
              // Finalize
            } else if (event.type === "error") {
              accumulated += `\n\n**Error:** ${event.content}`
              setStreamingContent(accumulated)
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Add assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: accumulated }])
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled
      } else {
        const msg = err instanceof Error ? err.message : "Unknown error"
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `**Error:** ${msg}` },
        ])
      }
    } finally {
      setStreaming(false)
      setStreamingContent("")
      abortRef.current = null
    }
  }, [input, messages, streaming])

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

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[#1e3a5f] text-white shadow-lg hover:bg-[#2563eb] transition-colors flex items-center justify-center"
          aria-label="打开聊天助手"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[560px] w-[400px] flex-col rounded-xl bg-white shadow-2xl border border-[#e2e8f0] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#1e3a5f] px-4 py-3">
            <span className="text-white font-medium text-sm">AI 知识助手</span>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="关闭"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && !streaming && (
              <div className="text-center text-gray-400 text-sm mt-8">
                问我任何关于 AI 销售系统的问题
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessageComponent key={i} message={msg} />
            ))}
            {streaming && streamingContent && (
              <ChatMessageComponent
                message={{ role: "assistant", content: streamingContent }}
              />
            )}
          </div>

          {/* Input */}
          <div className="border-t border-[#e2e8f0] px-4 py-3 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入问题..."
              disabled={streaming}
              className="flex-1 rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb] disabled:opacity-50"
            />
            {streaming ? (
              <button
                onClick={handleStop}
                className="rounded-lg bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600 transition-colors"
              >
                停止
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="rounded-lg bg-[#2563eb] px-3 py-2 text-sm text-white hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                发送
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

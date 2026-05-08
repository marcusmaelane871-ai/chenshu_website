"use client"

import Image from "next/image"
import Markdown from "react-markdown"
import type { ChatMessage } from "@/lib/wiki/types"

function stripCitationComment(content: string): string {
  return content.replace(/[\s\S]*<!--\s*cited:.*?-->\s*$/, (match) => {
    const before = match.slice(0, match.indexOf("<!--"))
    return before
  })
}

export default function ChatMessage({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[#1e3a5f] px-4 py-2.5 text-white text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start gap-2.5">
      <Image
        src="/avatar.jpg"
        alt="AI"
        width={32}
        height={32}
        className="rounded-full flex-shrink-0 mt-0.5 w-8 h-8 object-cover"
      />
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-[#f8fafc] border border-[#e2e8f0] px-4 py-2.5 text-sm leading-relaxed text-gray-800 prose prose-sm prose-gray max-w-none">
        <Markdown>{stripCitationComment(message.content)}</Markdown>
      </div>
    </div>
  )
}

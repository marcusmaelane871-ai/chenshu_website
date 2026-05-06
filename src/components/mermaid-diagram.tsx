"use client";

import { useEffect, useRef, useState } from "react";

export default function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    import("mermaid").then((mermaid) => {
      mermaid.default.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          primaryColor: "#e8f0fe",
          primaryTextColor: "#1e3a5f",
          primaryBorderColor: "#2563eb",
          lineColor: "#64748b",
          secondaryColor: "#f8fafc",
          tertiaryColor: "#ffffff",
          fontSize: "13px",
        },
        flowchart: { htmlLabels: true, curve: "basis" },
      });

      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      mermaid.default
        .render(id, chart)
        .then(({ svg: rendered }) => setSvg(rendered))
        .catch(() => setError(true));
    });
  }, [chart]);

  if (error) {
    return (
      <div className="text-sm text-[#64748b] p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
        架构图加载失败
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="text-sm text-[#64748b] p-4">架构图渲染中...</div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-x-auto p-4 bg-white rounded-xl border border-[#e2e8f0]"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

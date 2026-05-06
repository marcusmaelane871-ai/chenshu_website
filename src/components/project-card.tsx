import MermaidDiagram from "./mermaid-diagram";
import type { Project } from "@/lib/data";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-[#1e3a5f] text-white px-6 py-5">
        <div className="flex items-center gap-2 mb-2">
          {project.featured && (
            <span className="px-2 py-0.5 bg-[#2563eb] text-white text-xs rounded-md font-medium">
              王牌项目
            </span>
          )}
          <span className="text-blue-200 text-xs">{project.role}</span>
        </div>
        <h3 className="text-xl font-bold mb-1">{project.title}</h3>
        <p className="text-blue-100 text-sm">{project.subtitle}</p>
      </div>

      {/* Main line */}
      <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#e2e8f0]">
        <p className="text-[#0f172a] font-medium">{project.mainLine}</p>
      </div>

      {/* Three-layer sections */}
      <div className="divide-y divide-[#e2e8f0]">
        {project.sections.map((section) => (
          <div key={section.heading} className="px-6 py-5">
            <h4 className="text-base font-semibold text-[#1e3a5f] mb-2">
              {section.heading}
            </h4>
            <p className="text-sm text-[#64748b] leading-relaxed mb-3">
              {section.body}
            </p>
            {section.highlights && (
              <div className="flex flex-wrap gap-2">
                {section.highlights.map((h) => (
                  <span
                    key={h}
                    className="px-2.5 py-1 bg-[#e8f0fe] text-[#1e3a5f] text-xs rounded-md font-medium"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Architecture diagram */}
      {project.chart && (
        <div className="px-6 py-5 border-t border-[#e2e8f0]">
          <h4 className="text-base font-semibold text-[#1e3a5f] mb-3">
            架构流程
          </h4>
          <MermaidDiagram chart={project.chart} />
        </div>
      )}

      {/* Results */}
      <div className="px-6 py-5 bg-[#f8fafc] border-t border-[#e2e8f0]">
        <h4 className="text-base font-semibold text-[#1e3a5f] mb-3">
          量化结果
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {project.results.map((r) => (
            <div key={r.label} className="text-center">
              <div className="text-lg font-bold text-[#1e3a5f]">{r.value}</div>
              <div className="text-xs text-[#64748b]">{r.label}</div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

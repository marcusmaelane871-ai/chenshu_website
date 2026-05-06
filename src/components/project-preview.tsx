import Link from "next/link";
import type { Project } from "@/lib/data";

export default function ProjectPreview({ project }: { project: Project }) {
  return (
    <Link
      href="/projects"
      className={`block bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-6 hover:shadow-md transition-shadow ${
        project.featured ? "md:col-span-2 md:flex md:gap-6" : ""
      }`}
    >
      <div className={project.featured ? "flex-1" : ""}>
        <div className="flex items-center gap-2 mb-2">
          {project.featured && (
            <span className="px-2 py-0.5 bg-[#2563eb] text-white text-xs rounded-md font-medium">
              王牌项目
            </span>
          )}
          <span className="text-xs text-[#64748b]">{project.role}</span>
        </div>
        <h3 className="text-lg font-semibold text-[#1e3a5f] mb-1">
          {project.title}
        </h3>
        <p className="text-sm text-[#64748b] mb-3">{project.subtitle}</p>
        <p className="text-sm text-[#0f172a] leading-relaxed">
          {project.mainLine}
        </p>
      </div>
      <div
        className={`mt-4 ${
          project.featured ? "md:mt-0 md:w-64 flex-shrink-0" : ""
        }`}
      >
        <div className="grid grid-cols-2 gap-2">
          {project.results.map((r) => (
            <div key={r.label} className="flex flex-col">
              <span className="text-xs text-[#64748b]">{r.label}</span>
              <span className="text-sm font-semibold text-[#1e3a5f]">
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

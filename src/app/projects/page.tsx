import ProjectCard from "@/components/project-card";
import { projects } from "@/lib/data";

export default function ProjectsPage() {
  return (
    <section className="py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">项目</h1>
        <p className="text-[#64748b] mb-8">
          三个从0到1落地的AI系统，覆盖增长系统、插件化架构、可控决策系统
        </p>
        <div className="space-y-8">
          {projects.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

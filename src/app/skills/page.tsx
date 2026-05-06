import SkillGroup from "@/components/skill-group";
import { skillCategories } from "@/lib/data";

export default function SkillsPage() {
  return (
    <section className="py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">技能</h1>
        <p className="text-[#64748b] mb-8">
          AI产品设计 + Agent工程 + 技术实现的全栈能力
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {skillCategories.map((cat) => (
            <SkillGroup key={cat.title} category={cat} />
          ))}
        </div>
      </div>
    </section>
  );
}

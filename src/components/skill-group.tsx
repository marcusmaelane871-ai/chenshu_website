export interface SkillCategory {
  title: string;
  skills: { name: string; level: string }[];
}

export default function SkillGroup({ category }: { category: SkillCategory }) {
  return (
    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-[#1e3a5f] mb-4">
        {category.title}
      </h3>
      <div className="space-y-3">
        {category.skills.map((s) => (
          <div key={s.name}>
            <span className="text-sm font-medium text-[#0f172a]">
              {s.name}
            </span>
            <span className="block text-xs text-[#64748b] mt-0.5">
              {s.level}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

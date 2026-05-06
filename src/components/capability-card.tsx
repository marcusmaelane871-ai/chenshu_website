export interface Capability {
  title: string;
  description: string;
  evidence: { label: string; value: string }[];
  anchor: string;
}

export default function CapabilityCard({ cap }: { cap: Capability }) {
  return (
    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-6 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">
        {cap.title}
      </h3>
      <p className="text-[#64748b] text-sm leading-relaxed mb-4">
        {cap.description}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {cap.evidence.map((e) => (
          <div key={e.label} className="flex flex-col">
            <span className="text-xs text-[#64748b]">{e.label}</span>
            <span className="text-sm font-semibold text-[#0f172a]">
              {e.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

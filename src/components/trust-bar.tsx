import { stats } from "@/lib/data";

export default function TrustBar() {
  return (
    <section className="py-10 bg-[#1e3a5f]">
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                {s.value}
              </div>
              <div className="text-sm text-blue-200">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

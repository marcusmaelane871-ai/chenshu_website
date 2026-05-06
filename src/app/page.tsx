import Link from "next/link";
import Hero from "@/components/hero";
import CapabilityCard from "@/components/capability-card";
import ProjectPreview from "@/components/project-preview";
import TrustBar from "@/components/trust-bar";
import { capabilities, projects } from "@/lib/data";

export default function Home() {
  return (
    <>
      <Hero />

      {/* 三大核心能力 */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-6">
            三大核心能力
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {capabilities.map((cap) => (
              <CapabilityCard key={cap.title} cap={cap} />
            ))}
          </div>
        </div>
      </section>

      {/* 项目预览 */}
      <section className="py-12 bg-[#f8fafc]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-6">项目</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {projects.map((p) => (
              <ProjectPreview key={p.slug} project={p} />
            ))}
          </div>
        </div>
      </section>

      {/* 信任信号 */}
      <TrustBar />

      {/* CTA */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-3">
            想了解更多？
          </h2>
          <p className="text-[#64748b] mb-6">
            查看完整项目详情，或直接联系我聊聊
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/projects"
              className="inline-flex items-center px-5 py-2.5 rounded-lg bg-[#1e3a5f] text-white font-medium text-sm hover:bg-[#2563eb] transition-colors"
            >
              查看完整项目
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center px-5 py-2.5 rounded-lg border border-[#e2e8f0] text-[#1e3a5f] font-medium text-sm hover:border-[#2563eb] hover:text-[#2563eb] transition-colors"
            >
              联系我
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

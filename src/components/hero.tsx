import Image from "next/image";
import Link from "next/link";
import { profile } from "@/lib/data";

export default function Hero() {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-start gap-8">
        <Image
          src="/avatar.jpg"
          alt={profile.name}
          width={160}
          height={160}
          className="rounded-2xl flex-shrink-0 object-cover w-32 h-32 md:w-40 md:h-40"
          priority
        />
        <div>
          <p className="text-[#2563eb] font-medium text-sm tracking-wide uppercase mb-3">
            AI系统设计型产品经理
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4">
            {profile.name}
          </h1>
          <p className="text-xl text-[#0f172a] font-medium mb-4">
            {profile.tagline}
          </p>
          <p className="text-[#64748b] text-base leading-relaxed max-w-2xl mb-8">
            {profile.bio}
          </p>
          <div className="flex gap-3">
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
      </div>
    </section>
  );
}

import Link from "next/link";
import { profile, githubRepos } from "@/lib/data";

export default function ContactPage() {
  return (
    <section className="py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">联系我</h1>
        <p className="text-[#64748b] mb-8">
          如果你正在寻找能设计并落地AI系统的产品经理，欢迎联系
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Contact info */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">
              联系方式
            </h2>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-[#64748b] mb-1">邮箱</div>
                <a
                  href={`mailto:${profile.email}`}
                  className="text-[#2563eb] hover:underline text-sm"
                >
                  {profile.email}
                </a>
              </div>
              <div>
                <div className="text-xs text-[#64748b] mb-1">电话</div>
                <span className="text-sm text-[#0f172a]">{profile.phone}</span>
              </div>
              <div>
                <div className="text-xs text-[#64748b] mb-1">GitHub</div>
                <Link
                  href="https://github.com/phoenix1028"
                  target="_blank"
                  className="text-[#2563eb] hover:underline text-sm"
                >
                  github.com/phoenix1028
                </Link>
              </div>
            </div>
          </div>

          {/* GitHub repos */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">
              开源项目
            </h2>
            <div className="space-y-4">
              {githubRepos.map((repo) => (
                <div key={repo.name}>
                  <Link
                    href={repo.url}
                    target="_blank"
                    className="text-[#2563eb] hover:underline text-sm font-medium"
                  >
                    {repo.name}
                  </Link>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    {repo.description}
                  </p>
                  <p className="text-xs text-[#64748b]">{repo.tech}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

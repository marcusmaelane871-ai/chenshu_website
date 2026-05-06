import Link from "next/link";
import { social } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="border-t border-[#e2e8f0] bg-[#f8fafc] mt-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[#64748b]">
        <span>&copy; {new Date().getFullYear()} 陈树</span>
        <div className="flex gap-4">
          <Link
            href={social.github}
            target="_blank"
            className="hover:text-[#1e3a5f] transition-colors"
          >
            GitHub
          </Link>
          <Link
            href="/contact"
            className="hover:text-[#1e3a5f] transition-colors"
          >
            联系我
          </Link>
        </div>
      </div>
    </footer>
  );
}

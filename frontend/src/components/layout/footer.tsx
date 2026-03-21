import * as React from "react";
import { Mountain, Heart } from "lucide-react";
import { copy } from "@/lib/copy";

/**
 * 页脚组件 — GoMate Design System v2.0
 * 设计：品牌深色渐变底 + 温暖文字 + 呼吸感间距
 */
export function Footer() {
  return (
    <footer
      style={{
        background: "linear-gradient(160deg, #1a6459 0%, #1c7d6d 40%, #249a87 100%)",
      }}
    >
      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

          {/* 品牌区 */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                <Mountain className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-white font-bold text-xl tracking-tight">GoMate</span>
            </div>
            <p className="text-white/65 text-sm leading-relaxed mb-6">
              {copy.footer.tagline}
            </p>
            {/* 小标语 */}
            <p className="text-white/40 text-xs">
              下一座山，有人一起爬 🏔️
            </p>
          </div>

          {/* 产品 */}
          <div>
            <h3 className="text-white/90 font-semibold text-sm mb-5 tracking-wide uppercase">
              {copy.footer.product}
            </h3>
            <ul className="space-y-3 text-sm">
              {[
                { href: "/locations", label: copy.footer.productLocations },
                { href: "/teams",     label: copy.footer.productTeams },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-white/55 hover:text-white transition-colors duration-150"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 公司 */}
          <div>
            <h3 className="text-white/90 font-semibold text-sm mb-5 tracking-wide uppercase">
              {copy.footer.company}
            </h3>
            <ul className="space-y-3 text-sm">
              {[
                { href: "/about",   label: copy.footer.companyAbout },
                { href: "/contact", label: copy.footer.companyContact },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-white/55 hover:text-white transition-colors duration-150"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 支持 */}
          <div>
            <h3 className="text-white/90 font-semibold text-sm mb-5 tracking-wide uppercase">
              {copy.footer.support}
            </h3>
            <ul className="space-y-3 text-sm">
              {[
                { href: "/privacy", label: copy.footer.supportPrivacy },
                { href: "/terms",   label: copy.footer.terms },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-white/55 hover:text-white transition-colors duration-150"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 分割线 */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/35">
          <p>© {new Date().getFullYear()} {copy.footer.copyright}</p>
          <p className="flex items-center gap-1.5">
            Made with <Heart className="h-3 w-3 text-white/50 fill-white/50" /> in 深圳
          </p>
        </div>
      </div>
    </footer>
  );
}

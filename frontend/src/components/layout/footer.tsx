import * as React from "react";
import { Mountain, Heart, ArrowRight, Mail } from "lucide-react";
import { copy } from "@/lib/copy";

/**
 * 页脚组件 — GoMate Design System v2.0
 * 结构：主内容四列 + 底部版权栏
 */
export function Footer() {
  return (
    <footer style={{ background: "linear-gradient(160deg, #12302b 0%, #1a6459 45%, #1e7a6a 100%)" }}>

      {/* 顶部山脉装饰 */}
      <div className="relative overflow-hidden h-12 pointer-events-none" aria-hidden="true">
        <svg
          className="absolute top-0 left-0 w-full"
          viewBox="0 0 1440 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          style={{ opacity: 0.06 }}
        >
          <path
            d="M0 48L120 30L240 40L360 18L480 32L600 10L720 24L840 4L960 16L1080 0L1200 12L1320 2L1440 14V48H0Z"
            fill="white"
          />
        </svg>
      </div>

      {/* ── 主内容区 ── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">

          {/* 品牌区（占 5 列） */}
          <div className="md:col-span-5 order-last md:order-first">
            <div className="block md:hidden border-t border-white/8 mb-8 -mx-0 pt-2" />
            <div className="flex items-center gap-2.5 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(116,208,191,0.30) 0%, rgba(36,154,135,0.25) 100%)" }}
              >
                <Mountain className="h-5 w-5 text-white" />
              </div>
              <span className="text-white font-bold text-xl tracking-tight">GoMate</span>
            </div>
            <p className="text-white/55 text-sm leading-relaxed mb-6 max-w-xs">
              {copy.footer.tagline}
            </p>

            {/* 特色标签组 */}
            <div className="flex flex-wrap gap-2">
              {["深圳徒步", "极简组队", "户外社区"].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-medium cursor-default transition-colors duration-150"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.55)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLSpanElement;
                    el.style.borderColor = "rgba(255,255,255,0.30)";
                    el.style.color = "rgba(255,255,255,0.80)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLSpanElement;
                    el.style.borderColor = "rgba(255,255,255,0.10)";
                    el.style.color = "rgba(255,255,255,0.55)";
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* 产品（占 2 列） */}
          <div className="md:col-span-2">
            <h3 className="text-white/90 font-semibold text-xs mb-5 tracking-widest uppercase">
              {copy.footer.product}
            </h3>
            <ul className="space-y-3">
              {[
                { href: "/locations",    label: copy.footer.productLocations },
                { href: "/teams",        label: copy.footer.productTeams },
                { href: "/teams/create", label: copy.nav.createTeam },
                { href: "/locations",    label: copy.footer.productGuides },
                { href: "/safety",       label: copy.footer.productSafety },
              ].map(({ href, label }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-sm text-white/50 hover:text-white transition-colors duration-150 flex items-center gap-1.5 group"
                  >
                    <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-150" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 公司（占 2 列） */}
          <div className="md:col-span-2">
            <h3 className="text-white/90 font-semibold text-xs mb-5 tracking-widest uppercase">
              {copy.footer.company}
            </h3>
            <ul className="space-y-3">
              {[
                { href: "/about",    label: copy.footer.companyAbout },
                { href: "/careers",  label: copy.footer.companyCareers },
                { href: "/contact",  label: copy.footer.companyContact },
                { href: "/partners", label: copy.footer.companyPartners },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-sm text-white/50 hover:text-white transition-colors duration-150 flex items-center gap-1.5 group"
                  >
                    <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-150" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 支持（占 3 列） */}
          <div className="md:col-span-3">
            <h3 className="text-white/90 font-semibold text-xs mb-5 tracking-widest uppercase">
              {copy.footer.support}
            </h3>
            <ul className="space-y-3">
              {[
                { href: "/help",       label: copy.footer.supportHelp },
                { href: "/safety",     label: copy.footer.supportSafety },
                { href: "/guidelines", label: copy.footer.supportGuidelines },
                { href: "/privacy",    label: copy.footer.supportPrivacy },
                { href: "/terms",      label: copy.footer.terms },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-sm text-white/50 hover:text-white transition-colors duration-150 flex items-center gap-1.5 group"
                  >
                    <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-150" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>

            {/* 联系卡片 */}
            <div
              className="mt-6 p-3 rounded-xl flex items-center gap-2.5"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.10)" }}
              >
                <Mail className="h-3.5 w-3.5 text-white/60" />
              </div>
              <div>
                <p className="text-white/40 text-xs mb-0.5">联系我们</p>
                <p className="text-white/70 text-xs font-medium">hi@gomate.app</p>
              </div>
            </div>
          </div>

        </div>

        {/* ── 底部版权栏 ── */}
        <div
          className="border-t pt-7 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <p className="text-white/45 text-xs">
            © {new Date().getFullYear()} {copy.footer.copyright}
          </p>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-white/40 text-xs hover:text-white/70 transition-colors duration-150">
              {copy.footer.supportPrivacy}
            </a>
            <span className="text-white/20 text-xs">·</span>
            <a href="/terms" className="text-white/40 text-xs hover:text-white/70 transition-colors duration-150">
              {copy.footer.terms}
            </a>
          </div>
          <p className="text-white/45 text-xs flex items-center gap-1.5">
            Made with{" "}
            <Heart className="h-3 w-3" style={{ color: "rgba(255,122,101,0.65)", fill: "rgba(255,122,101,0.65)" }} />
            {" "}in 深圳
          </p>
        </div>
      </div>
    </footer>
  );
}

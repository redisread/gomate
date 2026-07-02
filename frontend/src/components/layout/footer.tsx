import * as React from "react";
import { useState } from "react";
import { Mountain, Heart, Mail, Copy, Check, X } from "lucide-react";
import type { TranslationKey } from "@/i18n";
import { useI18n } from "@/hooks/useI18n";
import { FooterMobile } from "./footer-mobile";

/**
 * 页脚组件 - 响应式布局
 * 桌面端：四列卡片式布局
 * 移动端：手风琴式简洁布局
 */

/**
 * 微信联系弹窗组件
 */
function WechatContactModal({ onClose, t }: { onClose: () => void; t: (key: TranslationKey) => string }) {
  const [copied, setCopied] = useState(false);
  const WECHAT_ID = "VictorHong111"; // 微信客服号

  // 复制微信号
  const handleCopyWechatId = async () => {
    try {
      await navigator.clipboard.writeText(WECHAT_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 复制失败静默处理
    }
  };

  // 保存二维码图片
  const handleSaveQRCode = () => {
    const link = document.createElement("a");
    link.href = "/wechat-qr.png";
    link.download = "gomate-wechat-qr.png";
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="bg-popover rounded-2xl w-full max-w-xs overflow-hidden shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalSlideIn 0.2s ease-out" }}
      >
        {/* 顶部装饰色带 */}
        <div
          className="h-1.5"
          style={{
            background: "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)",
          }}
        />

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label={t("common.wechat.close")}
        >
          <X className="w-4 h-4" />
        </button>

        {/* 内容区 */}
        <div className="p-5">
          {/* 标题 */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ background: "rgba(217, 119, 6, 0.1)" }}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#D97706">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {t("common.socials.wechat")}
            </h3>
          </div>

          {/* 二维码展示区 */}
          <div
            className="rounded-xl p-3 mb-4"
            style={{ background: "rgba(217, 119, 6, 0.04)" }}
          >
            <img
              src="/wechat-qr.png"
              alt={t("common.socials.wechat")}
              className="w-full aspect-square object-contain rounded-lg"
            />
          </div>

          {/* 微信号显示 */}
          <div className="mb-5">
            <div className="flex items-center justify-center gap-2">
              <span
                className="text-base font-medium px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground"
              >
                {WECHAT_ID}
              </span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={handleCopyWechatId}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "white" }}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  {t("common.wechat.wechatCopied")}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  {t("common.wechat.wechatCopy")}
                </>
              )}
            </button>
            <button
              onClick={handleSaveQRCode}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm border border-border text-muted-foreground transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t("common.wechat.wechatSaveQR")}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export function Footer() {
  const { t } = useI18n(["common"]);
  const [showWechatQR, setShowWechatQR] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // SSR 使用固定年份，CSR 更新为当前年份，避免 hydration mismatch
  const [year, setYear] = React.useState(2025);
  React.useEffect(() => {
    setYear(new Date().getFullYear());
    // 检测移动端
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 移动端使用独立组件
  if (isMobile) {
    return <FooterMobile />;
  }

  const exploreLinks = [
    { href: "/discover", label: t("common.discover") },
    { href: "/pricing", label: t("common.pricing") },
    { href: "/help", label: t("common.help") },
  ];

  return (
    <footer
      className="relative overflow-hidden bg-background border-t border-border"
    >
      {/* 背景装饰：极淡山形纹 */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <svg
          className="absolute bottom-0 left-0 w-full opacity-[0.05]"
          viewBox="0 0 1440 120"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M0 120L180 80L360 100L540 50L720 70L900 20L1080 45L1260 10L1440 30V120H0Z"
            fill="#2C1810"
          />
        </svg>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 sm:px-8">

        {/* ── 主体区：品牌卡片 + 链接 ── */}
        <div className="py-16 sm:py-12 md:py-16">
          <div className="flex flex-col md:flex-row gap-12 md:gap-16">

            {/* 品牌卡片 */}
            <div className="flex-1 max-w-xs">
              <div className="card-base p-6 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)" }}
                  >
                    <Mountain className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-bold text-lg tracking-tight text-foreground">
                    GoMate
                  </span>
                </div>
                <p className="text-sm leading-relaxed mb-5 text-muted-foreground">
                  {t("common.tagline")}
                </p>
                <a
                  href={`mailto:${t("common.contactEmail")}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] mt-auto"
                  style={{
                    background: "rgba(217, 119, 6, 0.08)",
                    color: "#D97706",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(217, 119, 6, 0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(217, 119, 6, 0.08)";
                  }}
                >
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  {t("common.contactEmail")}
                </a>
              </div>
            </div>

            {/* 链接 */}
            <div>
              <h3
                className="text-sm font-semibold mb-5 sm:mb-4 tracking-wide"
                style={{ color: "#D97706" }}
              >
                {t("common.explore")}
              </h3>
              <ul className="space-y-4 sm:space-y-3">
                {exploreLinks.map(({ href, label }) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="footer-link inline-flex items-center gap-2 text-sm text-muted-foreground group"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* ── 版权栏 ── */}
        <div
          className="border-t border-border py-8 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <p className="text-xs text-muted-foreground">
            © {year} {t("common.copyright")}
          </p>
          <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
            Made with
            <Heart className="h-3 w-3 text-primary" style={{ fill: "currentColor" }} />
            {t("common.madeWithLove")}
          </p>
        </div>

      </div>

      {/* 微信联系弹窗 */}
      {showWechatQR && (
        <WechatContactModal onClose={() => setShowWechatQR(false)} t={t} />
      )}

    </footer>
  );
}

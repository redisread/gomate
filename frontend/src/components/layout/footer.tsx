import * as React from "react";
import { useState } from "react";
import { Mountain, Heart, Mail, ArrowUp, MapPin, Users, Plus, ExternalLink, Copy, Check, X } from "lucide-react";
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const exploreLinks = [
    { href: "/locations", label: t("common.exploreLocations"), icon: MapPin },
    { href: "/teams", label: t("common.exploreTeams"), icon: Users },
    { href: "/teams/create", label: t("common.exploreCreate"), icon: Plus },
  ];

  const supportLinks = [
    { href: "/about", label: t("common.supportAbout") },
    { href: "/blog", label: t("common.supportBlog") },
    { href: "/feedback", label: t("common.supportFeedback") },
    { href: "/help", label: t("common.supportHelp") },
  ];

  const legalLinks = [
    { href: "/privacy", label: t("common.legalPrivacy") },
    { href: "/terms", label: t("common.legalTerms") },
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

        {/* ── 主体区：品牌卡片 + 三列链接 ── */}
        <div className="py-16 sm:py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-8 lg:gap-10">

            {/* 品牌卡片 */}
            <div className="lg:col-span-1">
              <div className="card-base p-6 h-full flex flex-col">
                {/* Logo */}
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

                {/* 标语 */}
                <p className="text-sm leading-relaxed mb-5 text-muted-foreground">
                  {t("common.tagline")}
                </p>

                {/* 邮箱按钮 */}
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

                {/* 社交媒体按钮 */}
                <div className="flex items-center gap-2 mt-3">
                  {/* 微信 */}
                  <button
                    onClick={() => setShowWechatQR(true)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                    style={{ background: "rgba(217, 119, 6, 0.08)", color: "#D97706" }}
                    title={t("common.socials.wechat")}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                    </svg>
                  </button>

                  {/* 即刻 */}
                  <a
                    href="https://web.okjike.com/u/e991c442-72ff-4522-8559-d5dff7c541cf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                    style={{ background: "rgba(217, 119, 6, 0.08)", color: "#D97706" }}
                    title={t("common.socials.jike")}
                  >
                    <svg width="20" height="20" viewBox="0 0 38 37" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M29.0824 0H8.78504C4.20934 0 0.5 3.70934 0.5 8.28504V28.5824C0.5 33.1581 4.20934 36.8675 8.78504 36.8675H29.0824C33.6581 36.8675 37.3675 33.1581 37.3675 28.5824V8.28504C37.3675 3.70934 33.6581 0 29.0824 0Z" fill="#D97706"/>
                      <path d="M14.8856 30.1234L12.1737 26.2888C12.1219 26.2145 12.1015 26.1227 12.1168 26.0334C12.1321 25.9441 12.182 25.8644 12.2557 25.8116L14.0489 24.5503C15.9031 23.2384 17.011 21.42 17.011 18.83V7.14769C17.011 7.05717 17.0468 6.97032 17.1106 6.90612C17.1744 6.84192 17.261 6.80557 17.3516 6.80502H22.1363V18.8258C22.1363 23.5412 20.8224 25.8936 16.9563 28.6602L14.8856 30.1234Z" fill="white"/>
                    </svg>
                  </a>

                  {/* 电报 */}
                  <a
                    href="https://t.me/gomate111"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                    style={{ background: "rgba(217, 119, 6, 0.08)", color: "#D97706" }}
                    title={t("common.socials.telegram")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.287 5.906q-1.168.486-4.666 2.01-.567.225-.595.442c-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294q.39.01.868-.32 3.269-2.206 3.374-2.23c.05-.012.12-.026.166.016s.042.12.037.141c-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8 8 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629q.14.092.27.187c.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.4 1.4 0 0 0-.013-.315.34.34 0 0 0-.114-.217.53.53 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09"/>
                    </svg>
                  </a>

                  {/* 小红书 */}
                  <a
                    href="https://xhslink.com/m/4nG6kEejTq3"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                    style={{ background: "rgba(217, 119, 6, 0.08)", color: "#D97706" }}
                    title={t("common.socials.xiaohongshu")}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.405 9.879c.002.016.01.02.07.019h.725a.797.797 0 0 0 .78-.972.794.794 0 0 0-.884-.618.795.795 0 0 0-.692.794c0 .101-.002.666.001.777zm-11.509 4.808c-.203.001-1.353.004-1.685.003a2.528 2.528 0 0 1-.766-.126.025.025 0 0 0-.03.014L7.7 16.127a.025.025 0 0 0 .01.032c.111.06.336.124.495.124.66.01 1.32.002 1.981 0 .01 0 .02-.006.023-.015l.712-1.545a.025.025 0 0 0-.024-.036zM.477 9.91c-.071 0-.076.002-.076.01a.834.834 0 0 0-.01.08c-.027.397-.038.495-.234 3.06-.012.24-.034.389-.135.607-.026.057-.033.042.003.112.046.092.681 1.523.787 1.74.008.015.011.02.017.02.008 0 .033-.026.047-.044.147-.187.268-.391.371-.606.306-.635.44-1.325.486-1.706.014-.11.021-.22.03-.33l.204-2.616.022-.293c.003-.029 0-.033-.03-.034zm7.203 3.757a1.427 1.427 0 0 1-.135-.607c-.004-.084-.031-.39-.235-3.06a.443.443 0 0 0-.01-.082c-.004-.011-.052-.008-.076-.008h-1.48c-.03.001-.034.005-.03.034l.021.293c.076.982.153 1.964.233 2.946.05.4.186 1.085.487 1.706.103.215.223.419.37.606.015.018.037.051.048.049.02-.003.742-1.642.804-1.765.036-.07.03-.055.003-.112zm3.861-.913h-.872a.126.126 0 0 1-.116-.178l1.178-2.625a.025.025 0 0 0-.023-.035l-1.318-.003a.148.148 0 0 1-.135-.21l.876-1.954a.025.025 0 0 0-.023-.035h-1.56c-.01 0-.02.006-.024.015l-.926 2.068c-.085.169-.314.634-.399.938a.534.534 0 0 0-.02.191.46.46 0 0 0 .23.378.981.981 0 0 0 .46.119h.59c.041 0-.688 1.482-.834 1.972a.53.53 0 0 0-.023.172.465.465 0 0 0 .23.398c.15.092.342.12.475.12l1.66-.001c.01 0 .02-.006.023-.015l.575-1.28a.025.025 0 0 0-.024-.035zm-6.93-4.937H3.1a.032.032 0 0 0-.034.033c0 1.048-.01 2.795-.01 6.829 0 .288-.269.262-.28.262h-.74c-.04.001-.044.004-.04.047.001.037.465 1.064.555 1.263.01.02.03.033.051.033.157.003.767.009.938-.014.153-.02.3-.06.438-.132.3-.156.49-.419.595-.765.052-.172.075-.353.075-.533.002-2.33 0-4.66-.007-6.991a.032.032 0 0 0-.032-.032zm11.784 6.896c0-.014-.01-.021-.024-.022h-1.465c-.048-.001-.049-.002-.05-.049v-4.66c0-.072-.005-.07.07-.07h.863c.08 0 .075.004.075-.074V8.393c0-.082.006-.076-.08-.076h-3.5c-.064 0-.075-.006-.075.073v1.445c0 .083-.006.077.08.077h.854c.075 0 .07-.004.07.07v4.624c0 .095.008.084-.085.084-.37 0-1.11-.002-1.304 0-.048.001-.06.03-.06.03l-.697 1.519s-.014.025-.008.036c.006.01.013.008.058.008 1.748.003 3.495.002 5.243.002.03-.001.034-.006.035-.033v-1.539zm4.177-3.43c0 .013-.007.023-.02.024-.346.006-.692.004-1.037.004-.014-.002-.022-.01-.022-.024-.005-.434-.007-.869-.01-1.303 0-.072-.006-.071.07-.07l.733-.003c.041 0 .081.002.12.015.093.025.16.107.165.204.006.431.002 1.153.001 1.153zm2.67.244a1.953 1.953 0 0 0-.883-.222h-.18c-.04-.001-.04-.003-.042-.04V10.21c0-.132-.007-.263-.025-.394a1.823 1.823 0 0 0-.153-.53 1.533 1.533 0 0 0-.677-.71 2.167 2.167 0 0 0-1-.258c-.153-.003-.567 0-.72 0-.07 0-.068.004-.068-.065V7.76c0-.031-.01-.041-.046-.039H17.93s-.016 0-.023.007c-.006.006-.008.012-.008.023v.546c-.008.036-.057.015-.082.022h-.95c-.022.002-.028.008-.03.032v1.481c0 .09-.004.082.082.082h.913c.082 0 .072.128.072.128V11.19s.003.117-.06.117h-1.482c-.068 0-.06.082-.06.082v1.445s-.01.068.064.068h1.457c.082 0 .076-.006.076.079v3.225c0 .088-.007.081.082.081h1.43c.09 0 .082.007.082-.08v-3.27c0-.029.006-.035.033-.035l2.323-.003c.098 0 .191.02.28.061a.46.46 0 0 1 .274.407c.008.395.003.79.003 1.185 0 .259-.107.367-.33.367h-1.218c-.023.002-.029.008-.028.033.184.437.374.871.57 1.303a.045.045 0 0 0 .04.026c.17.005.34.002.51.003.15-.002.517.004.666-.01a2.03 2.03 0 0 0 .408-.075c.59-.18.975-.698.976-1.313v-1.981c0-.128-.01-.254-.034-.38 0 .078-.029-.641-.724-.998z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* 探索 */}
            <div>
              <h3
                className="text-sm font-semibold mb-5 sm:mb-4 tracking-wide"
                style={{ color: "#D97706" }}
              >
                {t("common.explore")}
              </h3>
              <ul className="space-y-4 sm:space-y-3">
                {exploreLinks.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="footer-link inline-flex items-center gap-2 text-sm text-muted-foreground group"
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* 支持 */}
            <div>
              <h3
                className="text-sm font-semibold mb-5 sm:mb-4 tracking-wide"
                style={{ color: "#D97706" }}
              >
                {t("common.support")}
              </h3>
              <ul className="space-y-4 sm:space-y-3">
                {supportLinks.map(({ href, label }) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="footer-link text-sm text-muted-foreground"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* 法律/联系 */}
            <div>
              <h3
                className="text-sm font-semibold mb-5 sm:mb-4 tracking-wide"
                style={{ color: "#D97706" }}
              >
                {t("common.legal")}
              </h3>
              <ul className="space-y-4 sm:space-y-3 mb-6">
                {legalLinks.map(({ href, label }) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="footer-link text-sm text-muted-foreground"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>

              {/* 回到顶部按钮 */}
              <button
                onClick={scrollToTop}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:text-primary hover:scale-105"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                {t("common.backToTop")}
              </button>
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

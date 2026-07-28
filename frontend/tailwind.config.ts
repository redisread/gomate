import type { Config } from "tailwindcss";

/**
 * GoMate Tailwind CSS 4 配置
 *
 * 注意：Tailwind CSS 4 主要通过 globals.css 的 @theme inline 进行 CSS-first 配置，
 * 此文件主要补充：
 *   - 内容扫描路径
 *   - 自定义字体 / 动画 keyframes（用 JS 定义便于 IDE 提示）
 *   - 补充 spacing / screen 扩展
 */
const config: Config = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],

  // dark mode 通过 .dark class 控制（globals.css 中 @custom-variant 已定义）
  darkMode: "class",

  theme: {
    extend: {
      /* ---- 字体族（优化版） ---- */
      fontFamily: {
        /*
         * 优化后的系统字体栈 — 零下载成本，即时渲染
         * font-display: swap 通过 globals.css 中的 @font-face 规则实现
         */
        sans: [
          "System Sans",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "Noto Sans SC",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "SF Mono",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },

      /* ---- 字号 Scale ---- */
      fontSize: {
        // 微小辅助文字（时间戳、版权信息）
        "2xs": ["0.625rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
        // xs 覆写：用于徽章、标签
        xs:   ["0.75rem",  { lineHeight: "1.125rem" }],
        // sm 覆写：用于次要正文
        sm:   ["0.875rem", { lineHeight: "1.375rem" }],
        // base：正文
        base: ["1rem",     { lineHeight: "1.625rem" }],
        // lg：大正文 / 小标题
        lg:   ["1.125rem", { lineHeight: "1.75rem" }],
        // xl：卡片标题
        xl:   ["1.25rem",  { lineHeight: "1.875rem" }],
        // 2xl：页面子标题
        "2xl": ["1.5rem",  { lineHeight: "2rem",   fontWeight: "600" }],
        // 3xl：页面主标题（移动端）
        "3xl": ["1.875rem",{ lineHeight: "2.25rem" }],
        // 4xl：Hero 标题（桌面端）
        "4xl": ["2.25rem", { lineHeight: "2.625rem", letterSpacing: "-0.02em" }],
        // 5xl：超大 Hero
        "5xl": ["3rem",    { lineHeight: "3.5rem",   letterSpacing: "-0.025em" }],
      },

      /* ---- 行高补充 ---- */
      lineHeight: {
        tight:    "1.2",
        snug:     "1.35",
        normal:   "1.6",
        relaxed:  "1.75",
        loose:    "2",
      },

      /* ---- 字重 ---- */
      fontWeight: {
        light:    "300",
        normal:   "400",
        medium:   "500",
        semibold: "600",
        bold:     "700",
        extrabold:"800",
      },

      /* ---- 间距扩展（在 Tailwind 默认值基础上补充） ---- */
      spacing: {
        // 常用于图标间距
        "4.5": "1.125rem",
        "13":  "3.25rem",
        "15":  "3.75rem",
        "18":  "4.5rem",
        "22":  "5.5rem",
        "26":  "6.5rem",
        "30":  "7.5rem",
      },

      /* ---- 圆角 ---- */
      borderRadius: {
        xs:   "0.25rem",   /* 4px */
        sm:   "0.375rem",  /* 6px */
        md:   "0.5rem",    /* 8px */
        lg:   "0.625rem",  /* 10px — 默认 --radius */
        xl:   "0.875rem",  /* 14px */
        "2xl":"1.125rem",  /* 18px */
        "3xl":"1.5rem",    /* 24px */
        "4xl":"2rem",      /* 32px */
        full: "9999px",
      },

      /* ---- 断点扩展 ---- */
      screens: {
        xs:   "480px",   /* 超小屏（折叠屏/小手机） */
        sm:   "640px",
        md:   "768px",
        lg:   "1024px",
        xl:   "1280px",
        "2xl":"1536px",
        "3xl":"1920px",  /* 超宽屏 */
      },

      /* ---- 动画时长 ---- */
      transitionDuration: {
        "80":  "80ms",
        "150": "150ms",
        "250": "250ms",
        "350": "350ms",
        "400": "400ms",
        "600": "600ms",
      },

      /* ---- 缓动曲线 ---- */
      transitionTimingFunction: {
        // 快出慢入（页面元素出现）
        "spring":  "cubic-bezier(0.16, 1, 0.3, 1)",
        // 轻弹（菜单、下拉展开）
        "bounce-in": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        // 标准出现
        "ease-out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
      },

      /* ---- Keyframes（对应 globals.css 中 @theme 的 keyframes） ---- */
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.94)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-4px)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.5" },
        },
        "shimmer": {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
      },



      /* ---- 阴影 ---- */
      boxShadow: {
        // 温暖色调阴影（替代默认冷灰阴影）
        "warm-xs": "0 1px 2px oklch(0.5 0.05 75 / 0.08)",
        "warm-sm": "0 1px 3px oklch(0.5 0.05 75 / 0.12), 0 1px 2px oklch(0.5 0.05 75 / 0.08)",
        "warm":    "0 4px 6px oklch(0.5 0.05 75 / 0.10), 0 2px 4px oklch(0.5 0.05 75 / 0.08)",
        "warm-md": "0 6px 12px oklch(0.5 0.05 75 / 0.12), 0 3px 6px oklch(0.5 0.05 75 / 0.08)",
        "warm-lg": "0 10px 25px oklch(0.5 0.05 75 / 0.12), 0 4px 10px oklch(0.5 0.05 75 / 0.08)",
        "warm-xl": "0 20px 40px oklch(0.5 0.05 75 / 0.14), 0 8px 16px oklch(0.5 0.05 75 / 0.1)",
        // 品牌色发光效果（主 CTA 按钮 hover）
        "brand-glow": "0 4px 15px oklch(0.48 0.13 195 / 0.35)",
        "brand-glow-lg": "0 8px 25px oklch(0.48 0.13 195 / 0.4)",
        // 卡片浮起阴影
        "card":    "0 1px 3px oklch(0.18 0.008 250 / 0.06), 0 1px 2px oklch(0.18 0.008 250 / 0.04), 0 0 0 1px oklch(0.88 0.01 75 / 0.5)",
        "card-hover": "0 8px 24px oklch(0.18 0.008 250 / 0.1), 0 3px 8px oklch(0.18 0.008 250 / 0.06), 0 0 0 1px oklch(0.88 0.01 75 / 0.5)",
        // 内阴影（输入框聚焦）
        "inner-brand": "inset 0 0 0 2px oklch(0.48 0.13 195 / 0.4)",
      },

      /* ---- 模糊值 ---- */
      backdropBlur: {
        xs:  "4px",
        sm:  "8px",
        md:  "12px",
        lg:  "16px",
        xl:  "24px",
      },
    },
  },

  plugins: [require('@tailwindcss/typography')],
};

export default config;

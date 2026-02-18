import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出配置
  output: 'export',
  distDir: 'dist',
  trailingSlash: true,

  // 模块解析
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": ".",
    };
    return config;
  },

  // 图片优化配置（静态导出需要禁用）
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "gomate.cos.jiahongw.com",
        pathname: "/**",
      },
    ],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  // TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },

  // Turbopack 配置
  turbopack: {
    resolveAlias: {
      '@/app/*': './app/*',
      '@/components/*': './components/*',
      '@/lib/*': './lib/*',
      '@/db/*': './db/*',
      '@/types/*': './types/*',
      '@/emails/*': './emails/*',
      '@/content/*': './content/*',
    },
  },
};

export default nextConfig;

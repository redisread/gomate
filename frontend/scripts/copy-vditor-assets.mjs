/**
 * 复制 Vditor 静态资源到 public/vditor/dist
 *
 * Vditor 内部拼接 CDN 路径时会自动加 /dist/ 前缀：
 *   ${cdn}/dist/css/index.css
 *   ${cdn}/dist/js/lute/lute.min.js
 *   ${cdn}/dist/js/i18n/zh_CN.js
 *   ${cdn}/dist/css/content-theme/dark.css
 *   ${cdn}/dist/images/emoji/...
 *
 * 因此必须保持 dist 子目录结构，cdn 配置为 "/vditor" 即可。
 */
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const vditorSrc = resolve(root, "node_modules/vditor/dist");
const vditorDest = resolve(root, "public/vditor/dist");

if (!existsSync(vditorSrc)) {
  console.error("[copy-vditor-assets] vditor dist not found at:", vditorSrc);
  process.exit(1);
}

// 清理旧副本
await rm(resolve(root, "public/vditor"), { recursive: true, force: true });
await mkdir(vditorDest, { recursive: true });

// 复制整个 dist 目录（保留内部 css/js/images 结构）
await cp(vditorSrc, vditorDest, { recursive: true });

console.log(`[copy-vditor-assets] Copied vditor assets to public/vditor/dist`);

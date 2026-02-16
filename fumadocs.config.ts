import { defineConfig } from 'fumadocs-mdx/config';

export default defineConfig({
  // MDX 文件目录
  dir: 'content/docs',
  // 输出目录
  outDir: '.source',
  // 生成搜索索引
  generateSearchIndex: true,
  // 生成页面树
  generatePageTree: true,
});

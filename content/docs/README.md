# GoMate 文档系统

本文档系统基于 [FumaDocs](https://fumadocs.vercel.app) + MDX 构建。

## 目录结构

```
content/docs/              # 文档内容目录
├── meta.json             # 根目录元数据
├── index.mdx             # 文档首页
├── getting-started/      # 入门指南
│   ├── meta.json
│   ├── index.mdx
│   ├── what-is-gomate.mdx
│   ├── join-team.mdx
│   ├── create-team.mdx
│   └── safety.mdx
├── guides/               # 路线攻略
│   ├── meta.json
│   ├── index.mdx
│   ├── qiniangshan.mdx   # 七娘山
│   ├── wutongshan.mdx    # 梧桐山
│   ├── dongxichong.mdx   # 东西冲穿越
│   ├── dayanding.mdx     # 大雁顶
│   └── maluanshan.mdx    # 马峦山
└── best-practices/       # 最佳实践
    ├── meta.json
    ├── index.mdx
    ├── team-safety.mdx
    ├── gear-checklist.mdx
    ├── emergency.mdx
    └── eco-hiking.mdx
```

## 自定义 MDX 组件

### Callout 提示框

```mdx
<Callout type="info" title="提示标题">
  提示内容
</Callout>
```

type 可选值: `info`, `warning`, `error`, `success`, `tip`

### Card 卡片

```mdx
<Card title="卡片标题" href="/link">
  卡片内容
</Card>
```

### Cards 卡片组

```mdx
<Cards cols={2}>
  <Card title="卡片1">内容1</Card>
  <Card title="卡片2">内容2</Card>
</Cards>
```

### Steps 步骤

```mdx
<Steps>
  <Step step={1} title="步骤标题">
    步骤内容
  </Step>
</Steps>
```

### YouTube 嵌入

```mdx
<YouTube id="VIDEO_ID" title="视频标题" />
```

### MapEmbed 地图嵌入

```mdx
<MapEmbed src="GOOGLE_MAPS_EMBED_URL" title="地图标题" />
```

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问文档
open http://localhost:3000/docs
```

## 添加新文档

1. 在 `content/docs/` 下创建 `.mdx` 文件
2. 添加 frontmatter：
   ```mdx
   ---
   title: 文档标题
   description: 文档描述
   ---
   ```
3. 在对应目录的 `meta.json` 中添加页面引用
4. 重启开发服务器查看效果

## 搜索功能

文档搜索基于 FumaDocs 的搜索功能，自动索引所有文档内容。

搜索 API 端点：`/api/search`

# 🏔️ GoMate 徒步组队平台

> 发现户外好去处，找到同行好伙伴

[![Live](https://img.shields.io/badge/Live-gomate.live-blue)](https://gomate.live)

## 产品定位

GoMate 是一个**户外徒步组队平台**，解决「想出门但找不到伙伴」的问题：

| 功能 | 描述 |
|------|------|
| 🗺️ **发现地点** | 深圳及周边徒步路线推荐，含难度、时长、POI 标记 |
| 👥 **组建队伍** | 一键发布组队信息，设定人数、时间、要求 |
| ✅ **便捷参与** | 申请加入队伍，队长审核，组队出发 |

## 在线体验

**网站：** https://gomate.live

**核心流程：**
浏览地点 → 查看详情 → 加入/创建队伍 → 等待确认 → 一起出发

## 技术栈

- **前端：** Astro + React + Tailwind CSS
- **后端：** Hono + Cloudflare Workers
- **数据库：** Cloudflare D1
- **部署：** Cloudflare Pages + Workers

## 快速开始

```bash
# 安装依赖
pnpm install

# 本地开发
pnpm dev

# 部署
pnpm api:deploy    # 后端
pnpm web:build     # 前端
```

## 相关仓库

- 📱 **移动端**（Flutter）：已归档至 [gomate-mobile](https://github.com/redisread/gomate-mobile)

## 许可证

MIT

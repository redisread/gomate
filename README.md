# 🏔️ GoMate 地点组队平台

> 发现有趣地点，找到同行伙伴

[![Live](https://img.shields.io/badge/Live-gomate.live-blue)](https://gomate.live)

## 产品定位

GoMate 是一个**地点组队平台**，解决「想出门但找不到伙伴」的问题：

| 功能 | 描述 |
|------|------|
| 🗺️ **发现地点** | 城市及周边户外地点推荐，含难度、标签、POI 标记 |
| 👥 **组建队伍** | 一键发布组队信息，设定人数、时间、要求 |
| ✅ **便捷参与** | 申请加入队伍，队长审核，组队出发 |

## 在线体验

**网站：** https://gomate.live

**测试账号：**
- 邮箱：`1427298683@qq.com`
- 密码：`11111111`

**核心流程：**
浏览地点 → 查看详情 → 加入/创建队伍 → 等待确认 → 一起出发

## 技术架构

```
前端: Astro 4 + React 18 + Tailwind CSS
后端: Hono + Cloudflare Workers + D1 数据库
部署: Cloudflare（全球边缘节点）
```

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

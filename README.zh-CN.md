<p align="center" style="display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 6px; text-align: center;">
  <a style="display: inline-flex; align-items: center;" href="https://gomate.live"><img style="display: block;" src="public/icon-512.png" width="72" height="72" alt="GoMate 同行足迹图标"></a>
</p>

<h1 align="center" style="text-align: center;">GoMate</h1>

<p align="center" style="text-align: center;">
  <strong>发现好去处，找到同行人。</strong><br>
  探索城市与周边，组队开启下一程。
</p>

<p align="center" style="display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 6px; text-align: center;">
  <a style="display: inline-flex; align-items: center;" href="https://github.com/redisread/gomate/actions/workflows/ci.yml"><img style="display: block;" src="https://github.com/redisread/gomate/actions/workflows/ci.yml/badge.svg?event=pull_request" alt="CI"></a>
  <a style="display: inline-flex; align-items: center;" href="https://github.com/redisread/gomate"><img style="display: block;" src="https://img.shields.io/github/stars/redisread/gomate?style=flat&amp;color=111111" alt="GitHub stars"></a>
  <a style="display: inline-flex; align-items: center;" href="https://gomate.live"><img style="display: block;" src="https://img.shields.io/badge/Live-gomate.live-D97706" alt="Live demo"></a>
</p>

<p align="center" style="text-align: center;">
  <strong><a href="https://gomate.live">在线体验</a></strong> &nbsp;·&nbsp; <a href="LESSONS.md#快速开始">快速开始</a> &nbsp;·&nbsp; <a href="#项目文档">项目文档</a> &nbsp;·&nbsp; <a href="https://github.com/redisread/gomate/issues">问题反馈</a>
</p>

<p align="center" style="text-align: center;">
  <a href="README.md">English</a> &nbsp;/&nbsp; 简体中文
</p>
[![GoMate 首页：推荐地点、组队入口与导航](docs/images/gomate-home.png)](https://gomate.live)

## GoMate 能做什么？

想出门，却不知道去哪儿，或找不到同行的人？GoMate 把发现地点和组队出行放在一起。

- **发现地点** — 浏览地图，或按城市和兴趣筛选，查看标签与交通信息，选好目的地。
- **组建队伍** — 围绕地点设置时间、人数和参与要求，邀请伙伴加入。
- **参与出行** — 申请加入感兴趣的队伍，等待队长审核，集中管理队伍与申请。

浏览地点 → 选择目的地 → 创建或加入队伍 → 确认参与 → 一起出发。

### 地点探索

浏览目的地照片、兴趣标签与交通信息，找到下一站。

<img src="docs/images/gomate-locations.png" width="960" alt="GoMate 地点探索页：地点照片、介绍、城市标识与兴趣标签">

## 技术栈

| 分类 | 技术                         |
| ---- | ---------------------------- |
| 界面 | Astro · React · Tailwind CSS |
| 服务 | Hono · Cloudflare Workers    |
| 认证 | Better Auth                  |
| 数据 | Cloudflare D1 · Drizzle ORM  |
| 文件 | Cloudflare R2                |
| 邮件 | Resend                       |

## 项目文档

以下技术文档目前使用中文维护。

| 文档                                    | 内容                               |
| --------------------------------------- | ---------------------------------- |
| [开发与部署](LESSONS.md#简体中文)       | 快速开始、本地命令、测试与部署     |
| [本地开发](docs/local-dev-worktrees.md) | worktree、环境变量、本地存储与 E2E |
| [API](docs/backend-api.md)              | 接口、认证与响应合同               |
| [数据库](docs/database.md)              | 数据关系、migration 与存储约束     |
| [前端页面](docs/frontend-pages.md)      | 页面、SSR 与客户端行为             |
| [设计系统](docs/design-system.md)       | 组件、视觉规范与交互模式           |
| [编码规范](CODING_STANDARDS.md)         | 工程约束与验证门禁                 |
| [代理入口](AGENTS.md)                   | 按任务范围查阅项目规则             |
| [生产变更](docs/prod-change-policy.md)  | 受保护发布、资源变更与回滚         |

## 参与贡献

发现问题或有新想法，欢迎[提交 Issue](https://github.com/redisread/gomate/issues)，描述使用场景、预期行为和必要的复现步骤。

修改前请阅读 [AGENTS.md](AGENTS.md) 和适用的[编码规范](CODING_STANDARDS.md)，让文档与行为同步，完成所需验证，并遵循 [PR 模板](.github/PULL_REQUEST_TEMPLATE.md)。

Flutter 移动端已归档至 [gomate-mobile](https://github.com/redisread/gomate-mobile)。

## Star History

如果 GoMate 帮你找到了下一次出行，点个 ⭐，让更多人发现它。

<a href="https://www.star-history.com/?repos=redisread%2Fgomate&amp;type=date">

  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=redisread/gomate&amp;type=date&amp;theme=dark">
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=redisread/gomate&amp;type=date">
    <img alt="GoMate Star 增长历史图" src="https://api.star-history.com/chart?repos=redisread/gomate&amp;type=date" width="800">
  </picture>
</a>

## 许可证

MIT。

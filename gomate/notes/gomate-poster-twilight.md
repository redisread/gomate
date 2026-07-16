# gomate 分享海报 · 黄昏户外优化 Spec

> 频道：#proj-gomate task #129
> 日期：2026-07-12
> 版本：**v1.1**（Martin CR 风险修订版）
> 前版：v1
> 参考图：Victor 提供的深蓝夜空 + 远天际暖光带 + 开阔平原（IMG_9198.jpeg）
> 现有模板：`api/src/templates/share-image/{location,story,team}-poster.tsx`（三套共 ~1500 行）

---

## 版本变更（v1 → v1.1）

| 项            | v1                 | v1.1                                                               |
| ------------- | ------------------ | ------------------------------------------------------------------ |
| Hero 渐变实现 | CSS 多背景复合     | **3 个 div children 堆叠**，Satori 100% 兼容                       |
| Token 位置    | 写在模板/CSS 中    | **新建 `api/src/templates/share-image/poster-tokens.ts` 常量文件** |
| 小尺寸预览    | 仅要求「标题清晰」 | **明确 100×100 缩略图下标题不做文字强化，靠封面+品牌色块识别**     |
| Wen 验证场景  | 未列               | **§9 增加 iOS/Android 分享缩略图 + 朋友圈小尺寸预览验证**          |

---

## 0. 设计意图（参考图的精神）

参考图（深蓝夜空 + 天际线暖光带 + 开阔平原）的**核心张力**是：

> **冷环境 + 唯一暖色焦点 = 视觉深度**

不是「全冷」也不是「全暖」。是「大片冷寂里那一束暖光」—— 这正好契合 gomate 的「户外出发 / 走向目的地」叙事。

**现状痛点**：

- 全页 `#FAF7F2` 米色背景 + `#D97706` 琥珀强调 = 通篇暖
- 暖上加暖 = 视觉平、缺乏深度、跟 gomate 自己的 app UI 长得一模一样（海报缺乏品牌外溢感）
- 朋友看到海报的第一眼感受：「像一篇博客卡片」而不是「想去这里」

**优化方向**：**「黄昏户外」** — 把海报从"米色博客卡片"变成"晨昏出发时的远方目的地"。保留琥珀作为焦点暖色，引入**暮色蓝紫**作为环境冷色，形成参考图同款「冷暖对位」。

---

## 1. Color Token（新建 `poster-tokens.ts`，与 gomate app CSS 隔离）

### 1.1 Token 常量文件

新建 `api/src/templates/share-image/poster-tokens.ts`：

```ts
// 这些 token 仅用于 Satori 海报模板，禁止导入到 gomate app 前端 CSS
export const POSTER_TOKENS = {
  // 保留的 gomate DS v2.0 token
  bg: "#FAF7F2",
  surface: "#FFFFFF",
  primary: "#D97706",
  title: "#1C1917",
  body: "#57534E",
  muted: "#A8A29E",

  // 海报专用：黄昏户外的环境冷色与暖焦点
  sky: "#2A3B5C",
  skyDeep: "#1A2540",
  sunGlow: "#E89030",
} as const;
```

三个海报模板 `location-poster.tsx` / `story-poster.tsx` / `team-poster.tsx` 统一 `import { POSTER_TOKENS } from './poster-tokens'` 使用。

**关键约束**：`sky` / `skyDeep` / `sunGlow` **只在 poster 模板内使用**，**不进 gomate app UI**。这是「海报美学」独立于「产品设计系统」的分层。

---

## 2. 三套海报统一定调

| 海报         | Hero 封面              | 主色调                  | 故事感     |
| ------------ | ---------------------- | ----------------------- | ---------- |
| **Location** | 地点封面图（用户上传） | sky + sun-glow 渐变蒙版 | 远方目的地 |
| **Story**    | 故事首图               | sky + sun-glow 渐变蒙版 | 黄昏记录   |
| **Team**     | 团队头像/合影          | sky 单色蒙版            | 集合点     |

**统一元素**：

1. 顶部 4px 琥珀品牌条纹（同现状）
2. 标题区域使用 `--sky-deep → --sun-glow` 渐变底色（替代现状 `--bg` 米色）
3. 信息卡使用 `--surface` 白底
4. 二维码/Slogan 区域用 `--surface` 白底 + 琥珀色品牌名

---

## 3. Location 海报具体改动（参考现状 location-poster.tsx）

### 3.1 Hero 封面改动（最大改动）

**现状**（line 167-322）：

- 封面图全幅 16:9
- 底部 110px 深色渐变（rgba(28,25,23,0) → rgba(28,25,23,0.65)）
- 左下标题白色 + textShadow
- 右下季节胶囊

**优化 —— 用 3 个 div children 堆叠，不用 CSS 多背景复合**：

```jsx
// 伪代码结构（Satori 兼容）
<div
  style={{ position: "relative", width: 1200, height: 675, overflow: "hidden" }}
>
  {/* 1. 底层：cover 图片 */}
  <img
    src={coverUrl}
    style={{ position: "absolute", inset: 0, objectFit: "cover" }}
  />

  {/* 2. 中层：sky 顶部冷色蒙版 */}
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `linear-gradient(180deg, rgba(42,59,92,0.45) 0%, transparent 60%)`,
    }}
  />

  {/* 3. 上层：sun-glow 底部暖光蒙版 */}
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 240,
      background: `linear-gradient(180deg, rgba(28,25,23,0) 0%, rgba(42,59,92,0.30) 45%, rgba(232,144,48,0.55) 100%)`,
    }}
  />

  {/* 标题与胶囊仍在同一父容器内，不受渐变 div 影响 */}
</div>
```

**要点**：

- 封面图保持全幅 16:9
- 顶部 sky 冷色蒙版：从 45% 不透明度 fade 到透明，营造夜色天空
- 底部 sun-glow 暖光蒙版：240px 高度，三段过渡（透明 → sky → sun-glow），营造「下方夕阳照亮地平线」
- 左下标题白色保留，加 `--sun-glow` 微光晕 `text-shadow: 0 0 16px rgba(232,144,48,0.5)`
- 右下季节胶囊保持白色

> **为什么不用 CSS `background` 复合**：Satori 对 `background: url(...), linear-gradient(...)` 的多层复合支持不稳定。3 个绝对定位 div 单层渐变 = 100% 兼容。

### 3.2 信息卡保留

信息卡（路线指标 / 描述 / 标签）用 `--surface` 白底，**不变**。这样卡片从「冷天空背景」中浮起来，层次更分明。

### 3.3 二维码/Slogan 区域微调

**现状**：白底 + slogan + 二维码
**优化**：在 QR 区域加 `--sun-glow` 极淡底色 `rgba(232,144,48,0.04)`，让 QR 区域像被晨光打亮 —— 增加温度

---

## 4. Story 海报改动

参考 location 的"封面渐变 + 信息卡"模式，但**封面比例改为 3:2 或 16:9**（取决于故事图），高度增加给正文摘要留位。

**新增**：摘要前 2 行（55px）+ ember-style 引号 + 衬线斜体。

---

## 5. Team 海报改动

团队头像作为「集合点」—— 用 sky 单色蒙版（不用 sun-glow 渐变，因为不是风景）。

- 头像圆形 96×96，置于 `--sky-deep` 单色背景
- 强调色保留琥珀（成员数 / 招募中）

---

## 6. Font / Typography 保留现状

- 字体沿用现有 Satori 注入字体（line 38-44）
- 字号阶梯保留（22 标题 / 13 副 / 12 正文 / 10 元 / 9 标签）
- 字重 600/700/800 三档保留

不引入新字体（与 Twitter IP / daily-movie starlight 的字体选择完全独立）。

---

## 7. i18n 文案不变

scanText / sloganText / 各种 label 都是 i18n 注入（line 124-131），不变。

---

## 8. 落地清单（工程实施参考）

预估工作量：**0.5-1 天**（仅 location 改 30 行；team / story 同步调）。

- [ ] 新建 `api/src/templates/share-image/poster-tokens.ts`：定义 `POSTER_TOKENS` 常量
- [ ] `api/src/templates/share-image/location-poster.tsx`：
  - `import { POSTER_TOKENS } from './poster-tokens'`
  - 修改 Hero 封面为 **3 div children 堆叠**（cover-img → sky 蒙版 → sun-glow 蒙版）
  - 修改左下标题 textShadow（加 sun-glow 光晕）
  - QR 区域加极淡底色
- [ ] `api/src/templates/share-image/story-poster.tsx`：套同样 3-div 堆叠渐变 + 摘要位置
- [ ] `api/src/templates/share-image/team-poster.tsx`：头像单色蒙版改 sky
- [ ] gomate 仓库新建 `gomate/notes/gomate-poster-twilight.md`（本 spec 随 PR commit 入库）
- [ ] R2 缓存：24h 缓存还在，poster 文件改完后需要 cache-bust key（暂时由后端 `?refresh=1` 参数控制，无需主动改）
- [ ] Playwright E2E：检查 share-poster 截图测试（如果存在）

---

## 9. Review Checkpoints（含 Wen 测试场景）

- 三套海报视觉统一（同一渐变系统）
- 琥珀作为唯一暖焦点的稀缺性保持（不是每处都加 sun-glow）
- gomate app UI 不受影响（`sky` / `sunGlow` 等 token 不导入 app CSS）
- **小尺寸预览（100×100 缩略图）：标题不做文字强化，靠封面图 + 顶部 4px 琥珀品牌条纹识别**；完整尺寸海报（375×696）下标题才承担信息传递
- 暗色背景对外部图片色彩还原度
- **Wen 验证场景**：
  - iOS Safari 分享图缩略图（ Messages / 微信 / 朋友圈）
  - Android Chrome 分享图缩略图
  - 朋友圈 100×100 缩略图 vs 点开大图对比
  - Satori 生成 PNG 与 Playwright 截图像素一致（无渐变丢失）

---

## 10. 下一步

1. Martin 正式 CR（v3.1 首次实战）
2. Jeff 起 `raft/gomate-poster-twilight` 分支实施（改 3 个 poster 模板 + 新增 poster-tokens.ts + 入库本 spec）
3. Wen 按 §9 验证 iOS / Android / 朋友圈缩略图
4. 落地后做 3-5 张实拍对比图（location poster / 当前 vs 优化）
5. 上线 + 收集朋友圈反馈

---

_spec v1.1。结构（冷天空 + 暖焦点）建议保留；token 位置、Hero 渐变实现、小尺寸预览策略已按 Martin 风险点修订。_

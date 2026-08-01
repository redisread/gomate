# GoMate Frontend Design System

> Source of truth: `frontend/src/styles/globals.css`. Last sync: 2026-08-01 (PR #494 OKLCH migration + WCAG AA fixes).

## 1. 浏览器兼容矩阵

仅支持 evergreen (2023+ Chrome / Safari / Firefox / Edge)。这是项目级决策：

- **`oklch()`** 颜色函数 / **`color-mix(in oklab, ...)`** 半透明色：Baseline 2023，本项目**不写 hex fallback**
- 旧浏览器 (Safari 14 / 旧 Android) 需新增 fallback；当前不接受

如未来需要兼容更老浏览器，整套颜色体系需要 review（不是只改 fallback）。

## 2. Color tokens 命名约定

### shadcn/ui 兼容语义 token

`--background` / `--foreground` / `--card[-foreground]` / `--popover[-foreground]` / `--primary[-foreground]` / `--secondary[-foreground]` / `--muted[-foreground]` / `--accent[-foreground]` / `--destructive` / `--border` / `--input` / `--ring`

### 品牌 / 业务 token

`--brand[-foreground|subtle|muted]` / `--warm[-foreground|subtle]` / `--success[-subtle]` / `--warning[-subtle]`

### 渐进 / 阴影 / 半径

`--primary-50/300/400/500` / `--shadow-card[-hover]` / `--shadow-warm-sm` / `--shadow-glow` / `--radius-xs/sm/md/lg/xl/2xl/full`

完整定义（oklch 值 + light/dark 对应）见 `frontend/src/styles/globals.css:265–402` (`:root` 与 `.dark` 块)。

**约定**：

- **不直接写 oklch 字面值在 inline style**
- **所有颜色引用走 var(--token)**
- **不通过 value 而通过 role 选 token**（同一个 oklch 值不要分两个 role 使用）

## 3. 半透明 inline style 写法

半透明色首选 Tailwind v4 utility (`bg-primary/10`)；当需要 inline style（与 `backdropFilter` / `boxShadow` / `linear-gradient` 共存）时：

```tsx
style={{ background: "color-mix(in oklab, var(--primary) 10%, transparent)" }}
```

**不要**直接写 `oklch(0.666 0.157 58.3 / 0.10)` — 这把 token 系统分裂。

## 4. 对比度阈值 (WCAG 2)

- body text：≥ 4.5 (AA)，目标 ≥ 7.0 (AAA)
- ≥18px bold 或 ≥24px regular：AA ≥ 3.0，AAA ≥ 4.5

新加 / 调色 token 时跑 `chrome://inspect` / axe devtools 验证。

### 最近 contrast 修复（PR #494）

| token                        | 旧 hex    | 新 hex    | 旧 / 新 ratio      |
| ---------------------------- | --------- | --------- | ------------------ |
| `--muted-foreground` (light) | `#8f7f6e` | `#6b5d4e` | 3.65 → 6.00 (AA)   |
| `--muted-foreground` (dark)  | `#7a6e63` | `#a89a8c` | 3.83 → 6.93 (AA)   |
| `--warm-foreground` (light)  | `#fff5f3` | `#2d0f08` | 2.38 ✗ → 6.95 (AA) |

## 5. Avatar 身份色（Hue Rotation）

`avatar.tsx` 用 OKLCH hue rotation 155–215°（cyan-green 域）做用户身份色：常亮 L=0.55 / C=0.11（**常量 C 保证 hue 间感知均匀鲜艳度**——"same absolute C ≠ equal vividness across hues" 这是 `better-colors` skill 原则）。

**与品牌色解耦**：avatar 不是品牌色，是身份色。

## 6. Status / Recommendation badges

通过现有 semantic token 复用（不新增 component-level token）：

- steady / worthy / fresh：用 `--primary` / `--accent-foreground`
- danger / expert / destructive：`--destructive`
- muted (completed / cancelled)：`--muted-foreground`

如果未来出现需要与品牌色解耦的 badge（如 emerald success / sky info），再加 `--easy-bg/fg --hard-bg/fg` 这类 component token，并配套在 `.dark` 加 dark-mode override。

## 7. Inline-style vs Tailwind utility 决策

| 场景                                                                         | 用法                                                                        |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 仅 background / color / border                                               | Tailwind utility（tree-shakeable）                                          |
| inline 元素含 `backdropFilter` / `boxShadow` / `linear-gradient(...)` 等组合 | `style={{ ... }}` + `var(--token)`                                          |
| dynamic 值 (e.g. `departureLabel.urgent ? '...' : '...'`)                    | inline style                                                                |
| 渐变                                                                         | `linear-gradient(... var(--token) ..., var(--other-token) ...)` 保留 inline |

## 8. 与其他文档的关系

- `docs/frontend-pages.md`：页面功能矩阵，与本设计系统正交
- `AGENTS.md`：项目级代理工作规则（含 minimum checks）；不含 design tokens
- PR #494：https://github.com/redisread/gomate/pull/494 — `feat(frontend): OKLCH-ify tokens, fix HIGH WCAG, and switch inline-style to var(--token)`
- `/better-colors` skill：user-level `~/.codex/skills/better-colors/SKILL.md`，做对比度 / palette 决策时加载

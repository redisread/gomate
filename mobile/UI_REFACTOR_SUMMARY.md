# 移动端 UI 改造总结

## 概述

本次改造将移动端 (Flutter) 的 UI 设计系统对齐到 Web 端 Design System v2.0，从原来的"柔和蓝绿调"改为"温暖琥珀调"。

## 改造内容

### 1. Design Tokens 更新 (`lib/shared/theme/app_tokens.dart`)

#### 品牌主色
| 项目 | 改造前 | 改造后 |
|------|--------|--------|
| 主品牌色 | `#2EC4B6` (蓝绿) | `#D97706` (温暖琥珀) |
| 品牌深色 | `#1A9E92` | `#B45309` |
| 品牌浅色 | `#D6F5F2` | `#FFFBEB` |
| 辅助强调色 | `#FFFF6B6B` (珊瑚) | `#FFFF7a65` (珊瑚红) |

#### 中性色（沙米调）
| 项目 | 改造前 | 改造后 |
|------|--------|--------|
| 背景基色 | `#F7F9FC` (冷灰白) | `#faf8f5` (温暖沙米) |
| 卡片背景 | `#FFFFFF` | `#FFFFFF` (保持) |
|  elevated 表面 | `#F0F4F8` (冷灰) | `#f2ede7` (沙米) |
| 分隔线 | `#E8EDF3` (冷灰) | `#e8e0d7` (暖灰) |

#### 文字颜色
| 项目 | 改造前 | 改造后 |
|------|--------|--------|
| 主文字 | `#1A2332` (深蓝黑) | `#1e1812` (深棕黑) |
| 次要文字 | `#5A6A7A` (蓝灰) | `#8f7f6e` (暖灰棕) |
| 弱文字 | `#9AAAB8` (蓝灰) | `#a89b8c` (暖灰) |

#### 边框颜色
| 项目 | 改造前 | 改造后 |
|------|--------|--------|
| 默认边框 | `#E2EAF0` (冷灰) | `#e8e0d7` (暖灰) |
| 强边框 | `#BDCCDA` (蓝灰) | `#d4c9bc` (暖棕) |
| 品牌边框 | `#2EC4B6` (蓝绿) | `#D97706` (琥珀) |

#### 渐变色系统
```dart
// 品牌主渐变
gradientBrand: [0xFFD97706, 0xFFB45309]  // 琥珀 → 深琥珀

// 品牌强调渐变
gradientBrandAccent: [0xFFD97706, 0xFFff7a65]  // 琥珀 → 珊瑚红

// 卡片背景渐变
gradientCard: [0xFFFFFFFF, 0xFFFFFBEB]  // 白 → 极浅琥珀

// Hero 区背景渐变
gradientHero: [0xFFFFFBEB, 0xFFfaf8f5]  // 浅琥珀 → 沙米白
```

### 2. 新增组件

#### 2.1 状态徽章组件 (`lib/shared/widgets/app_status_badge.dart`)

**AppStatusBadge** - 队伍状态徽章
- 支持 5 种状态：`recruiting`/`full`/`formed`/`completed`/`cancelled`
- 圆角徽章设计（`radiusFull`）
- 带状态圆点（recruiting 时有扩散动画）
- 中文文案：正在招募/名额已满/队伍已集结/圆满收队/已取消

**AppDifficultyBadge** - 难度徽章
- 支持 4 种难度：`easy`/`moderate`/`hard`/`expert`
- 方形标签设计（4px 圆角）
- 中文文案：简单/普通/困难/专家

#### 2.2 头像组件 (`lib/shared/widgets/app_avatar.dart`)

**AppAvatar** - 用户头像
- 支持图片 URL / 字母占位
- 5 种尺寸：`xs`(24)/`sm`(32)/`md`(44)/`lg`(64)/`xl`(96)
- 根据姓名哈希生成一致的蓝绿色域背景色 (hue 155~215)
- 中文取首字，英文取首字母大写
- 可选白色环形边框

**AppAvatarStack** - 头像叠加组件
- 用于显示队伍成员
- 支持超出数量显示（+N）
- 重叠效果（offset 60%）

#### 2.3 队伍卡片组件 (`lib/shared/widgets/app_team_card.dart`)

**AppTeamCard** - 队伍卡片
- 封面图区域（160px 高）
- 渐变占位背景（无图时）
- 收藏按钮（带 heartbeat 动画）
- 状态徽章 + 难度徽章
- 队伍标题 + 地点信息
- 关键信息行（日期/时间/人数）
- 人数进度条（品牌色渐变）
- 队长信息 + 成员头像叠加

### 3. 组件更新

#### 3.1 卡片组件 (`lib/shared/widgets/app_card.dart`)
- 更新渐变卡片的阴影颜色为琥珀色 (`0x40D97706`)

### 4. 主题配置更新 (`lib/shared/theme/app_theme_v2.dart`)
- 更新注释说明，对齐 Web 端 Design System v2.0
- 保持 Material 3 组件主题与新的 Design Tokens 一致

### 5. 首页更新 (`lib/features/home/screens/home_screen.dart`)
- 导入新的状态徽章组件
- 更新队伍列表项使用 `AppStatusBadge`
- 更新颜色注释（蓝绿 → 温暖琥珀）

### 6. 队伍列表页更新 (`lib/features/teams/screens/teams_list_screen.dart`)
- 导入 `AppStatusBadge` 组件
- 替换旧的 inline 状态标签实现
- 添加卡片阴影效果增强层次感

### 7. 地点详情页更新 (`lib/features/locations/screens/location_detail_screen.dart`)
- 导入 `AppStatusBadge` 组件
- 路线卡片使用新的 `AppDifficultyBadge` 组件
- 更新文字颜色为新的 Design Tokens
- 添加卡片阴影效果

### 8. 队伍详情页更新 (`lib/features/teams/screens/team_detail_screen.dart`)
- 导入 `AppStatusBadge` 和 `AppAvatar` 组件
- 替换队伍状态展示为新的徽章组件
- 替换成员头像为新的 `AppAvatar` 组件
- 更新底部操作栏使用品牌渐变色
- 更新所有状态提示使用新的 Design Tokens

## 色彩映射关系

### Web 端 → 移动端
| Web (globals.css) | Mobile (app_tokens.dart) |
|-------------------|-------------------------|
| `--primary-500: #D97706` | `brandPrimary: #D97706` |
| `--neutral-50: #faf8f5` | `bgBase: #faf8f5` |
| `--neutral-100: #f2ede7` | `bgSurfaceElevated: #f2ede7` |
| `--neutral-200: #e8e0d7` | `borderDefault: #e8e0d7` |
| `--neutral-500: #8f7f6e` | `textSecondary: #8f7f6e` |
| `--neutral-900: #1e1812` | `textPrimary: #1e1812` |

## 视觉特点

### 改造前（蓝绿调）
- 冷色调，科技感强
- 适合 SaaS、工具类产品
- 参考方向：slock.ai

### 改造后（温暖琥珀调）
- 暖色调，户外自然感
- 符合"有温度的随身户外助手"定位
- 对齐 Web 端 Design System v2.0

## 待完成事项

- [x] 队伍详情页 - 使用新的 `AppStatusBadge` 和 `AppAvatar` 组件
- [x] 地点详情页 - 使用新的 `AppDifficultyBadge` 组件
- [x] 地点列表页 - 更新筛选芯片颜色
- [x] 登录/注册页 - 更新输入框焦点颜色
- [x] 个人中心页 - 使用新的 `AppAvatar` 组件
- [x] 底部导航栏 - 更新选中态颜色（FAB 阴影已更新）
- [ ] 空状态组件 - 更新插图颜色
- [ ] 加载骨架屏 - 更新渐变方向
- [ ] 队伍创建页 - 使用新的表单组件

## 开发注意事项

1. **颜色使用规范**
   - 不要直接使用 `Color(0x...)`，优先使用 `AppTokens` 中的语义化颜色
   - 品牌主色：`AppTokens.brandPrimary`
   - 背景色：`AppTokens.bgBase` / `AppTokens.bgSurface`

2. **组件复用**
   - 状态展示：`AppStatusBadge` / `AppDifficultyBadge`
   - 用户头像：`AppAvatar` / `AppAvatarStack`
   - 卡片：`AppCard` / `AppImageCard` / `AppGradientCard`

3. **字体使用**
   - 标题：`fontSizeXL` + `fontWeight.w600`
   - 正文：`fontSizeBase` / `fontSizeM`
   - 辅助文字：`fontSizeS` + `textSecondary`

## 测试建议

1. **色彩对比度测试** - 确保文字在背景上有足够的可读性
2. **暗色模式适配** - 后续可增加暗色主题支持
3. **不同屏幕尺寸** - 确保组件在各种屏幕尺寸下表现正常
4. **无障碍访问** - 检查色弱用户是否可辨识状态颜色

## 参考资料

- Web 端样式：`frontend/src/styles/globals.css`
- Web 端状态徽章：`frontend/src/components/ui/status-badge.tsx`
- Web 端队伍卡片：`frontend/src/components/ui/team-card.tsx`
- Web 端文案：`frontend/src/lib/copy.ts`

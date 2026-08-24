# Implementation Plan: admin-i18n-guardrails

状态：已批准（2026-08-25，用户授权连续完成全部阶段）

## Overview

先用独立 fixture 锁定后台专项静态规则，再把检查接入现有 `i18n:validate`；随后扩展管理员平台 E2E，覆盖三语言 shell、前缀导航和关键新增地点术语。

## Dependency Order

`negative fixtures` → `static validator` → `i18n:validate integration` → `three-locale Chromium smoke` → `durable docs`

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| 文本正则误报技术值 | 排除测试、URL、数字坐标和非展示代码，只扫描明确 UI 语法 |
| key 动态拼接无法静态求值 | 只检查静态 key，动态枚举由穷尽映射与类型检查负责 |
| E2E 扩大运行时间 | 复用现有串行管理员 fixture，在一个参数化测试中验证三语言 |
| 门禁与 locale parity 重复 | 专项脚本只负责后台消费者，现有脚本继续负责资源一致性 |

## Rollback Boundary

静态脚本、package script、E2E 和文档均可单独回退；无运行时数据影响。

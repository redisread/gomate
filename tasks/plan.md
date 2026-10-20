# Implementation Plan: 代码整洁边界改造

## Overview
执行用户已批准的七项审计建议，保留公开 API、权限、数据库及业务流程。

## Architecture Decisions
- 邮件传输统一适配，模板保持独立。
- CSS 只维护 globals.css；SEO 使用显式键。
- JSON 外部数据保持明确类型，优先共享合同。
- SSR 与客户端复用纯筛选函数，不统一不同运行时生命周期。

## Task List
- [ ] Task 1: 统一邮件发送结果
- [ ] Task 2: 统一主题来源
- [ ] Task 3: 显式 SEO 合同
- [ ] Task 4: 收紧响应类型边界
- [ ] Task 5: 共享队伍筛选解析
- [ ] Task 6: 显式加载失败与重试
- [ ] Task 7: 整理布局职责和文档
- [ ] Task 8: 独立审查与受保护交付

## Risks and Mitigations
- 全局类型收紧可能触及大量消费者：逐模块修复，避免用局部 any 代替。
- 删除关键 CSS 可能改变层叠：亮暗/移动/双语浏览器验证。
- UI 失败路径：先失败后通过的行为测试。

## Open Questions
无；本轮按用户执行指令推进。

# 执行清单

每个 UI 任务按不超过约 5 个消费文件一组执行，依赖其前置公共组件。修改后的原行为测试必须通过；表单保持提交值、disabled/loading、标签关联和错误提示。

- [x] T1：读取规范、最新主分支及官方版本，保存计划。验证：工作树干净、无被覆盖的旧计划。
- [x] T2：升级依赖与锁文件（package.json、pnpm-lock.yaml、pnpm-workspace.yaml）。验收：安装可重现、peer 约束有证据。验证：install、type-check、lint、test、test:server、build。
- [x] T3：同步工具链配置及版本文档（CI、tsconfig、Node/pnpm）。依赖 T2。验收：本地与 CI 一致，TS 7 阻碍被记录。验证：test:build-guard、worker 检查。
- [x] 检查点 A：依赖升级完整门禁通过。
- [x] T4：安装 Starwind 与主题基础（配置、依赖、CSS、工具函数）。依赖 T2。验收：官方源版本可追溯、品牌不变。验证：build、组件基础测试。
- [x] T5：基础按钮/输入/标签/文本域/原生选择器；每类独立验证。依赖 T4。验收：受控值与原生提交语义保持。验证：组件行为测试、type-check。
- [x] T6：登录、注册、找回/重置密码表单。依赖 T5。验收：认证路径和翻译保持。验证：认证测试及 E2E。
- [x] T7：资料编辑与反馈表单。依赖 T5。验收：字段与错误/加载状态保持。验证：相关测试、type-check。
- [x] T8：地点表单与筛选，每组最多 5 个消费文件。依赖 T5。验收：选择、清除、上传语义保持。验证：地点相关测试及 E2E。
- [x] T9：建队/编辑队伍及队伍列表，每组最多 5 个消费文件。依赖 T5。验收：人数、时长、权限和状态保持。验证：队伍测试及 E2E。
- [x] 检查点 B：核心用户流程可用，移动端与键盘路径验证。
- [x] T10：后台表单/表格/导航，每组最多 5 个文件。依赖 T5。验收：管理动作权限和确认流程保持。验证：后台测试及 E2E。
- [x] T11：公共 Astro 页面与导航的适用组件，每组最多 5 个文件。依赖 T4。验收：SSR、语义与分享信息保持。验证：pnpm check、双语、SSR/link-preview E2E。
- [x] T12：公共弹层、头像、骨架、提示/反馈，每类独立适配。依赖 T4。验收：焦点恢复、Escape、背景隔离、reduced-motion 保持。验证：专门行为与浏览器测试。
- [x] T13：审计剩余原生控件，记录必要保留原因，更新现行设计/开发文档。依赖 T6–T12。验收：无未说明的可替换遗漏。验证：搜索与文档核对。
- [x] 检查点 C：pnpm check、test:ci、worker:types/dry-run/size、audit、test:e2e:ci；桌面、移动、dark、reduced-motion 验证。
- [ ] T14：独立子代理完整审查，修复及复审（至多三轮），创建 PR，确认当前 head CI。依赖 C。验收：无阻塞发现，不绕过保护。
- [ ] T15：依审查判定合并与生产 smoke；精确记录未验证/阻碍。依赖 T14。

## 首轮计划审查补充

- Resend 使用实际 SDK + 拦截 fetch 验证成功和服务商错误，不真实发送邮件。
- 特别核对：后台 details/checkbox、资料 radio、region-select/season-picker/chip-input 的业务语义；Modal 的初始/返回焦点与 inert；SubmitButton 的 submit/loading；alert/status 播报语义。

## 验证进展

- 完整 Chromium E2E：85/85，通过 Node 24.22.0 与独立本地 D1 验证。
- 三轮独立实施审查完成，阻塞项清零；最终完整 CI、Worker types/dry-run/size 全部通过。

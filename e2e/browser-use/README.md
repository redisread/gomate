# GoMate browser-use E2E 脚本

这里存放用于「AI 代理驱动」探索式验收的 browser-use CLI 脚本。

## 前置条件

1. 安装 browser-use CLI（参考 https://docs.browser-use.com/open-source/browser-use-cli）
2. 确保 Chrome 已开启远程调试，或 browser-use 已配置好本地 Chrome
3. 本地开发服务器已启动：
   ```bash
   pnpm dev:fresh
   ```

## 运行脚本

如果你使用的是默认 Chrome 实例，browser-use 会自动尝试连接，首次可能需要到
`chrome://inspect/#remote-debugging` 允许远程调试。

如果已经有一个带 `--remote-debugging-port=9222` 的 Chrome 实例，可显式指定：

```bash
BU_CDP_URL=http://localhost:9222 browser-use <<'PY'
exec(open("e2e/browser-use/home_smoke.py").read())
PY
```

常规运行方式：

```bash
cat e2e/browser-use/home_smoke.py | browser-use
```

或

```bash
browser-use <<'PY'
exec(open("e2e/browser-use/home_smoke.py").read())
PY
```

### 手动启动带远程调试的 Chrome（macOS 示例）

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/browser-use-profile \
  --no-first-run \
  --no-default-browser-check
```

然后在另一个终端运行上面的 `BU_CDP_URL=... browser-use ...` 命令。

## 当前脚本

| 脚本            | 用途                         |
| --------------- | ---------------------------- |
| `home_smoke.py` | 打开首页，截图并检查关键文案 |

## 适用场景

- 新功能上线前让 AI 代理像真实用户一样点一遍
- 复杂交互、弹窗、暗色模式、移动端适配的回归验证
- 视觉问题捕捉（白屏、布局错乱）

注意：browser-use 基于 CDP，首次运行需要允许 Chrome 远程调试，不适合作为 CI 门禁。CI 门禁请使用 Playwright（`pnpm e2e`）。

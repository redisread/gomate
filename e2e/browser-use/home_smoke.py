# GoMate 本地 E2E 冒烟测试（browser-use CLI）
#
# 前置条件：
#   1. 安装 browser-use CLI 并确保 Chrome 远程调试可用
#   2. 本地开发服务器已启动：pnpm dev:fresh
#
# 运行方式：
#   browser-use <<'PY'
#   exec(open("e2e/browser-use/home_smoke.py").read())
#   PY
#
# 或者：
#   cat e2e/browser-use/home_smoke.py | browser-use

import time

BASE_URL = "http://localhost:5432"

def log(msg):
    print(f"[browser-use] {msg}")

log(f"Opening {BASE_URL}")
new_tab(BASE_URL)
wait_for_load()

# 等待页面稳定
# time.sleep(2)

info = page_info()
log(f"Page title: {info.get('title', 'N/A')}")
log(f"Page URL: {info.get('url', 'N/A')}")

# 截图用于人工/AI 验收
try:
    capture_screenshot()
    log("Screenshot captured")
except Exception as e:
    log(f"Screenshot capture timed out or failed: {e}")
    log("Continuing with keyword checks...")

# 检查页面文本中是否包含 GoMate 品牌或关键导航
body_text = js("document.body.innerText").lower()
keywords = ["gomate", "发现", "探索地点", "找队伍", "explore", "team"]
found = [k for k in keywords if k in body_text]
log(f"Found keywords: {found}")

if len(found) >= 3:
    log("✅ Home page smoke test passed")
else:
    log("❌ Home page smoke test failed: expected keywords not found")
    log(f"Body text preview: {body_text[:500]}")
    raise SystemExit(1)

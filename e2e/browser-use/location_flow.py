#!/usr/bin/env python3
"""
GoMate 地点浏览流程 browser-use 脚本

前置条件：
- 本地开发服务器已启动（pnpm dev:fresh）
- Chrome 已开启远程调试（--remote-debugging-port=9222）

运行方式：
    BU_CDP_URL=http://localhost:9222 browser-use <<'PY'
    exec(open("e2e/browser-use/location_flow.py").read())
    PY
"""

from browser_use import Browser, Agent

async def main():
    browser = Browser()
    agent = Agent(
        task="""
        1. 打开 http://localhost:5432/locations
        2. 确认页面加载正常，能看到地点列表
        3. 点击第一个地点卡片（或链接）
        4. 确认进入地点详情页，页面没有报错
        5. 截图保存为 location_result.png
        """,
        browser=browser,
    )
    result = await agent.run()
    print("地点浏览流程结果：", result)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

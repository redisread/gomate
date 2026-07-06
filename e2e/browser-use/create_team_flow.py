#!/usr/bin/env python3
"""
GoMate 创建队伍流程 browser-use 脚本

前置条件：
- 本地开发服务器已启动（pnpm dev:fresh）
- Chrome 已开启远程调试（--remote-debugging-port=9222）

运行方式：
    BU_CDP_URL=http://localhost:9222 browser-use <<'PY'
    exec(open("e2e/browser-use/create_team_flow.py").read())
    PY
"""

from browser_use import Browser, Agent

async def main():
    browser = Browser()
    agent = Agent(
        task="""
        1. 打开 http://localhost:5432/login
        2. 在邮箱输入框填入 "admin@test.com"
        3. 在密码输入框填入 "test1234"
        4. 点击登录按钮
        5. 等待跳转到首页
        6. 打开 http://localhost:5432/teams/create
        7. 确认页面加载正常，没有报错
        8. 截图保存为 create_team_result.png
        """,
        browser=browser,
    )
    result = await agent.run()
    print("创建队伍流程结果：", result)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

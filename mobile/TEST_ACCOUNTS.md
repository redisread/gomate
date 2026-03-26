# GoMate 移动端测试账号

## 测试角色

| 角色 | 邮箱 | 密码 | 用户 ID | 权限 |
|------|------|------|---------|------|
| 测试用户 1 | test1@gomate.com | Test123456 | aMN3e20VgKvHp7bW2swRQXPPcHdUmGiy | 管理员 ✅ |
| 测试用户 2 | test2@gomate.com | Test123456 | MgaKD4c3tlb3IsaGNZtwpb3NFJti7Ka0 | 普通用户 |
| 测试用户 3 | test3@gomate.com | Test123456 | wqIRVJge03zwGGf9RikZjIUl0mPu2naU | 普通用户 |

## API 配置

- **API 基地址**: `http://10.0.2.2:8799` (Android 模拟器访问宿主机)
- **注册接口**: `POST /auth/sign-up/email`
- **登录接口**: `POST /auth/sign-in/email`

## 测试数据

### 城市
| ID | 名称 | 省份 |
|----|------|------|
| city-1774450444674-rkv7q53t1 | 深圳市 | 广东省 |

### 地点
| ID | 名称 | 副标题 | 难度 |
|----|------|--------|------|
| IFXuw4eRtr8rJgr-4afUv | 梧桐山 | 深圳第一高峰 | moderate |
| ufuvCpEPNki_BUaTtxaVS | 塘朗山 | 城市中的绿洲 | easy |
| jlxX4yHTCpwKCo1WGr0V6 | 七娘山 | 大鹏半岛的明珠 | - |

### 路线
| ID | 地点 | 名称 | 难度 |
|----|------|------|------|
| route_1774450720392_qqdwzvh | 梧桐山 | 梧桐山经典登顶路线 | moderate |
| route_1774450721386_1qygami | 梧桐山 | 梧桐山挑战性穿越 | hard |
| route_1774450722509_m6n78l7 | 塘朗山 | 塘朗山休闲徒步 | easy |

### 队伍
| ID | 标题 | 地点 | 状态 |
|----|------|------|------|
| team-1774450851312-sfscrr7s9 | 周末梧桐山经典路线徒步 | 梧桐山 | recruiting |
| team-1774450851807-5em4jtf4f | 塘朗山休闲亲子徒步 | 塘朗山 | recruiting |
| team-1774450852253-foqwia6e6 | 七娘山挑战性穿越 | 七娘山 | recruiting |

## 创建时间

2026-03-25

## 使用说明

1. 在登录页面使用以上任意账号登录
2. 如需新账号，使用注册页面注册
3. 密码要求：至少 6 个字符
4. **测试用户 1** 是管理员，可以创建地点、路线、队伍等数据

## 验证状态

- [x] API 注册接口正常
- [x] API 登录接口正常
- [x] 3 个测试账号已创建
- [x] 测试城市已创建（深圳市）
- [x] 测试地点已创建（梧桐山、塘朗山、七娘山）
- [x] 测试路线已创建（3 条）
- [x] 测试队伍已创建（3 支）
- [x] 移动端登录流程验证
- [x] 移动端注册流程验证

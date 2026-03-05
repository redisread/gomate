# User 表优化实施清单

## ✅ 已完成

### 数据库层
- [x] 修改 db/schema.ts 添加新字段（nickname, gender, birthday, extra, status, deletedAt）
- [x] 添加 nameIdx 索引
- [x] 新增类型定义（UserLevel, UserStatus, UserGender）
- [x] 导出 UserExtra 接口
- [x] 执行数据库迁移（本地开发环境）
- [x] 验证表结构变更

### 工具函数层
- [x] 创建 lib/user-extra.ts（extra 字段工具）
- [x] 创建 lib/user-utils.ts（用户工具函数）
- [x] 测试所有工具函数

### API 层
- [x] 更新 app/api/user/update/route.ts 支持新字段
- [x] 集成 extra 字段校验逻辑
- [x] 处理 birthday 类型转换

### 前端层
- [x] 更新 lib/auth-context.tsx 的 AuthUser 接口
- [x] 更新 app/profile/page.tsx 展示新信息
- [x] 更新 app/profile/edit/page.tsx 编辑表单
- [x] 添加性别、生日、装备、经验输入框

### 文档
- [x] 创建 USER_TABLE_OPTIMIZATION.md 总结文档
- [x] 创建 IMPLEMENTATION_CHECKLIST.md 实施清单

## ⚠️ 待处理（可选）

### 功能完善
- [ ] 实现完成徒步次数动态计算（替代 completedHikes 字段）
- [ ] 添加账号注销功能（使用 status 和 deletedAt）
- [ ] 在其他用户资料展示页面应用新字段

### 生产环境部署
- [ ] 在 CloudFlare D1 执行迁移 SQL
- [ ] 验证生产环境数据完整性
- [ ] 监控 API 性能

### 测试
- [ ] 编写单元测试（工具函数）
- [ ] 编写集成测试（API 路由）
- [ ] 编写 E2E 测试（用户资料编辑流程）

## 📝 注意事项

1. **completedHikes 字段**: 保留但不再使用，应用层改为动态计算
2. **nickname 回退**: 为空时自动显示 name，保证向后兼容
3. **extra 字段**: 仅存储 equipment 和 experience，避免滥用
4. **索引优化**: 删除了 role/level/status 索引，低频查询可接受全表扫描

## 🚀 下一步

1. 启动开发服务器: `npm run dev`
2. 访问 http://localhost:3000/profile/edit 测试编辑功能
3. 验证资料展示页面显示正常
4. 如有问题查看控制台日志

## 📞 问题反馈

如遇到问题，请检查：
- 数据库迁移是否成功执行
- 浏览器控制台是否有错误
- API 响应是否正常
- 工具函数是否正确导入

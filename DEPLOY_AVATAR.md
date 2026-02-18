# 头像上传功能 - 线上部署指南

## 部署前检查清单

### 1. 创建 R2 Bucket

```bash
npx wrangler r2 bucket create gomate-images
```

### 2. 配置 R2 公开访问（两种方式）

#### 方式 A: 使用 R2 公开访问 URL（推荐测试用）

1. 登录 Cloudflare Dashboard → R2
2. 选择 `gomate-images` bucket
3. Settings → Manage Public Access
4. 开启 "Allow Public Access"
5. 复制 Public URL（格式：`https://pub-xxx.r2.dev`）

#### 方式 B: 使用自定义域名（推荐生产环境）

1. 登录 Cloudflare Dashboard → R2
2. 选择 `gomate-images` bucket
3. Settings → Connect Domain
4. 输入你的域名（如 `images.gomate.com`）
5. 按提示添加 DNS 记录

### 3. 设置环境变量

```bash
# 设置 R2 公开 URL
npx wrangler secret put R2_PUBLIC_URL
# 输入你的 R2 公开 URL，例如：
# https://pub-xxx.r2.dev
# 或自定义域名：https://images.gomate.com
```

### 4. 更新 wrangler.toml

确保已有 R2 绑定配置：

```toml
[[r2_buckets]]
binding = "R2"
bucket_name = "gomate-images"
```

### 5. 部署

```bash
npm run cf:build
npx wrangler deploy
```

## 部署后验证

### 测试头像上传

1. 访问线上地址 `/profile/edit`
2. 选择图片上传
3. 保存后查看个人资料页
4. 检查头像是否正常显示

### 检查 R2 存储

```bash
# 列出 bucket 中的文件
npx wrangler r2 object list gomate-images
```

## 常见问题

### 问题 1: 头像上传成功但不显示

**原因**: `R2_PUBLIC_URL` 未设置或设置错误

**解决**:
```bash
npx wrangler secret put R2_PUBLIC_URL
# 确保输入完整的 URL，如 https://pub-xxx.r2.dev
```

### 问题 2: 上传时报错 "R2 storage not configured"

**原因**: wrangler.toml 中缺少 R2 绑定

**解决**: 检查 wrangler.toml 是否包含：
```toml
[[r2_buckets]]
binding = "R2"
bucket_name = "gomate-images"
```

### 问题 3: 跨域问题 (CORS)

**解决**: 在 R2 Bucket 设置中添加 CORS 规则：

```json
[
  {
    "AllowedOrigins": ["https://your-domain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

## 配置对比

| 环境 | R2_PUBLIC_URL | 头像 URL 格式 |
|-----|---------------|--------------|
| 本地开发 | 不设置 | `/api/r2/avatars/xxx/xxx.png` |
| 线上生产 | 设置 | `https://pub-xxx.r2.dev/avatars/xxx/xxx.png` |

## 安全建议

1. **生产环境使用自定义域名**：比默认的 `pub-xxx.r2.dev` 更专业
2. **设置 R2 访问控制**：限制 Bucket 的公开访问范围
3. **定期清理旧头像**：用户更换头像后，旧文件仍保留在 R2 中

## 相关文件

- `app/api/upload/avatar/route.ts` - 头像上传 API
- `app/api/r2/[...path]/route.ts` - R2 文件访问 API（本地开发用）
- `app/profile/edit/page.tsx` - 头像上传界面
- `wrangler.toml` - Cloudflare 配置

# 用户头像上传功能

## 已实现功能

### 1. API 路由

#### POST /api/upload/avatar
上传用户头像到 Cloudflare R2 存储。

**请求参数：**
- `file` (File) - 图片文件 (JPEG, PNG, GIF, WebP)
- `userId` (string) - 用户 ID

**响应：**
```json
{
  "success": true,
  "key": "avatars/userId/timestamp-random-name.jpg",
  "url": "https://your-r2-public-url/avatars/userId/timestamp-random-name.jpg",
  "size": 12345,
  "type": "image/jpeg"
}
```

#### PATCH /api/user/update
更新用户信息（包括头像 URL）。

**请求体：**
```json
{
  "userId": "user-id",
  "name": "新昵称",
  "bio": "个人简介",
  "experience": "beginner",
  "image": "https://..."
}
```

### 2. 前端功能

在 `/profile/edit` 页面已添加头像上传功能：
- 点击头像或相机图标选择图片
- 支持预览选中的图片
- 可清除已选择的图片
- 保存时自动上传头像并更新用户信息

### 3. 配置要求

#### wrangler.toml
```toml
[[r2_buckets]]
binding = "R2"
bucket_name = "gomate-images"
```

#### 环境变量 (.env.local / .env.production)
```bash
# R2 公开访问 URL（可选，用于生成头像链接）
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

## 使用说明

1. 用户进入个人资料编辑页面 (`/profile/edit`)
2. 点击头像或相机图标选择图片
3. 选择后会立即显示预览
4. 点击"保存"按钮，头像会自动上传到 R2
5. 保存成功后返回个人资料页，新头像会显示

## 限制

- 支持的格式：JPEG, PNG, GIF, WebP
- 最大文件大小：5MB
- 头像存储路径：`avatars/{userId}/{timestamp}-{random}-{filename}.{ext}`

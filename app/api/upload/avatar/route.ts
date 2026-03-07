import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { uploadUserAvatar, deleteImage } from "@/lib/storage";

// 允许的图片类型
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// 最大文件大小 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * POST /api/upload/avatar
 * 上传用户头像到 R2 存储
 */
export async function POST(request: NextRequest) {
  try {
    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    // 验证参数
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 5MB" },
        { status: 400 }
      );
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();

    // 使用 lib/storage.ts 中的上传函数
    const result = await uploadUserAvatar(
      arrayBuffer,
      file.name,
      file.type
    );

    // 本地开发模式下使用 /api/r2/ 路径访问
    const host = request.headers.get("host") || "";
    const isLocalDev = host.includes("localhost") || host.includes("127.0.0.1");
    const publicUrl = isLocalDev
      ? `/api/r2/${result.key}`
      : result.publicUrl;

    return NextResponse.json({
      success: true,
      key: result.key,
      url: publicUrl,
      size: result.size,
      type: `image/${result.format}`,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar", message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload/avatar
 * 删除用户头像（仅允许删除自己的头像）
 */
export async function DELETE(request: NextRequest) {
  try {
    // 验证登录状态
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Object key is required" },
        { status: 400 }
      );
    }

    // 验证 key 属于当前用户：查询数据库确认该用户的 image 字段包含此 key
    const { env } = await import("@opennextjs/cloudflare").then(m => m.getCloudflareContext({ async: true }));
    if (env.DB) {
      const { drizzle } = await import("drizzle-orm/d1");
      const schema = await import("@/db/schema");
      const ormDb = drizzle(env.DB as D1Database, { schema });
      const userRecord = await ormDb
        .select({ image: schema.users.image })
        .from(schema.users)
        .where(eq(schema.users.id, session.user.id))
        .then(rows => rows[0]);

      if (!userRecord?.image?.includes(key)) {
        return NextResponse.json(
          { error: "无权删除该文件" },
          { status: 403 }
        );
      }
    }

    await deleteImage(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete avatar" },
      { status: 500 }
    );
  }
}
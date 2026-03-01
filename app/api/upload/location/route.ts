import { NextRequest, NextResponse } from "next/server";
import { uploadLocationCover, deleteImage } from "@/lib/storage";

// 允许的图片类型
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// 最大文件大小 (10MB - 徒步图片可能较大)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * POST /api/upload/location
 * 上传地点封面图片到 R2 存储
 */
export async function POST(request: NextRequest) {
  try {
    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    // 验证参数
    if (!file) {
      return NextResponse.json(
        { error: "请选择要上传的图片" },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "不支持的图片格式，允许: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "图片太大，最大允许 10MB" },
        { status: 400 }
      );
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();

    // 使用 lib/storage.ts 中的上传函数
    const result = await uploadLocationCover(
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
    console.error("Location image upload error:", error);
    return NextResponse.json(
      { error: "上传失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload/location
 * 删除地点图片
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "缺少图片 key 参数" },
        { status: 400 }
      );
    }

    await deleteImage(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Location image delete error:", error);
    return NextResponse.json(
      { error: "删除失败" },
      { status: 500 }
    );
  }
}
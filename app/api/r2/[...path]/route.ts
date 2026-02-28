import { NextRequest, NextResponse } from "next/server";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext({ async: true });
};

/**
 * 根据文件扩展名推断 Content-Type
 */
function getContentTypeFromKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

/**
 * GET /api/r2/[...path]
 * 从 R2 存储获取文件（用于本地开发模式）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // 获取 Cloudflare 上下文
    const { env } = await getCloudflareContext();
    const { path } = await params;

    if (!env.R2) {
      return NextResponse.json(
        { error: "R2 storage not configured" },
        { status: 500 }
      );
    }

    const r2 = env.R2 as R2Bucket;

    // 构建文件 key
    const key = path.join("/");

    if (!key) {
      return NextResponse.json(
        { error: "File key is required" },
        { status: 400 }
      );
    }

    // 从 R2 获取文件
    const object = await r2.get(key);

    if (!object) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // 返回文件内容
    const headers = new Headers();

    // 手动设置 content-type（从对象元数据获取或根据扩展名推断）
    const contentType =
      object.httpMetadata?.contentType || getContentTypeFromKey(key);
    headers.set("content-type", contentType);
    headers.set("cache-control", "public, max-age=31536000");

    // 尝试设置 etag，如果可用
    if (object.httpEtag) {
      headers.set("etag", object.httpEtag);
    }

    return new NextResponse(object.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("R2 get error:", error);
    return NextResponse.json(
      { error: "Failed to get file", message: (error as Error).message },
      { status: 500 }
    );
  }
}

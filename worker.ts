/**
 * GoMate Workers - 静态资源服务 + API 路由
 */

import { getDB } from "./db";

// 静态资源映射
const ASSET_MANIFEST: Record<string, string> = {
  "/": "/index.html",
  "/about": "/about/index.html",
  "/contact": "/contact/index.html",
  "/locations": "/locations/index.html",
  "/login": "/login/index.html",
  "/my-teams": "/my-teams/index.html",
  "/privacy": "/privacy/index.html",
  "/profile": "/profile/index.html",
  "/profile/edit": "/profile/edit/index.html",
  "/register": "/register/index.html",
  "/teams": "/teams/index.html",
  "/teams/create": "/teams/create/index.html",
  "/terms": "/terms/index.html",
};

// 获取内容类型
function getContentType(path: string): string {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".ico")) return "image/x-icon";
  return "application/octet-stream";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS 头
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // 处理预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // API 路由
    if (pathname.startsWith("/api/")) {
      return handleAPI(request, env, corsHeaders);
    }

    // 静态资源
    return handleStatic(request, pathname, corsHeaders);
  },
};

async function handleAPI(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  try {
    // 健康检查
    if (pathname === "/api/health") {
      return jsonResponse({
        status: "ok",
        timestamp: new Date().toISOString(),
        env: "cloudflare-workers",
      }, corsHeaders);
    }

    // 获取所有地点
    if (pathname === "/api/locations") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM locations ORDER BY name ASC"
      ).all();
      return jsonResponse({ success: true, data: results }, corsHeaders);
    }

    // 获取单个地点
    if (pathname.match(/^\/api\/locations\/[^\/]+$/)) {
      const id = pathname.replace("/api/locations/", "");
      const result = await env.DB.prepare(
        "SELECT * FROM locations WHERE id = ?"
      ).bind(id).first();
      if (!result) {
        return jsonResponse({ success: false, error: "Location not found" }, corsHeaders, 404);
      }
      return jsonResponse({ success: true, data: result }, corsHeaders);
    }

    // 获取所有队伍
    if (pathname === "/api/teams") {
      const { results } = await env.DB.prepare(
        `SELECT t.*, l.name as location_name, l.cover_image as location_image,
                u.name as leader_name, u.image as leader_image
         FROM teams t
         LEFT JOIN locations l ON t.location_id = l.id
         LEFT JOIN users u ON t.leader_id = u.id
         ORDER BY t.created_at DESC`
      ).all();
      return jsonResponse({ success: true, data: results }, corsHeaders);
    }

    // 获取单个队伍
    if (pathname.match(/^\/api\/teams\/[^\/]+$/)) {
      const id = pathname.replace("/api/teams/", "");
      const result = await env.DB.prepare(
        `SELECT t.*, l.name as location_name, l.cover_image as location_image,
                u.name as leader_name, u.image as leader_image
         FROM teams t
         LEFT JOIN locations l ON t.location_id = l.id
         LEFT JOIN users u ON t.leader_id = u.id
         WHERE t.id = ?`
      ).bind(id).first();
      if (!result) {
        return jsonResponse({ success: false, error: "Team not found" }, corsHeaders, 404);
      }
      return jsonResponse({ success: true, data: result }, corsHeaders);
    }

    // 404
    return jsonResponse({ success: false, error: "Not Found" }, corsHeaders, 404);
  } catch (error) {
    console.error("API Error:", error);
    return jsonResponse(
      { success: false, error: "Internal Server Error" },
      corsHeaders,
      500
    );
  }
}

async function handleStatic(request: Request, pathname: string, corsHeaders: Record<string, string>): Promise<Response> {
  // 尝试查找资源
  let assetPath = ASSET_MANIFEST[pathname];

  // 如果没有精确匹配，尝试查找动态路由
  if (!assetPath) {
    // 动态路由处理
    if (pathname.startsWith("/locations/")) {
      const id = pathname.replace("/locations/", "").replace(/\/$/, "");
      assetPath = `/locations/${id}/index.html`;
    } else if (pathname.startsWith("/teams/")) {
      const id = pathname.replace("/teams/", "").replace(/\/$/, "");
      assetPath = `/teams/${id}/index.html`;
    }
  }

  // 如果仍然没有找到，返回 index.html（SPA 模式）
  if (!assetPath) {
    assetPath = "/index.html";
  }

  // 尝试获取资源
  try {
    // 使用 fetch 获取静态资源
    const response = await fetch(new Request(`https://assets${assetPath}`, {
      headers: request.headers,
    }));

    if (response.ok) {
      const contentType = getContentType(assetPath);
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Content-Type", contentType);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    }
  } catch (e) {
    console.error("Asset fetch error:", e);
  }

  // 返回 404
  return new Response("Not Found", { status: 404, headers: corsHeaders });
}

function jsonResponse(data: unknown, headers: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
}

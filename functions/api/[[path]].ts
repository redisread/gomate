/**
 * Cloudflare Pages Functions - API 路由处理器
 * 用于处理静态导出后的动态 API 请求
 */

import { getDB } from "../../db";

// CORS 头
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// 创建响应
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

// 主处理器
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 处理预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const db = getDB(env as Env);

    // 路由匹配
    const path = pathname.replace("/api", "");

    // 健康检查
    if (path === "/health") {
      return jsonResponse({
        status: "ok",
        timestamp: new Date().toISOString(),
        env: "cloudflare-pages",
      });
    }

    // 获取所有地点
    if (path === "/locations" && request.method === "GET") {
      const result = await (env as Env).DB.prepare(
        "SELECT * FROM locations ORDER BY name ASC"
      ).all();
      return jsonResponse({ success: true, data: result.results });
    }

    // 获取单个地点
    if (path.startsWith("/locations/") && request.method === "GET") {
      const id = path.replace("/locations/", "");
      const result = await (env as Env).DB.prepare(
        "SELECT * FROM locations WHERE id = ?"
      )
        .bind(id)
        .first();
      if (!result) {
        return jsonResponse({ success: false, error: "Location not found" }, 404);
      }
      return jsonResponse({ success: true, data: result });
    }

    // 获取所有队伍
    if (path === "/teams" && request.method === "GET") {
      const result = await (env as Env).DB.prepare(
        `SELECT t.*, l.name as location_name, l.cover_image as location_image,
                u.name as leader_name, u.image as leader_image
         FROM teams t
         LEFT JOIN locations l ON t.location_id = l.id
         LEFT JOIN users u ON t.leader_id = u.id
         ORDER BY t.created_at DESC`
      ).all();
      return jsonResponse({ success: true, data: result.results });
    }

    // 获取单个队伍
    if (path.startsWith("/teams/") && request.method === "GET") {
      const id = path.replace("/teams/", "");
      const result = await (env as Env).DB.prepare(
        `SELECT t.*, l.name as location_name, l.cover_image as location_image,
                u.name as leader_name, u.image as leader_image
         FROM teams t
         LEFT JOIN locations l ON t.location_id = l.id
         LEFT JOIN users u ON t.leader_id = u.id
         WHERE t.id = ?`
      )
        .bind(id)
        .first();
      if (!result) {
        return jsonResponse({ success: false, error: "Team not found" }, 404);
      }
      return jsonResponse({ success: true, data: result });
    }

    // 获取地点的队伍列表
    if (path.startsWith("/locations/") && path.endsWith("/teams")) {
      const locationId = path.replace("/locations/", "").replace("/teams", "");
      const result = await (env as Env).DB.prepare(
        `SELECT t.*, u.name as leader_name, u.image as leader_image
         FROM teams t
         LEFT JOIN users u ON t.leader_id = u.id
         WHERE t.location_id = ? AND t.status = 'recruiting'
         ORDER BY t.start_time ASC`
      )
        .bind(locationId)
        .all();
      return jsonResponse({ success: true, data: result.results });
    }

    // 404 - 未找到路由
    return jsonResponse({ success: false, error: "Not Found" }, 404);
  } catch (error) {
    console.error("API Error:", error);
    return jsonResponse(
      {
        success: false,
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
};

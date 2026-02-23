/**
 * API 客户端 - 兼容本地开发和 Cloudflare Pages 环境
 * 静态导出时使用 Fetch API 调用 Cloudflare Pages Functions
 */

import { copy } from "@/lib/copy";

// API 基础 URL
const getBaseUrl = () => {
  if (typeof window === "undefined") {
    // 服务端渲染
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }
  // 客户端
  return "";
};

/**
 * 通用 API 请求函数
 */
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `${copy.api.failed}: ${response.status}`);
  }

  return response.json();
}

/**
 * 地点 API
 */
export async function fetchLocations() {
  return apiRequest<{ success: boolean; data: unknown[] }>("/locations");
}

export async function fetchLocationById(id: string) {
  return apiRequest<{ success: boolean; data: unknown }>(`/locations/${id}`);
}

/**
 * 队伍 API
 */
export async function fetchTeams() {
  return apiRequest<{ success: boolean; data: unknown[] }>("/teams");
}

export async function fetchTeamById(id: string) {
  return apiRequest<{ success: boolean; data: unknown }>(`/teams/${id}`);
}

/**
 * 健康检查
 */
export async function fetchHealth() {
  return apiRequest<{ status: string; timestamp: string }>("/health");
}

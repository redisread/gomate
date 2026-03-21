import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// mock 全局 fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// mock import.meta.env（Astro 环境变量）
vi.stubGlobal("import", { meta: { env: { PUBLIC_API_URL: "http://localhost:8799" } } });

// 动态导入（确保 mock 先于模块加载）
const { fetchAPI, apiGet, apiPost, apiPut, apiDelete } = await import("../lib/api");

function makeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("API 客户端封装", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // ===== fetchAPI =====
  describe("fetchAPI() - 基础 fetch 封装", () => {
    it("自动拼接 API_BASE 前缀", async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({}));
      await fetchAPI("/teams");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/teams"),
        expect.any(Object)
      );
    });

    it("自动携带 Content-Type: application/json", async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({}));
      await fetchAPI("/teams");
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("自动携带 credentials: include", async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({}));
      await fetchAPI("/teams");
      const [, options] = mockFetch.mock.calls[0];
      expect(options.credentials).toBe("include");
    });

    it("允许覆盖默认 headers", async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({}));
      await fetchAPI("/teams", { headers: { Authorization: "Bearer token123" } });
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBe("Bearer token123");
    });
  });

  // ===== apiGet =====
  describe("apiGet() - GET 请求", () => {
    it("成功时返回解析后的 JSON 数据", async () => {
      const data = { teams: [{ id: "1", title: "测试队伍" }] };
      mockFetch.mockResolvedValueOnce(makeResponse(data));
      const result = await apiGet<typeof data>("/teams");
      expect(result).toEqual(data);
    });

    it("请求失败时抛出包含状态码的错误", async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ error: "Not found" }, 404));
      await expect(apiGet("/teams/nonexistent")).rejects.toThrow("404");
    });

    it("服务器 500 时抛出错误", async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ error: "Internal Server Error" }, 500));
      await expect(apiGet("/teams")).rejects.toThrow("500");
    });
  });

  // ===== apiPost =====
  describe("apiPost() - POST 请求", () => {
    it("成功时返回解析后的 JSON 数据", async () => {
      const data = { success: true, team: { id: "new-team" } };
      mockFetch.mockResolvedValueOnce(makeResponse(data));
      const result = await apiPost<typeof data>("/teams", { title: "新队伍" });
      expect(result).toEqual(data);
    });

    it("自动序列化请求体为 JSON 字符串", async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ success: true }));
      const body = { title: "测试", maxMembers: 5 };
      await apiPost("/teams", body);
      const [, options] = mockFetch.mock.calls[0];
      expect(options.body).toBe(JSON.stringify(body));
      expect(options.method).toBe("POST");
    });

    it("请求失败时抛出服务器返回的 message", async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ message: "请先填写微信号" }, 400));
      await expect(apiPost("/teams", {})).rejects.toThrow("请先填写微信号");
    });

    it("无 body 时不传 body 参数", async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ success: true }));
      await apiPost("/teams/join");
      const [, options] = mockFetch.mock.calls[0];
      expect(options.body).toBeUndefined();
    });
  });

  // ===== apiPut =====
  describe("apiPut() - PUT 请求", () => {
    it("成功时返回解析后的 JSON 数据", async () => {
      const data = { success: true };
      mockFetch.mockResolvedValueOnce(makeResponse(data));
      const result = await apiPut<typeof data>("/users/update", { name: "新名字" });
      expect(result).toEqual(data);
    });

    it("使用 PUT 方法", async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ success: true }));
      await apiPut("/users/update", {});
      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe("PUT");
    });

    it("请求失败时抛出服务器返回的 message", async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ message: "更新失败" }, 400));
      await expect(apiPut("/users/update", {})).rejects.toThrow("更新失败");
    });
  });

  // ===== apiDelete =====
  describe("apiDelete() - DELETE 请求", () => {
    it("成功时返回解析后的 JSON 数据", async () => {
      const data = { success: true };
      mockFetch.mockResolvedValueOnce(makeResponse(data));
      const result = await apiDelete<typeof data>("/favorites?entityId=1");
      expect(result).toEqual(data);
    });

    it("使用 DELETE 方法", async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ success: true }));
      await apiDelete("/favorites?entityId=1");
      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe("DELETE");
    });

    it("请求失败时抛出包含状态码的错误", async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ error: "Not found" }, 404));
      await expect(apiDelete("/favorites?entityId=nonexistent")).rejects.toThrow("404");
    });
  });
});

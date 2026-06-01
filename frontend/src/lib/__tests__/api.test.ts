import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock import.meta.env
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return actual;
});

// We need to re-import after mock setup
const API_BASE = "http://localhost:8888";

describe("API 客户端封装", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchAPI", () => {
    it("发送 GET 请求并返回 Response", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      const { fetchAPI } = await import("@/lib/api");

      // Act
      const res = await fetchAPI("/test");

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/test`,
        expect.objectContaining({
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
      );
      expect(res.status).toBe(200);
    });

    it("自动去除 /api/ 前缀避免双路径", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response("", { status: 200 }));
      const { fetchAPI } = await import("@/lib/api");

      // Act
      await fetchAPI("/api/users");

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/users`,
        expect.any(Object),
      );
    });

    it("非 /api/ 开头的路径保持不变", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response("", { status: 200 }));
      const { fetchAPI } = await import("@/lib/api");

      // Act
      await fetchAPI("/auth/sign-in");

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/auth/sign-in`,
        expect.any(Object),
      );
    });

    it("携带自定义 headers 和 method", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response("", { status: 200 }));
      const { fetchAPI } = await import("@/lib/api");

      // Act
      await fetchAPI("/test", { method: "PUT", headers: { "X-Custom": "value" } });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/test`,
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Custom": "value" },
        }),
      );
    });
  });

  describe("apiGet", () => {
    it("成功时解析 JSON", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ data: "hello" }), { status: 200 }));
      const { apiGet } = await import("@/lib/api");

      // Act
      const result = await apiGet("/test");

      // Assert
      expect(result).toEqual({ data: "hello" });
    });

    it("失败时抛出错误", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ error: "not found" }), { status: 404 }));
      const { apiGet } = await import("@/lib/api");

      // Act & Assert
      await expect(apiGet("/test")).rejects.toThrow("API GET /test failed: 404");
    });
  });

  describe("apiPost", () => {
    it("成功时发送 POST 并返回 JSON", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 201 }));
      const { apiPost } = await import("@/lib/api");

      // Act
      const result = await apiPost("/items", { name: "test" });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/items`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "test" }),
        }),
      );
      expect(result).toEqual({ id: 1 });
    });

    it("无 body 时正常发送", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      const { apiPost } = await import("@/lib/api");

      // Act
      await apiPost("/items");

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/items`,
        expect.objectContaining({ method: "POST", body: undefined }),
      );
    });

    it("失败时解析错误消息", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ message: "duplicate" }), { status: 400 }));
      const { apiPost } = await import("@/lib/api");

      // Act & Assert
      await expect(apiPost("/items", { name: "test" })).rejects.toThrow("duplicate");
    });

    it("失败且无法解析 JSON 时使用 statusText", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response("bad gateway", { status: 502 }));
      const { apiPost } = await import("@/lib/api");

      // Act & Assert
      await expect(apiPost("/items")).rejects.toThrow("API POST /items failed: 502");
    });
  });

  describe("apiPut", () => {
    it("成功时发送 PUT 并返回 JSON", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ updated: true }), { status: 200 }));
      const { apiPut } = await import("@/lib/api");

      // Act
      const result = await apiPut("/items/1", { name: "updated" });

      // Assert
      expect(result).toEqual({ updated: true });
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/items/1`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ name: "updated" }),
        }),
      );
    });

    it("失败时抛出错误", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ error: "not found" }), { status: 404 }));
      const { apiPut } = await import("@/lib/api");

      // Act & Assert
      await expect(apiPut("/items/999")).rejects.toThrow("API PUT /items/999 failed: 404");
    });
  });

  describe("apiDelete", () => {
    it("成功时发送 DELETE 并返回 JSON", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ deleted: true }), { status: 200 }));
      const { apiDelete } = await import("@/lib/api");

      // Act
      const result = await apiDelete("/items/1");

      // Assert
      expect(result).toEqual({ deleted: true });
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/items/1`,
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("失败时抛出错误", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response("", { status: 403 }));
      const { apiDelete } = await import("@/lib/api");

      // Act & Assert
      await expect(apiDelete("/items/1")).rejects.toThrow("API DELETE /items/1 failed: 403");
    });
  });

  describe("getLocationPois", () => {
    it("成功时返回 POI 列表", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ pois: [{ id: "1", name: "POI" }] }), { status: 200 }));
      const { getLocationPois } = await import("@/lib/api");

      // Act
      const result = await getLocationPois("loc1");

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("POI");
    });

    it("失败时返回空数组", async () => {
      // Arrange
      mockFetch.mockResolvedValue(new Response("", { status: 500 }));
      const { getLocationPois } = await import("@/lib/api");

      // Act
      const result = await getLocationPois("loc1");

      // Assert
      expect(result).toEqual([]);
    });

    it("异常时也返回空数组", async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error("network error"));
      const { getLocationPois } = await import("@/lib/api");

      // Act
      const result = await getLocationPois("loc1");

      // Assert
      expect(result).toEqual([]);
    });
  });
});

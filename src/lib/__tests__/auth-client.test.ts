import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Auth 客户端", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("authClient 使用正确的配置初始化", async () => {
    // Arrange
    const configRef: { value?: { baseURL?: string; basePath?: string } } = {};
    vi.doMock("better-auth/react", () => ({
      createAuthClient: vi.fn((config?: { baseURL?: string; basePath?: string }) => {
        configRef.value = config;
        return { $Infer: { Session: {} as object } };
      }),
    }));

    // Act
    const { authClient } = await import("@/lib/auth-client");

    // Assert
    expect(authClient).toBeDefined();
    expect(configRef.value).toBeDefined();
    expect(configRef.value?.baseURL).toBeUndefined();
    expect(configRef.value?.basePath).toBe("/api/auth");
  });
});

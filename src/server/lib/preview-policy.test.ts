import { describe, expect, it } from "vitest";
import {
  getAuthBaseUrl,
  getRequestOrigin,
  isPreviewAuthMutation,
  isPreviewRequest,
} from "./preview-policy";

const env = {
  APP_URL: "https://gomate.live",
  PREVIEW_HOST_SUFFIX: "account.workers.dev",
};

describe("Preview request policy", () => {
  it("accepts only gomate version and alias hosts in the configured account", () => {
    const previewRequest = new Request(
      "https://b-feature-login-12345678-gomate.account.workers.dev/api/health",
    );

    expect(isPreviewRequest(previewRequest, env)).toBe(true);
    expect(getRequestOrigin(previewRequest, env)).toBe(
      "https://b-feature-login-12345678-gomate.account.workers.dev",
    );
  });

  it("rejects other workers, accounts, and insecure preview origins", () => {
    expect(
      isPreviewRequest(
        new Request("https://other-worker.account.workers.dev/api/health"),
        env,
      ),
    ).toBe(false);
    expect(
      isPreviewRequest(
        new Request("https://b-feature-gomate.other.workers.dev/api/health"),
        env,
      ),
    ).toBe(false);
    expect(
      isPreviewRequest(
        new Request("http://b-feature-gomate.account.workers.dev/api/health"),
        env,
      ),
    ).toBe(false);
    expect(
      getRequestOrigin(new Request("https://unknown.example/api/health"), env),
    ).toBe(null);
  });

  it("keeps the production origin as the auth fallback", () => {
    expect(
      getRequestOrigin(new Request("https://gomate.live/api/auth/sign-in/email"), env),
    ).toBe("https://gomate.live");
    expect(getAuthBaseUrl(env)).toMatchObject({
      allowedHosts: ["*-gomate.account.workers.dev"],
      fallback: "https://gomate.live",
      protocol: "https",
    });
  });

  it("allows only sign-in and sign-out mutations on a valid Preview host", () => {
    const request = new Request(
      "https://b-feature-login-12345678-gomate.account.workers.dev/api/auth/sign-in/email",
      { method: "POST" },
    );

    expect(isPreviewAuthMutation(request, "/auth/sign-in/email", env)).toBe(true);
    expect(isPreviewAuthMutation(request, "/api/auth/sign-in/email", env)).toBe(true);
    expect(
      isPreviewAuthMutation(
        new Request(request.url, { method: "POST" }),
        "/api/auth/sign-out",
        env,
      ),
    ).toBe(true);
    expect(
      isPreviewAuthMutation(
        new Request(request.url, { method: "POST" }),
        "/auth/sign-up/email",
        env,
      ),
    ).toBe(false);
    expect(
      isPreviewAuthMutation(
        new Request(request.url, { method: "POST" }),
        "/auth/reset-password",
        env,
      ),
    ).toBe(false);
    expect(
      isPreviewAuthMutation(
        new Request(request.url, { method: "GET" }),
        "/auth/sign-in/email",
        env,
      ),
    ).toBe(false);
  });
});

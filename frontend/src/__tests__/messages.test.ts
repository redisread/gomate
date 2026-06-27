import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConversation } from "../hooks/useMessages";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("messages client helpers", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("creates a member-to-leader conversation with teamId only", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: true,
      data: { id: "conv-1", isNew: true },
    }));

    const result = await createConversation("team-1");

    expect(result).toEqual({ id: "conv-1", isNew: true });
    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ teamId: "team-1" });
  });

  it("creates a leader-to-member conversation with target userId", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: true,
      data: { id: "conv-2", isNew: false },
    }));

    const result = await createConversation("team-1", "user-2");

    expect(result).toEqual({ id: "conv-2", isNew: false });
    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ teamId: "team-1", userId: "user-2" });
  });

  it("throws the structured API error message when creation fails", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      success: false,
      error: { message: "Target user is not an approved team member" },
    }, 403));

    await expect(createConversation("team-1", "pending-user"))
      .rejects.toThrow("Target user is not an approved team member");
  });
});

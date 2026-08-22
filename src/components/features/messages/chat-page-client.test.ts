import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { Message } from "@/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyMessagePage,
  buildMessageHistoryPath,
  getPrependScrollTop,
  initializeMessageChatPage,
} from "./chat-page-client";

const fetchMock = vi.fn();

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function message(
  id: string,
  createdAt: string,
  overrides: Partial<Message> = {},
): Message {
  return {
    id,
    conversationId: "conversation-1",
    senderId: "user-2",
    content: `message ${id}`,
    readAt: null,
    createdAt,
    sender: {
      id: "user-2",
      name: "Hiker",
      nickname: "",
      image: null,
    },
    ...overrides,
  };
}

function timestamp(sequence: number): string {
  return new Date(Date.UTC(2026, 7, 16, 0, sequence)).toISOString();
}

function mountChatPage(): void {
  document.body.innerHTML = `
    <div id="messageChatPage">
      <div id="headerAvatar"></div>
      <div id="headerInfo"><h1>Loading</h1></div>
      <p id="headerMeta" class="hidden"></p>
      <main id="chatContainer">
        <div id="historyControls" class="hidden">
          <button id="loadEarlierBtn" type="button"></button>
          <p id="historyError" role="alert" class="hidden"></p>
        </div>
        <div id="messageList" role="log"></div>
      </main>
      <form id="messageForm">
        <p id="chatError" class="hidden"></p>
        <input id="messageInput" />
        <button id="sendBtn" type="submit"><span id="sendText"></span></button>
        <span id="sendIcon"></span>
        <span id="sendSpinner" class="hidden"></span>
      </form>
    </div>
  `;

  const root = document.getElementById("messageChatPage") as HTMLElement;
  root.dataset.config = JSON.stringify({
    conversationId: "conversation-1",
    apiBase: "/api",
    dateLocale: "en-US",
    copy: {
      loading: "Loading",
      unknownUser: "Unknown user",
      noMessagesPrompt: "No messages",
      inputPlaceholder: "Type a message",
      loadFailed: "Load failed",
      forbidden: "Forbidden",
      sendFailed: "Send failed",
      read: "Read",
      today: "Today",
      yesterday: "Yesterday",
      backToMessages: "Back",
      messageList: "Message list",
      messageInputLabel: "Message content",
      sendMessage: "Send message",
      sending: "Sending",
      privateConversation: "Private conversation",
      loadEarlier: "Load earlier messages",
      loadingEarlier: "Loading earlier messages",
      loadEarlierFailed: "Could not load earlier messages",
    },
  });
}

describe("message chat history contract", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.body.innerHTML = "";
  });

  it("builds an encoded opaque-cursor request without page aliases", () => {
    expect(buildMessageHistoryPath("/api", "conversation/1", "opaque:cursor/+=")).toBe(
      "/api/messages/conversation%2F1?limit=50&cursor=opaque%3Acursor%2F%2B%3D",
    );
  });

  it("prepends older pages, de-duplicates by id, and preserves the history cursor during polling", () => {
    const initial = applyMessagePage(
      { messages: [], nextCursor: null },
      {
        messages: [
          message("message-3", "2026-08-16T03:00:00.000Z"),
          message("message-4", "2026-08-16T04:00:00.000Z"),
        ],
        nextCursor: "older-page-1",
      },
      "initial",
    );
    const withOlder = applyMessagePage(
      initial,
      {
        messages: [
          message("message-1", "2026-08-16T01:00:00.000Z"),
          message("message-2", "2026-08-16T02:00:00.000Z"),
          message("message-3", "2026-08-16T03:00:00.000Z"),
        ],
        nextCursor: "older-page-2",
      },
      "older",
    );
    const afterPoll = applyMessagePage(
      withOlder,
      {
        messages: [
          message("message-4", "2026-08-16T04:00:00.000Z", {
            readAt: "2026-08-16T04:30:00.000Z",
          }),
          message("message-5", "2026-08-16T05:00:00.000Z"),
        ],
        nextCursor: "latest-page-cursor-must-not-win",
      },
      "latest",
    );

    expect(afterPoll.messages.map(({ id }) => id)).toEqual([
      "message-1",
      "message-2",
      "message-3",
      "message-4",
      "message-5",
    ]);
    expect(afterPoll.messages.find(({ id }) => id === "message-4")?.readAt).toBe(
      "2026-08-16T04:30:00.000Z",
    );
    expect(afterPoll.nextCursor).toBe("older-page-2");
  });

  it("restores the visible scroll anchor after messages are prepended", () => {
    expect(getPrependScrollTop({
      previousScrollTop: 80,
      previousScrollHeight: 600,
      nextScrollHeight: 940,
    })).toBe(420);
  });

  it("loads earlier pages through the accessible control and polling keeps loaded history", async () => {
    mountChatPage();
    let latestRequestCount = 0;
    const requestedUrls: string[] = [];

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requestedUrls.push(url);

      if (url === "/api/auth/get-session") {
        return response({ user: { id: "user-1" } });
      }
      if (url.endsWith("/read") && init?.method === "PATCH") {
        return response({ success: true });
      }
      if (url.includes("cursor=older-page-1")) {
        return response({
          success: true,
          data: [
            message("message-1", "2026-08-16T01:00:00.000Z"),
            message("message-2", "2026-08-16T02:00:00.000Z"),
            message("message-3", "2026-08-16T03:00:00.000Z"),
          ],
          nextCursor: "older-page-2",
        });
      }
      if (url.includes("cursor=older-page-2")) {
        return response({
          success: true,
          data: [message("message-0", "2026-08-16T00:00:00.000Z")],
          nextCursor: null,
        });
      }
      if (url === "/api/messages/conversation-1?limit=50") {
        latestRequestCount += 1;
        return latestRequestCount === 1
          ? response({
              success: true,
              data: [
                message("message-3", "2026-08-16T03:00:00.000Z"),
                message("message-4", "2026-08-16T04:00:00.000Z"),
              ],
              nextCursor: "older-page-1",
              conversation: { otherUser: { id: "user-2", name: "Hiker" } },
            })
          : response({
              success: true,
              data: [
                message("message-4", "2026-08-16T04:00:00.000Z"),
                message("message-5", "2026-08-16T05:00:00.000Z"),
              ],
              nextCursor: "latest-page-cursor-must-not-win",
            });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const controller = await initializeMessageChatPage(document, { pollIntervalMs: 0 });
    expect(controller).not.toBeNull();

    const chatContainer = document.getElementById("chatContainer") as HTMLElement;
    Object.defineProperty(chatContainer, "scrollHeight", {
      configurable: true,
      get: () => document.querySelectorAll("[data-message-id]").length * 100,
    });
    chatContainer.scrollTop = 30;

    fireEvent.click(screen.getByRole("button", { name: "Load earlier messages" }));
    await waitFor(() => expect(screen.getByText("message message-1")).toBeInTheDocument());

    expect(chatContainer.scrollTop).toBe(230);
    expect(document.querySelectorAll('[data-message-id="message-3"]')).toHaveLength(1);

    await controller?.refreshLatest();
    expect(screen.getByText("message message-1")).toBeInTheDocument();
    expect(screen.getByText("message message-5")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-message-id="message-4"]')).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Load earlier messages" }));
    await waitFor(() => expect(screen.getByText("message message-0")).toBeInTheDocument());

    expect(requestedUrls).toContain(
      "/api/messages/conversation-1?limit=50&cursor=older-page-1",
    );
    expect(requestedUrls).toContain(
      "/api/messages/conversation-1?limit=50&cursor=older-page-2",
    );
    expect(screen.queryByRole("button", { name: "Load earlier messages" })).not.toBeInTheDocument();

    controller?.dispose();
  });

  it("walks latest cursors until overlapping local history so a burst over one page has no gap", async () => {
    mountChatPage();
    const requestedUrls: string[] = [];
    let latestRequestCount = 0;

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url === "/api/auth/get-session") {
        return response({ user: { id: "user-1" } });
      }
      if (url.endsWith("/read") && init?.method === "PATCH") {
        return response({ success: true });
      }
      if (url.includes("cursor=bridge-to-local-history")) {
        return response({
          success: true,
          data: Array.from({ length: 20 }, (_, index) =>
            message(`message-${index + 1}`, timestamp(index + 1))),
          nextCursor: null,
        });
      }
      if (url === "/api/messages/conversation-1?limit=50") {
        latestRequestCount += 1;
        if (latestRequestCount === 1) {
          return response({
            success: true,
            data: Array.from({ length: 10 }, (_, index) =>
              message(`message-${index + 1}`, timestamp(index + 1))),
            nextCursor: null,
          });
        }
        return response({
          success: true,
          data: Array.from({ length: 50 }, (_, index) =>
            message(`message-${index + 21}`, timestamp(index + 21))),
          nextCursor: "bridge-to-local-history",
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const controller = await initializeMessageChatPage(document, { pollIntervalMs: 0 });
    await controller?.refreshLatest();

    expect(requestedUrls).toContain(
      "/api/messages/conversation-1?limit=50&cursor=bridge-to-local-history",
    );
    expect(screen.getByText("message message-11")).toBeInTheDocument();
    expect(screen.getByText("message message-70")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-message-id]")).toHaveLength(70);
    expect(new Set(
      [...document.querySelectorAll<HTMLElement>("[data-message-id]")]
        .map((element) => element.dataset.messageId),
    ).size).toBe(70);

    controller?.dispose();
  });
});

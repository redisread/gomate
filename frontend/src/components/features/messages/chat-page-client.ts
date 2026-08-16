import type { Message } from "@gomate/types";

const HISTORY_PAGE_SIZE = 50;

export interface MessageHistoryState {
  messages: Message[];
  nextCursor: string | null;
}

interface MessagePage {
  messages: Message[];
  nextCursor: string | null;
}

type MessagePageMode = "initial" | "older" | "latest";

export interface MessageChatPageController {
  refreshLatest: () => Promise<void>;
  loadEarlier: () => Promise<void>;
  dispose: () => void;
}

export interface MessageChatPageOptions {
  pollIntervalMs?: number;
}

export function buildMessageHistoryPath(
  apiBase: string,
  conversationId: string,
  cursor: string | null = null,
): string {
  const query = new URLSearchParams({ limit: String(HISTORY_PAGE_SIZE) });
  if (cursor) query.set("cursor", cursor);
  return `${apiBase.replace(/\/$/u, "")}/messages/${encodeURIComponent(conversationId)}?${query}`;
}

function compareMessages(left: Message, right: Message): number {
  const timeDifference = Date.parse(left.createdAt) - Date.parse(right.createdAt);
  return timeDifference || left.id.localeCompare(right.id);
}

function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(compareMessages);
}

export function applyMessagePage(
  state: MessageHistoryState,
  page: MessagePage,
  mode: MessagePageMode,
): MessageHistoryState {
  return {
    messages: mode === "initial"
      ? mergeMessages([], page.messages)
      : mergeMessages(state.messages, page.messages),
    nextCursor: mode === "latest" ? state.nextCursor : page.nextCursor,
  };
}

export function getPrependScrollTop({
  previousScrollTop,
  previousScrollHeight,
  nextScrollHeight,
}: {
  previousScrollTop: number;
  previousScrollHeight: number;
  nextScrollHeight: number;
}): number {
  return Math.max(0, previousScrollTop + nextScrollHeight - previousScrollHeight);
}

interface ChatUser {
  id: string;
  name?: string | null;
  nickname?: string | null;
  image?: string | null;
}

interface ChatCopy {
  loading: string;
  unknownUser: string;
  noMessagesPrompt: string;
  inputPlaceholder: string;
  loadFailed: string;
  forbidden: string;
  sendFailed: string;
  read: string;
  today: string;
  yesterday: string;
  backToMessages: string;
  messageList: string;
  messageInputLabel: string;
  sendMessage: string;
  sending: string;
  privateConversation: string;
  loadEarlier: string;
  loadingEarlier: string;
  loadEarlierFailed: string;
}

interface ChatConfig {
  conversationId: string;
  apiBase: string;
  dateLocale: string;
  copy: ChatCopy;
}

interface MessageHistoryResponse {
  success?: boolean;
  data?: Message[] | Message;
  nextCursor?: string | null;
  conversation?: { otherUser?: ChatUser | null };
  error?: unknown;
  message?: string;
}

interface ChatElements {
  root: HTMLElement;
  chatContainer: HTMLElement;
  messageList: HTMLElement;
  historyControls: HTMLElement;
  loadEarlierButton: HTMLButtonElement;
  historyError: HTMLElement;
  messageForm: HTMLFormElement;
  messageInput: HTMLInputElement;
  sendButton: HTMLButtonElement;
  sendText: HTMLElement;
  sendIcon: HTMLElement;
  sendSpinner: HTMLElement;
  headerInfo: HTMLElement;
  headerAvatar: HTMLElement;
  headerMeta: HTMLElement;
  chatError: HTMLElement;
}

function readConfig(root: HTMLElement): ChatConfig | null {
  try {
    const parsed = JSON.parse(root.dataset.config ?? "") as Partial<ChatConfig>;
    if (
      typeof parsed.conversationId !== "string"
      || typeof parsed.apiBase !== "string"
      || typeof parsed.dateLocale !== "string"
      || !parsed.copy
    ) {
      return null;
    }
    return parsed as ChatConfig;
  } catch {
    return null;
  }
}

function getChatElements(pageDocument: Document): ChatElements | null {
  const root = pageDocument.getElementById("messageChatPage");
  const chatContainer = pageDocument.getElementById("chatContainer");
  const messageList = pageDocument.getElementById("messageList");
  const historyControls = pageDocument.getElementById("historyControls");
  const loadEarlierButton = pageDocument.getElementById("loadEarlierBtn");
  const historyError = pageDocument.getElementById("historyError");
  const messageForm = pageDocument.getElementById("messageForm");
  const messageInput = pageDocument.getElementById("messageInput");
  const sendButton = pageDocument.getElementById("sendBtn");
  const sendText = pageDocument.getElementById("sendText");
  const sendIcon = pageDocument.getElementById("sendIcon");
  const sendSpinner = pageDocument.getElementById("sendSpinner");
  const headerInfo = pageDocument.getElementById("headerInfo");
  const headerAvatar = pageDocument.getElementById("headerAvatar");
  const headerMeta = pageDocument.getElementById("headerMeta");
  const chatError = pageDocument.getElementById("chatError");
  if (
    !root
    || !chatContainer
    || !messageList
    || !historyControls
    || !(loadEarlierButton instanceof HTMLButtonElement)
    || !historyError
    || !(messageForm instanceof HTMLFormElement)
    || !(messageInput instanceof HTMLInputElement)
    || !(sendButton instanceof HTMLButtonElement)
    || !sendText
    || !sendIcon
    || !sendSpinner
    || !headerInfo
    || !headerAvatar
    || !headerMeta
    || !chatError
  ) {
    return null;
  }
  return {
    root,
    chatContainer,
    messageList,
    historyControls,
    loadEarlierButton,
    historyError,
    messageForm,
    messageInput,
    sendButton,
    sendText,
    sendIcon,
    sendSpinner,
    headerInfo,
    headerAvatar,
    headerMeta,
    chatError,
  };
}

export async function initializeMessageChatPage(
  pageDocument: Document = document,
  options: MessageChatPageOptions = {},
): Promise<MessageChatPageController | null> {
  const foundElements = getChatElements(pageDocument);
  if (!foundElements) return null;
  const elements: ChatElements = foundElements;
  const parsedConfig = readConfig(elements.root);
  if (!parsedConfig) return null;
  const config: ChatConfig = parsedConfig;

  let history: MessageHistoryState = { messages: [], nextCursor: null };
  let currentUserId: string | null = null;
  let otherUser: ChatUser | null = null;
  let composerLocked = false;
  let isSending = false;
  let isLoadingLatest = false;
  let isLoadingEarlier = false;
  let hasLoadedInitialPage = false;
  let accessDenied = false;
  let lastRenderedSignature: string | null = null;
  let pollTimer: number | null = null;

  function updateHistoryControls(): void {
    const hasEarlierMessages = Boolean(history.nextCursor && history.messages.length > 0);
    elements.historyControls.classList.toggle("hidden", !hasEarlierMessages);
    elements.historyControls.hidden = !hasEarlierMessages;
    elements.loadEarlierButton.disabled = isLoadingLatest || isLoadingEarlier;
    elements.loadEarlierButton.textContent = isLoadingEarlier
      ? config.copy.loadingEarlier
      : config.copy.loadEarlier;
    elements.loadEarlierButton.setAttribute(
      "aria-busy",
      isLoadingEarlier ? "true" : "false",
    );
  }

  function setComposerDisabled(disabled: boolean): void {
    composerLocked = disabled;
    elements.messageInput.disabled = disabled;
    updateSendButton();
  }

  function setSending(sending: boolean): void {
    isSending = sending;
    elements.sendIcon.classList.toggle("hidden", sending);
    elements.sendSpinner.classList.toggle("hidden", !sending);
    elements.sendText.textContent = sending ? config.copy.sending : config.copy.sendMessage;
    elements.sendButton.setAttribute(
      "aria-label",
      sending ? config.copy.sending : config.copy.sendMessage,
    );
    elements.sendButton.setAttribute(
      "title",
      sending ? config.copy.sending : config.copy.sendMessage,
    );
    elements.sendButton.setAttribute("aria-busy", sending ? "true" : "false");
    updateSendButton();
  }

  function updateSendButton(): void {
    const hasContent = elements.messageInput.value.trim().length > 0;
    elements.sendButton.disabled = composerLocked || isSending || !hasContent;
  }

  function showChatError(message: string): void {
    elements.chatError.textContent = message;
    elements.chatError.classList.remove("hidden");
    elements.chatError.hidden = false;
  }

  function clearChatError(): void {
    elements.chatError.textContent = "";
    elements.chatError.classList.add("hidden");
    elements.chatError.hidden = true;
  }

  function showHistoryError(message: string): void {
    elements.historyError.textContent = message;
    elements.historyError.classList.remove("hidden");
    elements.historyError.hidden = false;
  }

  function clearHistoryError(): void {
    elements.historyError.textContent = "";
    elements.historyError.classList.add("hidden");
    elements.historyError.hidden = true;
  }

  function getDisplayName(user: ChatUser | null | undefined): string {
    return user?.nickname || user?.name || config.copy.unknownUser;
  }

  function createAvatar(user: ChatUser | null | undefined, sizeClass: string): HTMLElement {
    const avatar = pageDocument.createElement("div");
    avatar.className = `${sizeClass} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold text-muted-foreground ring-1 ring-border/70`;
    avatar.setAttribute("aria-hidden", "true");

    const imageUrl = user?.image ? String(user.image) : "";
    if (
      imageUrl.startsWith("http://")
      || imageUrl.startsWith("https://")
      || imageUrl.startsWith("/")
    ) {
      const image = pageDocument.createElement("img");
      image.src = imageUrl;
      image.alt = "";
      image.loading = "lazy";
      image.className = "h-full w-full object-cover";
      avatar.appendChild(image);
      return avatar;
    }

    const fallback = pageDocument.createElement("span");
    fallback.textContent = getDisplayName(user).trim().charAt(0) || "?";
    avatar.appendChild(fallback);
    return avatar;
  }

  function updateHeader(): void {
    const heading = elements.headerInfo.querySelector("h1");
    if (heading) heading.textContent = getDisplayName(otherUser);
    elements.headerMeta.textContent = config.copy.privateConversation;
    elements.headerMeta.classList.remove("hidden");
    elements.headerMeta.hidden = false;
    elements.headerAvatar.replaceChildren(createAvatar(otherUser, "h-10 w-10 text-sm"));
    elements.headerAvatar.className = "flex";
  }

  function formatDate(dateValue: string): string {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return config.copy.today;
    if (date.toDateString() === yesterday.toDateString()) return config.copy.yesterday;
    return date.toLocaleDateString(config.dateLocale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function renderMessageElement(message: Message): HTMLElement {
    const isOwnMessage = message.senderId === currentUserId;
    const sender = message.sender;
    const time = message.createdAt
      ? new Date(message.createdAt).toLocaleTimeString(config.dateLocale, {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    const wrapper = pageDocument.createElement("div");
    wrapper.dataset.messageId = message.id;

    if (isOwnMessage) {
      wrapper.className = "flex justify-end";
      const container = pageDocument.createElement("div");
      container.className = "max-w-[82%] sm:max-w-md";
      const content = pageDocument.createElement("div");
      content.className = "whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground";
      content.textContent = message.content;
      container.appendChild(content);
      const metadata = pageDocument.createElement("div");
      metadata.className = "mt-1 text-right text-xs text-muted-foreground";
      metadata.textContent = time + (message.readAt ? ` · ${config.copy.read}` : "");
      container.appendChild(metadata);
      wrapper.appendChild(container);
      return wrapper;
    }

    wrapper.className = "flex justify-start gap-2";
    wrapper.appendChild(createAvatar(sender, "h-8 w-8 text-xs"));
    const container = pageDocument.createElement("div");
    container.className = "max-w-[82%] sm:max-w-md";
    const senderName = pageDocument.createElement("div");
    senderName.className = "mb-1 ml-1 text-xs text-muted-foreground";
    senderName.textContent = getDisplayName(sender);
    container.appendChild(senderName);
    const content = pageDocument.createElement("div");
    content.className = "whitespace-pre-wrap break-words rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground";
    content.textContent = message.content;
    container.appendChild(content);
    const metadata = pageDocument.createElement("div");
    metadata.className = "mt-1 ml-1 text-xs text-muted-foreground";
    metadata.textContent = time;
    container.appendChild(metadata);
    wrapper.appendChild(container);
    return wrapper;
  }

  function renderStatusMessage(
    message: string,
    tone: "muted" | "error" = "muted",
    role: "status" | "alert" = "status",
  ): void {
    elements.messageList.replaceChildren();
    const status = pageDocument.createElement("div");
    status.setAttribute("role", role);
    status.className = [
      "mx-auto flex min-h-full max-w-2xl items-center justify-center px-6 py-16 text-center text-sm leading-6",
      tone === "error" ? "text-destructive" : "text-muted-foreground",
    ].join(" ");
    status.textContent = message;
    elements.messageList.appendChild(status);
    updateHistoryControls();
  }

  function renderMessages(): void {
    if (history.messages.length === 0) {
      renderStatusMessage(config.copy.noMessagesPrompt);
      return;
    }

    const list = pageDocument.createElement("div");
    list.className = "mx-auto flex max-w-2xl flex-col gap-5";
    const groups = new Map<string, Message[]>();
    for (const message of history.messages) {
      const date = message.createdAt ? new Date(message.createdAt).toDateString() : "";
      const group = groups.get(date) ?? [];
      group.push(message);
      groups.set(date, group);
    }

    for (const [date, messages] of groups) {
      const group = pageDocument.createElement("div");
      group.className = "flex flex-col gap-3";
      const dateContainer = pageDocument.createElement("div");
      dateContainer.className = "flex items-center justify-center";
      const dateLabel = pageDocument.createElement("span");
      dateLabel.className = "rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground";
      dateLabel.textContent = formatDate(date);
      dateContainer.appendChild(dateLabel);
      group.appendChild(dateContainer);
      for (const message of messages) group.appendChild(renderMessageElement(message));
      list.appendChild(group);
    }

    elements.messageList.replaceChildren();
    elements.messageList.appendChild(list);
    updateHistoryControls();
  }

  function getMessagesSignature(messages: Message[]): string {
    return messages
      .map((message) => `${message.id}:${message.readAt ? "1" : "0"}:${message.createdAt}`)
      .join("|");
  }

  function isNearBottom(): boolean {
    return elements.chatContainer.scrollHeight
      - elements.chatContainer.scrollTop
      - elements.chatContainer.clientHeight < 96;
  }

  function scrollToBottom(smooth: boolean): void {
    if (typeof elements.chatContainer.scrollTo === "function") {
      elements.chatContainer.scrollTo({
        top: elements.chatContainer.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
      return;
    }
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
  }

  function redirectToLogin(): void {
    const pageWindow = pageDocument.defaultView;
    if (pageWindow) pageWindow.location.href = "/login?redirect=/messages";
  }

  function getErrorMessage(payload: MessageHistoryResponse, fallback: string): string {
    if (typeof payload.error === "string") return payload.error;
    if (
      payload.error
      && typeof payload.error === "object"
      && "message" in payload.error
      && typeof payload.error.message === "string"
    ) {
      return payload.error.message;
    }
    if (typeof payload.message === "string") return payload.message;
    return fallback;
  }

  function denyAccess(): void {
    accessDenied = true;
    stopPolling();
    history = { messages: [], nextCursor: null };
    setComposerDisabled(true);
    renderStatusMessage(config.copy.forbidden, "error", "alert");
  }

  async function loadLatest({ forceScroll = false }: { forceScroll?: boolean } = {}): Promise<void> {
    if (isLoadingLatest || isLoadingEarlier || accessDenied) return;
    isLoadingLatest = true;
    const isInitial = !hasLoadedInitialPage;
    const shouldStayAtBottom = forceScroll || isNearBottom();
    updateHistoryControls();

    try {
      const response = await fetch(buildMessageHistoryPath(
        config.apiBase,
        config.conversationId,
      ), { credentials: "include" });
      const payload = await response.json().catch(() => ({})) as MessageHistoryResponse;
      if (response.status === 401) {
        redirectToLogin();
        return;
      }
      if (response.status === 403) {
        denyAccess();
        return;
      }
      if (!response.ok || !payload.success) {
        if (lastRenderedSignature === null) {
          renderStatusMessage(getErrorMessage(payload, config.copy.loadFailed), "error", "alert");
        } else {
          showChatError(getErrorMessage(payload, config.copy.loadFailed));
        }
        return;
      }

      const existingMessageIds = new Set(history.messages.map((message) => message.id));
      const latestMessages = Array.isArray(payload.data) ? [...payload.data] : [];
      let overlapsLocalHistory = latestMessages.some((message) =>
        existingMessageIds.has(message.id));
      let bridgeCursor = payload.nextCursor ?? null;
      const seenBridgeCursors = new Set<string>();

      // A burst can span multiple API pages between polls. Follow the latest
      // page backwards until it joins the already-loaded timeline; otherwise
      // directly merging both ends would leave the middle permanently missing.
      while (!isInitial && !overlapsLocalHistory && bridgeCursor) {
        if (seenBridgeCursors.has(bridgeCursor)) {
          throw new Error("Message pagination returned a repeated cursor");
        }
        seenBridgeCursors.add(bridgeCursor);

        const bridgeResponse = await fetch(buildMessageHistoryPath(
          config.apiBase,
          config.conversationId,
          bridgeCursor,
        ), { credentials: "include" });
        const bridgePayload = await bridgeResponse.json().catch(() => ({})) as
          MessageHistoryResponse;
        if (bridgeResponse.status === 401) {
          redirectToLogin();
          return;
        }
        if (bridgeResponse.status === 403) {
          denyAccess();
          return;
        }
        if (!bridgeResponse.ok || !bridgePayload.success) {
          showChatError(getErrorMessage(bridgePayload, config.copy.loadFailed));
          return;
        }

        const bridgeMessages = Array.isArray(bridgePayload.data) ? bridgePayload.data : [];
        latestMessages.push(...bridgeMessages);
        overlapsLocalHistory = bridgeMessages.some((message) =>
          existingMessageIds.has(message.id));
        bridgeCursor = bridgePayload.nextCursor ?? null;
      }

      clearChatError();
      history = applyMessagePage(
        history,
        {
          messages: latestMessages,
          nextCursor: payload.nextCursor ?? null,
        },
        isInitial ? "initial" : "latest",
      );
      hasLoadedInitialPage = true;

      if (payload.conversation?.otherUser) {
        otherUser = payload.conversation.otherUser;
        updateHeader();
      } else if (!otherUser && history.messages.length > 0) {
        const firstMessage = history.messages[0];
        otherUser = firstMessage.senderId === currentUserId
          ? history.messages.find((message) => message.senderId !== currentUserId)?.sender ?? null
          : firstMessage.sender ?? null;
        updateHeader();
      }

      const nextSignature = getMessagesSignature(history.messages);
      if (nextSignature !== lastRenderedSignature) {
        renderMessages();
        lastRenderedSignature = nextSignature;
        if (shouldStayAtBottom) scrollToBottom(!forceScroll);
      }

      void fetch(`${config.apiBase}/messages/${encodeURIComponent(config.conversationId)}/read`, {
        method: "PATCH",
        credentials: "include",
      }).catch(() => undefined);
    } catch {
      if (lastRenderedSignature === null) {
        renderStatusMessage(config.copy.loadFailed, "error", "alert");
      } else {
        showChatError(config.copy.loadFailed);
      }
    } finally {
      isLoadingLatest = false;
      updateHistoryControls();
    }
  }

  async function loadEarlier(): Promise<void> {
    const cursor = history.nextCursor;
    if (!cursor || isLoadingLatest || isLoadingEarlier || accessDenied) return;
    const previousScrollTop = elements.chatContainer.scrollTop;
    const previousScrollHeight = elements.chatContainer.scrollHeight;
    isLoadingEarlier = true;
    clearHistoryError();
    updateHistoryControls();

    try {
      const response = await fetch(buildMessageHistoryPath(
        config.apiBase,
        config.conversationId,
        cursor,
      ), { credentials: "include" });
      const payload = await response.json().catch(() => ({})) as MessageHistoryResponse;
      if (response.status === 401) {
        redirectToLogin();
        return;
      }
      if (response.status === 403) {
        denyAccess();
        return;
      }
      if (!response.ok || !payload.success) {
        showHistoryError(config.copy.loadEarlierFailed);
        return;
      }

      history = applyMessagePage(history, {
        messages: Array.isArray(payload.data) ? payload.data : [],
        nextCursor: payload.nextCursor ?? null,
      }, "older");
      renderMessages();
      lastRenderedSignature = getMessagesSignature(history.messages);
      elements.chatContainer.scrollTop = getPrependScrollTop({
        previousScrollTop,
        previousScrollHeight,
        nextScrollHeight: elements.chatContainer.scrollHeight,
      });
    } catch {
      showHistoryError(config.copy.loadEarlierFailed);
    } finally {
      isLoadingEarlier = false;
      updateHistoryControls();
    }
  }

  async function sendMessage(): Promise<void> {
    if (composerLocked || isSending) return;
    const content = elements.messageInput.value.trim();
    if (!content) return;

    setSending(true);
    clearChatError();
    try {
      const response = await fetch(
        `${config.apiBase}/messages/${encodeURIComponent(config.conversationId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content }),
        },
      );
      const payload = await response.json().catch(() => ({})) as MessageHistoryResponse;
      if (response.status === 401) {
        redirectToLogin();
        return;
      }
      if (response.status === 403) {
        denyAccess();
        return;
      }
      const sentMessage = Array.isArray(payload.data) ? null : payload.data;
      if (!response.ok || !payload.success || !sentMessage || typeof sentMessage !== "object") {
        showChatError(getErrorMessage(payload, config.copy.sendFailed));
        return;
      }

      elements.messageInput.value = "";
      history = applyMessagePage(history, {
        messages: [sentMessage as Message],
        nextCursor: null,
      }, "latest");
      renderMessages();
      lastRenderedSignature = getMessagesSignature(history.messages);
      scrollToBottom(true);
    } catch {
      showChatError(config.copy.sendFailed);
    } finally {
      setSending(false);
    }
  }

  const onLoadEarlier = (): void => {
    void loadEarlier();
  };
  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    void sendMessage();
  };
  const onInput = (): void => {
    clearChatError();
    updateSendButton();
  };
  const stopPolling = (): void => {
    if (pollTimer === null) return;
    pageDocument.defaultView?.clearInterval(pollTimer);
    pollTimer = null;
  };
  const startPolling = (): void => {
    if (pollTimer !== null || accessDenied) return;
    const pollIntervalMs = options.pollIntervalMs ?? 5000;
    if (pollIntervalMs <= 0) return;
    pollTimer = pageDocument.defaultView?.setInterval(() => {
      void loadLatest();
    }, pollIntervalMs) ?? null;
  };
  const onVisibilityChange = (): void => {
    if (pageDocument.hidden) {
      stopPolling();
      return;
    }
    void loadLatest();
    startPolling();
  };
  const onBeforeUnload = (): void => stopPolling();

  updateSendButton();

  try {
    const sessionResponse = await fetch(`${config.apiBase}/auth/get-session`, {
      credentials: "include",
    });
    const session = await sessionResponse.json().catch(() => ({})) as {
      user?: { id?: string } | null;
    };
    if (!session.user?.id) {
      redirectToLogin();
      return null;
    }
    currentUserId = session.user.id;
  } catch {
    redirectToLogin();
    return null;
  }

  elements.loadEarlierButton.addEventListener("click", onLoadEarlier);
  elements.messageForm.addEventListener("submit", onSubmit);
  elements.messageInput.addEventListener("input", onInput);
  pageDocument.addEventListener("visibilitychange", onVisibilityChange);
  pageDocument.defaultView?.addEventListener("beforeunload", onBeforeUnload);

  await loadLatest({ forceScroll: true });
  startPolling();

  const controller: MessageChatPageController = {
    refreshLatest: () => loadLatest(),
    loadEarlier,
    dispose: () => {
      stopPolling();
      elements.loadEarlierButton.removeEventListener("click", onLoadEarlier);
      elements.messageForm.removeEventListener("submit", onSubmit);
      elements.messageInput.removeEventListener("input", onInput);
      pageDocument.removeEventListener("visibilitychange", onVisibilityChange);
      pageDocument.defaultView?.removeEventListener("beforeunload", onBeforeUnload);
    },
  };
  return controller;
}

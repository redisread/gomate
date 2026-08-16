import { useState, useEffect, useCallback } from "react";
import type { Conversation, Message } from "@gomate/types";
import { getApiErrorMessage } from "@/lib/api";

const API_BASE = "/api";

// ============ Types ============

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  sendMessage: (content: string) => Promise<void>;
  loadMore: () => void;
}

interface UseUnreadCountReturn {
  count: number;
  refetch: () => void;
}

export async function fetchAllConversations(): Promise<Conversation[]> {
  const conversations: Conversation[] = [];
  const seenIds = new Set<string>();
  const seenCursors = new Set<string>();
  let cursor: string | null = null;

  do {
    const query = new URLSearchParams({ limit: "50" });
    if (cursor) query.set("cursor", cursor);
    const response = await fetch(`${API_BASE}/messages?${query}`, {
      credentials: "include",
    });
    const payload = await response.json() as {
      success?: boolean;
      data?: Conversation[];
      nextCursor?: string | null;
      error?: unknown;
    };
    if (!response.ok || !payload.success) {
      throw new Error(getApiErrorMessage(payload, "Failed to load conversations"));
    }
    for (const conversation of payload.data ?? []) {
      if (!seenIds.has(conversation.id)) {
        seenIds.add(conversation.id);
        conversations.push(conversation);
      }
    }
    cursor = payload.nextCursor ?? null;
    if (cursor) {
      if (seenCursors.has(cursor)) {
        throw new Error("Conversation pagination returned a repeated cursor");
      }
      seenCursors.add(cursor);
    }
  } while (cursor);

  return conversations;
}

// ============ Hooks ============

/**
 * 获取会话列表
 */
export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setConversations(await fetchAllConversations());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
  };
}

/**
 * 获取消息列表
 */
export function useMessages(conversationId: string | undefined): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Initial load
  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_BASE}/messages/${conversationId}?limit=20`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (data.success) {
          setMessages(data.data || []);
          setHasMore(!!data.nextCursor);
          setCursor(data.nextCursor);
        } else {
          setError(data.error || "Failed to load messages");
        }
      } catch {
        setError("Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId]);

  // Polling for new messages (5s interval in chat page)
  useEffect(() => {
    if (!conversationId) return;

    const poll = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/messages/${conversationId}?limit=20`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (data.success) {
          // Merge new messages
          const newMessages = data.data || [];
          const existingIds = new Set(messages.map((m) => m.id));
          const merged = [...newMessages.filter((m: Message) => !existingIds.has(m.id)), ...messages];
          // Sort by createdAt
          merged.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
          setMessages(merged);
        }
      } catch {
        // Silent fail for polling
      }
    };

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [conversationId, messages]);

  const sendMessage = async (content: string) => {
    if (!conversationId) return;

    const res = await fetch(`${API_BASE}/messages/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (data.success) {
      setMessages((prev) => [...prev, data.data as Message]);
    } else {
      throw new Error(getApiErrorMessage(data, "Failed to send message"));
    }
  };

  const loadMore = async () => {
    if (!conversationId || !cursor) return;

    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/messages/${conversationId}?cursor=${cursor}&limit=20`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...data.data, ...prev]);
        setHasMore(!!data.nextCursor);
        setCursor(data.nextCursor);
      }
    } catch {
      setError("Failed to load more messages");
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    loadMore,
  };
}

/**
 * 获取未读消息数
 */
export function useUnreadCount(enabled = true): UseUnreadCountReturn {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!enabled) {
      setCount(0);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/messages/unread-count`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setCount(data.data?.count || 0);
      }
    } catch {
      // Silent fail
    }
  }, [enabled]);

  // Initial load
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Polling (30s interval)
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [enabled, fetchCount]);

  return { count, refetch: fetchCount };
}

/**
 * 创建会话
 */
export async function createConversation(teamId: string, memberUserId?: string): Promise<{
  id: string;
  isNew: boolean;
}> {
  const res = await fetch(`${API_BASE}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ teamId, ...(memberUserId ? { memberUserId } : {}) }),
  });
  const data = await res.json();
  if (data.success) {
    return data.data;
  }
  throw new Error(getApiErrorMessage(data, "Failed to create conversation"));
}

import { useState, useEffect, useCallback, useRef } from "react";
import type { Conversation, Message } from "@gomate/types";

const API_BASE = import.meta.env.PUBLIC_API_URL || "http://localhost:8799";

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
      const res = await fetch(`${API_BASE}/messages`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setConversations(data.data || []);
      } else {
        setError(data.error || "Failed to load conversations");
      }
    } catch (err) {
      setError("Failed to load conversations");
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
  const lastMessageIdRef = useRef<string | null>(null);

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
          // Track last message for polling
          const lastMsg = data.data?.[data.data.length - 1];
          if (lastMsg) {
            lastMessageIdRef.current = lastMsg.id;
          }
        } else {
          setError(data.error || "Failed to load messages");
        }
      } catch (err) {
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
          const merged = [...newMessages.filter((m) => !existingIds.has(m.id)), ...messages];
          // Sort by createdAt
          merged.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          setMessages(merged);
        }
      } catch (err) {
        // Silent fail for polling
      }
    };

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [conversationId, messages]);

  const sendMessage = async (content: string) => {
    if (!conversationId) return;

    try {
      const res = await fetch(`${API_BASE}/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.success) {
        // Optimistically add message
        const newMessage: Message = {
          id: data.data.id,
          conversationId,
          senderId: "current_user", // Will be replaced on next poll
          content,
          isRead: false,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, newMessage]);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      throw err;
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
    } catch (err) {
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
export function useUnreadCount(): UseUnreadCountReturn {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/messages/unread-count`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setCount(data.data?.count || 0);
      }
    } catch (err) {
      // Silent fail
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Polling (30s interval)
  useEffect(() => {
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return { count, refetch: fetchCount };
}

/**
 * 创建会话
 */
export async function createConversation(teamId: string): Promise<{
  id: string;
  isNew: boolean;
}> {
  const res = await fetch(`${API_BASE}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ teamId }),
  });
  const data = await res.json();
  if (data.success) {
    return data.data;
  }
  throw new Error(data.error || "Failed to create conversation");
}

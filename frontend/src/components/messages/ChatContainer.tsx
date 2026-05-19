import { useState, useRef, useEffect } from "react";
import type { Message } from "@gomate/types";

interface ChatContainerProps {
  messages: Message[];
  currentUserId: string;
  onSend: (content: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
}

export function ChatContainer({
  messages,
  currentUserId,
  onSend,
  onLoadMore,
  hasMore,
  loading,
}: ChatContainerProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSend(inputValue.trim());
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ scrollBehavior: "smooth" }}
      >
        {/* Load more */}
        {hasMore && (
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {loading ? "加载中..." : "加载更多"}
          </button>
        )}

        {/* Messages by date */}
        {groupedMessages.map((group) => (
          <div key={group.date} className="space-y-4">
            {/* Date separator */}
            <div className="flex items-center justify-center">
              <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                {formatDate(group.date)}
              </span>
            </div>

            {/* Messages */}
            {group.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === currentUserId}
              />
            ))}
          </div>
        ))}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const sender = message.sender;
  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[70%] ${isOwn ? "flex-row-reverse" : "flex-row"} gap-2`}>
        {/* Avatar (only for others) */}
        {!isOwn && (
          <div className="flex-shrink-0">
            {sender?.image ? (
              <img
                src={sender.image}
                alt={sender.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {sender?.name?.[0] || "?"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bubble */}
        <div className="flex flex-col">
          {/* Sender name (only for others) */}
          {!isOwn && sender?.name && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
              {sender.nickname || sender.name}
            </span>
          )}

          {/* Content */}
          <div
            className={`
              px-4 py-2 rounded-2xl text-sm
              ${
                isOwn
                  ? "bg-blue-500 text-white rounded-br-lg"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-lg"
              }
            `}
          >
            {message.content}
          </div>

          {/* Time & Read status */}
          <div className={`flex items-center gap-1 mt-1 text-xs text-gray-400 ${isOwn ? "justify-end" : "justify-start"}`}>
            <span>{time}</span>
            {isOwn && message.isRead && <span>· 已读</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];

  messages.forEach((message) => {
    const date = message.createdAt
      ? new Date(message.createdAt).toDateString()
      : "";
    const existingGroup = groups.find((g) => g.date === date);

    if (existingGroup) {
      existingGroup.messages.push(message);
    } else {
      groups.push({ date, messages: [message] });
    }
  });

  return groups;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "今天";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "昨天";
  } else {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

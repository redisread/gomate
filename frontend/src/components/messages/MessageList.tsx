import type { Conversation } from "@gomate/types";
import { useState, useEffect } from "react";

interface MessageListProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  selectedId?: string;
}

export function MessageList({ conversations, onSelect, selectedId }: MessageListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 mb-4 text-gray-300">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          暂无消息
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          加入队伍后可以私信队长
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {conversations.map((conversation) => (
        <MessageCard
          key={conversation.id}
          conversation={conversation}
          onClick={() => onSelect(conversation.id)}
          isSelected={selectedId === conversation.id}
        />
      ))}
    </div>
  );
}

interface MessageCardProps {
  conversation: Conversation;
  onClick: () => void;
  isSelected: boolean;
}

function MessageCard({ conversation, onClick, isSelected }: MessageCardProps) {
  const unreadCount = conversation.unreadCount || 0;
  const otherUser = conversation.otherUser;
  const lastMessage = conversation.lastMessageContent;
  const lastMessageTime = conversation.lastMessageAt
    ? formatTime(conversation.lastMessageAt)
    : "";

  return (
    <div
      onClick={onClick}
      className={`
        flex items-start gap-3 p-4 cursor-pointer transition-colors
        ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}
      `}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {otherUser?.image ? (
          <img
            src={otherUser.image}
            alt={otherUser.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-lg text-gray-500 dark:text-gray-400">
              {otherUser?.name?.[0] || "?"}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {otherUser?.nickname || otherUser?.name || "未知用户"}
          </h4>
          {lastMessageTime && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {lastMessageTime}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {lastMessage || "暂无消息"}
        </p>
      </div>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <div className="flex-shrink-0">
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        </div>
      )}
    </div>
  );
}

function formatTime(timestamp: number | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday =
    date.toDateString() === new Date(now.setDate(now.getDate() - 1)).toDateString();

  if (isToday) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  } else if (isYesterday) {
    return "昨天";
  } else {
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  }
}

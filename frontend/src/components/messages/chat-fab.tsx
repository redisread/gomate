"use client";

import * as React from "react";
import { MessageCircle, X } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface ChatFABProps {
  /** 未读消息数 */
  unreadCount?: number;
  /** 点击打开聊天 */
  onOpen: () => void;
}

/**
 * 聊天悬浮按钮（FAB）
 * 右下角固定位置，显示未读数
 */
export function ChatFAB({ unreadCount = 0, onOpen }: ChatFABProps) {
  const { t } = useI18n(["messages", "common"]);

  return (
    <button
      onClick={onOpen}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 flex items-center justify-center group"
      aria-label={t("messages.openChat") || "打开聊天"}
    >
      <MessageCircle className="w-6 h-6" />

      {/* 未读消息数 */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}

interface ChatPanelProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭面板 */
  onClose: () => void;
  /** 子组件（ChatContainer） */
  children: React.ReactNode;
}

/**
 * 聊天面板
 * 移动端全屏，桌面端右侧抽屉
 */
export function ChatPanel({ open, onClose, children }: ChatPanelProps) {
  const { t } = useI18n(["messages", "common"]);

  if (!open) return null;

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 bg-black/40 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* 面板 */}
      <div
        className="fixed bottom-0 right-0 z-50 w-full sm:w-[400px] h-[80vh] sm:h-[600px] bg-background rounded-t-2xl sm:rounded-tl-2xl sm:rounded-tr-none shadow-2xl"
        style={{
          animation: "slideUp 0.2s ease-out",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {t("messages.chatTitle") || "聊天"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            aria-label={t("common.close") || "关闭"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-hidden" style={{ height: "calc(100% - 64px)" }}>
          {children}
        </div>
      </div>

      {/* 动画 */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

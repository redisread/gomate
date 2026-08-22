import * as React from "react";
import { createPortal } from "react-dom";
import { useModalA11y } from "@/hooks/useModalA11y";
import { cn } from "@/lib/utils";

/**
 * 共享 Modal 壳（F2 完整化）
 *
 * - createPortal 到 <body>：modal 脱离组件树，背景内容可被 inert
 * - 背景 inert：打开时把 <body> 下非本 portal 的直接子树设 inert，
 *   阻止 screen-reader 读取背景 + 阻止背景交互（WCAG 4.1.2 / 2.4.3）
 * - focus trap / Escape / restore：复用 useModalA11y（已验证模式）
 * - backdrop click 关闭 + 可选 body scroll lock
 *
 * 用法：传 overlayClassName 控制布局（居中 / bottom sheet / 全屏），
 * panelClassName 控制面板外观，children 是面板内容。
 */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** aria-labelledby：指向面板内标题元素 id（必须唯一） */
  labelledBy?: string;
  describedBy?: string;
  role?: "dialog" | "alertdialog";
  /** 整个 overlay 容器的布局 class（如 "flex items-center justify-center p-4"） */
  overlayClassName?: string;
  /** backdrop（半透明遮罩）样式，默认 "bg-black/40 backdrop-blur-sm" */
  backdropClassName?: string;
  /** 面板 class */
  panelClassName?: string;
  /** 面板 inline style（env safe-area 等无法用 class 表达的值） */
  panelStyle?: React.CSSProperties;
  /** 打开时锁定 body 滚动（bottom sheet / 全屏场景） */
  lockBodyScroll?: boolean;
  children: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  labelledBy,
  describedBy,
  role = "dialog",
  overlayClassName,
  backdropClassName,
  panelClassName,
  panelStyle,
  lockBodyScroll = false,
  children,
  ...rest
}: ModalProps & React.HTMLAttributes<HTMLDivElement>) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const portalRef = React.useRef<HTMLDivElement | null>(null);
  useModalA11y(open, panelRef, onClose);

  // 背景 inert：打开时把 <body> 下非本 portal 的直接子树标记 inert
  React.useEffect(() => {
    if (!open) return;
    const inerted: HTMLElement[] = [];
    const root = portalRef.current;
    for (const el of Array.from(document.body.children)) {
      if (el === root || el.hasAttribute("data-gomate-modal-portal")) continue;
      if (el instanceof HTMLElement && !el.hasAttribute("inert")) {
        el.setAttribute("inert", "");
        inerted.push(el);
      }
    }
    return () => {
      for (const el of inerted) el.removeAttribute("inert");
    };
  }, [open]);

  // body scroll lock（bottom sheet / 全屏 modal 需要）
  React.useEffect(() => {
    if (!open || !lockBodyScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, lockBodyScroll]);

  if (!open) return null;

  return createPortal(
    <div
      ref={(el) => {
        portalRef.current = el;
      }}
      data-gomate-modal-portal=""
      className={cn("fixed inset-0 z-50", overlayClassName)}
      {...rest}
    >
      <div className={cn("absolute inset-0", backdropClassName ?? "bg-black/40 backdrop-blur-sm")} aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={cn("relative", panelClassName)}
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

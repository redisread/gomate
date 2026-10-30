import * as React from "react";
import { createPortal } from "react-dom";
import DialogPrimitive from "@starwind-ui/react/dialog";
import { cn } from "@/lib/utils";
import { animate } from "motion/mini";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

// A menu can still be exiting when the next dialog opens. Each owns a lease.
const inertOwners = new WeakMap<HTMLElement, { count: number; originallyInert: boolean }>();

/**
 * 共享 Modal 壳（F2 完整化）
 *
 * - createPortal 到 <body>：modal 脱离组件树，背景内容可被 inert
 * - 背景 inert：打开时把 <body> 下非本 portal 的直接子树设 inert，
 *   阻止 screen-reader 读取背景 + 阻止背景交互（WCAG 4.1.2 / 2.4.3）
 * - Starwind Dialog owns native modal, focus trapping, Escape and restoration.
 * - backdrop click 关闭；Starwind 统一管理 body scroll lock
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
  /** 打开后优先聚焦的弹窗内元素；省略时聚焦首个可交互元素 */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** 关闭后显式恢复焦点的元素；省略时恢复打开前的活动元素 */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  labelledBy,
  describedBy,
  role = "dialog",
  "aria-label": ariaLabel,
  overlayClassName,
  backdropClassName,
  panelClassName,
  panelStyle,
  initialFocusRef,
  returnFocusRef,
  children,
  ...rest
}: ModalProps & React.HTMLAttributes<HTMLDivElement>) {
  const [present, setPresent] = React.useState(open);
  const mounted = open || present;
  const reduced = useReducedMotion();
  const openRef = React.useRef(open);
  openRef.current = open;
  const panelRef = React.useRef<HTMLDivElement>(null);
  const portalRef = React.useRef<HTMLDivElement | null>(null);
  const previousFocus = React.useRef<HTMLElement | null>(null);
  const setPortalRef = React.useCallback((el: HTMLDivElement | null) => {
    if (el && !portalRef.current)
      previousFocus.current = document.activeElement as HTMLElement | null;
    portalRef.current = el;
  }, []);
  React.useEffect(() => { if (open) setPresent(true); }, [open]);
  React.useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    if (reduced || typeof panel.animate !== "function") {
      panel.style.removeProperty("transform");
      panel.style.removeProperty("opacity");
      return;
    }
    const animation = animate(panel, { opacity: [0.7, 1], transform: ["translateY(6px)", "translateY(0)"] }, { duration: 0.18, ease: [0.2, 0, 0, 1] });
    return () => animation.stop();
  }, [open, reduced]);
  React.useEffect(() => {
    if (!mounted) return;
    const returnTarget = returnFocusRef?.current ?? previousFocus.current;
    const requested = initialFocusRef?.current;
    if (requested && panelRef.current?.contains(requested)) requested.focus();
    return () => {
      queueMicrotask(() => {
        if (returnTarget?.isConnected) returnTarget.focus();
      });
    };
  }, [mounted, initialFocusRef, returnFocusRef]);

  // 背景 inert：打开时把 <body> 下非本 portal 的直接子树标记 inert
  React.useEffect(() => {
    if (!mounted) return;
    const inerted: HTMLElement[] = [];
    const root = portalRef.current;
    for (const el of Array.from(document.body.children)) {
      if (el === root || el.hasAttribute("data-gomate-modal-portal")) continue;
      if (el instanceof HTMLElement) {
        const ownership = inertOwners.get(el) ?? { count: 0, originallyInert: el.hasAttribute("inert") };
        ownership.count++;
        inertOwners.set(el, ownership);
        el.setAttribute("inert", "");
        inerted.push(el);
      }
    }
    return () => {
      for (const el of inerted) {
        const ownership = inertOwners.get(el);
        if (ownership && --ownership.count === 0) {
          if (!ownership.originallyInert) el.removeAttribute("inert");
          inertOwners.delete(el);
        }
      }
    };
  }, [mounted]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <DialogPrimitive.Root
      ref={setPortalRef}
      open={open}
      onCloseComplete={() => { if (!openRef.current) setPresent(false); }}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      closeOnOutsideInteract={false}
      data-gomate-modal-portal=""
      {...rest}
    >
      <DialogPrimitive.Popup
        inert={!open}
        aria-hidden={!open || undefined}
        role={role}
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={cn(
          "gomate-modal fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-inherit outline-none backdrop:bg-transparent",
          overlayClassName,
        )}
      >
        <div
          className={cn(
            "absolute inset-0",
            backdropClassName ?? "bg-black/40 backdrop-blur-sm",
          )}
          aria-hidden="true"
          onClick={onClose}
        />
        <div
          ref={panelRef}
          data-gomate-modal-panel=""
          className={cn("relative", panelClassName)}
          style={panelStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Root>,
    document.body,
  );
}

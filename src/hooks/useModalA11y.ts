import * as React from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * 弹窗可访问性 hook（对齐 daily-book modal-a11y 已验证模式，spec §4.1）：
 * - 打开时焦点移入弹窗第一个可交互元素（最多 5×50ms 重试，避开渲染/过渡时序坑）
 * - Tab / Shift+Tab 在弹窗内循环 trap（含焦点落出弹窗的兜底拦回）
 * - Esc 关闭
 * - 关闭后焦点还原到触发元素
 */
export function useModalA11y(
  open: boolean,
  panelRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  initialFocusRef?: React.RefObject<HTMLElement | null>,
) {
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const requestedTarget = initialFocusRef?.current;
    const target =
      requestedTarget && panel.contains(requestedTarget)
        ? requestedTarget
        : panel.querySelector<HTMLElement>(FOCUSABLE);
    let attempts = 0;
    let cancelled = false;
    const tryFocus = () => {
      if (cancelled) return;
      target?.focus();
      if (document.activeElement !== target && attempts++ < 5) {
        setTimeout(tryFocus, 50);
      }
    };
    tryFocus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      // 兜底：焦点落在弹窗外时先拦回弹窗内首位
      if (!panel.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKeyDown);
      const prev = previousFocusRef.current;
      if (prev && document.contains(prev)) prev.focus();
      previousFocusRef.current = null;
    };
  }, [open, panelRef, onClose, initialFocusRef]);
}

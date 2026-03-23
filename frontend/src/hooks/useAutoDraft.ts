import { useState, useEffect, useRef, useCallback } from "react";

/** 草稿存储结构 */
interface DraftEntry<T> {
  data: T;
  savedAt: number; // Unix timestamp (ms)
}

/** 草稿有效期：7 天 */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 自动草稿保存 Hook
 *
 * - 防抖 delay ms（默认 2000）后将 data 序列化到 localStorage
 * - 草稿超过 7 天自动清除
 * - 提供 restoreDraft / clearDraft 供外部调用
 */
export function useAutoDraft<T>(
  key: string,
  data: T,
  delay: number = 2000
): {
  lastSaved: Date | null;
  restoreDraft: () => T | null;
  clearDraft: () => void;
} {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 使用 ref 追踪是否为首次挂载，避免初始化时触发保存
  const isFirstRender = useRef(true);

  /** 从 localStorage 读取草稿，过期则清除并返回 null */
  const restoreDraft = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const entry: DraftEntry<T> = JSON.parse(raw);
      const isExpired = Date.now() - entry.savedAt > DRAFT_TTL_MS;

      if (isExpired) {
        localStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch {
      // JSON 解析失败时清除损坏数据
      localStorage.removeItem(key);
      return null;
    }
  }, [key]);

  /** 清除草稿并重置 lastSaved */
  const clearDraft = useCallback((): void => {
    localStorage.removeItem(key);
    setLastSaved(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [key]);

  /** 将数据写入 localStorage */
  const saveDraft = useCallback(
    (value: T): void => {
      try {
        const entry: DraftEntry<T> = {
          data: value,
          savedAt: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(entry));
        setLastSaved(new Date());
      } catch {
        // localStorage 写入失败（如隐私模式容量已满）时静默忽略
      }
    },
    [key]
  );

  // data 变化时触发防抖保存，跳过初次渲染
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;

      // 初始化时检查并清除过期草稿
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const entry: DraftEntry<T> = JSON.parse(raw);
          if (Date.now() - entry.savedAt > DRAFT_TTL_MS) {
            localStorage.removeItem(key);
          } else {
            setLastSaved(new Date(entry.savedAt));
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      saveDraft(data);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, delay, key, saveDraft]);

  return { lastSaved, restoreDraft, clearDraft };
}

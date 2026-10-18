"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { uploadLocationImage } from "@/lib/location-image-upload";

interface UploadItem {
  key: string;
  progress: number | null;
  error?: string;
}

interface UploadQueueOptions {
  values: string[];
  onChange: (values: string[]) => void;
  max: number;
  disabled: boolean;
  errorMessage: (error: unknown) => string;
}

/** Owns in-flight reservations and serializes completions into the latest form value. */
export function useImageUploadQueue(options: UploadQueueOptions) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const current = useRef(options);
  const values = useRef(options.values);
  const pending = useRef(new Set<string>());
  const sequence = useRef(0);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    current.current = options;
  });
  useLayoutEffect(() => {
    values.current = options.values;
  }, [options.values]);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function commit(next: string[]) {
    // Advance synchronously: several XHR callbacks may complete before React renders.
    values.current = next;
    current.current.onChange(next);
  }

  function uploadFiles(files: FileList | null) {
    if (!files || current.current.disabled) return;
    const remaining = Math.max(
      0,
      current.current.max - values.current.length - pending.current.size,
    );
    for (const file of Array.from(files).slice(0, remaining)) {
      const key = `upload-${++sequence.current}`;
      pending.current.add(key);
      setItems((previous) => [...previous, { key, progress: 0 }]);
      void uploadLocationImage(file, (progress) => {
        if (mounted.current)
          setItems((previous) =>
            previous.map((item) =>
              item.key === key ? { ...item, progress } : item,
            ),
          );
      })
        .then((url) => {
          pending.current.delete(key);
          if (!mounted.current) return;
          setItems((previous) => previous.filter((item) => item.key !== key));
          commit([...values.current, url]);
        })
        .catch((error: unknown) => {
          pending.current.delete(key);
          if (!mounted.current) return;
          setItems((previous) =>
            previous.map((item) =>
              item.key === key
                ? {
                    ...item,
                    progress: null,
                    error: current.current.errorMessage(error),
                  }
                : item,
            ),
          );
        });
    }
  }

  const totalCount =
    options.values.length +
    items.filter((item) => item.progress !== null).length;
  return {
    items,
    totalCount,
    canAddMore: totalCount < options.max && !options.disabled,
    uploadFiles,
    removeImage(index: number) {
      commit(values.current.filter((_, position) => position !== index));
    },
    clearError(key: string) {
      setItems((previous) => previous.filter((item) => item.key !== key));
    },
  };
}

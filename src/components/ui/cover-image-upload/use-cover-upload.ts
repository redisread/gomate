import { useLayoutEffect, useRef, useState } from "react";
import { uploadLocationImage } from "@/lib/location-image-upload";

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; progress: number }
  | { phase: "success"; fileName: string; fileSize: string }
  | { phase: "error"; message: string };

interface CoverUploadOptions {
  value: string;
  disabled: boolean;
  onChange: (url: string) => void;
  errorMessage: (error: unknown) => string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${["B", "KB", "MB", "GB"][i]}`;
}

/** All input paths share one reservation; a detached form cannot publish a result. */
export function useCoverUpload(options: CoverUploadOptions) {
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const current = useRef(options);
  const busy = useRef(false);
  const mounted = useRef(false);
  const valueRevision = useRef(0);
  useLayoutEffect(() => {
    valueRevision.current += 1;
  }, [options.value]);
  useLayoutEffect(() => {
    current.current = options;
  });
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function uploadFile(file: File) {
    if (!mounted.current || current.current.disabled || busy.current) return;
    busy.current = true;
    const revision = valueRevision.current;
    setState({ phase: "uploading", progress: 0 });
    try {
      const url = await uploadLocationImage(file, (progress) => {
        if (mounted.current && revision === valueRevision.current)
          setState({ phase: "uploading", progress });
      });
      if (!mounted.current) return;
      if (revision !== valueRevision.current) {
        setState({ phase: "idle" });
        return;
      }
      current.current.onChange(url);
      setState({
        phase: "success",
        fileName: file.name,
        fileSize: formatBytes(file.size),
      });
    } catch (error) {
      if (mounted.current)
        setState(
          revision !== valueRevision.current
            ? { phase: "idle" }
            : {
                phase: "error",
                message: current.current.errorMessage(error),
              },
        );
    } finally {
      busy.current = false;
    }
  }

  return {
    state,
    uploadFile,
    reset: () => setState({ phase: "idle" }),
  };
}

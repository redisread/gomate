import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationCoverImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Only the first visible covers should compete for high network priority. */
  priority?: boolean;
}

/** Native lazy loading works before hydration; the surrounding card reserves space. */
export function LocationCoverImage({ src, alt, className, priority = false }: LocationCoverImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <div className="relative h-full w-full overflow-hidden bg-muted">
      {failedSrc === src ? (
        <span role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={!alt}
          className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <ImageOff className="size-6" aria-hidden="true" />
        </span>
      ) : (
        <img src={src} alt={alt} loading={priority ? "eager" : "lazy"}
          decoding="async" fetchPriority={priority ? "high" : "auto"}
          onError={() => setFailedSrc(src)}
          className={cn("h-full w-full object-cover", className)} />
      )}
    </div>
  );
}

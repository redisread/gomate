import { useState } from "react";
import { Compass, MapPin } from "lucide-react";

/** Keyed by location and source by the caller, so late image events stay local. */
export function MapPreviewCover({ src }: { src?: string | null }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const Icon = src ? MapPin : Compass;

  return (
    <div
      aria-hidden="true"
      className="map-preview-cover relative flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary/15 bg-primary/5 text-primary sm:w-24"
    >
      <Icon className="h-6 w-6" strokeWidth={2} />
      {src && !failed && (
        <img
          src={src}
          alt=""
          width={192}
          height={128}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 motion-reduce:transition-none ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}

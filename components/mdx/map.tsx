import { cn } from '@/lib/utils';

interface MapEmbedProps {
  src: string;
  title?: string;
  className?: string;
  height?: number;
}

export function MapEmbed({
  src,
  title = 'Map',
  className,
  height = 400,
}: MapEmbedProps) {
  // Support both Google Maps embed URLs and Amap URLs
  const isGoogleMaps = src.includes('google.com/maps/embed');
  const isAmap = src.includes('amap.com') || src.includes('gaode.com');

  if (!isGoogleMaps && !isAmap) {
    // Assume it's a Google Maps place ID or query
    const embedUrl = `https://www.google.com/maps/embed?pb=${src}`;
    return (
      <div
        className={cn('my-6 rounded-lg overflow-hidden border bg-muted', className)}
        style={{ height }}
      >
        <iframe
          src={embedUrl}
          title={title}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    );
  }

  return (
    <div
      className={cn('my-6 rounded-lg overflow-hidden border bg-muted', className)}
      style={{ height }}
    >
      <iframe
        src={src}
        title={title}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

// Amap specific embed component
interface AmapEmbedProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  title?: string;
  className?: string;
  height?: number;
}

export function AmapEmbed({
  latitude,
  longitude,
  zoom = 12,
  title = 'Location',
  className,
  height = 400,
}: AmapEmbedProps) {
  // Note: Amap requires an API key for proper embedding
  // This is a placeholder implementation
  const amapUrl = `https://uri.amap.com/marker?position=${longitude},${latitude}&name=${encodeURIComponent(title)}&src=gomate&coordinate=gaode&callnative=0`;

  return (
    <div
      className={cn('my-6 rounded-lg overflow-hidden border bg-muted relative', className)}
      style={{ height }}
    >
      <iframe
        src={amapUrl}
        title={title}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
      />
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
        高德地图
      </div>
    </div>
  );
}

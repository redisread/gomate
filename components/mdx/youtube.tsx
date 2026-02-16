import { cn } from '@/lib/utils';

interface YouTubeProps {
  id: string;
  title?: string;
  className?: string;
}

export function YouTube({ id, title = 'YouTube video', className }: YouTubeProps) {
  return (
    <div className={cn('my-6 relative aspect-video rounded-lg overflow-hidden bg-muted', className)}>
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}

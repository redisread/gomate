import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  href?: string;
  className?: string;
}

export function Card({ children, title, href, className }: CardProps) {
  const content = (
    <>
      {title && (
        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
          {title}
          {href && <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </h3>
      )}
      <div className="text-muted-foreground text-sm leading-relaxed">
        {children}
      </div>
    </>
  );

  const cardClassName = cn(
    'group block rounded-xl border bg-card p-6 transition-all hover:border-emerald-500/50 hover:shadow-md',
    href && 'hover:-translate-y-0.5',
    className
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}

interface CardsProps {
  children: ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4;
}

export function Cards({ children, className, cols = 2 }: CardsProps) {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4 my-6', colsClass[cols], className)}>
      {children}
    </div>
  );
}

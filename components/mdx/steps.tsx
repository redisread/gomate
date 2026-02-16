import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface StepsProps {
  children: ReactNode;
  className?: string;
}

export function Steps({ children, className }: StepsProps) {
  return (
    <div className={cn('relative my-6 ml-4', className)}>
      <div className="absolute left-0 top-0 bottom-0 w-px bg-border ml-[19px]" />
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}

interface StepProps {
  children: ReactNode;
  title?: string;
  step?: number;
  className?: string;
}

export function Step({ children, title, step, className }: StepProps) {
  return (
    <div className={cn('relative pl-12', className)}>
      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-500 bg-background font-semibold text-sm text-emerald-600 dark:text-emerald-400">
        {step}
      </div>
      <div className="pt-1.5">
        {title && (
          <h4 className="font-semibold mb-2">{title}</h4>
        )}
        <div className="text-muted-foreground text-sm leading-relaxed [&>p]:m-0">
          {children}
        </div>
      </div>
    </div>
  );
}

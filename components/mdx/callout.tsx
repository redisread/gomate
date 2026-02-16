import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, CheckCircle, Info, Lightbulb } from 'lucide-react';
import type { ReactNode } from 'react';

interface CalloutProps {
  children: ReactNode;
  type?: 'info' | 'warning' | 'error' | 'success' | 'tip';
  title?: string;
  className?: string;
}

const icons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle,
  tip: Lightbulb,
};

const styles = {
  info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-100',
  warning: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-100',
  error: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-800 dark:text-red-100',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-100',
  tip: 'bg-purple-50 border-purple-200 text-purple-900 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-100',
};

const iconStyles = {
  info: 'text-blue-600 dark:text-blue-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  tip: 'text-purple-600 dark:text-purple-400',
};

export function Callout({
  children,
  type = 'info',
  title,
  className,
}: CalloutProps) {
  const Icon = icons[type];

  return (
    <div
      className={cn(
        'my-6 flex gap-3 rounded-lg border p-4',
        styles[type],
        className
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconStyles[type])} />
      <div className="flex-1">
        {title && (
          <p className="font-semibold mb-1">{title}</p>
        )}
        <div className="text-sm leading-relaxed [&>p]:m-0">
          {children}
        </div>
      </div>
    </div>
  );
}

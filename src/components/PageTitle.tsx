import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageTitleProps {
  title: string;
  icon?: LucideIcon;
  className?: string;
  actions?: React.ReactNode;
}

export function PageTitle({ title, icon: Icon, className, actions }: PageTitleProps) {
  return (
    <div className={cn("flex items-center justify-between mb-6 p-4 border-b border-border", className)}>
      <div className="flex items-center space-x-3">
        {Icon && <Icon className="h-7 w-7 text-primary" />}
        <h1 className="text-2xl font-semibold text-foreground">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center space-x-2">{actions}</div>}
    </div>
  );
}

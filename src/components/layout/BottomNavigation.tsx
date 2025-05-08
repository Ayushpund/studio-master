
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface BottomNavigationProps {
  navItems: NavItem[];
}

export function BottomNavigation({ navItems }: BottomNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card shadow-top md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center text-xs font-medium p-2 rounded-md transition-colors',
              pathname === item.href || (item.href === '/home' && pathname === '/')
                ? 'text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5 mb-0.5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

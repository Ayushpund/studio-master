
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger, 
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Home, Lightbulb, FileQuestion, UserCircle, PanelLeft, BookOpen } from 'lucide-react'; // Added BookOpen for new logo base

// Updated Acharya Logo SVG - Open Book
const AcharyaLogo = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-primary"
    aria-label="Acharya Logo"
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
  </svg>
);


const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/quiz', label: 'Quiz', icon: Lightbulb },
  { href: '/pdf-analyzer', label: 'PDF Analyzer', icon: FileQuestion },
  { href: '/profile', label: 'Profile', icon: UserCircle },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <Sidebar
          variant="sidebar"
          collapsible="icon"
          className="border-r hidden md:flex flex-col" 
        >
          <SidebarHeader className="p-3 flex justify-between items-center h-16 border-b"> 
            <Link href="/home" className="flex items-center gap-2 overflow-hidden">
              <AcharyaLogo />
              <span className="font-semibold text-lg whitespace-nowrap group-data-[collapsible=icon]:hidden">
                Acharya
              </span>
            </Link>
            <SidebarTrigger asChild className="group-data-[collapsible=icon]:hidden">
                <Button variant="ghost" size="icon" className="ml-2">
                    <PanelLeft className="h-5 w-5" />
                </Button>
            </SidebarTrigger>
          </SidebarHeader>

          <SidebarContent className="flex-grow p-2 overflow-y-auto"> 
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (item.href === '/home' && pathname === '/')}
                    tooltip={{ children: item.label, side: 'right', align: 'center' }}
                    className="justify-start" 
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        {/* Main Content Area */}
        <SidebarInset className="flex flex-col flex-1 overflow-hidden"> 
          {/* Mobile Header with SidebarTrigger */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:hidden">
            <Link href="/home" className="flex items-center gap-2">
               <AcharyaLogo />
               <span className="font-semibold text-md">Acharya</span>
            </Link>
            <SidebarTrigger asChild>
               <Button size="icon" variant="outline">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
            </SidebarTrigger>
          </header>

          <main className="flex-grow overflow-auto pb-16 md:pb-0"> 
            {children}
          </main>
          <BottomNavigation navItems={navItems} /> 
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

    

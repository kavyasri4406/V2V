'use client';

import { Car } from "lucide-react";
import { SidebarTrigger } from "./ui/sidebar";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        <div className="mr-4 hidden md:flex">
          <Car className="mr-2 h-6 w-6" />
          <h1 className="text-lg font-bold tracking-tight text-foreground font-headline">
            Vehicle to Vehicle Communication
          </h1>
        </div>
        <div className="flex items-center md:hidden">
          <SidebarTrigger />
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {/* Header content */}
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import { CarFront } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AppLogo = ({ className, isCompact = false }: { className?: string, isCompact?: boolean }) => {

  if (isCompact) {
    return (
        <div className={cn("flex flex-col items-center justify-center", className)}>
            <div className="relative p-1">
                <div className="absolute inset-0 border-t-2 border-r-2 border-accent rounded-full animate-spin-slow"></div>
                <CarFront className="h-6 w-6 text-accent" />
            </div>
            <p className="text-xs font-bold tracking-widest text-accent group-data-[collapsible=icon]:hidden">V2V</p>
        </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center justify-center pointer-events-none select-none", className)}>
        <div className="relative p-4">
            <div className="absolute inset-2 border-t-2 border-r-2 border-accent rounded-full animate-spin-slow"></div>
            <CarFront className="h-16 w-16 text-accent" />
            <div className="absolute top-5 right-5 h-1.5 w-1.5 bg-white rounded-full shadow-[0_0_10px_5px_rgba(255,255,255,0.7)]"></div>
        </div>
        <p className="text-4xl font-bold tracking-widest text-accent -mt-2">V2V</p>
    </div>
  );
};

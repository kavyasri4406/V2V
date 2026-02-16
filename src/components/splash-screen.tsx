'use client';

import { AppLogo } from '@/components/app-logo';

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
        <div className="animate-in fade-in zoom-in-75 duration-1500">
            <AppLogo />
        </div>
    </div>
  );
}

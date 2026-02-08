'use client';

import { ReactNode } from 'react';
import Image from 'next/image';

interface OnboardingLayoutProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function OnboardingLayout({ children, footer }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left pane - Content */}
      <div className="w-full lg:w-[55%] flex flex-col bg-background">
        {/* Header with logo */}
        <div className="p-8">
          <div className="flex items-center gap-2">
            <Image
              src="/beespo-logo.svg"
              alt="Beespo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-semibold tracking-tight">Beespo</span>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 max-w-2xl mx-auto w-full">
          {children}
        </div>

        {/* Footer with navigation */}
        {footer && (
          <div className="p-8 border-t">
            {footer}
          </div>
        )}
      </div>

      {/* Right pane - Decorative */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg
            className="w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern
                id="grid"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-24 h-24 mx-auto bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <svg
                className="w-12 h-12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6l4 2"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold">
              Welcome to Beespo
            </h2>
            <p className="text-lg text-white/80">
              The leadership management platform designed to help you organize meetings,
              sync on discussions, and track assignments seamlessly.
            </p>
          </div>
        </div>

        {/* Bottom accent */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/10 to-transparent" />
      </div>
    </div>
  );
}

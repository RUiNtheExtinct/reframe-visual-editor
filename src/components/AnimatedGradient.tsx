"use client";

import { cn } from "@/lib/utils";

type AnimatedGradientProps = {
  className?: string;
  showDots?: boolean;
  showGrid?: boolean;
};

export default function AnimatedGradient({
  className,
  showDots = true,
  showGrid = true,
}: AnimatedGradientProps) {
  return (
    <>
      <div aria-hidden className={cn("bg-animated-aurora", className)} />
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10 pointer-events-none bg-hero-pattern-topography hero-pattern-neutral-600 dark:hero-pattern-white hero-pattern-opacity-10 hero-pattern-size-lg",
          className
        )}
      />
      {showGrid && <div aria-hidden className={cn("bg-grid-pattern", className)} />}
      {showDots && <div aria-hidden className={cn("bg-dot-pattern", className)} />}
    </>
  );
}

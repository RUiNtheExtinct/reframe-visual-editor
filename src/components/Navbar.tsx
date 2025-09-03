"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { Wand2 } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="w-full sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 sm:px-12 h-14">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wand2 className="h-4 w-4" />
          </span>
          <span className="font-semibold tracking-tight">Runnable Editor</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <Link href="/components" className="hover:underline">
            Components
          </Link>
          <Link href="/docs" className="hover:underline">
            Docs
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

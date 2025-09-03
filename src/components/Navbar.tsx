"use client";

import ThemeToggle from "@/components/ThemeToggle";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="w-full sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-6 sm:px-12 h-14">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/icon.webp"
            className="dark:hidden block"
            alt="Reframe"
            width={48}
            height={48}
            priority
          />
          <Image
            src="/icon-dark.webp"
            className="hidden dark:block"
            alt="Reframe"
            width={48}
            height={48}
            priority
          />
          <span className="font-mono font-semibold tracking-tight text-xl">Reframe</span>
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

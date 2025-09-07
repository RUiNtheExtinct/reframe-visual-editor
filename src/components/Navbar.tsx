"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Menu, UserRound, X } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (!menuRef.current || !btnRef.current) return;
      if (menuRef.current.contains(target) || btnRef.current.contains(target)) return;
      setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  // Close mobile menu with Escape, and lock scroll when open
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    if (mobileOpen) {
      document.addEventListener("keydown", onKeyDown);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        "w-full sticky top-0 z-40 border-b",
        mobileOpen ? "" : "backdrop-blur supports-[backdrop-filter]:bg-background/70"
      )}
    >
      <div className="mx-auto flex items-center justify-between gap-4 px-6 sm:px-12 h-14">
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
        <nav className="flex items-center text-sm gap-4 sm:gap-6">
          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-4 sm:gap-6">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <Link href="/components" className="hover:underline">
              Components
            </Link>
            <Link href="/docs" className="hover:underline">
              Docs
            </Link>
          </div>
          <div className="flex items-center gap-2 pl-3 ml-1 border-l">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            {/* Desktop user controls */}
            <div className="hidden sm:block">
              {status === "authenticated" ? (
                <div className="relative">
                  <button
                    ref={btnRef}
                    aria-label="User menu"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background hover:bg-accent overflow-hidden"
                    onClick={() => setMenuOpen((v) => !v)}
                  >
                    {session?.user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={session.user.image}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-xs font-medium">
                        {(session?.user?.name || session?.user?.email || "U")
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>
                    )}
                  </button>
                  {menuOpen ? (
                    <div
                      ref={menuRef}
                      className="absolute right-0 mt-2 w-40 rounded-md border bg-card shadow-sm py-1 z-50"
                    >
                      <button
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          setMenuOpen(false);
                          signOut({ callbackUrl: "/" });
                        }}
                      >
                        Log out
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <motion.button
                  aria-label="Sign in"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background hover:bg-accent"
                  onClick={() => signIn()}
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <motion.span
                    initial={{ rotate: 0 }}
                    whileHover={{ rotate: 10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <UserRound className="size-4" />
                  </motion.span>
                </motion.button>
              )}
            </div>
            {/* Mobile menu toggle */}
            <button
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background hover:bg-accent sm:hidden"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </nav>
      </div>
      {/* Mobile slide-in menu */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50" onClick={() => setMobileOpen(false)}>
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="absolute right-0 top-0 h-full w-[85%] max-w-sm border-l shadow-2xl bg-white dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between h-14 px-4 border-b">
              <div className="flex items-center gap-2">
                <Image
                  src="/icon.webp"
                  className="dark:hidden block"
                  alt="Reframe"
                  width={28}
                  height={28}
                  priority
                />
                <Image
                  src="/icon-dark.webp"
                  className="hidden dark:block"
                  alt="Reframe"
                  width={28}
                  height={28}
                  priority
                />
                <span className="font-mono font-semibold tracking-tight text-base">Menu</span>
              </div>
              <button
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background hover:bg-accent"
                onClick={() => setMobileOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex flex-col gap-1">
                <Link
                  href="/"
                  className="px-2 py-3 rounded-md hover:bg-accent"
                  onClick={() => setMobileOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="/components"
                  className="px-2 py-3 rounded-md hover:bg-accent"
                  onClick={() => setMobileOpen(false)}
                >
                  Components
                </Link>
                <Link
                  href="/docs"
                  className="px-2 py-3 rounded-md hover:bg-accent"
                  onClick={() => setMobileOpen(false)}
                >
                  Docs
                </Link>
              </div>
              <div className="my-4 border-t" />
              <div className="flex items-center justify-between px-2 py-2">
                <span className="text-sm">Theme</span>
                <ThemeToggle />
              </div>
              <div className="my-2 border-t" />
              <div className="px-2 py-2">
                {status === "authenticated" ? (
                  <button
                    className="w-full px-3 py-3 text-left text-sm rounded-md border bg-background hover:bg-accent"
                    onClick={() => {
                      setMobileOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                  >
                    Log out
                  </button>
                ) : (
                  <button
                    className="w-full px-3 py-3 text-center text-sm rounded-md border bg-background hover:bg-accent"
                    onClick={() => {
                      setMobileOpen(false);
                      signIn();
                    }}
                  >
                    Sign in
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </header>
  );
}

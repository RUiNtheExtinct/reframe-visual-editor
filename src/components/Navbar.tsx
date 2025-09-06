"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import { UserRound } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <header className="w-full sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
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
          <div className="flex items-center gap-4 sm:gap-6">
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
            <ThemeToggle />
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
        </nav>
      </div>
    </header>
  );
}

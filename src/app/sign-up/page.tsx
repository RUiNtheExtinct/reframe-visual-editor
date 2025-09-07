"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Github } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-6 sm:px-12 py-8" />}>
      <SignUpContent />
    </Suspense>
  );
}

function SignUpContent() {
  const searchParams = useSearchParams();
  const rawCallback = searchParams?.get("callbackUrl") || "/";
  const callbackUrl = useMemo(() => {
    if (!rawCallback) return "/";
    if (rawCallback.startsWith("/sign-in") || rawCallback.startsWith("/sign-up")) return "/";
    return rawCallback;
  }, [rawCallback]);
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, name, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.message || "Sign up failed");
      // Auto sign-in after successful sign-up
      await signIn("credentials", {
        emailOrUsername: email,
        password,
        redirect: true,
        callbackUrl,
      });
      setMessage("Account created. Redirecting…");
    } catch (e: any) {
      setError(e?.message || "Sign up failed");
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl || "/");
    }
  }, [status, callbackUrl, router]);

  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-12 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative max-w-md mx-auto overflow-hidden rounded-2xl border bg-card p-0 shadow-sm"
      >
        <div className="relative p-6 sm:p-8">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-24 size-48 rounded-full bg-gradient-to-tr from-primary/25 via-accent/25 to-transparent blur-3xl"
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
          <h1 className="text-2xl font-semibold">Create an account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Start building and saving components.
          </p>
          <form onSubmit={onSubmit} className="space-y-3 mt-4">
            <motion.input
              whileFocus={{ scale: 1.01 }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <motion.input
              whileFocus={{ scale: 1.01 }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <motion.input
              whileFocus={{ scale: 1.01 }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <motion.input
              whileFocus={{ scale: 1.01 }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            {message ? <p className="text-sm text-green-600">{message}</p> : null}
            <motion.div whileHover={{ scale: 1.01 }}>
              <Button type="submit" className="w-full">
                Sign up
              </Button>
            </motion.div>
          </form>

          <div className="h-px bg-border my-6" />

          <div className="space-y-2">
            <Button
              className="w-full inline-flex items-center justify-center gap-2 bg-[#4285F4] text-white hover:opacity-95 dark:bg-[#4285F4]"
              onClick={() => signIn("google", { callbackUrl })}
            >
              <GoogleIcon className="size-4" />
              Continue with Google
            </Button>
            <Button
              className="w-full inline-flex items-center justify-center gap-2 bg-black text-white hover:opacity-95 dark:bg-white dark:text-black"
              onClick={() => signIn("github", { callbackUrl })}
            >
              <Github className="size-4" />
              Continue with GitHub
            </Button>
          </div>

          <p className="text-sm mt-4">
            Already have an account?{" "}
            <Link href="/sign-in" className="underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M22.5 12.23c0-.64-.06-1.25-.18-1.84H12v3.49h5.88a5.03 5.03 0 0 1-2.18 3.3v2.73h3.52c2.06-1.9 3.28-4.7 3.28-7.68Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.47-.98 7.29-2.65l-3.52-2.73c-.98.66-2.24 1.06-3.77 1.06a6.54 6.54 0 0 1-6.17-4.52H2.18v2.84A10.99 10.99 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.83 14.16A6.56 6.56 0 0 1 5.48 12c0-.75.13-1.48.35-2.16V7H2.18A11 11 0 0 0 1 12c0 1.73.41 3.37 1.18 4.83l3.65-2.67Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.46c1.62 0 3.07.56 4.22 1.66l3.15-3.15A10.98 10.98 0 0 0 12 1 10.99 10.99 0 0 0 2.18 7l3.65 2.84A6.54 6.54 0 0 1 12 5.46Z"
        fill="#EA4335"
      />
    </svg>
  );
}

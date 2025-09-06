"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Request failed");
      setMessage("If an account exists for that email, a reset link has been sent.");
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-12 py-8">
      <div className="max-w-md mx-auto rounded-2xl border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <p className="text-sm text-muted-foreground mt-1">We’ll email you a reset link.</p>
        <form onSubmit={onSubmit} className="space-y-3 mt-4">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {message ? <p className="text-sm text-green-600">{message}</p> : null}
          <Button type="submit" className="w-full">
            Send reset link
          </Button>
        </form>
      </div>
    </div>
  );
}

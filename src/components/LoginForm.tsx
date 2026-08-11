"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);

    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") || ""),
          password: String(form.get("password") || ""),
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error || "Sign in failed");
        setPending(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-3">
      <input
        className="field"
        type="email"
        name="email"
        placeholder="Email"
        required
      />
      <input
        className="field"
        type="password"
        name="password"
        placeholder="Password"
        required
      />
      {error && (
        <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral">
          {error}
        </p>
      )}
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Log in"}
      </button>
      <p className="text-sm text-ink-soft">
        No account?{" "}
        <Link href="/signup" className="font-semibold text-sea">
          Sign up
        </Link>
      </p>
    </form>
  );
}

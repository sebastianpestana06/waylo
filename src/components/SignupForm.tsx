"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignupForm() {
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

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: String(form.get("display_name") || ""),
          email: String(form.get("email") || ""),
          password: String(form.get("password") || ""),
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error || "Sign up failed");
        setPending(false);
        return;
      }
      if (payload.needsEmailConfirm) {
        setError(
          "Account created. Check your email to confirm, then log in — or disable Confirm email in Supabase → Authentication → Sign In / Providers → Email.",
        );
        setPending(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-3">
      <input
        className="field"
        name="display_name"
        placeholder="Display name"
        required
      />
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
        placeholder="Password (min 6)"
        minLength={6}
        required
      />
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          name="privacy_ack"
          className="mt-1"
          required
        />
        <span>
          I understand that personal information I add may be shared with people
          on my trips.
        </span>
      </label>
      {error && (
        <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral">
          {error}
        </p>
      )}
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </button>
      <p className="text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-sea">
          Log in
        </Link>
      </p>
    </form>
  );
}

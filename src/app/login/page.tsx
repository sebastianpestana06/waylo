import Link from "next/link";
import { signIn } from "@/lib/actions";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl">Welcome back</h1>
      <p className="mt-2 text-ink-soft">Log in to your Waylo trips.</p>
      <form action={signIn} className="mt-8 space-y-3">
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
        <button className="btn btn-primary w-full" type="submit">
          Log in
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-soft">
        No account?{" "}
        <Link href="/signup" className="font-semibold text-sea">
          Sign up
        </Link>
      </p>
    </main>
  );
}

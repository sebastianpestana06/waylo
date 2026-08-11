import Link from "next/link";
import { signUp } from "@/lib/actions";

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl">Join Waylo</h1>
      <p className="mt-2 text-ink-soft">
        Create an account, then add booking memberships and passports in
        settings.
      </p>
      <form action={signUp} className="mt-8 space-y-3">
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
        <button className="btn btn-primary w-full" type="submit">
          Create account
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-sea">
          Log in
        </Link>
      </p>
    </main>
  );
}

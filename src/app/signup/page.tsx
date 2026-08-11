import { SignupForm } from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl">Join Waylo</h1>
      <p className="mt-2 text-ink-soft">
        Create an account, then add booking memberships and passports in
        settings.
      </p>
      <aside
        className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200"
        role="note"
        aria-label="Personal information disclaimer"
      >
        <p className="font-semibold">Personal information notice</p>
        <p className="mt-1.5 leading-relaxed">
          Waylo is a collaborative trip planner. Details you add — such as your
          display name, email, passport country and expiry, or trip documents —
          may be visible to people you invite onto your trips. Only add
          information you are comfortable sharing with those travellers.
        </p>
      </aside>
      <SignupForm />
    </main>
  );
}

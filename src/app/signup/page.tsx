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
          Waylo is currently for <span className="font-medium">local testing
          only</span>. If you add details such as your name, email, passport
          country/expiry, or trip documents, trip mates you invite may see some
          of that information. Do not use real sensitive data you are not
          comfortable sharing in a test environment.
        </p>
      </aside>
      <SignupForm />
    </main>
  );
}

import { SignupForm } from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl">Join Waylo</h1>
      <p className="mt-2 text-ink-soft">
        Create an account, then add booking memberships and passports in
        settings.
      </p>
      <SignupForm />
    </main>
  );
}

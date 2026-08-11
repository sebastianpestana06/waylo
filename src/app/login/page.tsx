import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl">Welcome back</h1>
      <p className="mt-2 text-ink-soft">Log in to your Waylo trips.</p>
      <LoginForm />
    </main>
  );
}

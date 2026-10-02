"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ForgeBrand } from "@/components/layout/ForgeBrand";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ providers }: { providers: ("github" | "google")[] }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<"email" | "github" | "google" | null>(null);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("email");

    try {
      const { error: authError } = mode === "sign-in"
        ? await authClient.signIn.email({ email, password, callbackURL: "/dashboard" })
        : await authClient.signUp.email({ email, password, name, callbackURL: "/dashboard" });
      if (authError) setError(authError.message ?? "Check your details and try again.");
      else router.push("/dashboard");
    } catch {
      setError("We couldn’t reach the sign-in service. Your details are still here; please try again.");
    } finally { setLoading(null); }
  }

  async function handleSocial(provider: "github" | "google") {
    setError(null);
    setLoading(provider);
    try {
      const { error: authError } = await authClient.signIn.social({ provider, callbackURL: "/dashboard" });
      if (authError) { setError(authError.message ?? `Couldn't sign in with ${provider}.`); setLoading(null); }
    } catch {
      setError("We couldn’t reach the sign-in service. Please try again.");
      setLoading(null);
    }
  }

  return (
    <main className="forge-auth-page">
      <aside className="forge-auth-story"><ForgeBrand href="/" /><div><span className="forge-eyebrow">A place to work things out</span><h2>From “I’ve read it”<br />to “I can build it.”</h2><p>Follow the source. Connect the ideas. Turn your understanding into something that works.</p><ol><li><span>01</span> Understand the reference</li><li><span>02</span> Build a practical project</li><li><span>03</span> Verify and explain your work</li></ol></div><span className="forge-eyebrow">TECFAC FORGE / LEARNING THROUGH WORK</span></aside>
      <section className="forge-auth-form">
        <div className="forge-auth-heading"><div className="forge-auth-mobile-brand"><ForgeBrand href="/" /></div><span className="forge-eyebrow">Your workspace awaits</span><h1>{mode === "sign-in" ? "Welcome back." : "Make room to learn."}</h1><p>{mode === "sign-in" ? "Sign in and pick up where you left off." : "Create an account to begin your first project."}</p></div>

        {error && (
          <div role="alert" className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-danger)]/40 bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-[13px] text-[var(--color-danger)]">
            {error}
          </div>
        )}

        {providers.length > 0 && <><div className="space-y-3">
          {providers.includes("github") && <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={loading !== null}
            onClick={() => handleSocial("github")}
          >
            {loading === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue with GitHub
          </Button>}
          {providers.includes("google") && <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={loading !== null}
            onClick={() => handleSocial("google")}
          >
            {loading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue with Google
          </Button>}
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-text-tertiary)]">or</span>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        </>}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {mode === "sign-up" && (
            <label className="forge-auth-label">Name<input autoComplete="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent-solid)]"
            /></label>
          )}
          <label className="forge-auth-label">Email<input autoComplete="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent-solid)]"
          />
          </label><label className="forge-auth-label">Password<input autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent-solid)]"
          />
          </label><Button type="submit" className="w-full" disabled={loading !== null}>
            {loading === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "sign-in" ? "Continue learning" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--color-text-tertiary)]">
          {mode === "sign-in" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => {
              setError(null);
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            }}
            className="min-h-11 font-medium text-[var(--color-text-primary)] underline underline-offset-4"
          >
            {mode === "sign-in" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </section>
    </main>
  );
}

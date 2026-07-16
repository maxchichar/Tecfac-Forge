"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
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

    const { error: authError } =
      mode === "sign-in"
        ? await authClient.signIn.email({ email, password, callbackURL: "/dashboard" })
        : await authClient.signUp.email({ email, password, name, callbackURL: "/dashboard" });

    setLoading(null);
    if (authError) {
      setError(authError.message ?? "Something went wrong. Check your details and try again.");
      return;
    }
    router.push("/dashboard");
  }

  async function handleSocial(provider: "github" | "google") {
    setError(null);
    setLoading(provider);
    const { error: authError } = await authClient.signIn.social({
      provider,
      callbackURL: "/dashboard",
    });
    if (authError) {
      setLoading(null);
      setError(authError.message ?? `Couldn't sign in with ${provider}.`);
    }
    // On success, Better Auth redirects the browser to the provider — no further action needed here.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-accent-start)] to-[var(--color-accent-end)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Welcome to Tecfac Forge</h1>
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
            {mode === "sign-in" ? "Sign in to continue learning" : "Create your account"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-danger)]/40 bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-[13px] text-[var(--color-danger)]">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={loading !== null}
            onClick={() => handleSocial("github")}
          >
            {loading === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue with GitHub
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={loading !== null}
            onClick={() => handleSocial("google")}
          >
            {loading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue with Google
          </Button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-text-tertiary)]">or</span>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {mode === "sign-up" && (
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent-solid)]"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent-solid)]"
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent-solid)]"
          />
          <Button type="submit" className="w-full" disabled={loading !== null}>
            {loading === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--color-text-tertiary)]">
          {mode === "sign-in" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            }}
            className="font-medium text-[var(--color-accent-solid)] hover:underline"
          >
            {mode === "sign-in" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Sparkles, FolderGit2, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-accent-start)] to-[var(--color-accent-end)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Welcome to Tecfac Forge</h1>
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">Sign in to continue learning</p>
        </div>

        <div className="space-y-3">
          {/* These post to Better Auth's social sign-in routes once
              GITHUB_CLIENT_ID / GOOGLE_CLIENT_ID are set — see README. */}
          <form action="/api/auth/sign-in/github" method="POST">
            <Button type="submit" variant="secondary" className="w-full">
              <FolderGit2 className="h-4 w-4" /> Continue with GitHub
            </Button>
          </form>
          <form action="/api/auth/sign-in/google" method="POST">
            <Button type="submit" variant="secondary" className="w-full">
              <Mail className="h-4 w-4" /> Continue with Google
            </Button>
          </form>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-text-tertiary)]">or</span>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        <form className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent-solid)]"
          />
          <Link href="/dashboard">
            <Button type="button" className="w-full">
              Continue with email
            </Button>
          </Link>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--color-text-tertiary)]">
          By continuing, you agree to the Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

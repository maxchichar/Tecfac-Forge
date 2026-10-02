import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { envString, serverBaseUrl, isAuthConfigured } from "@/lib/env";

// Better Auth is constructed LAZILY and only when the required environment is
// present (see getAuth below). Importing this module must never create an
// auth instance with a hard-coded/insecure default secret.

interface ProviderSecrets {
  clientId: string;
  clientSecret: string;
}

/** Register a social provider ONLY when both its id and secret are present.
 *  When credentials are absent the provider is *unavailable*, not
 *  present-but-broken: it never appears in Better Auth's config, so a sign-in
 *  attempt fails cleanly (unknown provider) instead of pretending to work. */
function enabledSocialProviders(): Record<string, ProviderSecrets> {
  const providers: Record<string, ProviderSecrets> = {};
  const githubId = envString("GITHUB_CLIENT_ID");
  const githubSecret = envString("GITHUB_CLIENT_SECRET");
  if (githubId && githubSecret) providers.github = { clientId: githubId, clientSecret: githubSecret };
  const googleId = envString("GOOGLE_CLIENT_ID");
  const googleSecret = envString("GOOGLE_CLIENT_SECRET");
  if (googleId && googleSecret) providers.google = { clientId: googleId, clientSecret: googleSecret };
  return providers;
}

export function createAuth() {
  return betterAuth({
    appName: "Tecfac Forge",
    // Signed from env — there is intentionally no default here (fail closed).
    secret: envString("BETTER_AUTH_SECRET"),
    // Optional in dev (same-origin); required in production so cross-origin and
    // callback URLs are built correctly.
    baseURL: serverBaseUrl(),
    basePath: "/api/auth",
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    socialProviders: enabledSocialProviders(),
    session: { expiresIn: 60 * 60 * 24 * 30 }, // 30 days
    plugins: [nextCookies()],
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;

let cachedAuth: AuthInstance | null = null;

/** Lazy singleton. Only call after confirming isAuthConfigured(); otherwise it
 *  throws a descriptive error instead of building an insecure default config. */
export function getAuth(): AuthInstance {
  if (!isAuthConfigured()) {
    throw new Error(
      "Authentication is not configured: DATABASE_URL and BETTER_AUTH_SECRET must be set (see .env.example)."
    );
  }
  if (cachedAuth === null) cachedAuth = createAuth();
  return cachedAuth;
}

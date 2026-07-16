import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

async function shouldRedirectToLogin() {
  try {
    const { auth } = await import("@/auth/auth");
    const session = await auth.api.getSession({ headers: await headers() });
    return !session;
  } catch {
    // DATABASE_URL / Prisma not configured yet — stay in mock-data mode
    // rather than lock people out. See README "What's real vs. mocked".
    return false;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (await shouldRedirectToLogin()) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

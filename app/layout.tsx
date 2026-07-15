import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tecfac Forge, Turning documentation into a learning experience",
  description:
    "Import a GitHub repository, a docs site, or a course, and Tecfac Forge turns it into structured lessons, projects, and an AI tutor that knows exactly where you are.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Self-hosting via next/font/google is the recommended production path;
            a stylesheet link is used here so this scaffold builds in network-restricted
            sandboxes too. Swap freely — see README. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tecfac Forge — Understand it. Build with it.",
  description:
    "Learn from GitHub Markdown, connect concepts in a learning web, and build projects with source references, practical milestones, and contextual guidance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

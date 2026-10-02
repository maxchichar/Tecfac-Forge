import Link from "next/link";
import { UserRound } from "lucide-react";
import { CommandPalette } from "@/components/layout/CommandPalette";

export function Navbar() {
  return <header className="forge-navbar">
    <span className="forge-navbar-label">LEARN / BUILD / UNDERSTAND</span>
    <div className="forge-navbar-search"><CommandPalette /></div>
    <Link href="/profile" aria-label="Your profile" className="forge-profile-link"><UserRound size={18} /></Link>
  </header>;
}

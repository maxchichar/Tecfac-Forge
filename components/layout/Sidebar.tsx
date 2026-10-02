"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderGit2, Bookmark, NotebookPen, Settings, Network, Hammer } from "lucide-react";
import { ForgeBrand } from "./ForgeBrand";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: Hammer },
  { href: "/roadmap", label: "Learning web", icon: Network },
  { href: "/workspace", label: "Source library", icon: FolderGit2 },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/notes", label: "Notes", icon: NotebookPen },
];

function NavigationLinks() {
  const pathname = usePathname();
  return <>{NAV_ITEMS.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || (href === "/projects" && pathname.startsWith("/project/")) || (href === "/workspace" && /\/(course|lesson)\//.test(pathname));
    return <Link key={href} href={href} aria-current={active ? "page" : undefined}><Icon size={17} aria-hidden="true" /><span>{label}</span></Link>;
  })}</>;
}

export function Sidebar() {
  return <aside className="forge-sidebar">
    <ForgeBrand />
    <p className="forge-nav-caption">Your workspace</p>
    <nav aria-label="Main navigation" className="forge-navigation"><NavigationLinks /></nav>
    <div className="forge-sidebar-note"><span className="forge-eyebrow">A learning loop</span><p>Read the source.<br />Build the idea.<br />Show your evidence.</p></div>
    <Link className="forge-settings-link" href="/settings"><Settings size={17} /> Settings</Link>
  </aside>;
}

export function MobileNavigation() {
  return <nav aria-label="Main navigation" className="forge-mobile-navigation"><NavigationLinks /><Link href="/settings"><Settings size={17} /><span>Settings</span></Link></nav>;
}

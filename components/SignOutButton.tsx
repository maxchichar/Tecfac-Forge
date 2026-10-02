"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
export function SignOutButton() {
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState("");
 return <><button className="forge-secondary-link" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { const result = await authClient.signOut(); if (result.error) throw new Error(); window.location.assign("/login"); } catch { setError("Sign-out failed. Please try again."); setBusy(false); } }}>{busy ? "Signing out…" : "Sign out"}</button>{error && <p role="alert">{error}</p>}</>;
}

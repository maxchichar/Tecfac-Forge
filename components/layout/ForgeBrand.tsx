import Link from "next/link";

export function ForgeBrand({ href = "/dashboard" }: { href?: string }) {
  return <Link href={href} className="forge-brand" aria-label="Tecfac Forge home">
    <svg width="28" height="30" viewBox="0 0 28 30" fill="none" aria-hidden="true"><path d="M4 25V5h20M4 15h15M14 5v20" stroke="currentColor" strokeWidth="2" /><path d="m20 20 4 5-4 5" stroke="currentColor" strokeWidth="2" transform="translate(0 -5)" /></svg>
    <span>Tecfac <strong>Forge</strong></span>
  </Link>;
}

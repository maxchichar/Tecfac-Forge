"use client";
export default function WorkspaceError({ reset }: { reset: () => void }) {
 return <div className="forge-empty" role="alert"><h2>Your workspace is temporarily unavailable.</h2><p>We couldn’t load your saved work. Please try again shortly.</p><button className="forge-primary-link" onClick={reset}>Try again</button></div>;
}

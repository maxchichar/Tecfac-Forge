"use client";
export default function ProjectsError({ reset }: { reset: () => void }) {
  return <div className="forge-empty"><h2>Projects are temporarily unavailable.</h2><p>Your saved work has not been changed. Please try again.</p><button className="forge-primary-link" onClick={reset}>Try again</button></div>;
}

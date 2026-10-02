import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Check, GitBranch, Network } from "lucide-react";
import { ForgeBrand } from "@/components/layout/ForgeBrand";

const steps = [
  { number: "01", title: "Start with the source", body: "Bring in Markdown from a public GitHub repository. Keep the original reference close to the lesson." },
  { number: "02", title: "Build toward an outcome", body: "Choose what you want to build. Work through milestones that ask you to explain, apply, and verify." },
  { number: "03", title: "Make your learning visible", body: "Submit your work with evidence. Self-check it, seek a peer review, and follow the connections to your next step." },
];

export default function HomePage() {
  return <div className="forge-home">
    <a href="#main-content" className="forge-skip-link">Skip to content</a>
    <header className="forge-home-nav"><ForgeBrand href="/" /><nav aria-label="Website navigation"><a href="#how-it-works">How it works</a><Link href="/login">Sign in <ArrowUpRight size={15} /></Link></nav></header>
    <main id="main-content">
      <section className="forge-hero">
        <div className="forge-hero-copy"><span className="forge-eyebrow">A workspace for learning by building</span><h1>Understand it.<br />Build with it.</h1><p>Close the gap between reading the docs and knowing what to do with them. Turn source material into lessons, connected ideas, and practical projects.</p><Link href="/workspace" className="forge-primary-link">Start with a source <ArrowRight size={18} /></Link><div className="forge-hero-caption"><GitBranch size={15} /> Public GitHub repositories · Markdown sources</div></div>
        <div className="forge-build-preview" aria-label="Illustration of the project learning workflow">
          <div className="forge-preview-top"><span>PROJECT WORKSPACE</span><span>Illustrative example</span></div>
          <div className="forge-preview-brief"><span className="forge-eyebrow">Your build</span><h2>A small API.<br />A deeper understanding.</h2><p>Trace a request, make a change, then explain why it works.</p></div>
          <ol className="forge-preview-milestones"><li><span><Check size={15} /></span><div><strong>Understand the source</strong><small>Read the routing guide</small></div><span className="forge-preview-state">01</span></li><li className="is-current"><span>02</span><div><strong>Build a working change</strong><small>Add a route with input validation</small></div><ArrowRight size={16} /></li><li><span>03</span><div><strong>Verify and explain</strong><small>Test the edges. Show your evidence.</small></div></li></ol>
          <div className="forge-preview-source"><BookOpen size={15} /><span>Source reference</span><code>docs/routing.md</code></div>
        </div>
      </section>
      <section id="how-it-works" className="forge-home-process"><div className="forge-section-heading"><span className="forge-eyebrow">From reference to real work</span><h2>Reading is the beginning.</h2><p>Give every concept somewhere to go.</p></div><div className="forge-process-grid">{steps.map((step) => <article key={step.number}><span className="forge-step-index">{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}</div></section>
      <section className="forge-home-web"><div className="forge-web-sketch" aria-hidden="true"><svg viewBox="0 0 480 300" fill="none"><path d="M240 150 100 65 65 210 240 150 360 60 420 205 240 150 230 270 65 210M100 65 360 60M360 60 230 270M100 65 230 270M65 210 420 205" stroke="var(--color-border-strong)" /><circle cx="240" cy="150" r="35" fill="var(--color-surface)" stroke="var(--color-text-secondary)" />{[[100,65],[65,210],[360,60],[420,205],[230,270]].map(([x,y]) => <circle key={x} cx={x} cy={y} r="9" fill="var(--color-bg)" stroke="var(--color-text-secondary)" />)}<text x="240" y="155" textAnchor="middle" fill="var(--color-text-primary)" fontSize="12">BUILD</text></svg><span>Sources → milestones → concepts</span></div><div><Network size={24} /><span className="forge-eyebrow">See the relationships</span><h2>Your roadmap,<br />woven together.</h2><p>A project is more than a checklist. Explore a web of milestones, source references, and concepts. Select a connection to see why it matters to your work.</p><Link href="/roadmap" className="forge-text-link">Explore your learning web <ArrowRight size={16} /></Link></div></section>
    </main>
    <footer className="forge-home-footer"><ForgeBrand href="/" /><p>Learn through the work.</p><Link href="/login">Open your workspace <ArrowUpRight size={15} /></Link></footer>
  </div>;
}

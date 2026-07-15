// Central mock data layer.
// Shapes mirror prisma/schema.prisma so swapping this module for real
// Prisma queries later is a drop-in replacement — see README.md.

export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  repository: string;
  difficulty: Difficulty;
  estimatedHours: number;
  language: string;
  tags: string[];
  completion: number; // 0-100
  moduleIds: string[];
  updatedAt: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  order: number;
  lessonIds: string[];
  completion: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
  difficulty: Difficulty;
  completed: boolean;
  order: number;
  markdown: string;
}

export interface Project {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  estimatedHours: number;
  status: "not_started" | "in_progress" | "submitted" | "reviewed";
  objectives: string[];
  requirements: string[];
  checklist: { id: string; label: string; done: boolean }[];
  hints: string[];
}

export interface Note {
  id: string;
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
  content: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  type: "lesson" | "project" | "section";
  title: string;
  courseTitle: string;
  href: string;
  createdAt: string;
}

export const courses: Course[] = [
  {
    id: "c1",
    slug: "the-odin-project",
    title: "The Odin Project",
    description:
      "A full-stack web development curriculum covering HTML, CSS, JavaScript, Git, and Node — imported from the community open-source curriculum.",
    repository: "github.com/TheOdinProject/curriculum",
    difficulty: "beginner",
    estimatedHours: 120,
    language: "JavaScript",
    tags: ["web", "javascript", "fundamentals"],
    completion: 62,
    moduleIds: ["m1", "m2", "m3"],
    updatedAt: "2026-07-10",
  },
  {
    id: "c2",
    slug: "the-rust-book",
    title: "The Rust Programming Language",
    description:
      "The official Rust Book, restructured into lessons and paired with hands-on projects for ownership, traits, and concurrency.",
    repository: "github.com/rust-lang/book",
    difficulty: "intermediate",
    estimatedHours: 80,
    language: "Rust",
    tags: ["systems", "rust", "memory-safety"],
    completion: 24,
    moduleIds: ["m4"],
    updatedAt: "2026-07-08",
  },
  {
    id: "c3",
    slug: "kubernetes-docs",
    title: "Kubernetes Documentation",
    description:
      "Official Kubernetes concepts and tasks, sequenced into a learning path from pods to production operators.",
    repository: "github.com/kubernetes/website",
    difficulty: "advanced",
    estimatedHours: 45,
    language: "YAML",
    tags: ["devops", "infrastructure", "cloud"],
    completion: 8,
    moduleIds: ["m5"],
    updatedAt: "2026-07-02",
  },
];

export const modules: Module[] = [
  { id: "m1", courseId: "c1", title: "Foundations", order: 1, lessonIds: ["l1", "l2", "l3"], completion: 100 },
  { id: "m2", courseId: "c1", title: "Intermediate HTML & CSS", order: 2, lessonIds: ["l4", "l5"], completion: 50 },
  { id: "m3", courseId: "c1", title: "JavaScript", order: 3, lessonIds: ["l6"], completion: 0 },
  { id: "m4", courseId: "c2", title: "Ownership & Borrowing", order: 1, lessonIds: ["l7", "l8"], completion: 50 },
  { id: "m5", courseId: "c3", title: "Core Concepts", order: 1, lessonIds: ["l9"], completion: 0 },
];

const sampleMarkdown = `# Understanding Ownership

Ownership is Rust's most distinctive feature, and it enables memory safety guarantees without needing a garbage collector.

## The Rules

Before diving in, here are the three rules of ownership:

1. Each value in Rust has a variable that's called its *owner*.
2. There can only be one owner at a time.
3. When the owner goes out of scope, the value is dropped.

## Variable Scope

\`\`\`rust
fn main() {
    let s = String::from("hello"); // s comes into scope

    takes_ownership(s);            // s's value moves into the function
                                    // s is no longer valid here

    let x = 5;                     // x comes into scope
    makes_copy(x);                 // i32 is Copy, so x is still valid after
    println!("{}", x);
}

fn takes_ownership(some_string: String) {
    println!("{}", some_string);
} // some_string goes out of scope and is dropped

fn makes_copy(some_integer: i32) {
    println!("{}", some_integer);
}
\`\`\`

## Ownership and Functions

Passing a variable to a function will move or copy, just as assignment does.

> If a type implements the \`Copy\` trait, values don't move but are trivially copied instead.

## Diagram: Move vs. Copy

\`\`\`mermaid
flowchart LR
    A[Heap-allocated: String, Vec] -->|assignment| B[Move]
    C[Stack-only: i32, bool, char] -->|assignment| D[Copy]
\`\`\`

## Check Your Understanding

| Type | Behavior on assignment |
| --- | --- |
| \`String\` | Move |
| \`i32\` | Copy |
| \`Vec<T>\` | Move |
| \`bool\` | Copy |

Next lesson covers **references and borrowing** — how to let a function use a value without taking ownership of it.
`;

export const lessons: Lesson[] = [
  { id: "l1", moduleId: "m1", courseId: "c1", slug: "intro-to-html", title: "Introduction to HTML", estimatedMinutes: 15, difficulty: "beginner", completed: true, order: 1, markdown: sampleMarkdown },
  { id: "l2", moduleId: "m1", courseId: "c1", slug: "css-fundamentals", title: "CSS Fundamentals", estimatedMinutes: 25, difficulty: "beginner", completed: true, order: 2, markdown: sampleMarkdown },
  { id: "l3", moduleId: "m1", courseId: "c1", slug: "the-box-model", title: "The Box Model", estimatedMinutes: 18, difficulty: "beginner", completed: true, order: 3, markdown: sampleMarkdown },
  { id: "l4", moduleId: "m2", courseId: "c1", slug: "flexbox", title: "Flexbox", estimatedMinutes: 30, difficulty: "beginner", completed: true, order: 1, markdown: sampleMarkdown },
  { id: "l5", moduleId: "m2", courseId: "c1", slug: "grid", title: "CSS Grid", estimatedMinutes: 30, difficulty: "intermediate", completed: false, order: 2, markdown: sampleMarkdown },
  { id: "l6", moduleId: "m3", courseId: "c1", slug: "js-basics", title: "JavaScript Basics", estimatedMinutes: 40, difficulty: "beginner", completed: false, order: 1, markdown: sampleMarkdown },
  { id: "l7", moduleId: "m4", courseId: "c2", slug: "what-is-ownership", title: "What is Ownership?", estimatedMinutes: 20, difficulty: "intermediate", completed: true, order: 1, markdown: sampleMarkdown },
  { id: "l8", moduleId: "m4", courseId: "c2", slug: "references-and-borrowing", title: "References and Borrowing", estimatedMinutes: 22, difficulty: "intermediate", completed: false, order: 2, markdown: sampleMarkdown },
  { id: "l9", moduleId: "m5", courseId: "c3", slug: "pods", title: "Pods", estimatedMinutes: 15, difficulty: "advanced", completed: false, order: 1, markdown: sampleMarkdown },
];

export const projects: Project[] = [
  {
    id: "p1",
    courseId: "c1",
    slug: "landing-page",
    title: "Build a Landing Page",
    description: "Apply the box model, flexbox, and typography fundamentals to ship a responsive landing page from a Figma-style brief.",
    difficulty: "beginner",
    estimatedHours: 4,
    status: "in_progress",
    objectives: ["Practice semantic HTML", "Apply flexbox for layout", "Ship a fully responsive page"],
    requirements: ["Must be responsive from 320px to 1440px", "No CSS frameworks", "Lighthouse accessibility score of 90+"],
    checklist: [
      { id: "ck1", label: "Semantic HTML structure", done: true },
      { id: "ck2", label: "Responsive nav with mobile menu", done: true },
      { id: "ck3", label: "Hero section with flexbox layout", done: false },
      { id: "ck4", label: "Deploy to a public URL", done: false },
    ],
    hints: ["Start with mobile layout first, then scale up", "Use CSS custom properties for your color palette"],
  },
  {
    id: "p2",
    courseId: "c2",
    slug: "ownership-cli",
    title: "Build a File-Diff CLI",
    description: "A small command-line tool that reads two files and prints their differences — designed to force you to reason about ownership across function boundaries.",
    difficulty: "intermediate",
    estimatedHours: 6,
    status: "not_started",
    objectives: ["Practice borrowing across functions", "Handle Results and errors idiomatically"],
    requirements: ["No unwrap() in the main binary", "Must compile with zero warnings under clippy"],
    checklist: [
      { id: "ck5", label: "Read two files into memory", done: false },
      { id: "ck6", label: "Implement line-by-line diff", done: false },
      { id: "ck7", label: "Handle missing-file errors gracefully", done: false },
    ],
    hints: ["Reach for &str where you don't need ownership", "std::fs::read_to_string is your friend here"],
  },
];

export const notes: Note[] = [
  {
    id: "n1",
    lessonId: "l7",
    lessonTitle: "What is Ownership?",
    courseTitle: "The Rust Programming Language",
    content: "Remember: Copy types never move. Only heap-allocated types like String and Vec move on assignment.",
    updatedAt: "2026-07-12T09:20:00Z",
  },
  {
    id: "n2",
    lessonId: "l4",
    lessonTitle: "Flexbox",
    courseTitle: "The Odin Project",
    content: "justify-content controls the main axis, align-items controls the cross axis. Easy to mix these up.",
    updatedAt: "2026-07-11T18:05:00Z",
  },
];

export const bookmarks: Bookmark[] = [
  { id: "b1", type: "lesson", title: "References and Borrowing", courseTitle: "The Rust Programming Language", href: "/lesson/references-and-borrowing", createdAt: "2026-07-12" },
  { id: "b2", type: "project", title: "Build a Landing Page", courseTitle: "The Odin Project", href: "/project/landing-page", createdAt: "2026-07-09" },
  { id: "b3", type: "section", title: "The Box Model — Content vs. Border", courseTitle: "The Odin Project", href: "/lesson/the-box-model#content-vs-border", createdAt: "2026-07-05" },
];

export const streak = {
  current: 12,
  longest: 31,
  todayMinutes: 34,
  dailyGoalMinutes: 45,
  // last 12 weeks x 7 days, 0-4 intensity
  heatmap: Array.from({ length: 84 }, (_, i) => {
    const weekday = i % 7;
    const base = weekday === 0 || weekday === 6 ? 0.35 : 0.7;
    const v = Math.random() < base ? Math.floor(Math.random() * 5) : 0;
    return v;
  }),
};

export const weeklyProgress = [
  { day: "Mon", minutes: 42 },
  { day: "Tue", minutes: 58 },
  { day: "Wed", minutes: 20 },
  { day: "Thu", minutes: 65 },
  { day: "Fri", minutes: 34 },
  { day: "Sat", minutes: 12 },
  { day: "Sun", minutes: 34 },
];

export function getCourseBySlug(slug: string) {
  return courses.find((c) => c.slug === slug);
}

export function getLessonBySlug(slug: string) {
  return lessons.find((l) => l.slug === slug);
}

export function getLessonById(id: string) {
  return lessons.find((l) => l.id === id);
}

export function getProjectBySlug(slug: string) {
  return projects.find((p) => p.slug === slug);
}

export function getModulesForCourse(courseId: string) {
  return modules
    .filter((m) => m.courseId === courseId)
    .sort((a, b) => a.order - b.order)
    .map((m) => ({
      ...m,
      lessons: lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.order - b.order),
    }));
}

export function getProjectsForCourse(courseId: string) {
  return projects.filter((p) => p.courseId === courseId);
}

export function getAdjacentLessons(lessonId: string) {
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) return { prev: null, next: null };
  const siblings = lessons
    .filter((l) => l.moduleId === lesson.moduleId)
    .sort((a, b) => a.order - b.order);
  const idx = siblings.findIndex((l) => l.id === lessonId);
  return {
    prev: idx > 0 ? siblings[idx - 1] : null,
    next: idx < siblings.length - 1 ? siblings[idx + 1] : null,
  };
}

export const currentUser = {
  name: "Amara Osei",
  email: "amara@example.dev",
  avatarInitials: "AO",
  plan: "Pro",
};

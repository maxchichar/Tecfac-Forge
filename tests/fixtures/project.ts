import type { ProjectView } from "@/lib/projects/types";
import { projectMilestoneTemplate } from "@/lib/projects/policy";

export const projectFixture: ProjectView = {
  id: "project-fixture", title: "Build a resilient API client", description: "Create a small client that handles retries and errors, then demonstrate its behavior with repeatable checks.",
  course: { id: "course-fixture", title: "API client documentation", slug: "api-client", repository: "example/client" },
  milestones: projectMilestoneTemplate("Build a client with retry and error handling.").map((m, i) => ({
    ...m, id: `milestone-${i}`, order: i, status: i === 0 ? "available" : "locked", submissions: [],
    sources: [
      { id: "source-1", title: "Getting started", path: "docs/getting-started.md", url: null, excerpt: "Fixture documentation for testing the learning UI.", concepts: [{ id: "concept-1", name: "Client configuration", description: "Extracted concept from the selected source." }] },
      { id: "source-2", title: "Failure handling", path: "docs/errors.md", url: null, excerpt: "Fixture source covering failure handling.", concepts: [{ id: "concept-2", name: "Retry policy", description: "A concept supported by the fixture source." }, { id: "concept-3", name: "Error boundaries", description: "A second concept from the same source." }] },
    ],
  })),
};

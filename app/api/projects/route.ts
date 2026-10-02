import { CreateProjectSchema } from "@/lib/projects/policy";
import { createLearningProject } from "@/lib/server/projects/service";
import { projectMutation } from "@/lib/server/projects/http";

export async function POST(req: Request) {
  return projectMutation(req, CreateProjectSchema, createLearningProject);
}

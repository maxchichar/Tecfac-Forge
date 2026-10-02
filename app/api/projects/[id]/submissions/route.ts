import { SubmitProjectSchema } from "@/lib/projects/policy";
import { submitProjectMilestone } from "@/lib/server/projects/service";
import { projectMutation } from "@/lib/server/projects/http";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return projectMutation(req, SubmitProjectSchema, (userId, input) => submitProjectMilestone(userId, id, input));
}

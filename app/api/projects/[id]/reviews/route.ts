import { ReviewProjectSchema } from "@/lib/projects/policy";
import { reviewProjectSubmission } from "@/lib/server/projects/service";
import { projectMutation } from "@/lib/server/projects/http";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return projectMutation(req, ReviewProjectSchema, (userId, input) => reviewProjectSubmission(userId, id, input));
}

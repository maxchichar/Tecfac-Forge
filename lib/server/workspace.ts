import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface UserWorkspace {
  id: string;
  name: string;
  slug: string;
  role: string;
}

/**
 * Get or create a default workspace for a user.
 *
 * Ensures every authenticated user has an isolated workspace to which their
 * imported courses and learning progress belong.
 */
export async function getOrCreateUserWorkspace(userId: string, userName?: string): Promise<UserWorkspace> {
  // Check if user already belongs to a workspace
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
  });

  if (membership) {
    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      role: membership.role,
    };
  }

  // Create personal workspace for the user
  const baseName = userName ? `${userName.split(" ")[0]}'s Workspace` : "My Workspace";
  const slug = `ws-${userId.slice(0, 10).toLowerCase()}-${Date.now().toString(36)}`;

  const created = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        name: baseName,
        slug,
      },
    });

    const mem = await tx.workspaceMember.create({
      data: {
        workspaceId: ws.id,
        userId,
        role: "owner",
      },
    });

    return { ws, mem };
  });

  logger.info("workspace.created", { userId, workspaceId: created.ws.id });

  return {
    id: created.ws.id,
    name: created.ws.name,
    slug: created.ws.slug,
    role: created.mem.role,
  };
}

/**
 * Verify that a user is a member of a given workspace.
 */
export async function isUserInWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });
  return member !== null;
}

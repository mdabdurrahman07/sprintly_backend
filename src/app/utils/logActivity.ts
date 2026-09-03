import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../lib/prisma";

export const logActivity = (params: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) =>
  prisma.activityLog.create({
    data: {
      actorUserId: params.actorUserId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
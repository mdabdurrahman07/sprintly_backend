import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { ReqUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { ICreatePlanPayload, IUpdatePlanPayload } from "./plan.interface";
import { logActivity } from "../../utils/logActivity";

const createPlan = async (user: ReqUser, payload: ICreatePlanPayload) => {
  const { name, price } = payload;
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (existingUser.role !== "ADMIN") {
    throw new AppError(httpStatus.FORBIDDEN, "Only Admin can create plans");
  }

  const createdPlan = await prisma.plan.create({
    data: {
      name,
      price,
    },
  });
  await logActivity({
    actorUserId: user.userId,
    action: "Plan created",
    entityType: "Plan",
    entityId: createdPlan.id,
  });
  return createdPlan;
};
const getPlan = async () => {
  const plans = await prisma.plan.findMany();
  return plans;
};
const updatePlan = async (
  user: ReqUser,
  payload: IUpdatePlanPayload,
  planId: string,
) => {
  const { name, price } = payload;
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (existingUser.role !== "ADMIN") {
    throw new AppError(httpStatus.FORBIDDEN, "Only Admin can create plans");
  }

  if (!planId) {
    throw new AppError(httpStatus.NOT_FOUND, "TaskId not found");
  }
  const plan = await prisma.plan.update({
    where: {
      id: planId,
    },
    data: {
      name,
      price,
    },
  });
  await logActivity({
    actorUserId: user.userId,
    action: "Plan updated",
    entityType: "Plan",
    entityId: plan.id,
  });
  return plan;
};
const deletePlan = async (user: ReqUser, planId: string) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.userId,
      role: user.role,
    },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (existingUser.role !== "ADMIN") {
    throw new AppError(httpStatus.FORBIDDEN, "Only Admin can create plans");
  }

  if (!planId) {
    throw new AppError(httpStatus.NOT_FOUND, "TaskId not found");
  }
  const deletedPlan = await prisma.plan.delete({
    where: {
      id: planId,
    },
  });
  await logActivity({
    actorUserId: user.userId,
    action: "Plan deleted",
    entityType: "Plan",
    entityId: deletedPlan.id,
  });
};

export const planService = {
  createPlan,
  getPlan,
  updatePlan,
  deletePlan,
};

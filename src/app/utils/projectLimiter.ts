import { SubscriptionPlan } from "../../../generated/prisma/enums";

export const PROJECT_LIMITS: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PRO: 2,
  ENTERPRISE: 5,
};

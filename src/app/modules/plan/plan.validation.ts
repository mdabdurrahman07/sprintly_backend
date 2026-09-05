import z from "zod";
import { SubscriptionPlan } from "../../../../generated/prisma/enums";

export const CreatePlanSchema = z.object({
  name: z.nativeEnum(SubscriptionPlan),
  price: z.number()
});

export const UpdatePlanSchema = CreatePlanSchema.partial();
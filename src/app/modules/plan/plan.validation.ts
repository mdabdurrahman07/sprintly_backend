import z from "zod";
import { SubscriptionPlan } from "../../../../generated/prisma/enums";

export const CreatePlanSchema = z.object({
  name: SubscriptionPlan,
  price: z.number().positive("Price must be a positive number"),
});

export const UpdatePlanSchema = CreatePlanSchema.partial();
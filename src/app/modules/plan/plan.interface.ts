import { SubscriptionPlan } from "../../../../generated/prisma/enums";

export interface ICreatePlanPayload {
  name: SubscriptionPlan;
  price: number;
}

export interface IUpdatePlanPayload {
  name?: SubscriptionPlan;
  price?: number;
}


// TODO
// * Have to work on Description
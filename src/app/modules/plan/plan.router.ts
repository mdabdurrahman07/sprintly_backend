import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { planController } from "./plan.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { CreatePlanSchema, UpdatePlanSchema } from "./plan.validation";

const router = Router();
router.post("/createPlan", validateRequest(CreatePlanSchema), auth(Role.ADMIN), planController.createPlan);
router.get("/", planController.getPlan);
router.patch("/updatePlan/:id", validateRequest(UpdatePlanSchema),auth(Role.ADMIN), planController.updatePlan);
router.delete("/delete/:id", auth(Role.ADMIN), planController.deletePlan);
export const planRoutes = router;

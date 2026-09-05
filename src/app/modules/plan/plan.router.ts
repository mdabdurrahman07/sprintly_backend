import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { planController } from "./plan.controller";

const router = Router();
router.post("/createPlan", auth(Role.ADMIN), planController.createPlan);
router.get("/");
router.patch("/updatePlan/:id", auth(Role.ADMIN), planController.updatePlan);
router.delete("/delete/:id", auth(Role.ADMIN), planController.deletePlan);
export const planRoutes = router;

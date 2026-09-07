import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import { CreatePaymentPayloadSchema } from "./payment.validation";
import { paymentController } from "./payment.controller";
import { strictLimiter } from "../../middleware/strictLimiter";

const router = Router();

router.post(
  "/createPayment",
  auth(Role.MANAGER, Role.ADMIN),
  validateRequest(CreatePaymentPayloadSchema),
  strictLimiter,
  paymentController.createPayment,
);
router.get("/callback", paymentController.paymentCallback);
router.get(
  "/getMyPayment",
  auth(Role.MANAGER, Role.ADMIN),
  paymentController.getMyPayment,
);
export const paymentRoutes = router;

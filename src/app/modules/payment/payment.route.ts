import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import { CreatePaymentPayloadSchema } from "./payment.validation";
import { paymentController } from "./payment.controller";

const router = Router();

router.post("/createPayment", auth(Role.MANAGER, Role.ADMIN), validateRequest(CreatePaymentPayloadSchema), paymentController.createPayment)

export const paymentRoutes = router;

import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { userValidation } from "./auth.validation";
import { authController } from "./auth.controller";

const router = Router()

router.post('/register/member' , validateRequest(userValidation.RegisterSchema), authController.registerMember)
router.post('/verifyEmail', validateRequest(userValidation.VerifyEmailOTPSchema), authController.verifyEmail)
router.post('/login', validateRequest(userValidation.LoginSchema))
// router.get('/me')
// router.post('/refresh-token')
// router.post("/google")

export const authRoutes = router
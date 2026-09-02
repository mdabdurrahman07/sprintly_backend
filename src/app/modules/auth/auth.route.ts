import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { userValidation } from "./auth.validation";
import { authController } from "./auth.controller";

const router = Router()

router.post('/register' , validateRequest(userValidation.RegisterSchema), authController.registerMember)
router.post('/verifyEmail', validateRequest(userValidation.LoginSchema))
// router.post('/login')
// router.get('/me')
// router.post('/refresh-token')
// router.post("/google")

export const authRoutes = router
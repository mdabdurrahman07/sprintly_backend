import { Router } from "express";

const router = Router()

router.post('/register')
router.post('/login')
router.get('/me')
router.post('/refresh-token')
router.post("/google")
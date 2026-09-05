import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";

const createPlan = catchAsync(async (req: Request, res: Response) => {})
const getPlan = catchAsync(async (req: Request, res: Response) => {})
const updatePlan = catchAsync(async (req: Request, res: Response) => {})
const deletePlan = catchAsync(async (req: Request, res: Response) => {})

export const planController = {
    createPlan,
    getPlan,
    updatePlan,
    deletePlan
}
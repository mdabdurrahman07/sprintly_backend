import express, { Request, Response, type Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./app/config";
import httpStatus from "http-status";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { authRoutes } from "./app/modules/auth/auth.route";
import { profileRoutes } from "./app/modules/profile/profile.route";
import { taskRoutes } from "./app/modules/task/task.router";
import { commentRoute } from "./app/modules/comment/comment.route";
import { paymentRoutes } from "./app/modules/payment/payment.route";
import { planRoutes } from "./app/modules/plan/plan.router";
const app: Application = express();

app.use(
  cors({
    origin: config.frontend_url,
    credentials: true,
  }),
);
// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ? Auth Routes
app.use("/sprintly/api/v1/auth", authRoutes);
app.use("/sprintly/api/v1/profile", profileRoutes);
app.use("/sprintly/api/v1/project", profileRoutes);
app.use("/sprintly/api/v1/task", taskRoutes);
app.use("/sprintly/api/v1/comments", commentRoute);
app.use("/sprintly/api/v1/payment", paymentRoutes);
app.use("/sprintly/api/v1/plan", planRoutes);

// Basic route
app.get("/", async (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: "Welcome to Sprintly Your Project Management App Backend",
  });
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;

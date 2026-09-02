import express, {
  Request,
  Response,
  type Application,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./app/config";
import httpStatus from "http-status";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { authRoutes } from "./app/modules/auth/auth.route";
const app: Application = express()

app.use(cors({
    origin: config.frontend_url,
    credentials: true
}))
// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ? Auth Routes
app.use("/sprintly/api/v1/auth", authRoutes)

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
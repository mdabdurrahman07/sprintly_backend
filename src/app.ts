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
const app: Application = express()

app.use(cors({
    origin: config.frontend_url,
    credentials: true
}))
// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

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
import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";


import { AppError } from "../utils/AppError";
import { Prisma } from "../../../generated/prisma/client";
import { config } from "../config";

export const globalErrorHandler = async (
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
) => {
	console.error("Error from Global Error Handler", err);

	let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
	let errorMessage = "Internal Server Error";
	let errorName = "Internal Server Error";

	if (err instanceof Error) {
		errorName = err.name;
		errorMessage = err.message || errorMessage;
	}

	if (err instanceof AppError) {
		statusCode = err.StatusCode;
		errorMessage = err.message;
	} else if (err instanceof Prisma.PrismaClientValidationError) {
		statusCode = httpStatus.BAD_REQUEST;
		errorMessage = "You have provided incorrect field type or missing fields";
	} else if (err instanceof Prisma.PrismaClientKnownRequestError) {
		if (err.code === "P2002") {
			(statusCode = httpStatus.BAD_REQUEST),
				(errorMessage = "Duplicate Key Error");
		} else if (err.code === "P2003") {
			(statusCode = httpStatus.BAD_REQUEST),
				(errorMessage = "Foreign key constraint failed");
		} else if (err.code === "P2025") {
			(statusCode = httpStatus.BAD_REQUEST),
				(errorMessage =
					"An operation failed because it depends on one or more records that were required but not found.");
		}
	} else if (err instanceof Prisma.PrismaClientInitializationError) {
		if (err.errorCode === "P1000") {
			statusCode = httpStatus.UNAUTHORIZED;
			errorMessage =
				"Authentication failed against database server. Please Check Your Credentials";
		} else if (err.errorCode === "P1001") {
			statusCode = httpStatus.BAD_REQUEST;
			errorMessage = "Can't reach database server";
		}
	} else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
		statusCode = httpStatus.INTERNAL_SERVER_ERROR;
		errorMessage = "Error occurred during query execution";
	}

	res.status(statusCode).json({
		success: false,
		statusCode,
		name: errorName,
		message: errorMessage,
		error: config.node_env === "development" ? err : undefined,
		stack:
			config.node_env === "development" && err instanceof Error
				? err.stack
				: undefined,
	});
};
import  httpStatus  from 'http-status';
import { NextFunction, Request, Response } from "express";
import { Role } from "../../../generated/prisma/enums";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";
import { config } from "../config";
import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

export interface ReqUser {
  email: string;
  name: string;
  userId: string;
  role: Role;
}
declare global {
  namespace Express {
    interface Request {
      user?: ReqUser;
    }
  }
}

export const auth = (...requiredRoles: Role[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.accessToken
      ? req.cookies.accessToken
      : req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization?.split(" ")[1]
        : req.headers.authorization;

    if (!token) {
      throw new AppError(httpStatus.FORBIDDEN,
        "You are not logged in. Please log in to access this resource.",
      );
    }

    const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

    if (!verifiedToken.success) {
      throw new AppError(httpStatus.FORBIDDEN,verifiedToken.error);
    }

    const { email, name, userId, role } = verifiedToken.data as JwtPayload;

    if (requiredRoles.length && !requiredRoles.includes(role)) {
      throw new AppError(httpStatus.FORBIDDEN,
        "Forbidden. You don't have permission to access this resource.",
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        email,
        name,
        role,
      },
    });

    if (!user) {
      throw new AppError(httpStatus.BAD_REQUEST,"User not found. Please log in again.");
    }

    if (user.status === "BLOCKED") {
      throw new AppError(httpStatus.FORBIDDEN,"Your account has been blocked. Please contact support.");
    }

    req.user = {
      email,
      name,
      userId,
      role,
    };

    next();
  });
};

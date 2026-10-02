import type { CookieOptions, Response } from "express";
import { config } from "../../config";

const AUTH_COOKIE_PATH = "/";
const ACCESS_TOKEN_MAX_AGE = 1000 * 60 * 60 * 24;
const REFRESH_TOKEN_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

const getAuthCookieOptions = (
  tokenType: "access" | "refresh",
  environment = config.node_env,
): CookieOptions => ({
  httpOnly: true,
  secure: environment !== "development",
  sameSite: environment === "development" ? "lax" : "none",
  path: AUTH_COOKIE_PATH,
  maxAge: tokenType === "access" ? ACCESS_TOKEN_MAX_AGE : REFRESH_TOKEN_MAX_AGE,
});

export const setAuthCookies = (
  response: Response,
  accessToken: string,
  refreshToken: string,
  environment = config.node_env,
): void => {
  response.cookie("accessToken", accessToken, getAuthCookieOptions("access", environment));
  response.cookie("refreshToken", refreshToken, getAuthCookieOptions("refresh", environment));
};

export const clearAuthCookies = (
  response: Response,
  environment = config.node_env,
): void => {
  for (const tokenType of ["access", "refresh"] as const) {
    const cookieName = tokenType === "access" ? "accessToken" : "refreshToken";
    response.clearCookie(cookieName, {
      ...getAuthCookieOptions(tokenType, environment),
      expires: new Date(0),
      maxAge: 0,
    });
  }
};
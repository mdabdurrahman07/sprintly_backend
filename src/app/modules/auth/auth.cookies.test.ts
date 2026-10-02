import assert from "node:assert/strict";
import test from "node:test";
import type { CookieOptions, Response } from "express";
import { clearAuthCookies, setAuthCookies } from "./auth.cookies";

test("login cookies support cross-site production requests", () => {
  const calls: Array<{ name: string; value: string; options: CookieOptions }> = [];
  const response = {
    cookie: (name: string, value: string, options: CookieOptions) => {
      calls.push({ name, value, options });
      return response;
    },
  } as unknown as Response;

  setAuthCookies(response, "access-token", "refresh-token", "production");

  assert.deepEqual(calls, [
    {
      name: "accessToken",
      value: "access-token",
      options: {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
        maxAge: 1000 * 60 * 60 * 24,
      },
    },
    {
      name: "refreshToken",
      value: "refresh-token",
      options: {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    },
  ]);
});

test("development cookies remain same-site and non-secure", () => {
  const calls: Array<{ options: CookieOptions }> = [];
  const response = {
    cookie: (_name: string, _value: string, options: CookieOptions) => {
      calls.push({ options });
      return response;
    },
  } as unknown as Response;

  setAuthCookies(response, "access-token", "refresh-token", "development");

  assert.equal(calls[0].options.secure, false);
  assert.equal(calls[0].options.sameSite, "lax");
  assert.equal(calls[1].options.secure, false);
  assert.equal(calls[1].options.sameSite, "lax");
});

test("logout expires both auth cookies with matching path and security options", () => {
  const calls: Array<{ name: string; options: CookieOptions }> = [];
  const response = {
    clearCookie: (name: string, options: CookieOptions) => {
      calls.push({ name, options });
      return response;
    },
  } as unknown as Response;

  clearAuthCookies(response, "production");

  assert.deepEqual(calls.map(({ name }) => name), ["accessToken", "refreshToken"]);
  for (const { options } of calls) {
    assert.equal(options.path, "/");
    assert.equal(options.domain, undefined);
    assert.equal(options.httpOnly, true);
    assert.equal(options.secure, true);
    assert.equal(options.sameSite, "none");
    assert.equal(options.maxAge, 0);
    assert.equal(options.expires?.getTime(), 0);
  }
});
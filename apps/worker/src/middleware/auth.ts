import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { createDbClient } from "@fivethreeone/db";
import { validateSession } from "../auth/session.js";

export interface AuthVariables {
  userId: string;
  lifterId: string;
  username: string;
}

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: AuthVariables }>, next: Next) {
  const token = getCookie(c, "session_token");
  if (!token) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const db = createDbClient(c.env);
  const payload = await validateSession(db, token);
  if (!payload || !payload.lifterId) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  c.set("userId", payload.userId);
  c.set("lifterId", payload.lifterId);
  c.set("username", payload.username);

  await next();
}

export function getAuth(c: Context<{ Bindings: Env; Variables: AuthVariables }>): AuthVariables {
  return {
    userId: c.get("userId"),
    lifterId: c.get("lifterId"),
    username: c.get("username"),
  };
}

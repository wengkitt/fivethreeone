import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { createDbClient, user, account, lifter } from "@fivethreeone/db";
import { successResponse, errorResponse } from "@fivethreeone/shared";
import { hashPassword, verifyPassword } from "../auth/crypto.js";
import { createSession, validateSession, deleteSession } from "../auth/session.js";

const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.post("/register", async (c) => {
  const body = await c.req.json<{
    username: string;
    email: string;
    password: string;
  }>();

  if (!body.username || !body.email || !body.password) {
    return c.json(errorResponse("Username, email, and password are required"), 400);
  }

  const db = createDbClient(c.env);
  const now = new Date();

  const existingUser = await db
    .select()
    .from(user)
    .where(eq(user.email, body.email))
    .get();
  if (existingUser) {
    return c.json(errorResponse("Email already in use"), 409);
  }

  const existingLifter = await db
    .select()
    .from(lifter)
    .where(eq(lifter.username, body.username))
    .get();
  if (existingLifter) {
    return c.json(errorResponse("Username already taken"), 409);
  }

  const userId = crypto.randomUUID();
  const lifterId = crypto.randomUUID();

  const passwordHash = await hashPassword(body.password);

  await db.batch([
    db.insert(user).values({
      id: userId,
      name: body.username,
      email: body.email,
      emailVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: body.email,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(lifter).values({
      id: lifterId,
      userId,
      username: body.username,
      weightUnit: "kg",
      plateIncrement: 2500,
      createdAt: now,
      updatedAt: now,
    }),
  ]);

  const { token } = await createSession(db, userId);
  setCookie(c, "session_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return c.json(successResponse({ lifterId, username: body.username }));
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json<{
    login: string;
    password: string;
  }>();

  if (!body.login || !body.password) {
    return c.json(errorResponse("Login and password are required"), 400);
  }

  const db = createDbClient(c.env);

  const lifterRecord = await db
    .select()
    .from(lifter)
    .where(eq(lifter.username, body.login))
    .get();

  const userRecord = lifterRecord
    ? await db.select().from(user).where(eq(user.id, lifterRecord.userId)).get()
    : await db.select().from(user).where(eq(user.email, body.login)).get();

  if (!userRecord) {
    return c.json(errorResponse("Invalid credentials"), 401);
  }

  const accountRecord = await db
    .select()
    .from(account)
    .where(eq(account.userId, userRecord.id))
    .get();

  if (!accountRecord?.password) {
    return c.json(errorResponse("Invalid credentials"), 401);
  }

  const valid = await verifyPassword(body.password, accountRecord.password);
  if (!valid) {
    return c.json(errorResponse("Invalid credentials"), 401);
  }

  const { token } = await createSession(db, userRecord.id);
  setCookie(c, "session_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  const foundLifter = lifterRecord || await db
    .select()
    .from(lifter)
    .where(eq(lifter.userId, userRecord.id))
    .get();

  return c.json(successResponse({
    lifterId: foundLifter?.id ?? "",
    username: foundLifter?.username ?? userRecord.name,
  }));
});

authRoutes.post("/logout", async (c) => {
  const token = getCookie(c, "session_token");
  if (token) {
    const db = createDbClient(c.env);
    await deleteSession(db, token);
  }
  deleteCookie(c, "session_token", { path: "/" });
  return c.json(successResponse(null));
});

authRoutes.get("/session", async (c) => {
  const token = getCookie(c, "session_token");
  if (!token) {
    return c.json(successResponse(null));
  }

  const db = createDbClient(c.env);
  const payload = await validateSession(db, token);
  if (!payload) {
    deleteCookie(c, "session_token", { path: "/" });
    return c.json(successResponse(null));
  }

  return c.json(successResponse({
    userId: payload.userId,
    lifterId: payload.lifterId,
    username: payload.username,
  }));
});

export default authRoutes;

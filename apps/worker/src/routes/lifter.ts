import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDbClient, lifter, account } from "@fivethreeone/db";
import { successResponse, errorResponse } from "@fivethreeone/shared";
import { authMiddleware, getAuth } from "../middleware/auth.js";
import { hashPassword, verifyPassword } from "../auth/crypto.js";

const lifterRoutes = new Hono<{ Bindings: Env }>();

lifterRoutes.get("/profile", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);

  const record = await db
    .select()
    .from(lifter)
    .where(eq(lifter.id, auth.lifterId))
    .get();

  if (!record) {
    return c.json(errorResponse("Lifter not found"), 404);
  }

  return c.json(successResponse({
    id: record.id,
    userId: record.userId,
    username: record.username,
  }));
});

lifterRoutes.put("/profile", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);
  const body = await c.req.json<{ username?: string }>();

  if (!body.username) {
    return c.json(errorResponse("No fields to update"), 400);
  }

  const existing = await db
    .select()
    .from(lifter)
    .where(eq(lifter.username, body.username))
    .get();
  if (existing && existing.id !== auth.lifterId) {
    return c.json(errorResponse("Username already taken"), 409);
  }

  await db
    .update(lifter)
    .set({ username: body.username, updatedAt: new Date() })
    .where(eq(lifter.id, auth.lifterId));

  const record = await db
    .select()
    .from(lifter)
    .where(eq(lifter.id, auth.lifterId))
    .get();

  return c.json(successResponse({
    id: record!.id,
    userId: record!.userId,
    username: record!.username,
  }));
});

lifterRoutes.put("/password", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);
  const body = await c.req.json<{ currentPassword: string; newPassword: string }>();

  if (!body.currentPassword || !body.newPassword) {
    return c.json(errorResponse("Current password and new password are required"), 400);
  }

  if (body.newPassword.length < 6) {
    return c.json(errorResponse("New password must be at least 6 characters"), 400);
  }

  const accountRecord = await db
    .select()
    .from(account)
    .where(eq(account.userId, auth.userId))
    .get();

  if (!accountRecord?.password) {
    return c.json(errorResponse("Account not found"), 404);
  }

  const valid = await verifyPassword(body.currentPassword, accountRecord.password);
  if (!valid) {
    return c.json(errorResponse("Current password is incorrect"), 401);
  }

  const newHash = await hashPassword(body.newPassword);
  await db
    .update(account)
    .set({ password: newHash, updatedAt: new Date() })
    .where(eq(account.id, accountRecord.id));

  return c.json(successResponse({ message: "Password updated successfully" }));
});

export default lifterRoutes;

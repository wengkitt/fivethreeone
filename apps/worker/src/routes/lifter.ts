import { eq, and } from "drizzle-orm";
import { Hono } from "hono";
import { createDbClient, lifter, trainingMax, account } from "@fivethreeone/db";
import { successResponse, errorResponse, mainLiftValues, type MainLift } from "@fivethreeone/shared";
import { calculateTmFromOneRm } from "@fivethreeone/core";
import { authMiddleware, getAuth } from "../middleware/auth.js";
import { hashPassword, verifyPassword } from "../auth/crypto.js";

const lifterRoutes = new Hono<{ Bindings: Env }>();

const VALID_PLATE_INCREMENTS = [0.5, 1, 2.5, 5] as const;

function plateIncrementToDb(value: number): number {
  return Math.round(value * 1000);
}

function plateIncrementFromDb(value: number): number {
  const inc = value / 1000;
  return (VALID_PLATE_INCREMENTS.find((i) => i === inc) ?? 2.5) as (typeof VALID_PLATE_INCREMENTS)[number];
}

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
    unitPreference: record.weightUnit as "kg" | "lb",
    plateIncrement: plateIncrementFromDb(record.plateIncrement),
  }));
});

lifterRoutes.put("/profile", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);
  const body = await c.req.json<{
    username?: string;
    unitPreference?: "kg" | "lb";
    plateIncrement?: number;
  }>();

  const updates: Record<string, unknown> = {};
  if (body.username !== undefined) updates.username = body.username;
  if (body.unitPreference !== undefined) updates.weightUnit = body.unitPreference;
  if (body.plateIncrement !== undefined) {
    if (!(VALID_PLATE_INCREMENTS as readonly number[]).includes(body.plateIncrement)) {
      return c.json(errorResponse("Invalid plate increment"), 400);
    }
    updates.plateIncrement = plateIncrementToDb(body.plateIncrement);
  }
  updates.updatedAt = new Date();

  if (Object.keys(updates).length === 0) {
    return c.json(errorResponse("No fields to update"), 400);
  }

  if (updates.username) {
    const existing = await db
      .select()
      .from(lifter)
      .where(eq(lifter.username, updates.username as string))
      .get();
    if (existing && existing.id !== auth.lifterId) {
      return c.json(errorResponse("Username already taken"), 409);
    }
  }

  await db.update(lifter).set(updates).where(eq(lifter.id, auth.lifterId));

  const record = await db
    .select()
    .from(lifter)
    .where(eq(lifter.id, auth.lifterId))
    .get();

  return c.json(successResponse({
    id: record!.id,
    userId: record!.userId,
    username: record!.username,
    unitPreference: record!.weightUnit as "kg" | "lb",
    plateIncrement: plateIncrementFromDb(record!.plateIncrement),
  }));
});

lifterRoutes.get("/training-max", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);

  const records = await db
    .select()
    .from(trainingMax)
    .where(eq(trainingMax.lifterId, auth.lifterId));

  const result = mainLiftValues.map((lift) => {
    const record = records.find((r) => r.lift === lift);
    return {
      lift,
      oneRm: record?.oneRm ?? null,
      trainingMaxValue: record?.trainingMaxValue ?? null,
      cycleNumber: record?.cycleNumber ?? 1,
      id: record?.id ?? null,
    };
  });

  return c.json(successResponse(result));
});

lifterRoutes.put("/training-max/:lift", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);
  const lift = c.req.param("lift") as MainLift;

  if (!(mainLiftValues as readonly string[]).includes(lift)) {
    return c.json(errorResponse("Invalid lift"), 400);
  }

  const body = await c.req.json<{ oneRm: number }>();
  if (typeof body.oneRm !== "number" || body.oneRm <= 0) {
    return c.json(errorResponse("Invalid 1RM value"), 400);
  }

  const lifterRecord = await db
    .select({ plateIncrement: lifter.plateIncrement })
    .from(lifter)
    .where(eq(lifter.id, auth.lifterId))
    .get();

  if (!lifterRecord) {
    return c.json(errorResponse("Lifter not found"), 404);
  }

  const plateInc = plateIncrementFromDb(lifterRecord.plateIncrement);
  const tm = calculateTmFromOneRm(body.oneRm, plateInc);

  const existing = await db
    .select()
    .from(trainingMax)
    .where(and(eq(trainingMax.lifterId, auth.lifterId), eq(trainingMax.lift, lift)))
    .get();

  const now = new Date();
  if (existing) {
    await db
      .update(trainingMax)
      .set({
        oneRm: body.oneRm,
        trainingMaxValue: tm,
        updatedAt: now,
      })
      .where(eq(trainingMax.id, existing.id));
  } else {
    await db.insert(trainingMax).values({
      id: crypto.randomUUID(),
      lifterId: auth.lifterId,
      lift,
      oneRm: body.oneRm,
      trainingMaxValue: tm,
      cycleNumber: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  return c.json(successResponse({
    lift,
    oneRm: body.oneRm,
    trainingMaxValue: tm,
    cycleNumber: existing?.cycleNumber ?? 1,
  }));
});

lifterRoutes.post("/training-max/reset", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);

  const lifterRecord = await db
    .select({ plateIncrement: lifter.plateIncrement })
    .from(lifter)
    .where(eq(lifter.id, auth.lifterId))
    .get();

  if (!lifterRecord) {
    return c.json(errorResponse("Lifter not found"), 404);
  }

  const plateInc = plateIncrementFromDb(lifterRecord.plateIncrement);
  const records = await db
    .select()
    .from(trainingMax)
    .where(eq(trainingMax.lifterId, auth.lifterId));

  const now = new Date();
  const results = [];

  for (const record of records) {
    const tm = calculateTmFromOneRm(record.oneRm, plateInc);
    await db
      .update(trainingMax)
      .set({ trainingMaxValue: tm, updatedAt: now })
      .where(eq(trainingMax.id, record.id));
    results.push({
      lift: record.lift,
      oneRm: record.oneRm,
      trainingMaxValue: tm,
      cycleNumber: record.cycleNumber,
    });
  }

  return c.json(successResponse(results));
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

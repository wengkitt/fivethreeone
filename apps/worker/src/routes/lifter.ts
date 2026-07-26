import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDbClient, lifter } from "@fivethreeone/db";
import { successResponse, errorResponse } from "@fivethreeone/shared";
import { authMiddleware, getAuth } from "../middleware/auth.js";

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

  const validIncrements = [0.5, 1, 2.5, 5] as const;
  const plateInc = record.plateIncrement / 1000;
  const safeIncrement = validIncrements.find((i) => i === plateInc) ?? 2.5;

  return c.json(successResponse({
    id: record.id,
    userId: record.userId,
    username: record.username,
    unitPreference: record.weightUnit === "kg" ? "kg" as const : "lb" as const,
    plateIncrement: safeIncrement,
  }));
});

export default lifterRoutes;

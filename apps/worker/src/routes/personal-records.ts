import { eq, and, desc } from "drizzle-orm";
import { Hono } from "hono";
import { createDbClient, personalRecord } from "@fivethreeone/db";
import { successResponse, errorResponse, mainLiftValues, LIFT_LABELS, type MainLift } from "@fivethreeone/shared";
import { authMiddleware, getAuth } from "../middleware/auth.js";

const personalRecordRoutes = new Hono<{ Bindings: Env }>();

personalRecordRoutes.get("/personal-records", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);

  const records = await db
    .select()
    .from(personalRecord)
    .where(eq(personalRecord.lifterId, auth.lifterId))
    .orderBy(desc(personalRecord.achievedAt));

  const grouped: Record<string, Array<{
    id: string;
    lift: string;
    displayName: string;
    prType: string;
    value: number;
    achievedAt: string;
    workoutId: string | null;
  }>> = {};

  for (const r of records) {
    if (!grouped[r.lift]) {
      grouped[r.lift] = [];
    }
    grouped[r.lift].push({
      id: r.id,
      lift: r.lift,
      displayName: LIFT_LABELS[r.lift] ?? r.lift,
      prType: r.prType,
      value: r.value,
      achievedAt: typeof r.achievedAt === "number" ? new Date(r.achievedAt).toISOString() : "",
      workoutId: r.workoutId,
    });
  }

  return c.json(successResponse({ grouped }));
});

personalRecordRoutes.get("/personal-records/:liftId", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const liftParam = c.req.param("liftId") ?? "";
  const db = createDbClient(c.env);

  if (!(mainLiftValues as readonly string[]).includes(liftParam)) {
    return c.json(errorResponse("Invalid lift"), 400);
  }

  const liftId = liftParam as MainLift;

  const records = await db
    .select()
    .from(personalRecord)
    .where(
      and(
        eq(personalRecord.lifterId, auth.lifterId),
        eq(personalRecord.lift, liftId),
      ),
    )
    .orderBy(desc(personalRecord.achievedAt));

  return c.json(
    successResponse(
      records.map((r) => ({
        id: r.id,
        lift: r.lift,
        displayName: LIFT_LABELS[r.lift] ?? r.lift,
        prType: r.prType,
        value: r.value,
        achievedAt: typeof r.achievedAt === "number" ? new Date(r.achievedAt).toISOString() : "",
        workoutId: r.workoutId,
      })),
    ),
  );
});

export default personalRecordRoutes;

import { eq, desc } from "drizzle-orm";
import { Hono } from "hono";
import { createDbClient, block as blockTable, workoutDay } from "@fivethreeone/db";
import { successResponse, LIFT_LABELS, LIFT_ORDER, mainLiftValues, type MainLift } from "@fivethreeone/shared";
import { authMiddleware, getAuth } from "../middleware/auth.js";

const dashboardRoutes = new Hono<{ Bindings: Env }>();

dashboardRoutes.get("/lifts", (c) => {
  const lifts = mainLiftValues.map((id) => ({
    id,
    displayName: LIFT_LABELS[id],
  }));
  return c.json(successResponse(lifts));
});

export default dashboardRoutes;

import { eq, and, desc } from "drizzle-orm";
import { Hono } from "hono";
import { createDbClient, block, workoutDay, lifter as lifterTable } from "@fivethreeone/db";
import {
  successResponse,
  errorResponse,
  mainLiftValues,
  LIFT_LABELS,
  LIFT_ORDER,
  type MainLift,
  type WeekNumber,
  type WorkoutDayStatus,
} from "@fivethreeone/shared";
import { estimate1RM, calculateTmFromOneRm, progressTm } from "@fivethreeone/core";
import { authMiddleware, getAuth } from "../middleware/auth.js";

const PLATE_INCREMENT = 2.5;

const blocksRoutes = new Hono<{ Bindings: Env }>();

function computeTm(lift: MainLift, weight: number, reps: number): number {
  const estimated = estimate1RM(weight, reps);
  return calculateTmFromOneRm(estimated, PLATE_INCREMENT);
}

function computeTmForCycle(tm: number, lift: MainLift, cycle: number): number {
  let current = tm;
  for (let i = 1; i < cycle; i++) {
    current = progressTm(current, lift);
  }
  return current;
}

// List all blocks for the lifter
blocksRoutes.get("/blocks", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);

  const records = await db
    .select()
    .from(block)
    .where(eq(block.lifterId, auth.lifterId))
    .orderBy(desc(block.createdAt));

  const result = await Promise.all(records.map(async (b) => {
    const days = await db
      .select()
      .from(workoutDay)
      .where(eq(workoutDay.blockId, b.id));

    const totalDays = 4 * 4 * 4; // 4 lifts × 4 cycles × 4 weeks
    const completedDays = days.filter((d) => d.status === "completed" || d.status === "skipped").length;

    return {
      id: b.id,
      lifterId: b.lifterId,
      status: b.status as "active" | "completed",
      squat: { weight: b.squatWeight, reps: b.squatReps },
      benchPress: { weight: b.benchPressWeight, reps: b.benchPressReps },
      deadlift: { weight: b.deadliftWeight, reps: b.deadliftReps },
      overheadPress: { weight: b.overheadPressWeight, reps: b.overheadPressReps },
      completedDays,
      totalDays,
      createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : new Date(b.createdAt).toISOString(),
    };
  }));

  return c.json(successResponse(result));
});

// Create a new block
blocksRoutes.post("/blocks", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);

  const body = await c.req.json<{
    squat: { weight: number; reps: number };
    benchPress: { weight: number; reps: number };
    deadlift: { weight: number; reps: number };
    overheadPress: { weight: number; reps: number };
  }>();

  const lifts: [MainLift, keyof typeof body][] = [
    ["squat", "squat"],
    ["bench_press", "benchPress"],
    ["deadlift", "deadlift"],
    ["overhead_press", "overheadPress"],
  ];

  for (const [, key] of lifts) {
    const entry = body[key];
    if (!entry || typeof entry.weight !== "number" || typeof entry.reps !== "number" || entry.weight <= 0 || entry.reps <= 0) {
      return c.json(errorResponse(`Invalid rep max entry for ${key}`), 400);
    }
  }

  // Check for existing active block
  const existingActive = await db
    .select()
    .from(block)
    .where(and(eq(block.lifterId, auth.lifterId), eq(block.status, "active")))
    .get();

  if (existingActive) {
    return c.json(errorResponse("Complete or delete your current block before creating a new one"), 400);
  }

  const now = new Date();
  const blockId = crypto.randomUUID();

  await db.insert(block).values({
    id: blockId,
    lifterId: auth.lifterId,
    status: "active",
    squatWeight: body.squat.weight,
    squatReps: body.squat.reps,
    benchPressWeight: body.benchPress.weight,
    benchPressReps: body.benchPress.reps,
    deadliftWeight: body.deadlift.weight,
    deadliftReps: body.deadlift.reps,
    overheadPressWeight: body.overheadPress.weight,
    overheadPressReps: body.overheadPress.reps,
    createdAt: now,
  });

  return c.json(successResponse({
    id: blockId,
    lifterId: auth.lifterId,
    status: "active",
    squat: { weight: body.squat.weight, reps: body.squat.reps },
    benchPress: { weight: body.benchPress.weight, reps: body.benchPress.reps },
    deadlift: { weight: body.deadlift.weight, reps: body.deadlift.reps },
    overheadPress: { weight: body.overheadPress.weight, reps: body.overheadPress.reps },
    createdAt: now.toISOString(),
  }));
});

// Get block detail with workout days
blocksRoutes.get("/blocks/:id", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);
  const blockId = c.req.param("id");

  const b = await db
    .select()
    .from(block)
    .where(and(eq(block.id, blockId), eq(block.lifterId, auth.lifterId)))
    .get();

  if (!b) {
    return c.json(errorResponse("Block not found"), 404);
  }

  const days = await db
    .select()
    .from(workoutDay)
    .where(eq(workoutDay.blockId, blockId));

  const repMaxes = {
    squat: { weight: b.squatWeight, reps: b.squatReps },
    benchPress: { weight: b.benchPressWeight, reps: b.benchPressReps },
    deadlift: { weight: b.deadliftWeight, reps: b.deadliftReps },
    overheadPress: { weight: b.overheadPressWeight, reps: b.overheadPressReps },
  };

  return c.json(successResponse({
    block: {
      id: b.id,
      lifterId: b.lifterId,
      status: b.status,
      ...repMaxes,
      createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : new Date(b.createdAt).toISOString(),
    },
    workoutDays: days.map((d) => ({
      id: d.id,
      lift: d.lift as MainLift,
      cycleNumber: d.cycleNumber,
      weekNumber: d.weekNumber as WeekNumber,
      status: d.status as WorkoutDayStatus,
      completedAt: d.completedAt ? (d.completedAt instanceof Date ? d.completedAt.toISOString() : new Date(d.completedAt).toISOString()) : null,
    })),
  }));
});

// Delete a block
blocksRoutes.delete("/blocks/:id", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);
  const blockId = c.req.param("id");

  const b = await db
    .select()
    .from(block)
    .where(and(eq(block.id, blockId), eq(block.lifterId, auth.lifterId)))
    .get();

  if (!b) {
    return c.json(errorResponse("Block not found"), 404);
  }

  await db.delete(block).where(eq(block.id, blockId));

  return c.json(successResponse({ deleted: true }));
});

// Tick a workout day as completed
blocksRoutes.post("/blocks/:id/tick", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);
  const blockId = c.req.param("id");

  const body = await c.req.json<{
    lift: MainLift;
    cycleNumber: number;
    weekNumber: WeekNumber;
  }>();

  const b = await db
    .select()
    .from(block)
    .where(and(eq(block.id, blockId), eq(block.lifterId, auth.lifterId)))
    .get();

  if (!b) {
    return c.json(errorResponse("Block not found"), 404);
  }

  if (b.status === "completed") {
    return c.json(errorResponse("Block is already completed"), 400);
  }

  if (!(mainLiftValues as readonly string[]).includes(body.lift)) {
    return c.json(errorResponse("Invalid lift"), 400);
  }

  if (body.cycleNumber < 1 || body.cycleNumber > 4) {
    return c.json(errorResponse("Invalid cycle number"), 400);
  }

  if (body.weekNumber < 1 || body.weekNumber > 4) {
    return c.json(errorResponse("Invalid week number"), 400);
  }

  const now = new Date();

  // Upsert the workout day
  const existing = await db
    .select()
    .from(workoutDay)
    .where(
      and(
        eq(workoutDay.blockId, blockId),
        eq(workoutDay.lift, body.lift),
        eq(workoutDay.cycleNumber, body.cycleNumber),
        eq(workoutDay.weekNumber, body.weekNumber),
      ),
    )
    .get();

  if (existing) {
    if (existing.status === "completed" || existing.status === "skipped") {
      return c.json(errorResponse("Workout day already completed"), 400);
    }
    await db
      .update(workoutDay)
      .set({ status: "completed", completedAt: now })
      .where(eq(workoutDay.id, existing.id));
  } else {
    await db.insert(workoutDay).values({
      id: crypto.randomUUID(),
      blockId,
      lift: body.lift,
      cycleNumber: body.cycleNumber,
      weekNumber: body.weekNumber,
      status: "completed",
      completedAt: now,
    });
  }

  // Check if this completes the block
  const allDays = await db
    .select()
    .from(workoutDay)
    .where(eq(workoutDay.blockId, blockId));

  const totalRequired = 4 * 4 * 4;
  const completedOrSkipped = allDays.filter((d) => d.status === "completed" || d.status === "skipped").length;

  if (completedOrSkipped >= totalRequired) {
    await db
      .update(block)
      .set({ status: "completed" })
      .where(eq(block.id, blockId));
  }

  return c.json(successResponse({ completed: true }));
});

// Skip deload week for a cycle
blocksRoutes.post("/blocks/:id/skip-deload", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);
  const blockId = c.req.param("id");

  const body = await c.req.json<{ cycleNumber: number }>();

  const b = await db
    .select()
    .from(block)
    .where(and(eq(block.id, blockId), eq(block.lifterId, auth.lifterId)))
    .get();

  if (!b) {
    return c.json(errorResponse("Block not found"), 404);
  }

  if (body.cycleNumber < 1 || body.cycleNumber > 4) {
    return c.json(errorResponse("Invalid cycle number"), 400);
  }

  const now = new Date();

  // Mark all 4 deload days as skipped
  for (const lift of mainLiftValues) {
    const existing = await db
      .select()
      .from(workoutDay)
      .where(
        and(
          eq(workoutDay.blockId, blockId),
          eq(workoutDay.lift, lift),
          eq(workoutDay.cycleNumber, body.cycleNumber),
          eq(workoutDay.weekNumber, 4),
        ),
      )
      .get();

    if (existing) {
      if (existing.status === "pending") {
        await db
          .update(workoutDay)
          .set({ status: "skipped" })
          .where(eq(workoutDay.id, existing.id));
      }
    } else {
      await db.insert(workoutDay).values({
        id: crypto.randomUUID(),
        blockId,
        lift,
        cycleNumber: body.cycleNumber,
        weekNumber: 4,
        status: "skipped",
        completedAt: now,
      });
    }
  }

  // Check block completion
  const allDays = await db
    .select()
    .from(workoutDay)
    .where(eq(workoutDay.blockId, blockId));

  const totalRequired = 4 * 4 * 4;
  const completedOrSkipped = allDays.filter((d) => d.status === "completed" || d.status === "skipped").length;

  if (completedOrSkipped >= totalRequired) {
    await db
      .update(block)
      .set({ status: "completed" })
      .where(eq(block.id, blockId));
  }

  return c.json(successResponse({ skipped: true }));
});

export default blocksRoutes;

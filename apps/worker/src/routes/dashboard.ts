import { eq, and, desc } from "drizzle-orm";
import { Hono } from "hono";
import { createDbClient, lifter, trainingMax, workout, personalRecord } from "@fivethreeone/db";
import { successResponse, errorResponse, mainLiftValues, LIFT_LABELS, LIFT_ORDER, type MainLift } from "@fivethreeone/shared";
import { authMiddleware, getAuth } from "../middleware/auth.js";

function computeCycleInfo(completedWeeks: Set<number>): {
  currentWeek: number;
  progress: { week: number; completed: boolean }[];
} {
  const progress = [1, 2, 3, 4].map((week) => ({
    week,
    completed: completedWeeks.has(week),
  }));
  let currentWeek: number;
  if (completedWeeks.has(4)) {
    currentWeek = 4;
  } else {
    for (let w = 1; w <= 4; w++) {
      if (!completedWeeks.has(w)) {
        currentWeek = w;
        break;
      }
    }
    currentWeek ??= 1;
  }
  return { currentWeek, progress };
}

const dashboardRoutes = new Hono<{ Bindings: Env }>();

dashboardRoutes.get("/lifts", (c) => {
  const lifts = mainLiftValues.map((id) => ({
    id,
    displayName: LIFT_LABELS[id],
  }));
  return c.json(successResponse(lifts));
});

dashboardRoutes.get("/lifts/:liftId/cycle", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const liftId = c.req.param("liftId") as MainLift;
  const db = createDbClient(c.env);

  if (!(mainLiftValues as readonly string[]).includes(liftId)) {
    return c.json(errorResponse("Invalid lift"), 400);
  }

  const tmRecord = await db
    .select()
    .from(trainingMax)
    .where(
      and(eq(trainingMax.lifterId, auth.lifterId), eq(trainingMax.lift, liftId)),
    )
    .get();

  if (!tmRecord) {
    return c.json(errorResponse("Training max not found for this lift"), 404);
  }

  const completedWorkouts = await db
    .select()
    .from(workout)
    .where(
      and(
        eq(workout.lifterId, auth.lifterId),
        eq(workout.lift, liftId),
        eq(workout.cycleNumber, tmRecord.cycleNumber),
        eq(workout.status, "completed"),
      ),
    );

  const completedWeeks = new Set(completedWorkouts.map((w) => w.weekNumber));
  const { currentWeek, progress } = computeCycleInfo(completedWeeks);

  return c.json(
    successResponse({
      lift: liftId,
      displayName: LIFT_LABELS[liftId],
      cycleNumber: tmRecord.cycleNumber,
      trainingMax: tmRecord.trainingMaxValue,
      currentWeek,
      progress,
    }),
  );
});

dashboardRoutes.get("/dashboard", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);

  const lifterRecord = await db
    .select()
    .from(lifter)
    .where(eq(lifter.id, auth.lifterId))
    .get();

  if (!lifterRecord) {
    return c.json(errorResponse("Lifter not found"), 404);
  }

  const tmRecords = await db
    .select()
    .from(trainingMax)
    .where(eq(trainingMax.lifterId, auth.lifterId));

  const allCompletedWorkouts = await db
    .select()
    .from(workout)
    .where(
      and(eq(workout.lifterId, auth.lifterId), eq(workout.status, "completed")),
    )
    .orderBy(desc(workout.completedAt));

  const prRecords = await db
    .select()
    .from(personalRecord)
    .where(eq(personalRecord.lifterId, auth.lifterId))
    .orderBy(desc(personalRecord.achievedAt));

  const lifts = LIFT_ORDER.map((liftId) => {
    const tm = tmRecords.find((r) => r.lift === liftId);
    const cycleNumber = tm?.cycleNumber ?? 1;
    const trainingMaxValue = tm?.trainingMaxValue ?? 0;

    const liftCompletedWorkouts = allCompletedWorkouts.filter(
      (w) => w.lift === liftId && w.cycleNumber === cycleNumber,
    );
    const completedWeeks = new Set(liftCompletedWorkouts.map((w) => w.weekNumber));
    const { currentWeek, progress } = computeCycleInfo(completedWeeks);

    return {
      id: liftId,
      displayName: LIFT_LABELS[liftId],
      cycleNumber,
      trainingMax: trainingMaxValue,
      currentWeek,
      progress,
    };
  });

  const completedSet = new Map<string, Set<number>>();
  for (const liftId of LIFT_ORDER) {
    const tm = tmRecords.find((r) => r.lift === liftId);
    const cycleNumber = tm?.cycleNumber ?? 1;
    const liftCompleted = allCompletedWorkouts.filter(
      (w) => w.lift === liftId && w.cycleNumber === cycleNumber,
    );
    completedSet.set(
      liftId,
      new Set(liftCompleted.map((w) => w.weekNumber)),
    );
  }

  let todayWorkout: { lift: string; displayName: string; weekNumber: number } | null = null;
  let nextWorkout: { lift: string; displayName: string; weekNumber: number } | null = null;

  for (let week = 1; week <= 4; week++) {
    for (const liftId of LIFT_ORDER) {
      const weekCompleted = completedSet.get(liftId)?.has(week) ?? false;

      if (!weekCompleted) {
        todayWorkout = { lift: liftId, displayName: LIFT_LABELS[liftId], weekNumber: week };
        break;
      }
    }
    if (todayWorkout) break;
  }

  if (!todayWorkout) {
    todayWorkout = { lift: "squat", displayName: "Squat", weekNumber: 1 };
  }

  const todayIdx = LIFT_ORDER.indexOf(todayWorkout.lift as MainLift);
  if (todayIdx < LIFT_ORDER.length - 1) {
    const nextLift = LIFT_ORDER[todayIdx + 1];
    nextWorkout = {
      lift: nextLift,
      displayName: LIFT_LABELS[nextLift],
      weekNumber: todayWorkout.weekNumber,
    };
  } else {
    const nextLift = LIFT_ORDER[0];
    const nextWeek = todayWorkout.weekNumber < 4 ? todayWorkout.weekNumber + 1 : 1;
    nextWorkout = {
      lift: nextLift,
      displayName: LIFT_LABELS[nextLift],
      weekNumber: nextWeek,
    };
  }

  const recentWorkouts = allCompletedWorkouts.slice(0, 5).map((w) => ({
    id: w.id,
    lift: w.lift,
    displayName: LIFT_LABELS[w.lift] ?? w.lift,
    weekNumber: w.weekNumber,
    cycleNumber: w.cycleNumber,
    completedAt: typeof w.completedAt === "number" ? new Date(w.completedAt).toISOString() : null,
  }));

  const personalRecords = prRecords.slice(0, 10).map((pr) => ({
    lift: pr.lift,
    displayName: LIFT_LABELS[pr.lift] ?? pr.lift,
    prType: pr.prType,
    value: pr.value,
    achievedAt: typeof pr.achievedAt === "number" ? new Date(pr.achievedAt).toISOString() : "",
  }));

  const hasCompletedWorkouts = allCompletedWorkouts.length > 0;

  return c.json(
    successResponse({
      lifts,
      todayWorkout,
      nextWorkout,
      recentWorkouts,
      personalRecords,
      unitPreference: lifterRecord.weightUnit,
      hasCompletedWorkouts,
    }),
  );
});

export default dashboardRoutes;

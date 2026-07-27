import { eq, and, desc, count } from "drizzle-orm";
import { Hono } from "hono";
import { createDbClient, workout, workoutSet, assistanceExercise } from "@fivethreeone/db";
import { successResponse, errorResponse, mainLiftValues, LIFT_LABELS, type MainLift } from "@fivethreeone/shared";
import { authMiddleware, getAuth } from "../middleware/auth.js";

const historyRoutes = new Hono<{ Bindings: Env }>();

historyRoutes.get("/workouts", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);

  const liftParam = c.req.query("lift");
  const cycleParam = c.req.query("cycle");
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "20", 10) || 20));

  const filters = [
    eq(workout.lifterId, auth.lifterId),
    eq(workout.status, "completed"),
  ];

  if (liftParam && (mainLiftValues as readonly string[]).includes(liftParam)) {
    filters.push(eq(workout.lift, liftParam as MainLift));
  }

  if (cycleParam) {
    const cycleNum = parseInt(cycleParam, 10);
    if (!isNaN(cycleNum)) {
      filters.push(eq(workout.cycleNumber, cycleNum));
    }
  }

  const total = await db
    .select({ value: count() })
    .from(workout)
    .where(and(...filters))
    .get();

  const totalCount = total?.value ?? 0;

  const rows = await db
    .select()
    .from(workout)
    .where(and(...filters))
    .orderBy(desc(workout.completedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const workoutsWithDetails = await Promise.all(
    rows.map(async (w) => {
      const sets = await db
        .select()
        .from(workoutSet)
        .where(eq(workoutSet.workoutId, w.id));

      const exercises = await db
        .select()
        .from(assistanceExercise)
        .where(eq(assistanceExercise.workoutId, w.id));

      return {
        id: w.id,
        lift: w.lift,
        displayName: LIFT_LABELS[w.lift] ?? w.lift,
        weekNumber: w.weekNumber,
        cycleNumber: w.cycleNumber,
        notes: w.notes,
        completedAt: typeof w.completedAt === "number" ? new Date(w.completedAt).toISOString() : null,
        createdAt: typeof w.createdAt === "number" ? new Date(w.createdAt).toISOString() : null,
        sets: sets.map((s) => ({
          id: s.id,
          setNumber: s.setNumber,
          targetPercentage: s.targetPercentage,
          calculatedWeight: s.calculatedWeight,
          actualWeight: s.actualWeight,
          targetReps: s.targetReps,
          actualReps: s.actualReps,
          isAmrap: Boolean(s.isAmrap),
        })),
        assistanceExercises: exercises.map((e) => ({
          id: e.id,
          exerciseName: e.exerciseName,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          notes: e.notes,
          templateName: e.templateName,
        })),
      };
    }),
  );

  return c.json(
    successResponse({
      workouts: workoutsWithDetails,
      total: totalCount,
      page,
      limit,
    }),
  );
});

historyRoutes.get("/lifts/:liftId/history", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const liftId = c.req.param("liftId") ?? "";
  const db = createDbClient(c.env);

  if (!(mainLiftValues as readonly string[]).includes(liftId)) {
    return c.json(errorResponse("Invalid lift"), 400);
  }

  const lift = liftId as MainLift;

  const rows = await db
    .select()
    .from(workout)
    .where(
      and(
        eq(workout.lifterId, auth.lifterId),
        eq(workout.lift, lift),
        eq(workout.status, "completed"),
      ),
    )
    .orderBy(desc(workout.completedAt));

  const workoutsWithDetails = await Promise.all(
    rows.map(async (w) => {
      const sets = await db
        .select()
        .from(workoutSet)
        .where(eq(workoutSet.workoutId, w.id));

      const exercises = await db
        .select()
        .from(assistanceExercise)
        .where(eq(assistanceExercise.workoutId, w.id));

      return {
        id: w.id,
        lift: w.lift,
        displayName: LIFT_LABELS[w.lift] ?? w.lift,
        weekNumber: w.weekNumber,
        cycleNumber: w.cycleNumber,
        notes: w.notes,
        completedAt: typeof w.completedAt === "number" ? new Date(w.completedAt).toISOString() : null,
        createdAt: typeof w.createdAt === "number" ? new Date(w.createdAt).toISOString() : null,
        sets: sets.map((s) => ({
          id: s.id,
          setNumber: s.setNumber,
          targetPercentage: s.targetPercentage,
          calculatedWeight: s.calculatedWeight,
          actualWeight: s.actualWeight,
          targetReps: s.targetReps,
          actualReps: s.actualReps,
          isAmrap: Boolean(s.isAmrap),
        })),
        assistanceExercises: exercises.map((e) => ({
          id: e.id,
          exerciseName: e.exerciseName,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          notes: e.notes,
          templateName: e.templateName,
        })),
      };
    }),
  );

  return c.json(successResponse(workoutsWithDetails));
});

export default historyRoutes;

import { eq, and } from "drizzle-orm";
import { Hono } from "hono";
import { createDbClient, lifter, trainingMax, workout, workoutSet, assistanceExercise, personalRecord } from "@fivethreeone/db";
import { successResponse, errorResponse, mainLiftValues, LIFT_LABELS, LIFT_ORDER, type MainLift, type WeekNumber } from "@fivethreeone/shared";
import { generateWorkoutSets, getWeekPattern, progressTm } from "@fivethreeone/core";
import { authMiddleware, getAuth } from "../middleware/auth.js";

const VALID_PLATE_INCREMENTS = [0.5, 1, 2.5, 5] as const;

function plateIncrementFromDb(value: number): number {
  const inc = value / 1000;
  return (VALID_PLATE_INCREMENTS.find((i) => i === inc) ?? 2.5) as (typeof VALID_PLATE_INCREMENTS)[number];
}

function computeCycleInfo(completedWeeks: Set<number>): {
  currentWeek: number;
} {
  for (let w = 1; w <= 4; w++) {
    if (!completedWeeks.has(w)) {
      return { currentWeek: w };
    }
  }
  return { currentWeek: 4 };
}

const workoutRoutes = new Hono<{ Bindings: Env }>();

workoutRoutes.get("/workouts/current", authMiddleware, async (c) => {
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

  const plateInc = plateIncrementFromDb(lifterRecord.plateIncrement);

  const tmRecords = await db
    .select()
    .from(trainingMax)
    .where(eq(trainingMax.lifterId, auth.lifterId));

  const allWorkouts = await db
    .select()
    .from(workout)
    .where(eq(workout.lifterId, auth.lifterId));

  const results = await Promise.all(
    LIFT_ORDER.map(async (liftId: string) => {
      const tm = tmRecords.find((r) => r.lift === liftId);
      if (!tm) {
        return {
          lift: liftId,
          displayName: LIFT_LABELS[liftId],
          weekNumber: 1,
          cycleNumber: 1,
          trainingMax: 0,
          status: "not_started" as const,
          workoutId: null,
          sets: [],
        };
      }

      const cycleWorkouts = allWorkouts.filter(
        (w) => w.lift === liftId && w.cycleNumber === tm.cycleNumber,
      );
      const completedWeeks = new Set(
        cycleWorkouts.filter((w) => w.status === "completed").map((w) => w.weekNumber),
      );
      const { currentWeek } = computeCycleInfo(completedWeeks);

      const inProgress = cycleWorkouts.find((w) => w.status === "in_progress");

      let sets;
      let status: "not_started" | "in_progress" | "completed";
      let workoutId: string | null = null;

      if (inProgress) {
        status = "in_progress";
        workoutId = inProgress.id;
        const existingSets = await db
          .select()
          .from(workoutSet)
          .where(eq(workoutSet.workoutId, inProgress.id));
        sets = existingSets.map((s) => ({
          id: s.id,
          setNumber: s.setNumber,
          targetPercentage: s.targetPercentage,
          calculatedWeight: s.calculatedWeight,
          actualWeight: s.actualWeight,
          targetReps: s.targetReps,
          actualReps: s.actualReps,
          isAmrap: Boolean(s.isAmrap),
        }));
      } else if (completedWeeks.has(currentWeek)) {
        status = "completed";
        const completedWo = cycleWorkouts.find(
          (w) => w.weekNumber === currentWeek && w.status === "completed",
        );
        workoutId = completedWo?.id ?? null;
        if (completedWo) {
          const existingSets = await db
            .select()
            .from(workoutSet)
            .where(eq(workoutSet.workoutId, completedWo.id));
          sets = existingSets.map((s) => ({
            id: s.id,
            setNumber: s.setNumber,
            targetPercentage: s.targetPercentage,
            calculatedWeight: s.calculatedWeight,
            actualWeight: s.actualWeight,
            targetReps: s.targetReps,
            actualReps: s.actualReps,
            isAmrap: Boolean(s.isAmrap),
          }));
        } else {
          const pattern = getWeekPattern(currentWeek as WeekNumber);
          const generated = generateWorkoutSets(tm.trainingMaxValue, currentWeek as WeekNumber, plateInc);
          sets = generated.map((s, i) => ({
            id: null,
            setNumber: s.setNumber,
            targetPercentage: pattern.sets[i]?.percentage ?? 0,
            calculatedWeight: s.weight,
            actualWeight: null,
            targetReps: s.reps,
            actualReps: null,
            isAmrap: s.isAmrap,
          }));
        }
      } else {
        status = "not_started";
        const pattern = getWeekPattern(currentWeek as WeekNumber);
        const generated = generateWorkoutSets(tm.trainingMaxValue, currentWeek as WeekNumber, plateInc);
        sets = generated.map((s, i) => ({
          id: null,
          setNumber: s.setNumber,
          targetPercentage: pattern.sets[i]?.percentage ?? 0,
          calculatedWeight: s.weight,
          actualWeight: null,
          targetReps: s.reps,
          actualReps: null,
          isAmrap: s.isAmrap,
        }));
      }

      return {
        lift: liftId,
        displayName: LIFT_LABELS[liftId],
        weekNumber: currentWeek,
        cycleNumber: tm.cycleNumber,
        trainingMax: tm.trainingMaxValue,
        status,
        workoutId,
        sets,
      };
    }),
  );

  return c.json(successResponse(results));
});

workoutRoutes.post("/workouts", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);

  const body = await c.req.json<{ lift: string }>();
  const liftId = body.lift as MainLift;

  if (!(mainLiftValues as readonly string[]).includes(liftId)) {
    return c.json(errorResponse("Invalid lift"), 400);
  }

  const lifterRecord = await db
    .select()
    .from(lifter)
    .where(eq(lifter.id, auth.lifterId))
    .get();

  if (!lifterRecord) {
    return c.json(errorResponse("Lifter not found"), 404);
  }

  const plateInc = plateIncrementFromDb(lifterRecord.plateIncrement);

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

  const existingInProgress = await db
    .select()
    .from(workout)
    .where(
      and(
        eq(workout.lifterId, auth.lifterId),
        eq(workout.lift, liftId),
        eq(workout.cycleNumber, tmRecord.cycleNumber),
        eq(workout.status, "in_progress"),
      ),
    )
    .get();

  if (existingInProgress) {
    const sets = await db
      .select()
      .from(workoutSet)
      .where(eq(workoutSet.workoutId, existingInProgress.id));

    return c.json(
      successResponse({
        id: existingInProgress.id,
        lift: existingInProgress.lift,
        weekNumber: existingInProgress.weekNumber,
        cycleNumber: existingInProgress.cycleNumber,
        status: existingInProgress.status,
        notes: existingInProgress.notes,
        createdAt: existingInProgress.createdAt,
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
        assistanceExercises: [],
      }),
    );
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
  const { currentWeek } = computeCycleInfo(completedWeeks);

  const now = new Date();
  const pattern = getWeekPattern(currentWeek as WeekNumber);
  const generated = generateWorkoutSets(tmRecord.trainingMaxValue, currentWeek as WeekNumber, plateInc);

  const workoutId = crypto.randomUUID();
  await db.insert(workout).values({
    id: workoutId,
    lifterId: auth.lifterId,
    lift: liftId,
    weekNumber: currentWeek,
    cycleNumber: tmRecord.cycleNumber,
    status: "in_progress",
    notes: null,
    completedAt: null,
    createdAt: now,
  });

  const setValues = generated.map((set, index) => ({
    id: crypto.randomUUID(),
    workoutId,
    setNumber: set.setNumber,
    targetPercentage: pattern.sets[index]?.percentage ?? 0,
    calculatedWeight: set.weight,
    actualWeight: null,
    targetReps: set.reps,
    actualReps: null,
    isAmrap: set.isAmrap ? 1 : 0,
  }));

  await db.insert(workoutSet).values(setValues as never);

  return c.json(
    successResponse({
      id: workoutId,
      lift: liftId,
      weekNumber: currentWeek,
      cycleNumber: tmRecord.cycleNumber,
      status: "in_progress",
      notes: null,
      createdAt: now,
      sets: setValues.map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        targetPercentage: s.targetPercentage,
        calculatedWeight: s.calculatedWeight,
        actualWeight: s.actualWeight,
        targetReps: s.targetReps,
        actualReps: s.actualReps,
        isAmrap: Boolean(s.isAmrap),
      })),
      assistanceExercises: [],
    }),
    201,
  );
});

workoutRoutes.get("/workouts/:id", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);
  const id = c.req.param("id") ?? "";

  const wo = await db
    .select()
    .from(workout)
    .where(and(eq(workout.id, id), eq(workout.lifterId, auth.lifterId)))
    .get();

  if (!wo) {
    return c.json(errorResponse("Workout not found"), 404);
  }

  const sets = await db
    .select()
    .from(workoutSet)
    .where(eq(workoutSet.workoutId, id));

  const exercises = await db
    .select()
    .from(assistanceExercise)
    .where(eq(assistanceExercise.workoutId, id));

  return c.json(
    successResponse({
      id: wo.id,
      lift: wo.lift,
      weekNumber: wo.weekNumber,
      cycleNumber: wo.cycleNumber,
      status: wo.status,
      notes: wo.notes,
      completedAt: wo.completedAt,
      createdAt: wo.createdAt,
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
    }),
  );
});

workoutRoutes.put("/workouts/:id", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);
  const id = c.req.param("id") ?? "";

  const wo = await db
    .select()
    .from(workout)
    .where(and(eq(workout.id, id), eq(workout.lifterId, auth.lifterId)))
    .get();

  if (!wo) {
    return c.json(errorResponse("Workout not found"), 404);
  }

  const body = await c.req.json<{
    notes?: string | null;
    sets?: { id: string; actualWeight: number | null; actualReps: number | null }[];
    assistanceExercises?: {
      exerciseName: string;
      sets: number;
      reps: number;
      weight: number | null;
      notes: string | null;
      templateName?: string | null;
    }[];
  }>();

  const now = new Date();

  const updateData: Record<string, unknown> = {
    status: "completed",
    completedAt: now,
  };
  if (body.notes !== undefined) {
    updateData.notes = body.notes;
  }

  await db.update(workout).set(updateData).where(eq(workout.id, id));

  if (body.sets) {
    for (const setUpdate of body.sets) {
      await db
        .update(workoutSet)
        .set({
          actualWeight: setUpdate.actualWeight,
          actualReps: setUpdate.actualReps,
        })
        .where(eq(workoutSet.id, setUpdate.id));
    }
  }

  if (body.assistanceExercises && body.assistanceExercises.length > 0) {
    const exerciseValues = body.assistanceExercises.map((e) => ({
      id: crypto.randomUUID(),
      workoutId: id,
      exerciseName: e.exerciseName,
      sets: e.sets,
      reps: e.reps,
      weight: e.weight,
      notes: e.notes,
      templateName: e.templateName ?? null,
    }));
    await db.insert(assistanceExercise).values(exerciseValues as never);
  }

  if (wo.weekNumber !== 4) {
    const cycleCompletedWorkouts = await db
      .select()
      .from(workout)
      .where(
        and(
          eq(workout.lifterId, auth.lifterId),
          eq(workout.lift, wo.lift),
          eq(workout.cycleNumber, wo.cycleNumber),
          eq(workout.status, "completed"),
        ),
      );

    const completedNonDeloadWeeks = new Set(
      cycleCompletedWorkouts
        .filter((w) => w.weekNumber !== 4)
        .map((w) => w.weekNumber),
    );

    if (completedNonDeloadWeeks.size === 3) {
      const tmRecord = await db
        .select()
        .from(trainingMax)
        .where(
          and(
            eq(trainingMax.lifterId, auth.lifterId),
            eq(trainingMax.lift, wo.lift),
          ),
        )
        .get();

      if (tmRecord) {
        const newTm = progressTm(tmRecord.trainingMaxValue, wo.lift as MainLift);
        const newCycleNumber = tmRecord.cycleNumber + 1;

        await db
          .update(trainingMax)
          .set({
            trainingMaxValue: newTm,
            cycleNumber: newCycleNumber,
            updatedAt: now,
          })
          .where(eq(trainingMax.id, tmRecord.id));

        const existingPrs = await db
          .select()
          .from(personalRecord)
          .where(
            and(
              eq(personalRecord.lifterId, auth.lifterId),
              eq(personalRecord.lift, wo.lift),
              eq(personalRecord.prType, "tm"),
            ),
          );

        const maxPreviousTm = existingPrs.reduce(
          (max, pr) => Math.max(max, pr.value),
          tmRecord.trainingMaxValue,
        );

        if (newTm > maxPreviousTm) {
          await db.insert(personalRecord).values({
            id: crypto.randomUUID(),
            lifterId: auth.lifterId,
            lift: wo.lift,
            prType: "tm",
            value: newTm,
            achievedAt: now,
            workoutId: id,
          } as never);
        }
      }
    }
  }

  const updatedSets = await db
    .select()
    .from(workoutSet)
    .where(eq(workoutSet.workoutId, id));

  const updatedExercises = await db
    .select()
    .from(assistanceExercise)
    .where(eq(assistanceExercise.workoutId, id));

  return c.json(
    successResponse({
      id: wo.id,
      lift: wo.lift,
      weekNumber: wo.weekNumber,
      cycleNumber: wo.cycleNumber,
      status: "completed",
      notes: body.notes ?? wo.notes,
      completedAt: now,
      createdAt: wo.createdAt,
      sets: updatedSets.map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        targetPercentage: s.targetPercentage,
        calculatedWeight: s.calculatedWeight,
        actualWeight: s.actualWeight,
        targetReps: s.targetReps,
        actualReps: s.actualReps,
        isAmrap: Boolean(s.isAmrap),
      })),
      assistanceExercises: updatedExercises.map((e) => ({
        id: e.id,
        exerciseName: e.exerciseName,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
        notes: e.notes,
        templateName: e.templateName,
      })),
    }),
  );
});

export default workoutRoutes;

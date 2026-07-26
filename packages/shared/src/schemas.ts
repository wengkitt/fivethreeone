import { z } from "zod";
import { MainLift } from "./types.js";

export const unitPreferenceSchema = z.enum(["kg", "lb"]);

export const plateIncrementSchema = z.union([
  z.literal(0.5),
  z.literal(1),
  z.literal(2.5),
  z.literal(5),
]);

export const mainLiftSchema = z.enum([
  MainLift.squat,
  MainLift.bench_press,
  MainLift.deadlift,
  MainLift.overhead_press,
]);

export const weekNumberSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const workoutStatusSchema = z.enum(["in_progress", "completed"]);

export const prTypeSchema = z.enum(["tm", "estimated_1rm", "amrap_reps"]);

export const assistanceExerciseItemSchema = z.object({
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  weight: z.number().nullable(),
  notes: z.string().nullable(),
});

export const lifterSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string().min(1).max(50),
  unitPreference: unitPreferenceSchema,
  plateIncrement: plateIncrementSchema,
});

export const createLifterSchema = z.object({
  username: z.string().min(1).max(50),
  unitPreference: unitPreferenceSchema,
  plateIncrement: plateIncrementSchema,
});

export const cycleInfoSchema = z.object({
  cycleId: z.string(),
  lifterId: z.string(),
  mainLift: mainLiftSchema,
  trainingMax: z.number().positive(),
  week: weekNumberSchema,
  startDate: z.string(),
});

export const createCycleSchema = z.object({
  lifterId: z.string(),
  mainLift: mainLiftSchema,
  trainingMax: z.number().positive(),
  week: weekNumberSchema,
  startDate: z.string(),
});

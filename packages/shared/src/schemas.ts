import { z } from "zod";

export const mainLiftSchema = z.enum([
  "squat",
  "bench_press",
  "deadlift",
  "overhead_press",
]);

export const weekNumberSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const repMaxEntrySchema = z.object({
  weight: z.number().positive(),
  reps: z.number().int().positive(),
});

export const createBlockSchema = z.object({
  squat: repMaxEntrySchema,
  benchPress: repMaxEntrySchema,
  deadlift: repMaxEntrySchema,
  overheadPress: repMaxEntrySchema,
});

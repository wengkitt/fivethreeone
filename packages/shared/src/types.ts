export type UnitPreference = "kg" | "lb";

export type PlateIncrement = 0.5 | 1 | 2.5 | 5;

export interface Lifter {
  id: string;
  userId: string;
  username: string;
  unitPreference: UnitPreference;
  plateIncrement: PlateIncrement;
}

export const MainLift = {
  squat: "squat",
  bench_press: "bench_press",
  deadlift: "deadlift",
  overhead_press: "overhead_press",
} as const;

export type MainLift = (typeof MainLift)[keyof typeof MainLift];

export const mainLiftValues = [
  MainLift.squat,
  MainLift.bench_press,
  MainLift.deadlift,
  MainLift.overhead_press,
] as const satisfies readonly [string, ...string[]];

export const LIFT_LABELS: Record<string, string> = {
  squat: "Squat",
  bench_press: "Bench Press",
  deadlift: "Deadlift",
  overhead_press: "Overhead Press",
};

export const LIFT_ORDER = ["squat", "bench_press", "deadlift", "overhead_press"] as const satisfies readonly MainLift[];

export type WeekNumber = 1 | 2 | 3 | 4;

export type WorkoutStatus = "in_progress" | "completed";

export const PrType = {
  tm: "tm",
  estimated_1rm: "estimated_1rm",
  amrap_reps: "amrap_reps",
} as const;

export type PrType = (typeof PrType)[keyof typeof PrType];

export const prTypeValues = [
  PrType.tm,
  PrType.estimated_1rm,
  PrType.amrap_reps,
] as const satisfies readonly [string, ...string[]];

export interface WorkoutSet {
  setNumber: number;
  weight: number;
  reps: number;
  isAmrap: boolean;
}

export interface AssistanceExerciseItem {
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  notes: string | null;
}

export interface CycleInfo {
  cycleId: string;
  lifterId: string;
  mainLift: MainLift;
  trainingMax: number;
  week: WeekNumber;
  startDate: string;
}

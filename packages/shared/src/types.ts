export type MainLift = "squat" | "bench_press" | "deadlift" | "overhead_press";

export const mainLiftValues = [
  "squat",
  "bench_press",
  "deadlift",
  "overhead_press",
] as const satisfies readonly [string, ...string[]];

export const LIFT_LABELS: Record<string, string> = {
  squat: "Squat",
  bench_press: "Bench Press",
  deadlift: "Deadlift",
  overhead_press: "Overhead Press",
};

export const LIFT_ORDER = ["squat", "bench_press", "deadlift", "overhead_press"] as const satisfies readonly MainLift[];

export type WeekNumber = 1 | 2 | 3 | 4;

export type WorkoutDayStatus = "pending" | "completed" | "skipped";

export type BlockStatus = "active" | "completed";

export interface RepMaxEntry {
  weight: number;
  reps: number;
}

export interface Block {
  id: string;
  lifterId: string;
  status: BlockStatus;
  squat: RepMaxEntry;
  benchPress: RepMaxEntry;
  deadlift: RepMaxEntry;
  overheadPress: RepMaxEntry;
  createdAt: string;
}

export interface WorkoutDay {
  id?: string;
  lift: MainLift;
  cycleNumber: number;
  weekNumber: WeekNumber;
  status: WorkoutDayStatus;
  completedAt: string | null;
}

export interface BlockDetail {
  block: Block;
  workoutDays: WorkoutDay[];
}

export interface Lifter {
  id: string;
  userId: string;
  username: string;
}

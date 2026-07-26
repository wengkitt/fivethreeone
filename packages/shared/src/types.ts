export type UnitPreference = "kg" | "lb";

export type PlateIncrement = 0.5 | 1 | 2.5 | 5;

export interface Lifter {
  id: string;
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

export type WeekNumber = 1 | 2 | 3 | 4;

export interface WorkoutSet {
  setNumber: number;
  weight: number;
  reps: number;
  isAmrap: boolean;
}

export interface CycleInfo {
  cycleId: string;
  lifterId: string;
  mainLift: MainLift;
  trainingMax: number;
  week: WeekNumber;
  startDate: string;
}

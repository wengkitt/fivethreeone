import type { WeekNumber, MainLift, WorkoutSet } from "@fivethreeone/shared";

export interface WeekSet {
  percentage: number;
  reps: number;
  isAmrap: boolean;
}

export interface WeekPattern {
  sets: WeekSet[];
}

export function calculateTmFromOneRm(
  oneRm: number,
  plateIncrement: number,
): number {
  const raw = oneRm * 0.9;
  return Math.floor(raw / plateIncrement) * plateIncrement;
}

export function calculateWeight(
  tm: number,
  percentage: number,
  plateIncrement: number,
): number {
  const raw = tm * (percentage / 100);
  return Math.floor(raw / plateIncrement) * plateIncrement;
}

export function estimate1RM(weight: number, reps: number): number {
  return weight * reps * 0.0333 + weight;
}

export function progressTm(currentTm: number, lift: MainLift): number {
  const increment =
    lift === "bench_press" || lift === "overhead_press" ? 2.5 : 5;
  return currentTm + increment;
}

export function getWeekPattern(week: WeekNumber): WeekPattern {
  const patterns: Record<WeekNumber, WeekPattern> = {
    1: {
      sets: [
        { percentage: 65, reps: 5, isAmrap: false },
        { percentage: 75, reps: 5, isAmrap: false },
        { percentage: 85, reps: 5, isAmrap: true },
      ],
    },
    2: {
      sets: [
        { percentage: 70, reps: 3, isAmrap: false },
        { percentage: 80, reps: 3, isAmrap: false },
        { percentage: 90, reps: 3, isAmrap: true },
      ],
    },
    3: {
      sets: [
        { percentage: 75, reps: 5, isAmrap: false },
        { percentage: 85, reps: 3, isAmrap: false },
        { percentage: 95, reps: 1, isAmrap: true },
      ],
    },
    4: {
      sets: [
        { percentage: 40, reps: 5, isAmrap: false },
        { percentage: 50, reps: 5, isAmrap: false },
        { percentage: 60, reps: 5, isAmrap: false },
      ],
    },
  };
  return patterns[week];
}

export function generateWorkoutSets(
  tm: number,
  week: WeekNumber,
  plateIncrement: number,
): WorkoutSet[] {
  const pattern = getWeekPattern(week);
  return pattern.sets.map((set, index) => ({
    setNumber: index + 1,
    weight: calculateWeight(tm, set.percentage, plateIncrement),
    reps: set.reps,
    isAmrap: set.isAmrap,
  }));
}

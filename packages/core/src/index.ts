export type { Lifter, UnitPreference, PlateIncrement, MainLift, WeekNumber, CycleInfo, WorkoutSet } from "@fivethreeone/shared";

export {
  calculateWeight,
  estimate1RM,
  progressTm,
  getWeekPattern,
  generateWorkoutSets,
} from "./calculations.js";
export type { WeekSet, WeekPattern } from "./calculations.js";

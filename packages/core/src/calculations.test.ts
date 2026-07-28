import { describe, it, expect } from "vitest";
import {
  calculateWeight,
  calculateTmFromOneRm,
  estimate1RM,
  progressTm,
  getWeekPattern,
  generateWorkoutSets,
} from "./calculations.js";

describe("calculateWeight", () => {
  it("calculates weight correctly with 5kg increment", () => {
    expect(calculateWeight(100, 65, 5)).toBe(65);
    expect(calculateWeight(100, 75, 5)).toBe(75);
    expect(calculateWeight(100, 85, 5)).toBe(85);
  });

  it("rounds down to nearest plate increment", () => {
    expect(calculateWeight(102.5, 65, 5)).toBe(65);
    expect(calculateWeight(107.5, 65, 5)).toBe(65);
  });

  it("works with 0.5kg plate increment", () => {
    expect(calculateWeight(20, 65, 0.5)).toBe(13);
    expect(calculateWeight(20, 35, 0.5)).toBe(7);
  });

  it("works with 1.25kg plate increment", () => {
    expect(calculateWeight(100, 65, 1.25)).toBe(65);
    expect(calculateWeight(100, 70, 2.5)).toBe(70);
  });

  it("works with 2.5kg plate increment", () => {
    expect(calculateWeight(100, 65, 2.5)).toBe(65);
    expect(calculateWeight(102.5, 65, 2.5)).toBe(65);
  });

  it("handles very light TM under plate increment", () => {
    expect(calculateWeight(10, 65, 5)).toBe(5);
    expect(calculateWeight(3, 65, 5)).toBe(0);
  });

  it("handles heavy TM", () => {
    expect(calculateWeight(200, 95, 5)).toBe(190);
    expect(calculateWeight(300, 85, 5)).toBe(255);
  });

  it("handles 1lb increments", () => {
    expect(calculateWeight(100, 65, 1)).toBe(65);
    expect(calculateWeight(100, 65, 5)).toBe(65);
  });
});

describe("calculateTmFromOneRm", () => {
  it("calculates 90% of 1RM rounded to plate increment", () => {
    expect(calculateTmFromOneRm(100, 5)).toBe(90);
  });

  it("rounds down to nearest 2.5kg increment", () => {
    expect(calculateTmFromOneRm(102.5, 2.5)).toBe(90);
    expect(calculateTmFromOneRm(105, 2.5)).toBe(92.5);
  });

  it("rounds down to nearest 5lb increment", () => {
    expect(calculateTmFromOneRm(200, 5)).toBe(180);
    expect(calculateTmFromOneRm(205, 5)).toBe(180);
  });

  it("returns 0 for very low 1RM", () => {
    expect(calculateTmFromOneRm(1, 5)).toBe(0);
  });

  it("works with 0.5kg plate increment", () => {
    expect(calculateTmFromOneRm(100, 0.5)).toBe(90);
    expect(calculateTmFromOneRm(101, 0.5)).toBe(90.5);
  });
});

describe("estimate1RM", () => {
  it("calculates Epley formula correctly", () => {
    expect(estimate1RM(100, 10)).toBeCloseTo(133.3, 1);
  });

  it("calculates for moderate reps", () => {
    expect(estimate1RM(80, 5)).toBeCloseTo(93.32, 1);
  });

  it("returns weight for 1 rep", () => {
    expect(estimate1RM(100, 1)).toBeCloseTo(103.33, 1);
  });

  it("handles 0 reps (unrealistic but mathematically valid)", () => {
    expect(estimate1RM(100, 0)).toBe(100);
  });

  it("handles heavy weights", () => {
    expect(estimate1RM(200, 3)).toBeCloseTo(219.98, 1);
  });
});

describe("progressTm", () => {
  it("adds 2.5kg for bench press", () => {
    expect(progressTm(100, "bench_press")).toBe(102.5);
  });

  it("adds 2.5kg for overhead press", () => {
    expect(progressTm(100, "overhead_press")).toBe(102.5);
  });

  it("adds 5kg for squat", () => {
    expect(progressTm(100, "squat")).toBe(105);
  });

  it("adds 5kg for deadlift", () => {
    expect(progressTm(100, "deadlift")).toBe(105);
  });

  it("handles very low TM for bench press", () => {
    expect(progressTm(2.5, "bench_press")).toBe(5);
  });

  it("handles very low TM for squat", () => {
    expect(progressTm(2.5, "squat")).toBe(7.5);
  });
});

describe("getWeekPattern", () => {
  it("returns correct pattern for week 1", () => {
    const pattern = getWeekPattern(1);
    expect(pattern.sets).toHaveLength(3);
    expect(pattern.sets[0]).toEqual({ percentage: 65, reps: 5, isAmrap: false });
    expect(pattern.sets[1]).toEqual({ percentage: 75, reps: 5, isAmrap: false });
    expect(pattern.sets[2]).toEqual({ percentage: 85, reps: 5, isAmrap: true });
  });

  it("returns correct pattern for week 2", () => {
    const pattern = getWeekPattern(2);
    expect(pattern.sets).toHaveLength(3);
    expect(pattern.sets[0]).toEqual({ percentage: 70, reps: 3, isAmrap: false });
    expect(pattern.sets[1]).toEqual({ percentage: 80, reps: 3, isAmrap: false });
    expect(pattern.sets[2]).toEqual({ percentage: 90, reps: 3, isAmrap: true });
  });

  it("returns correct pattern for week 3", () => {
    const pattern = getWeekPattern(3);
    expect(pattern.sets).toHaveLength(3);
    expect(pattern.sets[0]).toEqual({ percentage: 75, reps: 5, isAmrap: false });
    expect(pattern.sets[1]).toEqual({ percentage: 85, reps: 3, isAmrap: false });
    expect(pattern.sets[2]).toEqual({ percentage: 95, reps: 1, isAmrap: true });
  });

  it("returns correct pattern for week 4 (deload, no AMRAP)", () => {
    const pattern = getWeekPattern(4);
    expect(pattern.sets).toHaveLength(3);
    expect(pattern.sets[0]).toEqual({ percentage: 40, reps: 5, isAmrap: false });
    expect(pattern.sets[1]).toEqual({ percentage: 50, reps: 5, isAmrap: false });
    expect(pattern.sets[2]).toEqual({ percentage: 60, reps: 5, isAmrap: false });
  });
});

describe("generateWorkoutSets", () => {
  it("generates correct sets for week 1 with 5kg increment", () => {
    const sets = generateWorkoutSets(100, 1, 5);
    expect(sets).toHaveLength(3);
    expect(sets[0]).toEqual({ setNumber: 1, weight: 65, reps: 5, isAmrap: false, percentage: 65 });
    expect(sets[1]).toEqual({ setNumber: 2, weight: 75, reps: 5, isAmrap: false, percentage: 75 });
    expect(sets[2]).toEqual({ setNumber: 3, weight: 85, reps: 5, isAmrap: true, percentage: 85 });
  });

  it("generates correct sets for week 2", () => {
    const sets = generateWorkoutSets(100, 2, 5);
    expect(sets[0]).toEqual({ setNumber: 1, weight: 70, reps: 3, isAmrap: false, percentage: 70 });
    expect(sets[1]).toEqual({ setNumber: 2, weight: 80, reps: 3, isAmrap: false, percentage: 80 });
    expect(sets[2]).toEqual({ setNumber: 3, weight: 90, reps: 3, isAmrap: true, percentage: 90 });
  });

  it("generates correct sets for week 3", () => {
    const sets = generateWorkoutSets(100, 3, 5);
    expect(sets[0]).toEqual({ setNumber: 1, weight: 75, reps: 5, isAmrap: false, percentage: 75 });
    expect(sets[1]).toEqual({ setNumber: 2, weight: 85, reps: 3, isAmrap: false, percentage: 85 });
    expect(sets[2]).toEqual({ setNumber: 3, weight: 95, reps: 1, isAmrap: true, percentage: 95 });
  });

  it("week 4 has no AMRAP sets", () => {
    const sets = generateWorkoutSets(100, 4, 5);
    expect(sets.every((s) => !s.isAmrap)).toBe(true);
    expect(sets[0]).toEqual({ setNumber: 1, weight: 40, reps: 5, isAmrap: false, percentage: 40 });
    expect(sets[1]).toEqual({ setNumber: 2, weight: 50, reps: 5, isAmrap: false, percentage: 50 });
    expect(sets[2]).toEqual({ setNumber: 3, weight: 60, reps: 5, isAmrap: false, percentage: 60 });
  });

  it("rounds weights down with 5lb increment", () => {
    const sets = generateWorkoutSets(102.5, 1, 5);
    expect(sets[0].weight).toBe(65);
    expect(sets[2].weight).toBe(85);
  });

  it("rounds weights down with 1.25kg increment", () => {
    const sets = generateWorkoutSets(100, 1, 1.25);
    expect(sets[0].weight).toBe(65);
    expect(sets[1].weight).toBe(75);
    expect(sets[2].weight).toBe(85);
  });

  it("handles very light TM", () => {
    const sets = generateWorkoutSets(20, 1, 5);
    expect(sets[0].weight).toBe(10);
    expect(sets[1].weight).toBe(15);
    expect(sets[2].weight).toBe(15);
  });

  it("handles very heavy TM", () => {
    const sets = generateWorkoutSets(300, 1, 5);
    expect(sets[0].weight).toBe(195);
    expect(sets[1].weight).toBe(225);
    expect(sets[2].weight).toBe(255);
  });

  it("AMRAP only on last set for weeks 1-3", () => {
    for (const week of [1, 2, 3] as const) {
      const sets = generateWorkoutSets(100, week, 5);
      expect(sets[0].isAmrap).toBe(false);
      expect(sets[1].isAmrap).toBe(false);
      expect(sets[2].isAmrap).toBe(true);
    }
  });

  it("set numbers are sequential 1, 2, 3", () => {
    const sets = generateWorkoutSets(100, 1, 5);
    expect(sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
  });
});

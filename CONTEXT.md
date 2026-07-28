# fivethreeone

A Jim Wendler 5/3/1 workout tracker.

## Planned (not building now)

Graph view: compile completed workout data into a progression chart for the Lifter.

## Language

**Lifter**:
A person who trains using the 5/3/1 program. The Lifter owns all data: preferences, training maxes, cycles, and history. Has a `userId` FK to a separate Better Auth `user` table for auth concerns.
_Avoid_: Athlete, customer

**User**:
The auth entity managed by Better Auth. Stores email, password hash, and sessions. Has exactly one Lifter. Login accepts either username (from the Lifter record) or email (from the User record).
_Avoid_: Account, credentials

**Main Lift**:
One of the four core lifts — Squat, Bench Press, Deadlift, or Overhead Press. Each Main Lift has its own Training Max and follows the 5/3/1 percentage progression across a cycle.
_Avoid_: Exercise, core lift, primary movement

**Assistance Exercise**:
Supplementary work done after the Main Lift. Has no Training Max, no percentage-based progression. Can be from a built-in template (Boring But Big, First Set Last) or a custom user-created template.
_Avoid_: Accessory, supplement, aux lift

**Rep Max**:
A weight-and-reps pair the Lifter enters for a Main Lift to start a Block. The system estimates the 1RM via the Epley formula (`weight × reps × 0.0333 + weight`) and derives the Training Max (90% of estimated 1RM). Replaces direct 1RM entry.
_Avoid_: One-Rep Max, 1RM (the estimate is still called 1RM internally)

**Training Max (TM)**:
The working number used for all 5/3/1 calculations. Equals 90% of the estimated 1RM. Auto-increments after each completed cycle per the 5/3/1 rules (Bench/OHP: +2.5kg, Squat/Deadlift: +5kg). Stored per-Block.
_Avoid_: Working max, calculated max

**Block**:
A structured training plan created from a single Rep Max entry for all 4 Main Lifts. Contains exactly 4 Cycles of pre-calculated weights. When a Block's 4 Cycles are completed, the Lifter starts a new Block by entering fresh Rep Maxes. Old Blocks are read-only.
_Avoid_: Profile, program, phase

**Cycle**:
A four-week training block within a Block. Each Cycle has 4 weekly workouts per Main Lift. The pattern is fixed (Week 1: 5/5/5+, Week 2: 3/3/3+, Week 3: 5/3/1+, Week 4: deload). Cycles are identified by number within the Block — all 4 lifts share the same Cycle number.
_Avoid_: Phase, mesocycle

**Deload Week**:
Week 4 of a cycle, performed at 40%/50%/60% × 5. Optional — can be skipped. When skipped the cycle is considered complete and TM increments.
_Avoid_: Recovery week, rest week

**Workout Day**:
One Main Lift on a given week. Tracked by a single tick when completed. No per-set data (weight, reps) is logged during the workout.
_Avoid_: Session, workout set entry

**Settings**:
Username, password change, and logout only. No preferences (kg/lb, plate increment) and no Training Max editing — those are replaced by Block creation.
_Avoid_: Preferences, theme, training max editor

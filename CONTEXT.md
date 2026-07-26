# fivethreeone

A Jim Wendler 5/3/1 workout tracker.

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

**One-Rep Max (1RM)**:
The Lifter's estimated true maximum for a Main Lift. Set during onboarding, editable later. Serves as the anchor truth; changing it recalculates the Training Max.
_Avoid_: Estimated max, true max

**Training Max (TM)**:
The working number used for all 5/3/1 calculations. Equals 90% of the 1RM. Auto-increments after each completed cycle per the 5/3/1 rules (Bench/OHP: +2.5kg, Squat/Deadlift: +5kg). Can diverge from 1RM over time.
_Avoid_: Working max, calculated max

**Cycle**:
A four-week block of 5/3/1 training. Each Cycle has 4 weekly workouts per Main Lift. The pattern is fixed (Week 1: 5/5/5+, Week 2: 3/3/3+, Week 3: 5/3/1+, Week 4: deload). Cycles are identified by number and tracked per-lift — Squat may be on Cycle 3 while Bench is on Cycle 2. Not stored as rows; derived from the Lifter's completion history per lift.
_Avoid_: Block, phase, mesocycle

**Deload Week**:
Week 4 of a cycle, performed at 40%/50%/60% × 5. Optional — a cycle is considered complete after 3 non-deload weeks are logged per Main Lift. TM auto-increments after Week 3; the deload workout (if done) uses the new TM.
_Avoid_: Recovery week, rest week

**AMRAP Set**:
The final working set of each workout (marked with a + in 5/3/1 notation). The lifter does as many reps as possible beyond the target. Used to estimate a new 1RM via the formula: `weight × reps × 0.0333 + weight`.
_Avoid_: AMRAP+ set, plus set

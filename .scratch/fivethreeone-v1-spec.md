# 5/3/1 Workout Tracker — V1 Spec

## Problem Statement

Lifters following the Jim Wendler 5/3/1 program currently rely on manual percentage calculations, spreadsheets, or generic workout apps that don't understand the program's progression rules. This creates friction: calculating weights in the gym, tracking cycles across lifts independently, remembering when to deload, and recording AMRAP performance to estimate progress. The mental overhead distracts from the actual training.

## Solution

A modern, mobile-first web application that handles all 5/3/1 calculations and progression automatically. The Lifter shows up, sees exactly which lift to do and what weights to load, logs their reps, and moves on. The system tracks cycles per lift, calculates working weights (rounded to the Lifter's plate increment), manages deloads, estimates 1RM from AMRAP sets, and progresses the Training Max according to Wendler's rules.

## User Stories

1. As a new Lifter, I want to register with a username, email, and password, so that I can create my account.
2. As a returning Lifter, I want to log in using either my username or email and password, so that I can access my training data.
3. As a Lifter, I want to log out securely, so that my account remains protected on shared devices.
4. As a new Lifter, I want to complete an onboarding wizard that collects my preferred weight unit, plate increment, and 1RM for all four Main Lifts, so that I can start training immediately.
5. As a Lifter, I want my Training Max automatically calculated as 90% of my 1RM during onboarding, so that I don't have to do the math myself.
6. As a Lifter, I want to see my current cycle number and week for each Main Lift on the dashboard, so that I know where I am in the program.
7. As a Lifter, I want to see today's recommended workout on the dashboard, so that I know what to train.
8. As a Lifter, I want to see my next upcoming workout on the dashboard, so that I can plan my training week.
9. As a Lifter, I want to see my current Training Max for all four Main Lifts on the dashboard, so that I know my working weights at a glance.
10. As a Lifter, I want to see my most recent completed workouts on the dashboard, so that I can track recent progress.
11. As a Lifter, I want to see my recent Personal Records on the dashboard, so that I feel motivated.
12. As a Lifter, I want quick one-tap access to start today's workout from the dashboard, so that I minimize navigation in the gym.
13. As a Lifter, I want to see the correct 5/3/1 working sets for the current week of each Main Lift, with target percentage, calculated weight, and target reps displayed clearly.
14. As a Lifter, I want the calculated weights automatically rounded down to my preferred plate increment, so that I know exactly which plates to load.
15. As a Lifter, I want the final set of each workout highlighted as an AMRAP set, so that I know to push for maximum reps.
16. As a Lifter, I want to input the actual reps I completed for each set, so that I can log my performance.
17. As a Lifter, I want to optionally input the actual weight I used (if different from the calculated weight), so that I can log precise training data.
18. As a Lifter, I want to add notes to my workout, so that I can record how the session felt.
19. As a Lifter, I want to mark individual sets as completed, so that I can track progress through the workout.
20. As a Lifter, I want to save a completed workout, so that it appears in my history.
21. As a Lifter, I want to optionally add Assistance Exercises after the Main Lift workout, with exercise name, sets, reps, weight, and notes.
22. As a Lifter, I want to use the Boring But Big or First Set Last templates as default Assistance Exercise configurations, so that I don't have to plan accessory work from scratch.
23. As a Lifter, I want to create custom Assistance Exercise templates and save them for future workouts, so that I can personalize my accessory work.
24. As a Lifter, I want the system to automatically create the next cycle when I complete a cycle for a Main Lift, so that I never have to think about progression.
25. As a Lifter, I want the Training Max to increase by the correct Wendler-specified amounts after each completed cycle (Bench/OHP: +2.5kg, Squat/Deadlift: +5kg), so that I progress at the right pace.
26. As a Lifter, I want all future workouts automatically regenerated with the updated Training Max, so that my next session is ready to go.
27. As a Lifter, I want the deload week to be optional and skippable, so that I can decide based on how I feel.
28. As a Lifter, I want my Training Max to auto-increment after completing 3 non-deload weeks of a Main Lift, regardless of whether I do the deload workout.
29. As a Lifter, I want to review my workout history, filtered by lift or cycle, so that I can see my progress over time.
30. As a Lifter, I want to see completed sets, AMRAP performance, and workout notes in my history, so that I can analyze past sessions.
31. As a Lifter, I want to see my Personal Records, including highest Training Max, best AMRAP performance, estimated 1RM, and total workouts completed, so that I can track my long-term progress.
32. As a Lifter, I want my estimated 1RM from AMRAP sets automatically calculated using the formula `weight × reps × 0.0333 + weight`, so that I get objective performance feedback.
33. As a Lifter, I want a new PR automatically logged whenever an AMRAP set produces an estimated 1RM higher than my current record, so that I never miss a milestone.
34. As a Lifter, I want to edit my 1RM values for any Main Lift in settings, so that I can update them as my strength changes.
35. As a Lifter, I want my Training Max recalculated when I update a 1RM, so that the training weights stay consistent.
36. As a Lifter, I want to change my preferred weight unit (kg/lb) and plate increment in settings, so that the app adapts to my equipment.
37. As a Lifter, I want to change my password, so that my account stays secure.
38. As a Lifter, I want the app to be fully responsive and optimized for mobile use, so that I can use it easily in the gym.
39. As a Lifter, I want large touch-friendly buttons and minimal typing during workouts, so that I can log data quickly between sets.
40. As a Lifter, I want dark mode support, so that the app is comfortable to use in dimly lit gym environments.
41. As a Lifter, I want my workout data to be private and accessible only to me, so that my training history remains secure.
42. As a Lifter, I want to see my progress over time for estimated 1RM on the Personal Records page, so that I can visualize my strength gains.

## Implementation Decisions

### Architecture

- **Monorepo** with three shared packages and two applications (frontend + API worker).
- **`@fivethreeone/core`**: Stateless workout calculation engine. Pure functions that compute working weights from a Training Max and week number, round weights to the nearest plate increment downward, and calculate estimated 1RM from AMRAP reps. No database or framework dependencies.
- **`@fivethreeone/db`**: Drizzle ORM schema definitions, migrations, and D1 client factory. Imported only by the API worker.
- **`@fivethreeone/shared`**: Shared TypeScript types and Zod validation schemas used by both frontend and backend. Includes unit conversion utilities (kg ↔ lb).
- **Frontend**: React + Vite + TanStack Router (config-based routing) + Tailwind CSS + shadcn/ui. React state and TanStack Query for workout session management (no Zustand/Redux).
- **Backend**: Cloudflare Workers + Hono.js + Drizzle ORM + Cloudflare D1 + Better Auth.

### Domain Model

- **Lifter** is the core entity, with a FK to Better Auth's `user` table. See ADR-0001.
- **Main Lifts**: Squat, Bench Press, Deadlift, Overhead Press. Each has a 1RM and Training Max. Progression is per-lift, not global.
- **Cycle**: A 4-week block per lift, computed from completion history (not stored as rows).
- **Workout generation**: Sets are computed on-the-fly from TM + week offset. Stored only when the Lifter completes them.
- **Weight rounding**: Always round down to the Lifter's preferred plate increment.
- **Deload**: Optional (Week 4). TM auto-increments after 3 non-deload weeks are logged.
- **AMRAP formula**: `weight × reps × 0.0333 + weight`.
- **Assistance templates**: Two built-in (Boring But Big, First Set Last) as code constants; custom templates stored in DB.
- **Weight storage**: All weights stored in kg. Frontend converts for display based on Lifter preference.

### Database Entities (D1 + Drizzle)

- `user` — Better Auth's user table (email, password hash, sessions)
- `lifter` — username, unit preference (kg/lb), plate increment (grams), foreign key to `user`
- `training_max` — one row per Main Lift per Lifter: lift name, 1RM (kg), TM (kg), current cycle number
- `workout` — one row per completed workout session: lifter_id, lift name, week number, cycle number, notes, completed_at
- `workout_set` — one row per completed set: workout_id, set_number, target_percentage, calculated_weight (kg), actual_weight (kg), target_reps, actual_reps, is_amrap
- `assistance_exercise` — one row per assistance exercise in a workout: workout_id, exercise_name, sets, reps, weight, notes, template_name (nullable)
- `assistance_template` — user-created custom templates: lifter_id, name, exercises (JSON array of {name, sets, reps, weight, notes})
- `personal_record` — one row per PR event: lifter_id, lift_name, pr_type (tm | estimated_1rm | amrap_reps), value, achieved_at, workout_id (nullable)

### API Contracts

**Authentication (Better Auth):**
- `POST /api/auth/register` — registers a new User + Lifter
- `POST /api/auth/login` — accepts username or email + password
- `POST /api/auth/logout`
- `GET /api/auth/session` — returns current session info

**Lifter:**
- `GET /api/lifter/profile` — returns Lifter profile + unit preferences
- `PUT /api/lifter/profile` — update username, unit, plate increment
- `PUT /api/lifter/password` — change password

**Training Maxes:**
- `GET /api/lifter/training-max` — returns all 4 Main Lifts with 1RM + TM + cycle number
- `PUT /api/lifter/training-max/:liftId` — update 1RM for a lift (recalculates TM)
- `POST /api/lifter/training-max/reset` — recalculate all TMs from 1RMs

**Workouts:**
- `GET /api/workouts` — paginated workout history (query: lift, page, limit)
- `GET /api/workouts/current` — next uncompleted workout for each lift
- `GET /api/workouts/:id` — single workout with sets and assistance exercises
- `POST /api/workouts` — start a workout for a given lift (creates `in_progress` draft)
- `PUT /api/workouts/:id` — save completed workout with all sets and assistance exercises

**Lifts/Cycles:**
- `GET /api/lifts` — returns the 4 Main Lifts
- `GET /api/lifts/:liftId/cycle` — current cycle info (week, progression)
- `GET /api/lifts/:liftId/history` — completed workouts for a lift

**Templates:**
- `GET /api/templates` — built-in + user's custom templates
- `POST /api/templates` — save a custom template
- `DELETE /api/templates/:id`

**Personal Records:**
- `GET /api/personal-records` — all PRs grouped by lift
- `GET /api/personal-records/:liftId` — PRs for a specific lift

**Response format (all endpoints):**
- Success: `{ data: T, error: null }`
- Error: `{ data: null, error: string }`
- List: `{ data: T[], total: number, error: null }`

### Authentication Flow

- Better Auth manages sessions via D1-backed storage.
- Login accepts either username (looked up in `lifter` table) or email (looked up in `user` table).
- All workout-related routes require authentication; middleware resolves the authenticated Lifter from the session and attaches `lifterId` to the request context.

### Frontend Routes

| Route | Page |
|---|---|
| `/login` | Login form |
| `/register` | Registration form |
| `/onboarding` | Setup wizard (1RM, units, plate increment) |
| `/dashboard` | Main dashboard |
| `/workout` | Today's/next workout |
| `/workout/:liftId` | Workout for a specific Main Lift |
| `/history` | Workout history |
| `/history/:liftId` | History filtered by lift |
| `/pr` | Personal Records |
| `/settings` | Settings page |

TanStack Router with config-based route definitions and lazy-loaded components.

### Assistance Templates

- **Boring But Big (BBB)**: 5 × 10 at 50-60% of TM for the same lift
- **First Set Last (FSL)**: 3-5 × 5 at the first working set's weight
- **Custom**: User-defined exercises with name, sets, reps, weight, notes

Templates are constants in `@fivethreeone/core`. User-saved custom templates are stored in the `assistance_template` table.

### Workout Session State

- When a Lifter starts a workout, the API creates a `workout` row with `in_progress` status.
- Sets are saved one at a time or batched on completion.
- An `in_progress` workout is resumed on return (shown as "Continue Workout" on dashboard).
- Completed workouts cannot be edited (append-only history).

### Cycle Progression

- After saving the 3rd non-deload weekly workout for a Main Lift, the system auto-increments the TM and cycle number.
- The deload workout (if done) uses the new TM percentages but does not trigger further progression.
- All future workout generations for that lift use the updated TM.

## Testing Decisions

Three test seams, in order of priority:

### 1. `@fivethreeone/core` — Unit tests (primary seam)

**What to test:** All pure calculation functions in the core engine.

**What makes a good test:** Deterministic, input → output. No mocks, no setup. Each test describes a scenario (e.g., "Week 1 Squat at 100kg TM with 2.5kg increment") and asserts the three working sets' percentages, weights, and rep targets.

**Test cases:**
- Week 1/2/3/4 percentage patterns are correct for each lift
- Weights are rounded down to the nearest plate increment
- Plate increments of 1.25kg, 2.5kg, 5lb produce correct rounding
- AMRAP formula produces correct estimated 1RM
- TM progression after 3 weeks: Bench/OHP +2.5kg, Squat/Deadlift +5kg
- Edge cases: very light TMs (below first plate increment), very heavy TMs, kg vs lb inputs

### 2. API route handlers — Integration tests

**What to test:** Hono routes with a real D1 test instance (or in-memory D1 via `@cloudflare/vite-plugin`).

**What makes a good test:** Exercises the full request cycle — auth middleware, validation (Zod), data flow through core engine, persistence. Tests should cover happy path and common error cases (unauthenticated, invalid input, not found).

**Test cases:**
- Unauthenticated requests return 401
- Registration creates User + Lifter correctly
- Login with username works; login with email works
- Workout generation returns correct sets for current week
- Completing a workout creates history entries and set records
- Completing the 3rd week of a cycle triggers TM progression
- PR is created when AMRAP exceeds current record

### 3. Workout logging UI — Component tests

**What to test:** The workout logging flow — starting a workout, completing sets, saving, resuming an in-progress workout.

**What makes a good test:** Renders the component with mock API data, simulates user interactions (tapping set checkboxes, entering reps, saving), and asserts UI state changes. Uses Vitest + React Testing Library.

**Test cases:**
- Workout page shows correct sets for the week
- Completing all sets enables the save button
- AMRAP set is visually highlighted
- Assistance exercises can be added and configured
- In-progress workout shows "Continue" state on dashboard

## Out of Scope

- **Social features**: No friend lists, leaderboards, or workout sharing.
- **Advanced 5/3/1 variations**: No support for 5/3/1 For Beginners, 5/3/1 Building the Monolith, 5/3/1 Beyond, or other program variants in V1. Standard 5/3/1 only.
- **Juggernaut method / other programs**: This is 5/3/1 exclusively.
- **Rest timers**: No built-in timer for rest between sets.
- **Custom cycle templates**: The 4-week cycle structure is fixed; no support for custom week patterns.
- **Offline mode**: Requires network connectivity (Cloudflare Worker). No PWA offline support in V1.
- **Workout editing**: Completed workouts are append-only; no editing or deleting past sessions.
- **Data export**: No CSV/JSON export in V1.
- **Email verification / password reset flows**: These are deferred to post-V1.
- **Push notifications**: No notification support in V1.
- **Apple Watch / Wear OS**: Mobile web only, no native apps or companion apps.
- **Bar weight configuration**: Assumes standard 20kg Olympic bar; no adjustable bar weight.

## Further Notes

- The domain glossary lives in `CONTEXT.md` at the repo root.
- ADR-0001 documents the `user`/`lifter` table split, which is the most consequential architectural decision.
- The project was scaffolded from `pnpm create cloudflare@latest` with the React + Vite template.
- All date handling should use ISO 8601 (UTC) internally.
- The onboarding wizard should determine whether to show based on the presence of Training Maxes for all 4 lifts — if any are missing, redirect to onboarding.
- The dashboard should handle the case where a Lifter has no completed workouts gracefully (empty state with CTA to start first workout).
- Dark mode should default to system preference with a manual toggle in settings.

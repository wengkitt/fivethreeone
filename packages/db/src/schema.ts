import { sqliteTable, text, integer, real, unique, index } from "drizzle-orm/sqlite-core";
import { mainLiftValues, prTypeValues } from "@fivethreeone/shared";

// ── Better Auth tables ──────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// ── Domain tables ───────────────────────────────────────────────────

export const lifter = sqliteTable("lifter", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => user.id),
  username: text("username").notNull().unique(),
  weightUnit: text("weight_unit", { enum: ["kg", "lb"] }).notNull().default("kg"),
  plateIncrement: integer("plate_increment").notNull().default(2500),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const trainingMax = sqliteTable("training_max", {
  id: text("id").primaryKey(),
  lifterId: text("lifter_id").notNull().references(() => lifter.id, { onDelete: "cascade" }),
  lift: text("lift", { enum: mainLiftValues }).notNull(),
  oneRm: real("one_rm").notNull(),
  trainingMaxValue: real("training_max").notNull(),
  cycleNumber: integer("cycle_number").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  unique("training_max_lifter_lift").on(table.lifterId, table.lift),
  index("training_max_lifter_id_idx").on(table.lifterId),
]);

export const workout = sqliteTable("workout", {
  id: text("id").primaryKey(),
  lifterId: text("lifter_id").notNull().references(() => lifter.id, { onDelete: "cascade" }),
  lift: text("lift", { enum: mainLiftValues }).notNull(),
  weekNumber: integer("week_number").notNull(),
  cycleNumber: integer("cycle_number").notNull(),
  status: text("status", { enum: ["in_progress", "completed"] }).notNull().default("in_progress"),
  notes: text("notes"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("workout_lifter_id_idx").on(table.lifterId),
]);

export const workoutSet = sqliteTable("workout_set", {
  id: text("id").primaryKey(),
  workoutId: text("workout_id").notNull().references(() => workout.id, { onDelete: "cascade" }),
  setNumber: integer("set_number").notNull(),
  targetPercentage: real("target_percentage").notNull(),
  calculatedWeight: real("calculated_weight").notNull(),
  actualWeight: real("actual_weight"),
  targetReps: integer("target_reps").notNull(),
  actualReps: integer("actual_reps"),
  isAmrap: integer("is_amrap", { mode: "boolean" }).notNull().default(false),
}, (table) => [
  index("workout_set_workout_id_idx").on(table.workoutId),
]);

export const assistanceExercise = sqliteTable("assistance_exercise", {
  id: text("id").primaryKey(),
  workoutId: text("workout_id").notNull().references(() => workout.id, { onDelete: "cascade" }),
  exerciseName: text("exercise_name").notNull(),
  sets: integer("sets").notNull(),
  reps: integer("reps").notNull(),
  weight: real("weight"),
  notes: text("notes"),
  templateName: text("template_name"),
}, (table) => [
  index("assistance_exercise_workout_id_idx").on(table.workoutId),
]);

export const assistanceTemplate = sqliteTable("assistance_template", {
  id: text("id").primaryKey(),
  lifterId: text("lifter_id").notNull().references(() => lifter.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  exercises: text("exercises").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("assistance_template_lifter_id_idx").on(table.lifterId),
]);

export const personalRecord = sqliteTable("personal_record", {
  id: text("id").primaryKey(),
  lifterId: text("lifter_id").notNull().references(() => lifter.id, { onDelete: "cascade" }),
  lift: text("lift", { enum: mainLiftValues }).notNull(),
  prType: text("pr_type", { enum: prTypeValues }).notNull(),
  value: real("value").notNull(),
  achievedAt: integer("achieved_at", { mode: "timestamp" }).notNull(),
  workoutId: text("workout_id").references(() => workout.id),
}, (table) => [
  index("personal_record_lifter_id_idx").on(table.lifterId),
]);

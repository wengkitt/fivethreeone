import { sqliteTable, text, integer, real, unique, index } from "drizzle-orm/sqlite-core";
import { mainLiftValues } from "@fivethreeone/shared";

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

export const block = sqliteTable("block", {
  id: text("id").primaryKey(),
  lifterId: text("lifter_id").notNull().references(() => lifter.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["active", "completed"] }).notNull().default("active"),
  squatWeight: real("squat_weight").notNull(),
  squatReps: integer("squat_reps").notNull(),
  benchPressWeight: real("bench_press_weight").notNull(),
  benchPressReps: integer("bench_press_reps").notNull(),
  deadliftWeight: real("deadlift_weight").notNull(),
  deadliftReps: integer("deadlift_reps").notNull(),
  overheadPressWeight: real("overhead_press_weight").notNull(),
  overheadPressReps: integer("overhead_press_reps").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("block_lifter_id_idx").on(table.lifterId),
]);

export const workoutDay = sqliteTable("workout_day", {
  id: text("id").primaryKey(),
  blockId: text("block_id").notNull().references(() => block.id, { onDelete: "cascade" }),
  lift: text("lift", { enum: mainLiftValues }).notNull(),
  cycleNumber: integer("cycle_number").notNull(),
  weekNumber: integer("week_number").notNull(),
  status: text("status", { enum: ["pending", "completed", "skipped"] }).notNull().default("pending"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
}, (table) => [
  unique("workout_day_block_lift_cycle_week").on(table.blockId, table.lift, table.cycleNumber, table.weekNumber),
  index("workout_day_block_id_idx").on(table.blockId),
]);

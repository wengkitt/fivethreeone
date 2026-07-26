import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const lifterTable = sqliteTable("lifters", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  unitPreference: text("unit_preference", { enum: ["kg", "lb"] }).notNull().default("kg"),
  plateIncrement: real("plate_increment").notNull().default(2.5),
});

export const cycleTable = sqliteTable("cycles", {
  id: text("id").primaryKey(),
  lifterId: text("lifter_id").notNull().references(() => lifterTable.id),
  mainLift: text("main_lift", {
    enum: ["squat", "bench_press", "deadlift", "overhead_press"],
  }).notNull(),
  trainingMax: real("training_max").notNull(),
  week: integer("week").notNull(),
  startDate: text("start_date").notNull(),
});

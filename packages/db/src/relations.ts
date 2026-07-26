import { relations } from "drizzle-orm";
import {
  user,
  session,
  account,
  verification,
  lifter,
  trainingMax,
  workout,
  workoutSet,
  assistanceExercise,
  assistanceTemplate,
  personalRecord,
} from "./schema.js";

export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  lifter: one(lifter, {
    fields: [user.id],
    references: [lifter.userId],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const verificationRelations = relations(verification, () => ({}));

export const lifterRelations = relations(lifter, ({ one, many }) => ({
  user: one(user, {
    fields: [lifter.userId],
    references: [user.id],
  }),
  trainingMaxes: many(trainingMax),
  workouts: many(workout),
  assistanceTemplates: many(assistanceTemplate),
  personalRecords: many(personalRecord),
}));

export const trainingMaxRelations = relations(trainingMax, ({ one }) => ({
  lifter: one(lifter, {
    fields: [trainingMax.lifterId],
    references: [lifter.id],
  }),
}));

export const workoutRelations = relations(workout, ({ one, many }) => ({
  lifter: one(lifter, {
    fields: [workout.lifterId],
    references: [lifter.id],
  }),
  sets: many(workoutSet),
  assistanceExercises: many(assistanceExercise),
}));

export const workoutSetRelations = relations(workoutSet, ({ one }) => ({
  workout: one(workout, {
    fields: [workoutSet.workoutId],
    references: [workout.id],
  }),
}));

export const assistanceExerciseRelations = relations(assistanceExercise, ({ one }) => ({
  workout: one(workout, {
    fields: [assistanceExercise.workoutId],
    references: [workout.id],
  }),
}));

export const assistanceTemplateRelations = relations(assistanceTemplate, ({ one }) => ({
  lifter: one(lifter, {
    fields: [assistanceTemplate.lifterId],
    references: [lifter.id],
  }),
}));

export const personalRecordRelations = relations(personalRecord, ({ one }) => ({
  lifter: one(lifter, {
    fields: [personalRecord.lifterId],
    references: [lifter.id],
  }),
  workout: one(workout, {
    fields: [personalRecord.workoutId],
    references: [workout.id],
  }),
}));

import { relations } from "drizzle-orm";
import {
  user,
  session,
  account,
  verification,
  lifter,
  block,
  workoutDay,
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
  blocks: many(block),
}));

export const blockRelations = relations(block, ({ one, many }) => ({
  lifter: one(lifter, {
    fields: [block.lifterId],
    references: [lifter.id],
  }),
  workoutDays: many(workoutDay),
}));

export const workoutDayRelations = relations(workoutDay, ({ one }) => ({
  block: one(block, {
    fields: [workoutDay.blockId],
    references: [block.id],
  }),
}));

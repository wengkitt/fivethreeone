import { eq } from "drizzle-orm";
import type { DbClient } from "@fivethreeone/db";
import { session, lifter } from "@fivethreeone/db";
import { generateSessionToken } from "./crypto.js";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionPayload {
  sessionId: string;
  userId: string;
  lifterId: string;
  username: string;
}

export async function createSession(db: DbClient, userId: string): Promise<{ token: string; payload: SessionPayload }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
  const token = generateSessionToken();
  const sessionId = crypto.randomUUID();

  const lifterRecord = await db
    .select({ id: lifter.id, username: lifter.username })
    .from(lifter)
    .where(eq(lifter.userId, userId))
    .get();

  await db.insert(session).values({
    id: sessionId,
    token,
    userId,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  return {
    token,
    payload: {
      sessionId,
      userId,
      lifterId: lifterRecord?.id ?? "",
      username: lifterRecord?.username ?? "",
    },
  };
}

export async function validateSession(db: DbClient, token: string): Promise<SessionPayload | null> {
  const sessionRecord = await db
    .select()
    .from(session)
    .where(eq(session.token, token))
    .get();

  if (!sessionRecord) return null;
  if (sessionRecord.expiresAt < new Date()) {
    await db.delete(session).where(eq(session.id, sessionRecord.id));
    return null;
  }

  const lifterRecord = await db
    .select({ id: lifter.id, username: lifter.username })
    .from(lifter)
    .where(eq(lifter.userId, sessionRecord.userId))
    .get();

  return {
    sessionId: sessionRecord.id,
    userId: sessionRecord.userId,
    lifterId: lifterRecord?.id ?? "",
    username: lifterRecord?.username ?? "",
  };
}

export async function deleteSession(db: DbClient, token: string): Promise<void> {
  await db.delete(session).where(eq(session.token, token));
}

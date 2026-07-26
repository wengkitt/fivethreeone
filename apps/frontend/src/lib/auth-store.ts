import { getSession } from "./api"

export interface SessionData {
  userId: string
  lifterId: string
  username: string
}

let sessionData: SessionData | null = null
let sessionPromise: Promise<SessionData | null> | null = null

export async function fetchSession(): Promise<SessionData | null> {
  if (sessionPromise) return sessionPromise
  sessionPromise = getSession().then((res) => {
    const data =
      res.success && res.data && "lifterId" in res.data
        ? (res.data as SessionData)
        : null
    sessionData = data
    return data
  })
  return sessionPromise
}

export function getSessionData(): SessionData | null {
  return sessionData
}

export function setSessionData(session: SessionData | null) {
  sessionData = session
}

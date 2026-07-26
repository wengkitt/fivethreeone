import { useState, useEffect, useCallback, type ReactNode } from "react"
import { loginUser, registerUser, logoutUser } from "./api"
import { fetchSession, setSessionData } from "./auth-store"
import { AuthContext, type SessionData } from "./auth-context"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSession()
      .then((s) => {
        setSession(s)
        setSessionData(s)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const signIn = useCallback(async (login: string, password: string): Promise<string | null> => {
    const res = await loginUser(login, password)
    if (res.success && res.data) {
      const fresh = await fetchSession()
      setSession(fresh)
      setSessionData(fresh)
      return null
    }
    return res.error ?? "Login failed"
  }, [])

  const signUp = useCallback(async (username: string, email: string, password: string): Promise<string | null> => {
    const res = await registerUser(username, email, password)
    if (res.success && res.data) {
      const fresh = await fetchSession()
      setSession(fresh)
      setSessionData(fresh)
      return null
    }
    return res.error ?? "Registration failed"
  }, [])

  const signOut = useCallback(async () => {
    await logoutUser()
    setSession(null)
    setSessionData(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

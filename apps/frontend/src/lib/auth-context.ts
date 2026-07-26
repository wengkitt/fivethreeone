import { createContext } from "react"

export interface SessionData {
  userId: string
  lifterId: string
  username: string
}

export interface AuthContextValue {
  session: SessionData | null
  isLoading: boolean
  signIn: (login: string, password: string) => Promise<string | null>
  signUp: (username: string, email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

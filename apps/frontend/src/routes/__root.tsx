import { Outlet } from "@tanstack/react-router"
import { AuthProvider } from "../lib/auth"

export function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}

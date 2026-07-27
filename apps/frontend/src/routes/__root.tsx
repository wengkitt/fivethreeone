import { Outlet } from "@tanstack/react-router"
import { AuthProvider } from "../lib/auth"
import { useTheme } from "../lib/theme"

export function RootLayout() {
  useTheme()

  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}

import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router"
import { RootLayout } from "./routes/__root"
import { LandingPage } from "./routes/landing"
import { LoginPage } from "./routes/login"
import { RegisterPage } from "./routes/register"
import { DashboardPage } from "./routes/dashboard"
import { CreateBlockPage } from "./routes/create-block"
import { HistoryPage } from "./routes/history"
import { SettingsPage } from "./routes/settings"
import { fetchSession } from "./lib/auth-store"
import { getBlocks } from "./lib/api"

const rootRoute = createRootRoute({
  component: RootLayout,
})

async function hasActiveBlock(): Promise<boolean> {
  try {
    const res = await getBlocks()
    if (!res.success || !res.data) return false
    return res.data.some((b) => b.status === "active")
  } catch {
    return false
  }
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (!session) throw redirect({ to: "/login" })
    const hasBlock = await hasActiveBlock()
    if (!hasBlock) throw redirect({ to: "/create-block" })
  },
  component: DashboardPage,
})

const createBlockRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/create-block",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (!session) throw redirect({ to: "/login" })
  },
  component: CreateBlockPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (session) throw redirect({ to: "/dashboard" })
  },
  component: LoginPage,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (session) throw redirect({ to: "/dashboard" })
  },
  component: RegisterPage,
})

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (!session) throw redirect({ to: "/login" })
  },
  component: HistoryPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (!session) throw redirect({ to: "/login" })
  },
  component: SettingsPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  createBlockRoute,
  loginRoute,
  registerRoute,
  historyRoute,
  settingsRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

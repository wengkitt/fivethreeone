import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router"
import { RootLayout } from "./routes/__root"
import { LoginPage } from "./routes/login"
import { RegisterPage } from "./routes/register"
import { OnboardingPage, ALL_LIFTS } from "./routes/onboarding"
import { DashboardPage } from "./routes/dashboard"
import { WorkoutPage } from "./routes/workout"
import { HistoryPage, HistoryLiftPage } from "./routes/history"
import { PersonalRecordsPage } from "./routes/pr"
import { SettingsPage } from "./routes/settings"
import { fetchSession } from "./lib/auth-store"
import { getTrainingMax } from "./lib/api"

const rootRoute = createRootRoute({
  component: RootLayout,
})

async function hasAllTrainingMaxes(): Promise<boolean> {
  try {
    const res = await getTrainingMax()
    if (!res.success || !res.data) return false
    const entries = res.data
    return ALL_LIFTS.every((lift) => {
      const entry = entries.find((e) => e.lift === lift)
      return entry !== undefined && entry.oneRm !== null && entry.oneRm > 0
    })
  } catch {
    return false
  }
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (!session) throw redirect({ to: "/login" })
    const complete = await hasAllTrainingMaxes()
    if (!complete) throw redirect({ to: "/onboarding" })
    throw redirect({ to: "/dashboard" })
  },
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (!session) throw redirect({ to: "/login" })
    const complete = await hasAllTrainingMaxes()
    if (!complete) throw redirect({ to: "/onboarding" })
  },
  component: DashboardPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (session) throw redirect({ to: "/" })
  },
  component: LoginPage,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (session) throw redirect({ to: "/" })
  },
  component: RegisterPage,
})

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (!session) throw redirect({ to: "/login" })
    const complete = await hasAllTrainingMaxes()
    if (complete) throw redirect({ to: "/" })
  },
  component: OnboardingPage,
})

const workoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workout/$liftId",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (!session) throw redirect({ to: "/login" })
    const complete = await hasAllTrainingMaxes()
    if (!complete) throw redirect({ to: "/onboarding" })
  },
  component: WorkoutPage,
})

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (!session) throw redirect({ to: "/login" })
    const complete = await hasAllTrainingMaxes()
    if (!complete) throw redirect({ to: "/onboarding" })
  },
  component: HistoryPage,
})

const historyLiftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history/$liftId",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (!session) throw redirect({ to: "/login" })
    const complete = await hasAllTrainingMaxes()
    if (!complete) throw redirect({ to: "/onboarding" })
  },
  component: HistoryLiftPage,
})

const prRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pr",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (!session) throw redirect({ to: "/login" })
    const complete = await hasAllTrainingMaxes()
    if (!complete) throw redirect({ to: "/onboarding" })
  },
  component: PersonalRecordsPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (!session) throw redirect({ to: "/login" })
    const complete = await hasAllTrainingMaxes()
    if (!complete) throw redirect({ to: "/onboarding" })
  },
  component: SettingsPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  loginRoute,
  registerRoute,
  onboardingRoute,
  workoutRoute,
  historyRoute,
  historyLiftRoute,
  prRoute,
  settingsRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

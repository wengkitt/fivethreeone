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
import App from "./App"
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
  },
  component: App,
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  onboardingRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

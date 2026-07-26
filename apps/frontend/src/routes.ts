import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router"
import { RootLayout } from "./routes/__root"
import { LoginPage } from "./routes/login"
import { RegisterPage } from "./routes/register"
import App from "./App"
import { fetchSession } from "./lib/auth-store"

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async () => {
    const session = await fetchSession()
    if (!session) throw redirect({ to: "/login" })
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
  },
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

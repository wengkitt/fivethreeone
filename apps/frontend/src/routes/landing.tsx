import { Link } from "@tanstack/react-router"

export function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-lg text-center">
          <p className="mb-2 text-sm font-medium tracking-widest uppercase text-muted-foreground">
            Jim Wendler's
          </p>
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight sm:text-6xl">
            5/3/1
          </h1>
          <p className="mb-8 text-lg text-muted-foreground">
            Track your 5/3/1 workouts. Focus on the lifting, not the spreadsheets.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/register"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        fivethreeone
      </footer>
    </div>
  )
}

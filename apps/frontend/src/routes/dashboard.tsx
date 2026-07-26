import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { getDashboard } from "../lib/api"
import { useAuth } from "../lib/useAuth"
import {
  Dumbbell,
  ArrowRight,
  Trophy,
  History,
  Calendar,
  TrendingUp,
  LogOut,
} from "lucide-react"
import type { DashboardData } from "../lib/api"
import { convertWeight } from "@fivethreeone/shared"

const LIFT_ICONS: Record<string, string> = {
  squat: "S",
  bench_press: "B",
  deadlift: "D",
  overhead_press: "O",
}

function formatDate(isoString: string | null): string {
  if (!isoString) return ""
  const date = new Date(isoString)
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function getWeekLabel(week: number): string {
  const labels: Record<number, string> = {
    1: "Week 1",
    2: "Week 2",
    3: "Week 3",
    4: "Deload",
  }
  return labels[week] ?? `Week ${week}`
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await getDashboard()
        if (res.success && res.data) {
          setDashboard(res.data)
        } else {
          setError(res.error ?? "Failed to load dashboard")
        }
      } catch {
        setError("Failed to load dashboard")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleLogout() {
    await signOut()
    navigate({ to: "/login" })
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">{error ?? "Failed to load dashboard"}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const unit = dashboard.unitPreference === "lb" ? "lb" : "kg"

  function displayWeight(kg: number): string {
    if (unit === "lb") {
      return `${Math.round(convertWeight(kg, "kg", "lb"))}`
    }
    return `${Math.round(kg)}`
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="size-5 text-primary" />
            <h1 className="text-lg font-bold">5/3/1</h1>
          </div>
          <div className="flex items-center gap-3">
            {session && (
              <span className="text-sm text-muted-foreground">{session.username}</span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
            >
              <LogOut className="size-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4 pb-24 sm:p-6 sm:pb-24">
        {/* Empty state */}
        {!dashboard.hasCompletedWorkouts && dashboard.lifts.length > 0 && (
          <section className="rounded-xl border border-border bg-gradient-to-b from-primary/5 to-transparent p-8 text-center">
            <Dumbbell className="mx-auto mb-4 size-12 text-primary" />
            <h2 className="text-2xl font-bold">Welcome to 5/3/1</h2>
            <p className="mt-2 text-muted-foreground">
              Your training program is ready. Start your first workout to begin tracking your progress.
            </p>
            {(() => {
              const tw = dashboard.todayWorkout
              if (!tw) return null
              return (
                <button
                  onClick={() => navigate({ to: `/workout/${tw.lift}` })}
                  className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
                >
                  Start Your First Workout
                  <ArrowRight className="size-5" />
                </button>
              )
            })()}
          </section>
        )}

        {/* Today's Workout */}
        {dashboard.hasCompletedWorkouts && (() => {
          const tw = dashboard.todayWorkout
          if (!tw) return null
          return (
            <section className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="size-4" />
                Today's Workout
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{tw.displayName}</h2>
                  <p className="mt-1 text-muted-foreground">
                    {getWeekLabel(tw.weekNumber)}
                  </p>
                </div>
                <button
                  onClick={() => navigate({ to: `/workout/${tw.lift}` })}
                  className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90"
                >
                  Start Workout
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </section>
          )
        })()}

        {/* Main Lifts */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Training Maxes
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {dashboard.lifts.map((lift) => (
              <div
                key={lift.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      {LIFT_ICONS[lift.id]}
                    </div>
                    <div>
                      <p className="font-semibold">{lift.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        Cycle {lift.cycleNumber} &middot; {getWeekLabel(lift.currentWeek)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold tabular-nums">
                      {displayWeight(lift.trainingMax)}
                    </p>
                    <p className="text-xs text-muted-foreground">{unit}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-1.5">
                  {lift.progress.map((p) => (
                    <div
                      key={p.week}
                      className={`h-1.5 flex-1 rounded-full ${
                        p.completed ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-1 flex justify-between px-0.5 text-[10px] text-muted-foreground">
                  <span>W1</span>
                  <span>W2</span>
                  <span>W3</span>
                  <span>W4</span>
                </div>
                <button
                  onClick={() => navigate({ to: `/workout/${lift.id}` })}
                  className="mt-3 w-full rounded-md border border-input py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Start Workout
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Personal Records */}
        {dashboard.personalRecords.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Trophy className="size-4 text-amber-500" />
              Personal Records
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {dashboard.personalRecords.map((pr, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
                >
                  <div>
                    <p className="font-medium">{pr.displayName}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {pr.prType.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">{displayWeight(pr.value)}</p>
                    <p className="text-xs text-muted-foreground">{unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Workouts */}
        {dashboard.recentWorkouts.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <History className="size-4" />
              Recent Workouts
            </h2>
            <div className="space-y-2">
              {dashboard.recentWorkouts.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
                      {LIFT_ICONS[w.lift]}
                    </div>
                    <div>
                      <p className="font-medium">{w.displayName}</p>
                      <p className="text-xs text-muted-foreground">{getWeekLabel(w.weekNumber)}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatDate(w.completedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Next Workout */}
        {dashboard.hasCompletedWorkouts && dashboard.nextWorkout && (
          <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="size-4" />
              Up Next
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-base font-bold text-muted-foreground">
                  {LIFT_ICONS[dashboard.nextWorkout.lift]}
                </div>
                <div>
                  <p className="font-semibold">{dashboard.nextWorkout.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {getWeekLabel(dashboard.nextWorkout.weekNumber)}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

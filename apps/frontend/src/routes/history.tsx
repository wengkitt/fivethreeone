import { useState, useEffect } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { getWorkouts, getLiftHistory, getLifts } from "../lib/api"
import type { HistoryWorkout, LiftInfo } from "../lib/api"
import { useAuth } from "../lib/useAuth"
import { ChevronDown, ChevronRight, Dumbbell, Calendar, Filter, History, LogOut, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react"

function formatDate(isoString: string | null): string {
  if (!isoString) return ""
  const date = new Date(isoString)
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getWeekLabel(week: number): string {
  const labels: Record<number, string> = { 1: "Week 1", 2: "Week 2", 3: "Week 3", 4: "Deload" }
  return labels[week] ?? `Week ${week}`
}

export function HistoryLiftPage() {
  const { liftId } = useParams({ from: "/history/$liftId" })
  return <HistoryPage liftId={liftId} />
}

export function HistoryPage({ liftId: initialLiftId }: { liftId?: string } = {}) {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const [workouts, setWorkouts] = useState<HistoryWorkout[]>([])
  const [lifts, setLifts] = useState<LiftInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterLift, setFilterLift] = useState("")
  const [filterCycle, setFilterCycle] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [unit] = useState("kg")

  const limit = 10

  useEffect(() => {
    async function loadLifts() {
      try {
        const res = await getLifts()
        if (res.success && res.data) {
          setLifts(res.data)
        }
      } catch {}
    }
    loadLifts()
  }, [])

  useEffect(() => {
    if (initialLiftId) {
      setFilterLift(initialLiftId)
    }
  }, [initialLiftId])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const params: { lift?: string; cycle?: string; page?: number; limit?: number } = { page, limit }
        if (filterLift) params.lift = filterLift
        if (filterCycle) params.cycle = filterCycle

        if (initialLiftId) {
          const res = await getLiftHistory(initialLiftId)
          if (res.success && res.data) {
            setWorkouts(res.data)
            setTotal(res.data.length)
          } else {
            setError(res.error ?? "Failed to load history")
          }
        } else {
          const res = await getWorkouts(params)
          if (res.success && res.data) {
            setWorkouts(res.data.workouts)
            setTotal(res.data.total)
          } else {
            setError(res.error ?? "Failed to load history")
          }
        }
      } catch {
        setError("Failed to load history")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filterLift, filterCycle, page, initialLiftId])

  async function handleLogout() {
    await signOut()
    navigate({ to: "/login" })
  }

  function getUniqueCycles(): number[] {
    const cycles = new Set(workouts.map((w) => w.cycleNumber))
    return Array.from(cycles).sort((a, b) => b - a)
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="size-5 text-primary" />
            <h1 className="text-lg font-bold">Workout History</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate({ to: "/settings" })}
              className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
            >
              Settings
            </button>
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

      <main className="mx-auto max-w-4xl space-y-4 p-4 pb-24 sm:p-6 sm:pb-24">
        {!initialLiftId && (
          <section className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
            <Filter className="size-4 text-muted-foreground" />
            <select
              value={filterLift}
              onChange={(e) => { setFilterLift(e.target.value); setPage(1) }}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="">All Lifts</option>
              {lifts.map((l) => (
                <option key={l.id} value={l.id}>{l.displayName}</option>
              ))}
            </select>
            <select
              value={filterCycle}
              onChange={(e) => { setFilterCycle(e.target.value); setPage(1) }}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="">All Cycles</option>
              {getUniqueCycles().map((c) => (
                <option key={c} value={String(c)}>Cycle {c}</option>
              ))}
            </select>
          </section>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading history...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-destructive">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && workouts.length === 0 && (
          <section className="rounded-xl border border-border bg-gradient-to-b from-primary/5 to-transparent p-8 text-center">
            <History className="mx-auto mb-4 size-12 text-primary" />
            <h2 className="text-xl font-bold">No Workouts Yet</h2>
            <p className="mt-2 text-muted-foreground">
              Complete your first workout to see it here.
            </p>
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground"
            >
              Go to Dashboard
            </button>
          </section>
        )}

        {!loading && workouts.length > 0 && (
          <>
            <div className="space-y-2">
              {workouts.map((w) => (
                <div key={w.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => toggleExpand(w.id)}
                    className="flex w-full items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                        {w.displayName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{w.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {getWeekLabel(w.weekNumber)} &middot; Cycle {w.cycleNumber}
                        </p>
                        {w.notes && !expandedId && (
                          <p className="mt-0.5 max-w-[200px] truncate text-xs text-muted-foreground/70 italic">
                            {w.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="size-3" />
                        {formatDate(w.completedAt)}
                      </div>
                      {expandedId === w.id ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expandedId === w.id && (
                    <div className="border-t border-border px-4 py-3 space-y-4">
                      {w.notes && (
                        <p className="text-sm text-muted-foreground italic">
                          &ldquo;{w.notes}&rdquo;
                        </p>
                      )}

                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Sets
                        </h4>
                        <div className="space-y-1">
                          {w.sets.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Set {s.setNumber}</span>
                                {s.isAmrap && (
                                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                    AMRAP
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-muted-foreground">
                                <span>
                                  {s.calculatedWeight}{unit} × {s.targetReps}{s.isAmrap ? "+" : ""}
                                </span>
                                {(s.actualWeight != null || s.actualReps != null) && (
                                  <span className="text-foreground">
                                    → {s.actualWeight ?? "—"}{unit} × {s.actualReps ?? "—"}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {w.assistanceExercises.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Assistance Exercises
                          </h4>
                          <div className="space-y-1">
                            {w.assistanceExercises.map((e) => (
                              <div
                                key={e.id}
                                className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                              >
                                <span className="font-medium">{e.exerciseName}</span>
                                <span className="text-muted-foreground">
                                  {e.sets}×{e.reps}{e.weight ? ` @ ${e.weight}${unit}` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!initialLiftId && totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent"
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent"
                >
                  Next
                  <ChevronRightIcon className="size-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

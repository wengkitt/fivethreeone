import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { getPersonalRecords, getLifts } from "../lib/api"
import type { PersonalRecordItem } from "../lib/api"
import { useAuth } from "../lib/useAuth"
import { Trophy, TrendingUp, Target, Zap, LogOut, Award } from "lucide-react"

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

interface LiftSummary {
  displayName: string
  lift: string
  prs: PersonalRecordItem[]
  highestTm: PersonalRecordItem | null
  bestAmrap: PersonalRecordItem | null
  highestEstimated1Rm: PersonalRecordItem | null
  estimated1RmHistory: PersonalRecordItem[]
}

function buildSummary(prMap: Record<string, PersonalRecordItem[]>, liftNameMap: Record<string, string>): LiftSummary[] {
  return Object.entries(prMap).map(([lift, records]) => {
    const tmPrs = records.filter((r) => r.prType === "tm")
    const amrapPrs = records.filter((r) => r.prType === "amrap_reps")
    const estimated1RmPrs = records.filter((r) => r.prType === "estimated_1rm")

    const highestTm = tmPrs.length > 0
      ? tmPrs.reduce((a, b) => (a.value > b.value ? a : b))
      : null

    const bestAmrap = amrapPrs.length > 0
      ? amrapPrs.reduce((a, b) => (a.value > b.value ? a : b))
      : null

    const highestEstimated1Rm = estimated1RmPrs.length > 0
      ? estimated1RmPrs.reduce((a, b) => (a.value > b.value ? a : b))
      : null

    const estimated1RmHistory = [...estimated1RmPrs].sort(
      (a, b) => new Date(a.achievedAt).getTime() - new Date(b.achievedAt).getTime(),
    )

    return {
      displayName: liftNameMap[lift] ?? lift,
      lift,
      prs: records,
      highestTm,
      bestAmrap,
      highestEstimated1Rm,
      estimated1RmHistory,
    }
  })
}

function Estimated1RmChart({ history, unit }: { history: PersonalRecordItem[]; unit: string }) {
  if (history.length < 2) return null

  const values = history.map((h) => h.value)
  const min = Math.min(...values) * 0.95
  const max = Math.max(...values) * 1.05
  const range = max - min
  const width = 240
  const height = 60
  const padding = 4

  const points = values.map((v, i) => {
    const x = padding + (i / Math.max(values.length - 1, 1)) * (width - 2 * padding)
    const y = height - padding - ((v - min) / range) * (height - 2 * padding)
    return `${x},${y}`
  })

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ")

  return (
    <div className="mt-3">
      <p className="mb-1 text-xs font-medium text-muted-foreground">
        Estimated 1RM Progress
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[240px] h-15">
        <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
        {points.map((p, i) => {
          const [cx, cy] = p.split(",")
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="3"
              className="fill-primary"
            />
          )
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{Math.round(min)}{unit}</span>
        <span>{Math.round(max)}{unit}</span>
      </div>
    </div>
  )
}

export function PersonalRecordsPage() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const [summaries, setSummaries] = useState<LiftSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unit] = useState("kg")

  useEffect(() => {
    async function load() {
      try {
        const [prRes, liftsRes] = await Promise.all([
          getPersonalRecords(),
          getLifts(),
        ])

        if (prRes.success && prRes.data) {
          const liftNameMap: Record<string, string> = {}
          if (liftsRes.success && liftsRes.data) {
            for (const l of liftsRes.data) {
              liftNameMap[l.id] = l.displayName
            }
          }
          setSummaries(buildSummary(prRes.data.grouped, liftNameMap))
        } else {
          setError(prRes.error ?? "Failed to load personal records")
        }
      } catch {
        setError("Failed to load personal records")
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

  function displayWeight(kg: number): string {
    return `${Math.round(kg)}`
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading personal records...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
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

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-amber-500" />
            <h1 className="text-lg font-bold">Personal Records</h1>
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

      <main className="mx-auto max-w-4xl space-y-6 p-4 pb-24 sm:p-6 sm:pb-24">
        {summaries.length === 0 && (
          <section className="rounded-xl border border-border bg-gradient-to-b from-amber-500/5 to-transparent p-8 text-center">
            <Award className="mx-auto mb-4 size-12 text-amber-500" />
            <h2 className="text-xl font-bold">No Records Yet</h2>
            <p className="mt-2 text-muted-foreground">
              Complete workouts and set new personal bests. Your achievements will appear here.
            </p>
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground"
            >
              Start Training
            </button>
          </section>
        )}

        {summaries.map((summary) => (
          <section
            key={summary.lift}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="bg-gradient-to-r from-amber-500/10 to-primary/5 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/20 text-base font-bold text-amber-600">
                  {summary.displayName.charAt(0)}
                </div>
                <h2 className="text-xl font-bold">{summary.displayName}</h2>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {summary.highestTm && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <TrendingUp className="size-4" />
                    Highest Training Max
                  </div>
                  <p className="mt-1 text-xl font-bold tabular-nums">
                    {displayWeight(summary.highestTm.value)} {unit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(summary.highestTm.achievedAt)}
                  </p>
                </div>
              )}

              {summary.bestAmrap && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Zap className="size-4" />
                    Best AMRAP Performance
                  </div>
                  <p className="mt-1 text-xl font-bold tabular-nums">
                    {summary.bestAmrap.value} reps
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(summary.bestAmrap.achievedAt)}
                  </p>
                </div>
              )}

              {summary.highestEstimated1Rm && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Target className="size-4" />
                    Highest Estimated 1RM
                  </div>
                  <p className="mt-1 text-xl font-bold tabular-nums">
                    {displayWeight(summary.highestEstimated1Rm.value)} {unit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(summary.highestEstimated1Rm.achievedAt)}
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Trophy className="size-4" />
                  Personal Records
                </div>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {summary.prs.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  total records
                </p>
              </div>
            </div>

            {summary.estimated1RmHistory.length >= 2 && (
              <div className="border-t border-border px-5 py-4">
                <Estimated1RmChart history={summary.estimated1RmHistory} unit={unit} />
              </div>
            )}

            <div className="border-t border-border">
              <button
                onClick={() => navigate({ to: `/history/${summary.lift}` })}
                className="flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                View history for {summary.displayName}
              </button>
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}

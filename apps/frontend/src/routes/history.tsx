import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { getBlocks, getBlock, type BlockListItem } from "../lib/api"
import { LIFT_LABELS, LIFT_ORDER, type WorkoutDay } from "@fivethreeone/shared"
import { ArrowLeft, Check, SkipForward } from "lucide-react"

export function HistoryPage() {
  const navigate = useNavigate()
  const [blocks, setBlocks] = useState<BlockListItem[]>([])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await getBlocks()
      if (res.success && res.data) {
        setBlocks(res.data)
        if (res.data.length > 0 && !selectedBlockId) {
          setSelectedBlockId(res.data[0].id)
        }
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    if (!selectedBlockId) return
    loadBlockDays(selectedBlockId)
  }, [selectedBlockId])

  async function loadBlockDays(id: string) {
    try {
      const res = await getBlock(id)
      if (res.success && res.data) {
        setWorkoutDays(res.data.workoutDays)
      }
    } catch {}
  }

  const completedDays = workoutDays.filter((d) => d.status === "completed" || d.status === "skipped")

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button onClick={() => navigate({ to: "/dashboard" })} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-lg font-bold">History</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        {blocks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No blocks yet. Create one to get started.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <select
                value={selectedBlockId ?? ""}
                onChange={(e) => setSelectedBlockId(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
              >
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    Block from {new Date(b.createdAt).toLocaleDateString()} ({b.completedDays}/{b.totalDays} days)
                  </option>
                ))}
              </select>
            </div>

            {completedDays.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No completed workouts in this block yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {completedDays
                  .sort((a, b) => {
                    if (a.cycleNumber !== b.cycleNumber) return a.cycleNumber - b.cycleNumber
                    if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber
                    return LIFT_ORDER.indexOf(a.lift) - LIFT_ORDER.indexOf(b.lift)
                  })
                  .map((day) => (
                    <div
                      key={day.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        {day.status === "skipped" ? (
                          <SkipForward className="size-4 text-amber-500" />
                        ) : (
                          <Check className="size-4 text-green-600" />
                        )}
                        <div>
                          <p className="font-medium">
                            {LIFT_LABELS[day.lift]} — C{day.cycleNumber} W{day.weekNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {day.completedAt
                              ? new Date(day.completedAt).toLocaleDateString(undefined, {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : day.status === "skipped" ? "Skipped" : ""}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${day.status === "skipped" ? "text-amber-500" : "text-green-600"}`}>
                        {day.status === "skipped" ? "Skipped" : "Done"}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

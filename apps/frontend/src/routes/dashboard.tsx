import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { getBlocks, getBlock, tickWorkoutDay, skipDeload, deleteBlock, type BlockListItem } from "../lib/api"
import { LIFT_LABELS, LIFT_ORDER, type WeekNumber, type WorkoutDay } from "@fivethreeone/shared"
import type { MainLift } from "@fivethreeone/shared"
import { estimate1RM, calculateTmFromOneRm, progressTm, generateWorkoutSets } from "@fivethreeone/core"
import { Check, Plus, Trash2, Settings, History as HistoryIcon, Dumbbell } from "lucide-react"

const PLATE_INCREMENT = 2.5

interface LiftsConfig {
  squat: { weight: number; reps: number }
  benchPress: { weight: number; reps: number }
  deadlift: { weight: number; reps: number }
  overheadPress: { weight: number; reps: number }
}

function computeTm(weight: number, reps: number): number {
  const estimated = estimate1RM(weight, reps)
  return calculateTmFromOneRm(estimated, PLATE_INCREMENT)
}

function tmForCycle(lift: MainLift, tm: number, cycle: number): number {
  let current = tm
  for (let i = 1; i < cycle; i++) {
    current = progressTm(current, lift)
  }
  return current
}

function computeCurrentCycleAndWeek(
  workoutDays: WorkoutDay[],
): { cycle: number; week: number } {
  for (let cycle = 1; cycle <= 4; cycle++) {
    for (let week = 1; week <= 4; week++) {
      const allDone = LIFT_ORDER.every((lift) =>
        workoutDays.some(
          (d) =>
            d.lift === lift &&
            d.cycleNumber === cycle &&
            d.weekNumber === week &&
            (d.status === "completed" || d.status === "skipped"),
        ),
      )
      if (!allDone) return { cycle, week }
    }
  }
  return { cycle: 4, week: 4 }
}

function isWeekComplete(workoutDays: WorkoutDay[], cycle: number, week: number): boolean {
  return LIFT_ORDER.every((lift) =>
    workoutDays.some(
      (d) =>
        d.lift === lift &&
        d.cycleNumber === cycle &&
        d.weekNumber === week &&
        (d.status === "completed" || d.status === "skipped"),
    ),
  )
}

function isCycleComplete(workoutDays: WorkoutDay[], cycle: number): boolean {
  for (let week = 1; week <= 4; week++) {
    if (!isWeekComplete(workoutDays, cycle, week)) return false
  }
  return true
}

function isLiftDone(workoutDays: WorkoutDay[], lift: MainLift, cycle: number, week: number) {
  return workoutDays.some(
    (d) =>
      d.lift === lift &&
      d.cycleNumber === cycle &&
      d.weekNumber === week &&
      (d.status === "completed" || d.status === "skipped"),
  )
}

function isDeloadSkipped(workoutDays: WorkoutDay[], cycle: number): boolean {
  return LIFT_ORDER.every((lift) =>
    workoutDays.some(
      (d) =>
        d.lift === lift &&
        d.cycleNumber === cycle &&
        d.weekNumber === 4 &&
        d.status === "skipped",
    ),
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [blocks, setBlocks] = useState<BlockListItem[]>([])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [blockDetail, setBlockDetail] = useState<{
    config: LiftsConfig
    workoutDays: WorkoutDay[]
  } | null>(null)
  const [selectedCycle, setSelectedCycle] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ticking, setTicking] = useState<string | null>(null)

  useEffect(() => {
    loadBlocks()
  }, [])

  async function loadBlocks() {
    setLoading(true)
    setError(null)
    try {
      const res = await getBlocks()
      if (res.success && res.data) {
        setBlocks(res.data)
        const active = res.data.find((b) => b.status === "active")
        if (active) {
          setSelectedBlockId(active.id)
        } else if (res.data.length > 0) {
          setSelectedBlockId(res.data[0].id)
        }
      }
    } catch {
      setError("Failed to load blocks")
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!selectedBlockId) {
      setBlockDetail(null)
      return
    }
    loadBlockDetail(selectedBlockId)
  }, [selectedBlockId])

  async function loadBlockDetail(id: string) {
    try {
      const res = await getBlock(id)
      if (res.success && res.data) {
        const b = res.data.block
        const config: LiftsConfig = {
          squat: { weight: b.squat.weight, reps: b.squat.reps },
          benchPress: { weight: b.benchPress.weight, reps: b.benchPress.reps },
          deadlift: { weight: b.deadlift.weight, reps: b.deadlift.reps },
          overheadPress: { weight: b.overheadPress.weight, reps: b.overheadPress.reps },
        }
        setBlockDetail({ config, workoutDays: res.data.workoutDays })

        const { cycle, week } = computeCurrentCycleAndWeek(res.data.workoutDays)
        setSelectedCycle(cycle)
        setSelectedWeek(week)
      }
    } catch {
      setError("Failed to load block details")
    }
  }

  const currentBlock = blocks.find((b) => b.id === selectedBlockId)
  const currentInfo = blockDetail
    ? computeCurrentCycleAndWeek(blockDetail.workoutDays)
    : { cycle: 1, week: 1 }

  async function handleTick(lift: MainLift, cycle: number, week: WeekNumber) {
    if (!selectedBlockId) return
    setTicking(`${lift}-${cycle}-${week}`)
    try {
      const res = await tickWorkoutDay(selectedBlockId, lift, cycle, week)
      if (res.success) {
        await loadBlockDetail(selectedBlockId)
        await loadBlocks()
      }
    } catch {
      setError("Failed to tick workout")
    }
    setTicking(null)
  }

  async function handleSkipDeload() {
    if (!selectedBlockId) return
    try {
      const res = await skipDeload(selectedBlockId, selectedCycle)
      if (res.success) {
        await loadBlockDetail(selectedBlockId)
        await loadBlocks()
      }
    } catch {
      setError("Failed to skip deload")
    }
  }

  async function handleDeleteBlock(id: string) {
    try {
      const res = await deleteBlock(id)
      if (res.success) {
        await loadBlocks()
        setBlockDetail(null)
      }
    } catch {
      setError("Failed to delete block")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (blocks.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
        <Dumbbell className="size-16 text-primary" />
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome to 5/3/1</h1>
          <p className="mt-2 text-muted-foreground">Create your first block to get started.</p>
        </div>
        <button
          onClick={() => navigate({ to: "/create-block" })}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          <Plus className="size-5" />
          Create Block
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-bold">5/3/1</h1>
          <div className="flex items-center gap-2">
            {currentBlock && currentBlock.status === "completed" && (
              <button
                onClick={() => navigate({ to: "/create-block" })}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              >
                <Plus className="size-4" />
                New Block
              </button>
            )}
            <button onClick={() => navigate({ to: "/history" })} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
              <HistoryIcon className="size-5" />
            </button>
            <button onClick={() => navigate({ to: "/settings" })} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
              <Settings className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        {error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 font-medium underline">Dismiss</button>
          </div>
        )}

        {/* Block selector */}
        <div className="mb-4 flex items-center gap-2">
          <select
            value={selectedBlockId ?? ""}
            onChange={(e) => setSelectedBlockId(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
          >
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                Block from {new Date(b.createdAt).toLocaleDateString()} ({b.completedDays}/{b.totalDays}) — {b.status}
              </option>
            ))}
          </select>
          {currentBlock && currentBlock.status === "active" && (
            <button
              onClick={() => handleDeleteBlock(currentBlock.id)}
              className="rounded-xl border border-border p-2.5 text-muted-foreground hover:text-red-600"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>

        {blockDetail && (
          <>
            {/* Block summary */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(Object.entries(LIFT_LABELS) as [MainLift, string][]).map(([lift, label]) => {
                const entry = blockDetail.config[lift === "bench_press" ? "benchPress" : lift === "overhead_press" ? "overheadPress" : lift]
                const tm = computeTm(entry.weight, entry.reps)
                return (
                  <div key={lift} className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">{tm} kg</p>
                    <p className="text-xs text-muted-foreground">TM</p>
                  </div>
                )
              })}
            </div>

            {/* Cycle tabs */}
            <div className="mb-3 flex gap-2">
              {[1, 2, 3, 4].map((cycle) => {
                const complete = isCycleComplete(blockDetail.workoutDays, cycle)
                const isCurrent = cycle === currentInfo.cycle && !complete
                return (
                  <button
                    key={cycle}
                    onClick={() => setSelectedCycle(cycle)}
                    className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${isWeekComplete(blockDetail.workoutDays, cycle, w as WeekNumber)
              ) ?? 4
              setSelectedWeek(firstIncomplete)
                    }}
                    className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                      selectedCycle === cycle && !showAllCycles
                        ? "border-primary bg-primary/5 text-primary"
                        : isCurrent
                          ? "border-primary/50 text-primary"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    C{cycle}
                    {complete && <Check className="size-3.5 text-green-600" />}
                  </button>
                )
              })}
            </div>

            {/* View all cycles toggle */}
            <button
              onClick={() => setShowAllCycles(!showAllCycles)}
              className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {showAllCycles ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              {showAllCycles ? "Show current week" : "View all cycles"}
            </button>

            {showAllCycles ? (
              <AllCyclesGrid
                workoutDays={blockDetail.workoutDays}
                currentCycle={currentInfo.cycle}
                currentWeek={currentInfo.week}
                onTick={handleTick}
                ticking={ticking}
              />
            ) : (
              <>
                {/* Week tabs */}
                <div className="mb-3 flex gap-2">
                  {[1, 2, 3, 4].map((week) => {
                    const complete = isWeekComplete(blockDetail.workoutDays, selectedCycle, week)
                    const isCurrent = week === currentInfo.week && selectedCycle === currentInfo.cycle
                    return (
                      <button
                        key={week}
                        onClick={() => setSelectedWeek(week as WeekNumber)}
                        className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                          selectedWeek === week
                            ? "border-primary bg-primary/5 text-primary"
                            : isCurrent
                              ? "border-primary/50 text-primary"
                              : "border-border text-muted-foreground"
                        }`}
                      >
                        {week === 4 ? "Deload" : `W${week}`}
                        {complete && <Check className="size-3.5 text-green-600" />}
                      </button>
                    )
                  })}
                </div>

                {/* Lift cards */}
                {LIFT_ORDER.map((lift) => {
                  const entry = blockDetail.config[lift === "bench_press" ? "benchPress" : lift === "overhead_press" ? "overheadPress" : lift]
                  const tm = computeTm(entry.weight, entry.reps)
                  const cycleTm = tmForCycle(lift, tm, selectedCycle)
                  const week = selectedWeek as WeekNumber
                  const sets = generateWorkoutSets(cycleTm, week, PLATE_INCREMENT)
                  const done = isLiftDone(blockDetail.workoutDays, lift, selectedCycle, selectedWeek)
                  const isCurrent = selectedCycle === currentInfo.cycle && selectedWeek === currentInfo.week && !done

                  const tickKey = `${lift}-${selectedCycle}-${week}`
                  const isTicking = ticking === tickKey

                  return (
                    <div key={lift} className="mb-3 rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{LIFT_LABELS[lift]}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">TM: {cycleTm} kg</span>
                          <button
                            onClick={() => handleTick(lift, selectedCycle, selectedWeek as WeekNumber)}
                            disabled={done || !isCurrent || isTicking}
                            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                              done
                                ? "bg-green-100 text-green-700"
                                : isCurrent
                                  ? "border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                  : "cursor-not-allowed border border-border text-muted-foreground"
                            }`}
                          >
                            {isTicking ? (
                              "..." 
                            ) : done ? (
                              <>
                                <Check className="size-4" /> Done
                              </>
                            ) : (
                              "Tick"
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1">
                        {sets.map((set) => (
                          <div key={set.setNumber} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                            <span>
                              Set {set.setNumber}: {set.weight} kg × {set.reps}
                              {set.isAmrap ? "+" : ""}
                            </span>
                            <span className="text-muted-foreground">
                              {set.percentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {/* Skip deload button */}
                {selectedWeek === 4 && currentInfo.cycle === selectedCycle && !isDeloadSkipped(blockDetail.workoutDays, selectedCycle) && (
                  <button
                    onClick={handleSkipDeload}
                    className="mb-3 w-full rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    Skip Deload Week
                  </button>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function AllCyclesGrid({
  workoutDays,
  currentCycle,
  currentWeek,
  onTick,
  ticking,
}: {
  workoutDays: WorkoutDay[]
  currentCycle: number
  currentWeek: number
  onTick: (lift: MainLift, cycle: number, week: WeekNumber) => void
  ticking: string | null
}) {
  return (
    <div className="space-y-6">
      {[1, 2, 3, 4].map((cycle) => {
        const cycleComplete = isCycleComplete(workoutDays, cycle)
        return (
          <div key={cycle} className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold">
              Cycle {cycle}
              {cycleComplete && <Check className="ml-2 inline size-4 text-green-600" />}
            </h3>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((week) => {
                const weekComplete = isWeekComplete(workoutDays, cycle, week)
                return (
                  <div key={week} className="rounded-lg bg-muted/30 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {week === 4 ? "Deload" : `Week ${week}`}
                        {weekComplete && <Check className="ml-2 inline size-3.5 text-green-600" />}
                      </span>
                      {!weekComplete && cycle === currentCycle && week === currentWeek && (
                        <span className="text-xs text-primary">Current</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {LIFT_ORDER.map((lift) => {
                        const done = isLiftDone(workoutDays, lift, cycle, week as WeekNumber)
                        const isTickable = cycle === currentCycle && week === currentWeek && !done
                        const tickKey = `${lift}-${cycle}-${week}`
                        const isTicking = ticking === tickKey
                        return (
                          <button
                            key={lift}
                            onClick={() => onTick(lift, cycle, week as WeekNumber)}
                            disabled={done || !isTickable || isTicking}
                            className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                              done
                                ? "bg-green-50 text-green-700"
                                : isTickable
                                  ? "border border-primary/30 text-primary hover:bg-primary/5"
                                  : "bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            <span>{LIFT_LABELS[lift]}</span>
                            {isTicking ? (
                              <span>...</span>
                            ) : done ? (
                              <Check className="size-3" />
                            ) : isTickable ? (
                              <Check className="size-3" />
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

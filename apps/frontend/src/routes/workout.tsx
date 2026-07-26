import { useState, useEffect, useCallback } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { useAuth } from "../lib/useAuth"
import {
  getWorkoutsCurrent, getWorkout, startWorkout, completeWorkout, getTemplates,
  type WorkoutCurrentData, type WorkoutDetail, type WorkoutSetData,
  type AssistanceExerciseData, type TemplateData,
} from "../lib/api"
import { convertWeight } from "@fivethreeone/shared"
import {
  Dumbbell, ArrowLeft, Check, Plus, X, AlertCircle, Flame,
} from "lucide-react"
import { LIFT_LABELS } from "@fivethreeone/shared"

const WEEK_LABELS: Record<number, string> = {
  1: "Week 1",
  2: "Week 2",
  3: "Week 3",
  4: "Deload",
}

function getWeekLabel(week: number): string {
  return WEEK_LABELS[week] ?? `Week ${week}`
}

type PageState = "loading" | "ready" | "error"

export function WorkoutPage() {
  const navigate = useNavigate()
  const { liftId } = useParams({ from: "/workout/$liftId" })
  const { session } = useAuth()

  const [pageState, setPageState] = useState<PageState>("loading")
  const [error, setError] = useState<string | null>(null)
  const [unit, setUnit] = useState<"kg" | "lb">("kg")

  const [workoutData, setWorkoutData] = useState<WorkoutCurrentData | null>(null)
  const [workoutDetail, setWorkoutDetail] = useState<WorkoutDetail | null>(null)

  const [sets, setSets] = useState<WorkoutSetData[]>([])
  const [notes, setNotes] = useState("")
  const [assistanceExercises, setAssistanceExercises] = useState<AssistanceExerciseData[]>([])
  const [showAssistanceForm, setShowAssistanceForm] = useState(false)
  const [templates, setTemplates] = useState<TemplateData[]>([])
  const [saving, setSaving] = useState(false)

  const isInProgress = workoutDetail?.status === "in_progress"
  const isCompleted = workoutDetail?.status === "completed"

  useEffect(() => {
    async function load() {
      try {
        const [currentRes, templatesRes] = await Promise.all([
          getWorkoutsCurrent(),
          getTemplates(),
        ])
        if (!currentRes.success || !currentRes.data) {
          setError(currentRes.error ?? "Failed to load workout data")
          setPageState("error")
          return
        }
        if (templatesRes.success && templatesRes.data) {
          setTemplates(templatesRes.data)
        }
        const liftData = currentRes.data.find((d: WorkoutCurrentData) => d.lift === liftId)
        if (!liftData) {
          setError("Lift not found")
          setPageState("error")
          return
        }
        setWorkoutData(liftData)
        setUnit(liftData.trainingMax > 0 ? (liftData.status === "in_progress" ? "kg" : "kg") : "kg")

        if (liftData.status === "in_progress" && liftData.workoutId) {
          const detailRes = await getWorkout(liftData.workoutId)
          if (detailRes.success && detailRes.data) {
            setWorkoutDetail(detailRes.data)
            setSets(detailRes.data.sets)
            setNotes(detailRes.data.notes ?? "")
            setAssistanceExercises(detailRes.data.assistanceExercises)
          } else {
            setSets(liftData.sets)
          }
        } else if (liftData.status === "completed" && liftData.workoutId) {
          const detailRes = await getWorkout(liftData.workoutId)
          if (detailRes.success && detailRes.data) {
            setWorkoutDetail(detailRes.data)
            setSets(detailRes.data.sets)
            setNotes(detailRes.data.notes ?? "")
            setAssistanceExercises(detailRes.data.assistanceExercises)
          } else {
            setSets(liftData.sets)
          }
        } else {
          setSets(liftData.sets)
        }
        setPageState("ready")
      } catch {
        setError("Failed to load workout data")
        setPageState("error")
      }
    }
    load()
  }, [liftId])

  const displayWeight = useCallback((kg: number): string => {
    if (unit === "lb") {
      return `${Math.round(convertWeight(kg, "kg", "lb"))}`
    }
    return `${Math.round(kg)}`
  }, [unit])

  function handleSetChange(setNumber: number, field: "actualWeight" | "actualReps", value: string) {
    setSets((prev) =>
      prev.map((s) =>
        s.setNumber === setNumber
          ? { ...s, [field]: value === "" ? null : Number(value) }
          : s,
      ),
    )
  }

  async function handleStartWorkout() {
    setSaving(true)
    try {
      const res = await startWorkout(liftId)
      if (res.success && res.data) {
        setWorkoutDetail(res.data)
        setSets(res.data.sets)
      } else {
        setError(res.error ?? "Failed to start workout")
      }
    } catch {
      setError("Failed to start workout")
    } finally {
      setSaving(false)
    }
  }

  async function handleCompleteWorkout() {
    if (!workoutDetail) return
    setSaving(true)
    try {
      const res = await completeWorkout(workoutDetail.id, {
        notes: notes || null,
        sets: sets.map((s) => ({
          id: s.id ?? "",
          actualWeight: s.actualWeight,
          actualReps: s.actualReps,
        })),
        assistanceExercises: assistanceExercises.map((e) => ({
          exerciseName: e.exerciseName,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          notes: e.notes,
          templateName: e.templateName ?? null,
        })),
      })
      if (res.success && res.data) {
        setWorkoutDetail(res.data)
        navigate({ to: "/dashboard" })
      } else {
        setError(res.error ?? "Failed to complete workout")
      }
    } catch {
      setError("Failed to complete workout")
    } finally {
      setSaving(false)
    }
  }

  function addAssistanceExercise(exercise: AssistanceExerciseData) {
    setAssistanceExercises((prev) => [...prev, exercise])
    setShowAssistanceForm(false)
  }

  function removeAssistanceExercise(index: number) {
    setAssistanceExercises((prev) => prev.filter((_, i) => i !== index))
  }

  function applyTemplate(template: TemplateData) {
    for (const ex of template.exercises) {
      setAssistanceExercises((prev) => [...prev, { ...ex, templateName: template.name }])
    }
    setShowAssistanceForm(false)
  }

  if (pageState === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading workout...</p>
      </div>
    )
  }

  if (pageState === "error") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 size-12 text-destructive" />
          <p className="text-destructive">{error ?? "Something went wrong"}</p>
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

  if (!workoutData) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-muted-foreground">No workout data available</p>
      </div>
    )
  }

  const displayName = LIFT_LABELS[liftId] ?? liftId

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="flex items-center gap-1 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">{displayName}</h1>
              <p className="text-xs text-muted-foreground">
                {getWeekLabel(workoutData.weekNumber)} &middot; Cycle {workoutData.cycleNumber}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums">{displayWeight(workoutData.trainingMax)}</p>
            <p className="text-xs text-muted-foreground">TM</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4 pb-32 sm:p-6 sm:pb-32">
        {/* Status banner */}
        {isCompleted && (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600">
            <Check className="size-4" />
            Workout completed
          </div>
        )}
        {isInProgress && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
            <AlertCircle className="size-4" />
            Workout in progress — resume where you left off
          </div>
        )}

        {/* Working Sets */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Working Sets
          </h2>
          <div className="space-y-3">
            {sets.map((set) => (
              <div
                key={set.setNumber}
                className={`rounded-xl border p-4 transition-colors ${
                  set.isAmrap
                    ? "border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/30"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold">
                      {set.setNumber}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {displayWeight(set.calculatedWeight)} {unit}
                        </p>
                        {set.isAmrap && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-200 px-2.5 py-0.5 text-xs font-semibold text-violet-800 dark:bg-violet-800 dark:text-violet-100">
                            <Flame className="size-3" />
                            AMRAP
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {set.targetPercentage}% &times; {set.targetReps} reps
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isInProgress || (!isCompleted && workoutDetail && workoutDetail.status === "in_progress" && (
                      <>
                        <div className="text-right">
                          <label className="text-xs text-muted-foreground">Reps</label>
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={set.actualReps ?? ""}
                            onChange={(e) => handleSetChange(set.setNumber, "actualReps", e.target.value)}
                            className="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm tabular-nums"
                            placeholder={String(set.targetReps)}
                          />
                        </div>
                        <div className="text-right">
                          <label className="text-xs text-muted-foreground">Weight</label>
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={set.actualWeight ?? ""}
                            onChange={(e) => handleSetChange(set.setNumber, "actualWeight", e.target.value)}
                            className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm tabular-nums"
                            placeholder={displayWeight(set.calculatedWeight)}
                          />
                        </div>
                      </>
                    ))}
                    {(isCompleted || (!workoutDetail && sets.length > 0)) && !isInProgress && !isCompleted && (
                      <div className="text-right text-sm text-muted-foreground">
                        <p className="font-medium">{set.actualReps ?? "-"} reps</p>
                        {set.actualWeight != null && (
                          <p>{displayWeight(set.actualWeight)} {unit}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Action buttons */}
        {workoutData.status === "not_started" && (
          <button
            onClick={handleStartWorkout}
            disabled={saving}
            className="w-full rounded-xl bg-primary py-4 text-center text-base font-bold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Starting..." : "Start Workout"}
          </button>
        )}

        {(isInProgress || workoutData.status === "in_progress") && !isCompleted && (
          <>
            {/* Notes */}
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did the workout feel?"
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              />
            </section>

            {/* Assistance Exercises */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Assistance
                </h2>
                <button
                  onClick={() => setShowAssistanceForm(true)}
                  className="flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <Plus className="size-3.5" />
                  Add Exercise
                </button>
              </div>

              {assistanceExercises.length > 0 && (
                <div className="space-y-2">
                  {assistanceExercises.map((ex, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{ex.exerciseName}</p>
                        <p className="text-xs text-muted-foreground">
                          {ex.sets} &times; {ex.reps}
                          {ex.weight != null && ` @ ${ex.weight}${unit}`}
                          {ex.templateName && ` (${ex.templateName})`}
                        </p>
                      </div>
                      <button
                        onClick={() => removeAssistanceExercise(i)}
                        className="rounded-md p-1 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${ex.exerciseName}`}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {assistanceExercises.length === 0 && !showAssistanceForm && (
                <p className="text-sm text-muted-foreground">
                  No assistance exercises added yet.
                </p>
              )}
            </section>

            {/* Assistance Form Overlay */}
            {showAssistanceForm && (
              <AssistanceForm
                templates={templates}
                onApplyTemplate={applyTemplate}
                onAddCustom={addAssistanceExercise}
                onCancel={() => setShowAssistanceForm(false)}
              />
            )}

            {/* Complete Workout Button */}
            <button
              onClick={handleCompleteWorkout}
              disabled={saving}
              className="w-full rounded-xl bg-green-600 py-4 text-center text-base font-bold text-white shadow-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Complete Workout"}
            </button>
          </>
        )}

        {isCompleted && (
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="w-full rounded-xl border border-input py-4 text-center text-base font-bold hover:bg-accent"
          >
            Back to Dashboard
          </button>
        )}
      </main>
    </div>
  )
}

function AssistanceForm({
  templates,
  onApplyTemplate,
  onAddCustom,
  onCancel,
}: {
  templates: TemplateData[]
  onApplyTemplate: (template: TemplateData) => void
  onAddCustom: (exercise: AssistanceExerciseData) => void
  onCancel: () => void
}) {
  const [mode, setMode] = useState<"template" | "custom">("template")
  const [name, setName] = useState("")
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [weight, setWeight] = useState<number | null>(null)

  function handleAddCustom() {
    if (!name.trim()) return
    onAddCustom({
      exerciseName: name.trim(),
      sets,
      reps,
      weight,
      notes: null,
    })
    setName("")
    setSets(3)
    setReps(10)
    setWeight(null)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Add Assistance Exercise</h3>
        <button
          onClick={onCancel}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Mode toggle */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setMode("template")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            mode === "template" ? "bg-primary text-primary-foreground" : "border border-input hover:bg-accent"
          }`}
        >
          From Template
        </button>
        <button
          onClick={() => setMode("custom")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            mode === "custom" ? "bg-primary text-primary-foreground" : "border border-input hover:bg-accent"
          }`}
        >
          Custom
        </button>
      </div>

      {mode === "template" && (
        <div className="space-y-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onApplyTemplate(t)}
              className="w-full rounded-lg border border-input p-3 text-left hover:bg-accent"
            >
              <p className="font-medium text-sm">{t.name}</p>
              {t.description && (
                <p className="text-xs text-muted-foreground">{t.description}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {t.exercises.map((e) => `${e.sets}×${e.reps} ${e.name}`).join(", ")}
              </p>
            </button>
          ))}
        </div>
      )}

      {mode === "custom" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Exercise Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pull-ups"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Sets</label>
              <input
                type="number"
                min={1}
                max={20}
                value={sets}
                onChange={(e) => setSets(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-center text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Reps</label>
              <input
                type="number"
                min={1}
                max={99}
                value={reps}
                onChange={(e) => setReps(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-center text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Weight</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={weight ?? ""}
                onChange={(e) => setWeight(e.target.value === "" ? null : Number(e.target.value))}
                placeholder="BW"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-center text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleAddCustom}
            disabled={!name.trim()}
            className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Add Exercise
          </button>
        </div>
      )}
    </div>
  )
}

import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { createBlock } from "../lib/api"
import { estimate1RM, calculateTmFromOneRm } from "@fivethreeone/core"
import { LIFT_LABELS, LIFT_ORDER } from "@fivethreeone/shared"
import { ArrowLeft, Dumbbell } from "lucide-react"

const PLATE_INCREMENT = 2.5

interface LiftEntry {
  weight: string
  reps: string
}

export function CreateBlockPage() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<Record<string, LiftEntry>>({
    squat: { weight: "", reps: "" },
    bench_press: { weight: "", reps: "" },
    deadlift: { weight: "", reps: "" },
    overhead_press: { weight: "", reps: "" },
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateEntry(lift: string, field: "weight" | "reps", value: string) {
    setEntries((prev) => ({
      ...prev,
      [lift]: { ...prev[lift], [field]: value },
    }))
  }

  function getEstimatedTm(lift: string): number | null {
    const entry = entries[lift]
    const weight = parseFloat(entry.weight)
    const reps = parseInt(entry.reps, 10)
    if (isNaN(weight) || isNaN(reps) || weight <= 0 || reps <= 0) return null
    const estimated = estimate1RM(weight, reps)
    return calculateTmFromOneRm(estimated, PLATE_INCREMENT)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const data: Record<string, { weight: number; reps: number }> = {}
    for (const lift of LIFT_ORDER) {
      const entry = entries[lift]
      const weight = parseFloat(entry.weight)
      const reps = parseInt(entry.reps, 10)
      if (isNaN(weight) || isNaN(reps) || weight <= 0 || reps <= 0) {
        setError(`Invalid entry for ${LIFT_LABELS[lift]}`)
        return
      }
      data[lift === "bench_press" ? "benchPress" : lift === "overhead_press" ? "overheadPress" : lift] = { weight, reps }
    }

    setSaving(true)
    try {
      const res = await createBlock(data as any)
      if (res.success) {
        navigate({ to: "/dashboard" })
      } else {
        setError(res.error ?? "Failed to create block")
      }
    } catch {
      setError("Failed to create block")
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button onClick={() => navigate({ to: "/" })} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-lg font-bold">Create Block</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <Dumbbell className="size-8 text-primary" />
            <div>
              <h2 className="font-semibold">Enter your rep maxes</h2>
              <p className="text-sm text-muted-foreground">
                For each lift, enter the weight and reps you can do. The system will estimate your 1RM and calculate all working weights for 4 cycles.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {LIFT_ORDER.map((lift) => {
            const tm = getEstimatedTm(lift)
            return (
              <div key={lift} className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 font-semibold">{LIFT_LABELS[lift]}</h3>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-muted-foreground">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      placeholder="e.g. 100"
                      value={entries[lift].weight}
                      onChange={(e) => updateEntry(lift, "weight", e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-muted-foreground">Reps</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      placeholder="e.g. 5"
                      value={entries[lift].reps}
                      onChange={(e) => updateEntry(lift, "reps", e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                    />
                  </div>
                </div>
                {tm !== null && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Estimated TM: <strong>{tm} kg</strong>
                  </p>
                )}
              </div>
            )
          })}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Block"}
          </button>
        </form>
      </main>
    </div>
  )
}

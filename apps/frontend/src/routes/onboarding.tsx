import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"
import { getProfile, updateProfile, getTrainingMax, updateTrainingMax } from "../lib/api"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { calculateTmFromOneRm } from "@fivethreeone/core"
import { LIFT_LABELS } from "@fivethreeone/shared"

const STEPS = [
  "Preferences",
  "Squat",
  "Bench Press",
  "Deadlift",
  "Overhead Press",
  "Review",
] as const

export const ALL_LIFTS = ["squat", "bench_press", "deadlift", "overhead_press"] as const
const PLATE_OPTIONS = [0.5, 1, 2.5, 5] as const

export function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [unitPreference, setUnitPreference] = useState<"kg" | "lb">("kg")
  const [plateIncrement, setPlateIncrement] = useState(2.5)
  const [oneRmByLift, setOneRmByLift] = useState<Record<string, number | null>>({
    squat: null,
    bench_press: null,
    deadlift: null,
    overhead_press: null,
  })

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, tmRes] = await Promise.all([getProfile(), getTrainingMax()])
        if (profileRes.success && profileRes.data) {
          setUnitPreference(profileRes.data.unitPreference as "kg" | "lb")
          setPlateIncrement(profileRes.data.plateIncrement)
        }
        if (tmRes.success && tmRes.data) {
          const loaded: Record<string, number | null> = { ...oneRmByLift }
          let hasAll = true
          for (const entry of tmRes.data) {
            if (entry.oneRm !== null) {
              loaded[entry.lift] = entry.oneRm
            } else {
              hasAll = false
            }
          }
          setOneRmByLift(loaded)
          if (hasAll) {
            navigate({ to: "/" })
            return
          }
        }
      } catch {
        /* loading state handles errors */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const savePreferences = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await updateProfile({ unitPreference, plateIncrement })
      if (!res.success) {
        setError(res.error ?? "Failed to save preferences")
      }
    } catch {
      setError("Failed to save preferences")
    } finally {
      setSaving(false)
    }
  }, [unitPreference, plateIncrement])

  const saveOneRm = useCallback(async (lift: string, oneRm: number) => {
    setSaving(true)
    setError(null)
    try {
      const res = await updateTrainingMax(lift, oneRm)
      if (!res.success) {
        setError(res.error ?? `Failed to save ${LIFT_LABELS[lift]} 1RM`)
      }
    } catch {
      setError(`Failed to save ${LIFT_LABELS[lift]} 1RM`)
    } finally {
      setSaving(false)
    }
  }, [])

  async function handleNext() {
    if (step === 0) {
      await savePreferences()
    } else if (step >= 1 && step <= 4) {
      const lift = ALL_LIFTS[step - 1]
      const oneRm = oneRmByLift[lift]
      if (oneRm !== null && oneRm > 0) {
        await saveOneRm(lift, oneRm)
      }
    }

    if (!error && step < STEPS.length - 1) {
      setStep((s) => s + 1)
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1)
  }

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      for (const lift of ALL_LIFTS) {
        const oneRm = oneRmByLift[lift]
        if (oneRm !== null && oneRm > 0) {
          const res = await updateTrainingMax(lift, oneRm)
          if (!res.success) {
            setError(res.error ?? `Failed to save ${LIFT_LABELS[lift]}`)
            setSaving(false)
            return
          }
        }
      }
      navigate({ to: "/" })
    } catch {
      setError("Failed to complete onboarding")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-bold">Set Up Your Profile</h1>
      </header>

      <div className="mx-auto mt-6 flex w-full max-w-2xl items-center gap-2 px-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "border-2 border-primary text-primary"
                    : "border border-border text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </div>
            <span className={`hidden text-sm sm:inline ${i === step ? "font-medium text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`mx-2 h-px w-8 ${i < step ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      <main className="mx-auto mt-8 w-full max-w-md space-y-6 px-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Weight Preferences</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose your preferred weight unit and plate increment.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Weight Unit</label>
              <div className="flex gap-3">
                {(["kg", "lb"] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setUnitPreference(unit)}
                    className={`flex-1 rounded-md border px-4 py-3 text-center text-lg font-semibold transition-colors ${
                      unitPreference === unit
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="plate-increment" className="text-sm font-medium">
                Plate Increment
              </label>
              <select
                id="plate-increment"
                value={plateIncrement}
                onChange={(e) => setPlateIncrement(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {PLATE_OPTIONS.map((inc) => (
                  <option key={inc} value={inc}>
                    {inc} {unitPreference === "kg" ? "kg" : "lb"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step >= 1 && step <= 4 && (
          <OneRmInput
            label={LIFT_LABELS[ALL_LIFTS[step - 1]]}
            value={oneRmByLift[ALL_LIFTS[step - 1]]}
            unit={unitPreference}
            plateIncrement={plateIncrement}
            onChange={(v) => setOneRmByLift((prev) => ({ ...prev, [ALL_LIFTS[step - 1]]: v }))}
          />
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Review Your Maxes</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your training max is 90% of your 1RM, rounded down to the nearest plate increment.
              </p>
            </div>

            <div className="space-y-3">
              {ALL_LIFTS.map((lift) => {
                const oneRm = oneRmByLift[lift]
                const tm = oneRm ? calculateTmFromOneRm(oneRm, plateIncrement) : 0
                return (
                  <div
                    key={lift}
                    className="flex items-center justify-between rounded-md border border-border p-4"
                  >
                    <div>
                      <p className="font-medium">{LIFT_LABELS[lift]}</p>
                      {oneRm && (
                        <p className="text-sm text-muted-foreground">
                          1RM: {oneRm} {unitPreference}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {tm} {unitPreference}
                      </p>
                      <p className="text-xs text-muted-foreground">Training Max</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {Object.values(oneRmByLift).some((v) => !v || v <= 0) && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                Please enter a valid 1RM for all lifts before confirming.
              </div>
            )}
          </div>
        )}
      </main>

      <div className="mx-auto mt-auto w-full max-w-md px-6 pb-8 pt-8">
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            className="flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Next"}
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving || Object.values(oneRmByLift).some((v) => !v || v <= 0)}
              className="flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Confirm & Finish"}
              <Check className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function OneRmInput({
  label,
  value,
  unit,
  plateIncrement,
  onChange,
}: {
  label: string
  value: number | null
  unit: string
  plateIncrement: number
  onChange: (v: number | null) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your current 1-rep max for {label}.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor={`one-rm-${label}`} className="text-sm font-medium">
          1RM ({unit})
        </label>
        <input
          id={`one-rm-${label}`}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={value ?? ""}
          onChange={(e) => {
            const v = e.target.value === "" ? null : Number(e.target.value)
            onChange(v)
          }}
          placeholder="e.g. 100"
          className="w-full rounded-md border border-input bg-background px-4 py-3 text-2xl font-bold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          autoFocus
        />
      </div>

      {value !== null && value > 0 && (
        <div className="rounded-md bg-muted p-3">
          <p className="text-sm text-muted-foreground">
            Estimated Training Max:{" "}
            <span className="font-bold text-foreground">{calculateTmFromOneRm(value, plateIncrement)} {unit}</span>
          </p>
        </div>
      )}
    </div>
  )
}

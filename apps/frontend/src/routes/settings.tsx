import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  getProfile,
  updateProfile,
  getTrainingMax,
  updateTrainingMax,
  changePassword,
  resetTrainingMax,
} from "../lib/api"
import { useAuth } from "../lib/useAuth"
import { LIFT_LABELS } from "@fivethreeone/shared"
import { calculateTmFromOneRm } from "@fivethreeone/core"
import { Settings, LogOut, Save, RotateCcw } from "lucide-react"

const PLATE_OPTIONS = [0.5, 1, 2.5, 5] as const
const ALL_LIFTS = ["squat", "bench_press", "deadlift", "overhead_press"] as const

interface TrainingMaxEntry {
  lift: string
  oneRm: number | null
  trainingMaxValue: number | null
  cycleNumber: number
  id: string | null
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [savingTm, setSavingTm] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [preferencesError, setPreferencesError] = useState<string | null>(null)
  const [tmError, setTmError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)

  const [username, setUsername] = useState("")
  const [unitPreference, setUnitPreference] = useState<"kg" | "lb">("kg")
  const [plateIncrement, setPlateIncrement] = useState(2.5)
  const [trainingMaxes, setTrainingMaxes] = useState<TrainingMaxEntry[]>([])
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, tmRes] = await Promise.all([getProfile(), getTrainingMax()])
        if (profileRes.success && profileRes.data) {
          setUsername(profileRes.data.username)
          setUnitPreference(profileRes.data.unitPreference as "kg" | "lb")
          setPlateIncrement(profileRes.data.plateIncrement)
        }
        if (tmRes.success && tmRes.data) {
          setTrainingMaxes(tmRes.data as TrainingMaxEntry[])
        }
      } catch {
        // handled by loading state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleProfileSave() {
    setSavingProfile(true)
    setProfileError(null)
    try {
      const res = await updateProfile({ username })
      if (!res.success) {
        setProfileError(res.error ?? "Failed to update username")
      }
    } catch {
      setProfileError("Failed to update username")
    } finally {
      setSavingProfile(false)
    }
  }

  async function handlePasswordSave() {
    setSavingPassword(true)
    setPasswordError(null)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required")
      setSavingPassword(false)
      return
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters")
      setSavingPassword(false)
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match")
      setSavingPassword(false)
      return
    }

    try {
      const res = await changePassword(currentPassword, newPassword)
      if (!res.success) {
        setPasswordError(res.error ?? "Failed to change password")
      } else {
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch {
      setPasswordError("Failed to change password")
    } finally {
      setSavingPassword(false)
    }
  }

  async function handlePreferencesSave() {
    setSavingPreferences(true)
    setPreferencesError(null)
    try {
      const res = await updateProfile({ unitPreference, plateIncrement })
      if (!res.success) {
        setPreferencesError(res.error ?? "Failed to save preferences")
      }
    } catch {
      setPreferencesError("Failed to save preferences")
    } finally {
      setSavingPreferences(false)
    }
  }

  async function handleTmSave(lift: string) {
    setSavingTm(lift)
    setTmError(null)

    const entry = trainingMaxes.find((e) => e.lift === lift)
    if (!entry || entry.oneRm === null || entry.oneRm <= 0) {
      setTmError("Please enter a valid 1RM")
      setSavingTm(null)
      return
    }

    try {
      const res = await updateTrainingMax(lift, entry.oneRm)
      if (res.success && res.data) {
        setTrainingMaxes((prev) =>
          prev.map((e) =>
            e.lift === lift
              ? { ...e, oneRm: res.data!.oneRm, trainingMaxValue: res.data!.trainingMaxValue, cycleNumber: res.data!.cycleNumber }
              : e,
          ),
        )
      } else {
        setTmError(res.error ?? `Failed to save ${LIFT_LABELS[lift]}`)
      }
    } catch {
      setTmError(`Failed to save ${LIFT_LABELS[lift]}`)
    } finally {
      setSavingTm(null)
    }
  }

  async function handleResetAll() {
    setResetting(true)
    setTmError(null)
    setResetSuccess(null)
    try {
      const res = await resetTrainingMax()
      if (res.success && res.data) {
        setTrainingMaxes((prev) =>
          prev.map((e) => {
            const updated = res.data!.find((r) => r.lift === e.lift)
            return updated ? { ...e, trainingMaxValue: updated.trainingMaxValue } : e
          }),
        )
        setResetSuccess("All training maxes have been recalculated from your current 1RMs")
      } else {
        setTmError(res.error ?? "Failed to reset training maxes")
      }
    } catch {
      setTmError("Failed to reset training maxes")
    } finally {
      setResetting(false)
    }
  }

  function updateOneRm(lift: string, value: number | null) {
    setTrainingMaxes((prev) =>
      prev.map((e) => (e.lift === lift ? { ...e, oneRm: value } : e)),
    )
  }

  async function handleLogout() {
    await signOut()
    navigate({ to: "/login" })
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="size-5 text-primary" />
            <h1 className="text-lg font-bold">Settings</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
            >
              Dashboard
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

      <main className="mx-auto max-w-2xl space-y-8 p-4 pb-24 sm:p-6 sm:pb-24">
        {/* Profile Section */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">Update your display name.</p>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {profileError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{profileError}</div>
            )}

            <button
              type="button"
              onClick={handleProfileSave}
              disabled={savingProfile}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="size-4" />
              {savingProfile ? "Saving..." : "Save"}
            </button>
          </div>
        </section>

        {/* Password Section */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Password</h2>
          <p className="mt-1 text-sm text-muted-foreground">Change your account password.</p>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="current-password" className="text-sm font-medium">Current Password</label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium">New Password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {passwordError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{passwordError}</div>
            )}

            <button
              type="button"
              onClick={handlePasswordSave}
              disabled={savingPassword}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="size-4" />
              {savingPassword ? "Saving..." : "Save"}
            </button>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Preferences</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose your preferred weight unit and plate increment.</p>

          <div className="mt-4 space-y-4">
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
              <label htmlFor="plate-increment" className="text-sm font-medium">Plate Increment</label>
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

            {preferencesError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{preferencesError}</div>
            )}

            <button
              type="button"
              onClick={handlePreferencesSave}
              disabled={savingPreferences}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="size-4" />
              {savingPreferences ? "Saving..." : "Save"}
            </button>
          </div>
        </section>

        {/* Training Maxes Section */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Training Maxes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your 1RM to recalculate your training max (90% of 1RM, rounded down).
          </p>

          <div className="mt-4 space-y-4">
            {ALL_LIFTS.map((lift) => {
              const entry = trainingMaxes.find((e) => e.lift === lift)
              const oneRm = entry?.oneRm ?? null
              const tm = oneRm ? calculateTmFromOneRm(oneRm, plateIncrement) : entry?.trainingMaxValue
              const cycleNum = entry?.cycleNumber ?? 1

              return (
                <div key={lift} className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{LIFT_LABELS[lift]}</h3>
                    <span className="text-xs text-muted-foreground">Cycle {cycleNum}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor={`one-rm-${lift}`} className="text-xs font-medium text-muted-foreground">
                        1RM ({unitPreference})
                      </label>
                      <input
                        id={`one-rm-${lift}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={oneRm ?? ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : Number(e.target.value)
                          updateOneRm(lift, v)
                        }}
                        placeholder="e.g. 100"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-bold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Training Max</label>
                      <div className="flex h-[42px] items-center rounded-md border border-border bg-background px-3 text-lg font-bold text-muted-foreground">
                        {tm !== null ? `${tm} ${unitPreference}` : "—"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTmSave(lift)}
                    disabled={savingTm === lift || oneRm === null}
                    className="mt-3 flex items-center gap-2 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                  >
                    <Save className="size-3.5" />
                    {savingTm === lift ? "Saving..." : "Save"}
                  </button>
                </div>
              )
            })}

            {tmError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{tmError}</div>
            )}

            {resetSuccess && (
              <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">{resetSuccess}</div>
            )}

            <button
              type="button"
              onClick={handleResetAll}
              disabled={resetting}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              <RotateCcw className="size-4" />
              {resetting ? "Resetting..." : "Reset All TMs from 1RMs"}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

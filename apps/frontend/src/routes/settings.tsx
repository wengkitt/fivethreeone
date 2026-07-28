import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { getProfile, updateProfile, changePassword } from "../lib/api"
import { useAuth } from "../lib/useAuth"
import { ArrowLeft, LogOut, Save } from "lucide-react"

export function SettingsPage() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [username, setUsername] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const profileRes = await getProfile()
        if (profileRes.success && profileRes.data) {
          setUsername(profileRes.data.username)
        }
      } catch {
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
            <button onClick={() => navigate({ to: "/dashboard" })} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-lg font-bold">Settings</h1>
          </div>
          {session && (
            <span className="text-sm text-muted-foreground">{session.username}</span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
        {/* Profile Section */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Profile</h2>

          {profileError && (
            <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {profileError}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-muted-foreground">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
              />
            </div>
            <button
              onClick={handleProfileSave}
              disabled={savingProfile}
              className="mt-6 flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Save className="size-4" />
              {savingProfile ? "Saving..." : "Save"}
            </button>
          </div>
        </section>

        {/* Password Section */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Change Password</h2>

          {passwordError && (
            <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {passwordError}
            </div>
          )}

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
              />
            </div>
            <button
              onClick={handlePasswordSave}
              disabled={savingPassword}
              className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Save className="size-4" />
              {savingPassword ? "Saving..." : "Change Password"}
            </button>
          </div>
        </section>

        {/* Logout */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Sign Out</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign out of your account.
          </p>
          <button
            onClick={handleLogout}
            className="mt-4 flex items-center gap-1 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </section>
      </main>
    </div>
  )
}

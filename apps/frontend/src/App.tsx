import { MainLift, kgToLb } from "@fivethreeone/shared"
import { useAuth } from "./lib/useAuth"
import { useNavigate } from "@tanstack/react-router"

function App() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate({ to: "/login" })
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-xl font-bold">5/3/1 Workout Tracker</h1>
        <div className="flex items-center gap-4">
          {session && (
            <span className="text-sm text-muted-foreground">
              {session.username}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 p-6">
        <section className="rounded-lg border border-border p-6">
          <h2 className="mb-4 text-lg font-semibold">Available Lifts</h2>
          <ul className="space-y-2">
            {Object.values(MainLift).map((lift) => (
              <li
                key={lift}
                className="rounded-md bg-muted px-4 py-2 text-muted-foreground"
              >
                {lift.replace(/_/g, " ")}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-border p-6">
          <h2 className="mb-4 text-lg font-semibold">Weight Conversion</h2>
          <p className="text-muted-foreground">
            100 kg = {kgToLb(100).toFixed(1)} lb
          </p>
        </section>
      </main>
    </div>
  )
}

export default App

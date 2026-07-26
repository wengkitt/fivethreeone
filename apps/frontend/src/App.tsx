import { useState } from "react"
import { MainLift, kgToLb } from "@fivethreeone/shared"

function App() {
  const [dark, setDark] = useState(false)

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-svh bg-background text-foreground">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h1 className="text-xl font-bold">5/3/1 Workout Tracker</h1>
          <button
            onClick={() => setDark(!dark)}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent"
          >
            {dark ? "Light" : "Dark"} Mode
          </button>
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
    </div>
  )
}

export default App

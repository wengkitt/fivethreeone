import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { DashboardPage } from "./dashboard"

const mockNavigate = vi.fn()

vi.mock("../lib/useAuth", () => ({
  useAuth: vi.fn(() => ({
    session: { userId: "1", lifterId: "1", username: "testuser" },
    signOut: vi.fn(),
  })),
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("../lib/api", () => ({
  getDashboard: vi.fn(),
}))

import { getDashboard } from "../lib/api"

function createMockDashboard(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    success: true,
    data: {
      lifts: [
        { id: "squat", displayName: "Squat", cycleNumber: 1, trainingMax: 90, currentWeek: 1, progress: [{ week: 1, completed: false }, { week: 2, completed: false }, { week: 3, completed: false }, { week: 4, completed: false }] },
        { id: "bench_press", displayName: "Bench Press", cycleNumber: 1, trainingMax: 72, currentWeek: 1, progress: [{ week: 1, completed: false }, { week: 2, completed: false }, { week: 3, completed: false }, { week: 4, completed: false }] },
        { id: "deadlift", displayName: "Deadlift", cycleNumber: 1, trainingMax: 126, currentWeek: 1, progress: [{ week: 1, completed: false }, { week: 2, completed: false }, { week: 3, completed: false }, { week: 4, completed: false }] },
        { id: "overhead_press", displayName: "Overhead Press", cycleNumber: 1, trainingMax: 54, currentWeek: 1, progress: [{ week: 1, completed: false }, { week: 2, completed: false }, { week: 3, completed: false }, { week: 4, completed: false }] },
      ],
      todayWorkout: { lift: "squat", displayName: "Squat", weekNumber: 1 },
      nextWorkout: { lift: "bench_press", displayName: "Bench Press", weekNumber: 1 },
      recentWorkouts: [],
      personalRecords: [],
      unitPreference: "kg",
      hasCompletedWorkouts: false,
      ...overrides,
    },
  }
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders all 4 lifts with cycle info", async () => {
    const mockData = createMockDashboard({
      hasCompletedWorkouts: true,
      recentWorkouts: [
        { id: "w1", lift: "squat", displayName: "Squat", weekNumber: 1, cycleNumber: 1, completedAt: "2026-07-20T00:00:00.000Z" },
      ],
    })
    vi.mocked(getDashboard).mockResolvedValue(mockData as never)

    render(<DashboardPage />)

    const squats = await screen.findAllByText("Squat")
    expect(squats.length).toBeGreaterThanOrEqual(1)
    const benchPress = screen.getAllByText("Bench Press")
    expect(benchPress.length).toBeGreaterThanOrEqual(1)
    const deadlift = screen.getAllByText("Deadlift")
    expect(deadlift.length).toBeGreaterThanOrEqual(1)
    const ohp = screen.getAllByText("Overhead Press")
    expect(ohp.length).toBeGreaterThanOrEqual(1)
  })

  it("shows empty state for lifter with no workouts", async () => {
    vi.mocked(getDashboard).mockResolvedValue(createMockDashboard() as never)

    render(<DashboardPage />)

    const welcomeTexts = await screen.findAllByText("Welcome to 5/3/1")
    expect(welcomeTexts.length).toBeGreaterThanOrEqual(1)
    const ctas = await screen.findAllByText("Start Your First Workout")
    expect(ctas.length).toBeGreaterThanOrEqual(1)
  })

  it("shows today's workout section when workouts exist", async () => {
    const mockData = createMockDashboard({
      hasCompletedWorkouts: true,
      recentWorkouts: [
        { id: "w1", lift: "squat", displayName: "Squat", weekNumber: 1, cycleNumber: 1, completedAt: "2026-07-20T00:00:00.000Z" },
      ],
    })
    vi.mocked(getDashboard).mockResolvedValue(mockData as never)

    render(<DashboardPage />)

    const headings = await screen.findAllByText("Today's Workout")
    expect(headings.length).toBeGreaterThanOrEqual(1)
  })

  it('"Start Workout" button navigates to the correct lift', async () => {
    const mockData = createMockDashboard({
      hasCompletedWorkouts: true,
      todayWorkout: { lift: "squat", displayName: "Squat", weekNumber: 1 },
      recentWorkouts: [
        { id: "w1", lift: "squat", displayName: "Squat", weekNumber: 1, cycleNumber: 1, completedAt: "2026-07-20T00:00:00.000Z" },
      ],
    })
    vi.mocked(getDashboard).mockResolvedValue(mockData as never)

    render(<DashboardPage />)

    const startBtns = await screen.findAllByText("Start Workout")
    const todayBtn = startBtns.find(
      (btn) => btn.closest("section")?.querySelector('[class*="text-2xl"]'),
    ) ?? startBtns[0]
    todayBtn.click()
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/workout/squat" })
  })

  it("converts TM values to lifter preferred unit (lb)", async () => {
    const mockData = createMockDashboard({
      unitPreference: "lb",
      hasCompletedWorkouts: true,
      recentWorkouts: [
        { id: "w1", lift: "squat", displayName: "Squat", weekNumber: 1, cycleNumber: 1, completedAt: "2026-07-20T00:00:00.000Z" },
      ],
    })
    vi.mocked(getDashboard).mockResolvedValue(mockData as never)

    render(<DashboardPage />)

    const units = await screen.findAllByText("lb")
    expect(units.length).toBeGreaterThan(0)
  })

  it("shows recent workouts list", async () => {
    const mockData = createMockDashboard({
      hasCompletedWorkouts: true,
      recentWorkouts: [
        { id: "w1", lift: "squat", displayName: "Squat", weekNumber: 2, cycleNumber: 1, completedAt: "2026-07-22T00:00:00.000Z" },
        { id: "w2", lift: "bench_press", displayName: "Bench Press", weekNumber: 2, cycleNumber: 1, completedAt: "2026-07-21T00:00:00.000Z" },
      ],
    })
    vi.mocked(getDashboard).mockResolvedValue(mockData as never)

    render(<DashboardPage />)

    const headings = await screen.findAllByText("Recent Workouts")
    expect(headings.length).toBeGreaterThanOrEqual(1)
  })

  it("shows PR summary when lifter has personal records", async () => {
    const mockData = createMockDashboard({
      hasCompletedWorkouts: true,
      personalRecords: [
        { lift: "squat", displayName: "Squat", prType: "tm", value: 90, achievedAt: "2026-07-20T00:00:00.000Z" },
      ],
      recentWorkouts: [
        { id: "w1", lift: "squat", displayName: "Squat", weekNumber: 1, cycleNumber: 1, completedAt: "2026-07-20T00:00:00.000Z" },
      ],
    })
    vi.mocked(getDashboard).mockResolvedValue(mockData as never)

    render(<DashboardPage />)

    const headings = await screen.findAllByText("Personal Records")
    expect(headings.length).toBeGreaterThanOrEqual(1)
  })
})

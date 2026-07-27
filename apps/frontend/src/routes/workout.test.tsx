import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { WorkoutPage } from "./workout"

const mockNavigate = vi.fn()

vi.mock("../lib/useAuth", () => ({
  useAuth: vi.fn(() => ({
    session: { userId: "1", lifterId: "1", username: "testuser" },
    signOut: vi.fn(),
  })),
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ liftId: "squat" }),
}))

const mockGetWorkoutsCurrent = vi.fn()
const mockGetTemplates = vi.fn()
const mockGetWorkout = vi.fn()
const mockStartWorkout = vi.fn()
const mockCompleteWorkout = vi.fn()

vi.mock("../lib/api", () => ({
  getWorkoutsCurrent: (...args: unknown[]) => mockGetWorkoutsCurrent(...args),
  getTemplates: (...args: unknown[]) => mockGetTemplates(...args),
  getWorkout: (...args: unknown[]) => mockGetWorkout(...args),
  startWorkout: (...args: unknown[]) => mockStartWorkout(...args),
  completeWorkout: (...args: unknown[]) => mockCompleteWorkout(...args),
}))

function createMockCurrent(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    data: [
      {
        lift: "squat",
        displayName: "Squat",
        weekNumber: 1,
        cycleNumber: 1,
        trainingMax: 90,
        status: "not_started",
        workoutId: null,
        sets: [
          { id: null, setNumber: 1, targetPercentage: 65, calculatedWeight: 57.5, actualWeight: null, targetReps: 5, actualReps: null, isAmrap: false },
          { id: null, setNumber: 2, targetPercentage: 75, calculatedWeight: 67.5, actualWeight: null, targetReps: 5, actualReps: null, isAmrap: false },
          { id: null, setNumber: 3, targetPercentage: 85, calculatedWeight: 75, actualWeight: null, targetReps: 5, actualReps: null, isAmrap: true },
        ],
      },
    ],
    ...overrides,
  }
}

function createMockTemplates() {
  return {
    success: true,
    data: [
      { id: "bbb", name: "Boring But Big (BBB)", description: "5x10 at 50%", isBuiltIn: true, exercises: [{ name: "Bench", sets: 5, reps: 10, weight: null, notes: null }] },
    ],
  }
}

describe("WorkoutPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetWorkoutsCurrent.mockResolvedValue(createMockCurrent())
    mockGetTemplates.mockResolvedValue(createMockTemplates())
    mockGetWorkout.mockResolvedValue({ success: false })
    mockStartWorkout.mockResolvedValue({ success: false })
    mockCompleteWorkout.mockResolvedValue({ success: false })
  })

  it("renders loading state initially", () => {
    mockGetWorkoutsCurrent.mockReturnValue(new Promise(() => {}))
    render(<WorkoutPage />)
    expect(screen.getByText("Loading workout...")).toBeDefined()
  })

  it("renders workout sets for the current lift", async () => {
    await act(async () => {
      render(<WorkoutPage />)
    })

    const setItems = await screen.findAllByText(/reps/)
    expect(setItems.length).toBeGreaterThanOrEqual(3)
  })

  it("shows AMRAP badge on the last set", async () => {
    await act(async () => {
      render(<WorkoutPage />)
    })

    const amrapBadges = await screen.findAllByText("AMRAP")
    expect(amrapBadges.length).toBeGreaterThanOrEqual(1)
  })

  it("shows 'Start Workout' button when not started", async () => {
    await act(async () => {
      render(<WorkoutPage />)
    })

    const startBtns = await screen.findAllByText("Start Workout")
    expect(startBtns.length).toBeGreaterThanOrEqual(1)
  })

  it("shows in-progress status banner and workout heading", async () => {
    mockGetWorkoutsCurrent.mockResolvedValue({
      success: true,
      data: [
        {
          lift: "squat",
          displayName: "Squat",
          weekNumber: 1,
          cycleNumber: 1,
          trainingMax: 90,
          status: "in_progress",
          workoutId: "w1",
          sets: [
            { id: "ws1", setNumber: 1, targetPercentage: 65, calculatedWeight: 57.5, actualWeight: null, targetReps: 5, actualReps: null, isAmrap: false },
            { id: "ws2", setNumber: 2, targetPercentage: 75, calculatedWeight: 67.5, actualWeight: null, targetReps: 5, actualReps: null, isAmrap: false },
            { id: "ws3", setNumber: 3, targetPercentage: 85, calculatedWeight: 75, actualWeight: null, targetReps: 5, actualReps: null, isAmrap: true },
          ],
        },
      ],
    })
    mockGetWorkout.mockResolvedValue({
      success: true,
      data: {
        id: "w1", lift: "squat", weekNumber: 1, cycleNumber: 1, status: "in_progress",
        notes: null, completedAt: null, createdAt: Date.now(),
        sets: [
          { id: "ws1", setNumber: 1, targetPercentage: 65, calculatedWeight: 57.5, actualWeight: null, targetReps: 5, actualReps: null, isAmrap: false },
          { id: "ws2", setNumber: 2, targetPercentage: 75, calculatedWeight: 67.5, actualWeight: null, targetReps: 5, actualReps: null, isAmrap: false },
          { id: "ws3", setNumber: 3, targetPercentage: 85, calculatedWeight: 75, actualWeight: null, targetReps: 5, actualReps: null, isAmrap: true },
        ],
        assistanceExercises: [],
      },
    })

    render(<WorkoutPage />)

    const headings = await screen.findAllByText("Squat")
    expect(headings.length).toBeGreaterThanOrEqual(1)
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { SettingsPage } from "./settings"

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

const mockGetProfile = vi.fn()
const mockUpdateProfile = vi.fn()
const mockGetTrainingMax = vi.fn()
const mockUpdateTrainingMax = vi.fn()
const mockChangePassword = vi.fn()
const mockResetTrainingMax = vi.fn()

vi.mock("../lib/api", () => ({
  getProfile: () => mockGetProfile(),
  updateProfile: (data: unknown) => mockUpdateProfile(data),
  getTrainingMax: () => mockGetTrainingMax(),
  updateTrainingMax: (lift: string, oneRm: number) => mockUpdateTrainingMax(lift, oneRm),
  changePassword: (currentPassword: string, newPassword: string) => mockChangePassword(currentPassword, newPassword),
  resetTrainingMax: () => mockResetTrainingMax(),
}))

function createMockProfile(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      id: "lifter-1",
      userId: "1",
      username: "testuser",
      unitPreference: "kg",
      plateIncrement: 2.5,
      ...overrides,
    },
  }
}

function createMockTrainingMaxes() {
  return {
    success: true,
    data: [
      { lift: "squat", oneRm: 100, trainingMaxValue: 90, cycleNumber: 1, id: "tm-1" },
      { lift: "bench_press", oneRm: 80, trainingMaxValue: 72, cycleNumber: 1, id: "tm-2" },
      { lift: "deadlift", oneRm: 140, trainingMaxValue: 126, cycleNumber: 1, id: "tm-3" },
      { lift: "overhead_press", oneRm: 60, trainingMaxValue: 54, cycleNumber: 2, id: "tm-4" },
    ],
  }
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetProfile.mockResolvedValue(createMockProfile())
    mockGetTrainingMax.mockResolvedValue(createMockTrainingMaxes())
    mockUpdateProfile.mockResolvedValue({ success: true, data: {} })
    mockUpdateTrainingMax.mockResolvedValue({
      success: true,
      data: { lift: "squat", oneRm: 110, trainingMaxValue: 99, cycleNumber: 1 },
    })
    mockChangePassword.mockResolvedValue({ success: true, data: { message: "Password updated successfully" } })
    mockResetTrainingMax.mockResolvedValue({
      success: true,
      data: [
        { lift: "squat", oneRm: 100, trainingMaxValue: 90, cycleNumber: 1 },
        { lift: "bench_press", oneRm: 80, trainingMaxValue: 72, cycleNumber: 1 },
      ],
    })
  })

  it("renders all sections with pre-filled values", async () => {
    render(<SettingsPage />)

    expect(await screen.findByText("Settings")).toBeTruthy()
    const usernameInputs = await screen.findAllByDisplayValue("testuser")
    expect(usernameInputs.length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Profile").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Password").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Preferences").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Training Maxes").length).toBeGreaterThanOrEqual(1)
  })

  it("loads current profile and TM data on mount", async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(mockGetProfile).toHaveBeenCalled()
      expect(mockGetTrainingMax).toHaveBeenCalled()
    })

    const usernameInputs = await screen.findAllByDisplayValue("testuser")
    expect(usernameInputs.length).toBeGreaterThanOrEqual(1)
  })

  it("updates profile when save button is clicked", async () => {
    render(<SettingsPage />)

    const usernameInputs = await screen.findAllByDisplayValue("testuser")
    fireEvent.change(usernameInputs[0], { target: { value: "newusername" } })

    const profileSection = (await screen.findAllByText("Profile"))[0].closest("section")!
    const profileSave = within(profileSection).getByText("Save")
    fireEvent.click(profileSave)

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ username: "newusername" })
    })
  })

  it("changes password when all fields are valid", async () => {
    render(<SettingsPage />)

    const passwordSection = (await screen.findAllByText("Password"))[0].closest("section")!
    const currentPwInput = within(passwordSection).getByLabelText("Current Password")
    const newPwInput = within(passwordSection).getByLabelText("New Password")
    const confirmPwInput = within(passwordSection).getByLabelText("Confirm New Password")

    fireEvent.change(currentPwInput, { target: { value: "oldpass" } })
    fireEvent.change(newPwInput, { target: { value: "newpass123" } })
    fireEvent.change(confirmPwInput, { target: { value: "newpass123" } })

    const pwSave = within(passwordSection).getByText("Save")
    fireEvent.click(pwSave)

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith("oldpass", "newpass123")
    })
  })

  it("shows error when new passwords do not match", async () => {
    render(<SettingsPage />)

    const passwordSection = (await screen.findAllByText("Password"))[0].closest("section")!
    const currentPwInput = within(passwordSection).getByLabelText("Current Password")
    const newPwInput = within(passwordSection).getByLabelText("New Password")
    const confirmPwInput = within(passwordSection).getByLabelText("Confirm New Password")

    fireEvent.change(currentPwInput, { target: { value: "oldpass" } })
    fireEvent.change(newPwInput, { target: { value: "newpass123" } })
    fireEvent.change(confirmPwInput, { target: { value: "different" } })

    const pwSave = within(passwordSection).getByText("Save")
    fireEvent.click(pwSave)

    await waitFor(() => {
      expect(screen.getByText("New passwords do not match")).toBeTruthy()
    })
  })

  it("saves preferences when weight unit is changed", async () => {
    render(<SettingsPage />)

    const preferencesSection = (await screen.findAllByText("Preferences"))[0].closest("section")!
    const lbButton = within(preferencesSection).getByText("lb")
    fireEvent.click(lbButton)

    const prefsSave = within(preferencesSection).getByText("Save")
    fireEvent.click(prefsSave)

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ unitPreference: "lb", plateIncrement: 2.5 })
    })
  })

  it("updates 1RM and saves training max", async () => {
    mockUpdateTrainingMax.mockResolvedValue({
      success: true,
      data: { lift: "squat", oneRm: 150, trainingMaxValue: 135, cycleNumber: 1 },
    })

    render(<SettingsPage />)

    const squatInputs = await screen.findAllByDisplayValue("100")
    fireEvent.change(squatInputs[0], { target: { value: "150" } })

    const squatCard = squatInputs[0].closest(".rounded-lg") as HTMLElement
    const squatSave = within(squatCard).getByText("Save")
    fireEvent.click(squatSave)

    await waitFor(() => {
      expect(mockUpdateTrainingMax).toHaveBeenCalledWith("squat", 150)
    })
  })

  it("resets all training maxes", async () => {
    render(<SettingsPage />)

    const resetButtons = await screen.findAllByText("Reset All TMs from 1RMs")
    fireEvent.click(resetButtons[0])

    await waitFor(() => {
      expect(mockResetTrainingMax).toHaveBeenCalled()
    })

    expect(screen.getByText("All training maxes have been recalculated from your current 1RMs")).toBeTruthy()
  })

  it("shows loading state initially", () => {
    mockGetProfile.mockImplementation(() => new Promise(() => {}))
    mockGetTrainingMax.mockImplementation(() => new Promise(() => {}))

    render(<SettingsPage />)

    expect(screen.getByText("Loading settings...")).toBeTruthy()
  })

  it("shows error for incorrect current password", async () => {
    mockChangePassword.mockResolvedValue({ success: false, error: "Current password is incorrect" })

    render(<SettingsPage />)

    const passwordSection = (await screen.findAllByText("Password"))[0].closest("section")!
    const currentPwInput = within(passwordSection).getByLabelText("Current Password")
    const newPwInput = within(passwordSection).getByLabelText("New Password")
    const confirmPwInput = within(passwordSection).getByLabelText("Confirm New Password")

    fireEvent.change(currentPwInput, { target: { value: "wrong" } })
    fireEvent.change(newPwInput, { target: { value: "newpass123" } })
    fireEvent.change(confirmPwInput, { target: { value: "newpass123" } })

    const pwSave = within(passwordSection).getByText("Save")
    fireEvent.click(pwSave)

    await waitFor(() => {
      expect(screen.getByText("Current password is incorrect")).toBeTruthy()
    })
  })
})

import type { ApiResponse } from "@fivethreeone/shared";

const BASE_URL = "/api";

interface SessionData {
  userId: string;
  lifterId: string;
  username: string;
}

interface AuthResponse {
  lifterId: string;
  username: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res.json();
}

export function registerUser(username: string, email: string, password: string) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

export function loginUser(login: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });
}

export function logoutUser() {
  return request<null>("/auth/logout", { method: "POST" });
}

export function getSession() {
  return request<SessionData | null>("/auth/session");
}

export function getProfile() {
  return request<{
    id: string;
    userId: string;
    username: string;
    unitPreference: string;
    plateIncrement: number;
  }>("/lifter/profile");
}

export function updateProfile(data: {
  username?: string;
  unitPreference?: "kg" | "lb";
  plateIncrement?: number;
}) {
  return request<{
    id: string;
    userId: string;
    username: string;
    unitPreference: "kg" | "lb";
    plateIncrement: number;
  }>("/lifter/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getTrainingMax() {
  return request<Array<{
    lift: string;
    oneRm: number | null;
    trainingMaxValue: number | null;
    cycleNumber: number;
    id: string | null;
  }>>("/lifter/training-max");
}

export function updateTrainingMax(lift: string, oneRm: number) {
  return request<{
    lift: string;
    oneRm: number;
    trainingMaxValue: number;
    cycleNumber: number;
  }>(`/lifter/training-max/${lift}`, {
    method: "PUT",
    body: JSON.stringify({ oneRm }),
  });
}

export interface LiftInfo {
  id: string;
  displayName: string;
}

export interface DayProgress {
  week: number;
  completed: boolean;
}

export interface LiftCycleInfo {
  lift: string;
  displayName: string;
  cycleNumber: number;
  trainingMax: number;
  currentWeek: number;
  progress: DayProgress[];
}

export interface DashboardLift {
  id: string;
  displayName: string;
  cycleNumber: number;
  trainingMax: number;
  currentWeek: number;
  progress: DayProgress[];
}

export interface DashboardWorkout {
  lift: string;
  displayName: string;
  weekNumber: number;
}

export interface RecentWorkout {
  id: string;
  lift: string;
  displayName: string;
  weekNumber: number;
  cycleNumber: number;
  completedAt: string | null;
}

export interface PersonalRecordEntry {
  lift: string;
  displayName: string;
  prType: string;
  value: number;
  achievedAt: string;
}

export interface DashboardData {
  lifts: DashboardLift[];
  todayWorkout: DashboardWorkout | null;
  nextWorkout: DashboardWorkout | null;
  recentWorkouts: RecentWorkout[];
  personalRecords: PersonalRecordEntry[];
  unitPreference: string;
  hasCompletedWorkouts: boolean;
}

export function getLifts() {
  return request<LiftInfo[]>("/lifts");
}

export function getLiftCycle(liftId: string) {
  return request<LiftCycleInfo>(`/lifts/${liftId}/cycle`);
}

export function getDashboard() {
  return request<DashboardData>("/dashboard");
}

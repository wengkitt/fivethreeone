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

// Workout types
export interface WorkoutSetData {
  id: string | null;
  setNumber: number;
  targetPercentage: number;
  calculatedWeight: number;
  actualWeight: number | null;
  targetReps: number;
  actualReps: number | null;
  isAmrap: boolean;
}

export interface WorkoutCurrentData {
  lift: string;
  displayName: string;
  weekNumber: number;
  cycleNumber: number;
  trainingMax: number;
  status: "not_started" | "in_progress" | "completed";
  workoutId: string | null;
  sets: WorkoutSetData[];
}

export interface WorkoutDetail {
  id: string;
  lift: string;
  weekNumber: number;
  cycleNumber: number;
  status: string;
  notes: string | null;
  completedAt: number | null;
  createdAt: number;
  sets: WorkoutSetData[];
  assistanceExercises: AssistanceExerciseData[];
}

export interface AssistanceExerciseData {
  id?: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number | null;
  notes: string | null;
  templateName?: string | null;
}

export interface TemplateData {
  id: string;
  name: string;
  description?: string;
  isBuiltIn: boolean;
  exercises: AssistanceExerciseData[];
  createdAt?: number;
}

export function getWorkoutsCurrent() {
  return request<WorkoutCurrentData[]>("/workouts/current");
}

export function startWorkout(lift: string) {
  return request<WorkoutDetail>("/workouts", {
    method: "POST",
    body: JSON.stringify({ lift }),
  });
}

export function getWorkout(id: string) {
  return request<WorkoutDetail>(`/workouts/${id}`);
}

export function completeWorkout(id: string, data: {
  notes?: string | null;
  sets?: { id: string; actualWeight: number | null; actualReps: number | null }[];
  assistanceExercises?: AssistanceExerciseData[];
}) {
  return request<WorkoutDetail>(`/workouts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getTemplates() {
  return request<TemplateData[]>("/templates");
}

export function createTemplate(data: { name: string; exercises: AssistanceExerciseData[] }) {
  return request<TemplateData>("/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteTemplate(id: string) {
  return request<{ deleted: boolean }>(`/templates/${id}`, {
    method: "DELETE",
  });
}

// History types
export interface HistoryWorkoutSet {
  id: string;
  setNumber: number;
  targetPercentage: number;
  calculatedWeight: number;
  actualWeight: number | null;
  targetReps: number;
  actualReps: number | null;
  isAmrap: boolean;
}

export interface HistoryAssistanceExercise {
  id: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number | null;
  notes: string | null;
  templateName: string | null;
}

export interface HistoryWorkout {
  id: string;
  lift: string;
  displayName: string;
  weekNumber: number;
  cycleNumber: number;
  notes: string | null;
  completedAt: string | null;
  createdAt: string | null;
  sets: HistoryWorkoutSet[];
  assistanceExercises: HistoryAssistanceExercise[];
}

export interface HistoryResponse {
  workouts: HistoryWorkout[];
  total: number;
  page: number;
  limit: number;
}

export function getWorkouts(params?: { lift?: string; cycle?: string; page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.lift) searchParams.set("lift", params.lift);
  if (params?.cycle) searchParams.set("cycle", params.cycle);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  return request<HistoryResponse>(`/workouts${qs ? `?${qs}` : ""}`);
}

export function getLiftHistory(liftId: string) {
  return request<HistoryWorkout[]>(`/lifts/${liftId}/history`);
}

// Personal Records types
export interface PersonalRecordItem {
  id: string;
  lift: string;
  displayName: string;
  prType: string;
  value: number;
  achievedAt: string;
  workoutId: string | null;
}

export interface PersonalRecordsResponse {
  grouped: Record<string, PersonalRecordItem[]>;
}

export function getPersonalRecords() {
  return request<PersonalRecordsResponse>("/personal-records");
}

export function getLiftPersonalRecords(liftId: string) {
  return request<PersonalRecordItem[]>(`/personal-records/${liftId}`);
}

export function changePassword(currentPassword: string, newPassword: string) {
  return request<{ message: string }>("/lifter/password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function resetTrainingMax() {
  return request<Array<{
    lift: string;
    oneRm: number;
    trainingMaxValue: number;
    cycleNumber: number;
  }>>("/lifter/training-max/reset", { method: "POST" });
}

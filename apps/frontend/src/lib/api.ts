import type { ApiResponse } from "@fivethreeone/shared";
import type { MainLift, WeekNumber, Block, BlockDetail } from "@fivethreeone/shared";

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
  }>("/lifter/profile");
}

export function updateProfile(data: { username?: string }) {
  return request<{
    id: string;
    userId: string;
    username: string;
  }>("/lifter/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return request<{ message: string }>("/lifter/password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// Block types
export interface BlockListItem extends Block {
  completedDays: number;
  totalDays: number;
}

export function getBlocks() {
  return request<BlockListItem[]>("/blocks");
}

export function getBlock(id: string) {
  return request<BlockDetail>(`/blocks/${id}`);
}

export function createBlock(data: {
  squat: { weight: number; reps: number };
  benchPress: { weight: number; reps: number };
  deadlift: { weight: number; reps: number };
  overheadPress: { weight: number; reps: number };
}) {
  return request<Block>("/blocks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteBlock(id: string) {
  return request<{ deleted: boolean }>(`/blocks/${id}`, {
    method: "DELETE",
  });
}

export function tickWorkoutDay(blockId: string, lift: MainLift, cycleNumber: number, weekNumber: WeekNumber) {
  return request<{ completed: boolean }>(`/blocks/${blockId}/tick`, {
    method: "POST",
    body: JSON.stringify({ lift, cycleNumber, weekNumber }),
  });
}

export function skipDeload(blockId: string, cycleNumber: number) {
  return request<{ skipped: boolean }>(`/blocks/${blockId}/skip-deload`, {
    method: "POST",
    body: JSON.stringify({ cycleNumber }),
  });
}

export interface LiftInfo {
  id: string;
  displayName: string;
}

export function getLifts() {
  return request<LiftInfo[]>("/lifts");
}

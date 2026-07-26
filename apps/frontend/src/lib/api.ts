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

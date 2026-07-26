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

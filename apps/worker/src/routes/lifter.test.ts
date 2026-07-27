import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

const mockVerifyPassword = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const mockHashPassword = vi.hoisted(() => vi.fn().mockResolvedValue("new-hash-value"));

let mockGetResult: Record<string, unknown> | null = null;

vi.mock("@fivethreeone/db", () => {
  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          get: vi.fn(() => Promise.resolve(mockGetResult)),
          then: vi.fn((resolve: (val: unknown) => void) => resolve([])),
        }),
        then: vi.fn((resolve: (val: unknown) => void) => resolve([])),
      }),
      then: vi.fn((resolve: (val: unknown) => void) => resolve([])),
    }),
    insert: () => ({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: () => ({
      set: () => ({
        where: () => vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: () => ({
      where: () => vi.fn().mockResolvedValue(undefined),
    }),
    batch: vi.fn().mockResolvedValue([undefined]),
  };

  return {
    createDbClient: vi.fn().mockReturnValue(mockDb),
    lifter: { id: "lifter.id", userId: "lifter.user_id", username: "lifter.username", weightUnit: "lifter.weight_unit", plateIncrement: "lifter.plate_increment" },
    trainingMax: { id: "training_max.id", lifterId: "training_max.lifter_id", lift: "training_max.lift", oneRm: "training_max.one_rm", trainingMaxValue: "training_max.training_max", cycleNumber: "training_max.cycle_number" },
    user: {},
    session: {},
    account: { id: "account.id", userId: "account.user_id", password: "account.password" },
    verification: {},
    workout: {},
    workoutSet: {},
    assistanceExercise: {},
    assistanceTemplate: {},
    personalRecord: {},
  };
});

vi.mock("../auth/session.js", () => ({
  validateSession: vi.fn().mockResolvedValue({
    sessionId: "test-session-id",
    userId: "test-user-id",
    lifterId: "test-lifter-id",
    username: "testuser",
  }),
}));

vi.mock("../auth/crypto.js", () => ({
  verifyPassword: mockVerifyPassword,
  hashPassword: mockHashPassword,
}));

import lifterRoutes from "./lifter.js";

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/api/lifter", lifterRoutes);
  return app;
}

describe("lifter routes - auth guard", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    mockGetResult = {
      id: "test-lifter-id",
      userId: "test-user-id",
      username: "testuser",
      weightUnit: "kg",
      plateIncrement: 2500,
    };
  });

  it("GET /api/lifter/profile returns 401 without auth", async () => {
    const res = await app.request("/api/lifter/profile");
    expect(res.status).toBe(401);
  });

  it("GET /api/lifter/training-max returns 401 without auth", async () => {
    const res = await app.request("/api/lifter/training-max");
    expect(res.status).toBe(401);
  });

  it("PUT /api/lifter/training-max/:lift returns 401 without auth", async () => {
    const res = await app.request(
      "/api/lifter/training-max/squat",
      { method: "PUT", body: JSON.stringify({ oneRm: 100 }), headers: { "Content-Type": "application/json" } },
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/lifter/training-max/reset returns 401 without auth", async () => {
    const res = await app.request("/api/lifter/training-max/reset", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("PUT /api/lifter/profile returns 401 without auth", async () => {
    const res = await app.request(
      "/api/lifter/profile",
      { method: "PUT", body: JSON.stringify({ unitPreference: "lb" }), headers: { "Content-Type": "application/json" } },
    );
    expect(res.status).toBe(401);
  });

  it("PUT /api/lifter/password returns 401 without auth", async () => {
    const res = await app.request(
      "/api/lifter/password",
      { method: "PUT", body: JSON.stringify({ currentPassword: "old", newPassword: "new123" }), headers: { "Content-Type": "application/json" } },
    );
    expect(res.status).toBe(401);
  });
});

describe("lifter routes - input validation", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    mockGetResult = {
      id: "test-lifter-id",
      userId: "test-user-id",
      username: "testuser",
      weightUnit: "kg",
      plateIncrement: 2500,
    };
    mockVerifyPassword.mockResolvedValue(true);
  });

  beforeAll(() => {
    app = createApp();
  });

  it("PUT /api/lifter/training-max/:lift returns 400 for invalid lift", async () => {
    const res = await app.request(
      "/api/lifter/training-max/invalid",
      { method: "PUT", body: JSON.stringify({ oneRm: 100 }), headers: { "Content-Type": "application/json", Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(400);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("Invalid lift");
  });

  it("PUT /api/lifter/training-max/:lift returns 400 for invalid 1RM", async () => {
    const res = await app.request(
      "/api/lifter/training-max/squat",
      { method: "PUT", body: JSON.stringify({ oneRm: -5 }), headers: { "Content-Type": "application/json", Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(400);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("Invalid 1RM value");
  });

  it("PUT /api/lifter/training-max/:lift returns 400 for missing 1RM", async () => {
    const res = await app.request(
      "/api/lifter/training-max/squat",
      { method: "PUT", body: JSON.stringify({}), headers: { "Content-Type": "application/json", Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(400);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("Invalid 1RM value");
  });

  it("PUT /api/lifter/password returns 400 for missing fields", async () => {
    const res = await app.request(
      "/api/lifter/password",
      { method: "PUT", body: JSON.stringify({}), headers: { "Content-Type": "application/json", Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(400);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("Current password and new password are required");
  });

  it("PUT /api/lifter/password returns 400 for short new password", async () => {
    const res = await app.request(
      "/api/lifter/password",
      { method: "PUT", body: JSON.stringify({ currentPassword: "old", newPassword: "123" }), headers: { "Content-Type": "application/json", Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(400);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("New password must be at least 6 characters");
  });

  it("PUT /api/lifter/password returns 401 for incorrect current password", async () => {
    mockVerifyPassword.mockResolvedValue(false);
    mockGetResult = { id: "account-id", userId: "test-user-id", password: "hashed-old-password" };

    const res = await app.request(
      "/api/lifter/password",
      { method: "PUT", body: JSON.stringify({ currentPassword: "wrong", newPassword: "newpassword123" }), headers: { "Content-Type": "application/json", Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(401);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("Current password is incorrect");
  });

  it("PUT /api/lifter/password updates password successfully", async () => {
    mockGetResult = { id: "account-id", userId: "test-user-id", password: "hashed-old-password" };

    const res = await app.request(
      "/api/lifter/password",
      { method: "PUT", body: JSON.stringify({ currentPassword: "correct", newPassword: "newpassword123" }), headers: { "Content-Type": "application/json", Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.success).toBe(true);
    expect(mockVerifyPassword).toHaveBeenCalledWith("correct", "hashed-old-password");
    expect(mockHashPassword).toHaveBeenCalledWith("newpassword123");
  });
});

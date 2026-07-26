import { describe, it, expect, vi, beforeAll } from "vitest";
import { Hono } from "hono";

vi.mock("@fivethreeone/db", () => {
  const mockLifterTable = {
    id: "test-lifter-id",
    userId: "test-user-id",
    username: "testuser",
    weightUnit: "kg",
    plateIncrement: 2500,
  };

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          get: vi.fn().mockResolvedValue(mockLifterTable),
        }),
      }),
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
    account: {},
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
});

describe("lifter routes - input validation", () => {
  let app: ReturnType<typeof createApp>;

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
});

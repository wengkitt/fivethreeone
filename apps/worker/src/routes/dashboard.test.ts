import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

let mockTrainingMaxes: Array<Record<string, unknown>> = [];
let mockWorkouts: Array<Record<string, unknown>> = [];
let mockPRs: Array<Record<string, unknown>> = [];
let mockGetResult: Record<string, unknown> | null = null;

vi.mock("@fivethreeone/db", () => {
  function buildChain() {
    const chain: Record<string, unknown> = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      get: vi.fn(() => Promise.resolve(mockGetResult)),
      then: vi.fn((resolve: (val: unknown) => void) => {
        if (mockWorkouts.length > 0 || mockTrainingMaxes.length > 0 || mockPRs.length > 0) {
          resolve(mockWorkouts.length > 0 ? mockWorkouts : (mockTrainingMaxes.length > 0 ? mockTrainingMaxes : mockPRs));
        } else {
          resolve([]);
        }
      }),
    };
    return chain;
  }

  const mockDb = {
    select: vi.fn(() => buildChain()),
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue(undefined),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
    })),
    batch: vi.fn().mockResolvedValue([undefined]),
  };

  return {
    createDbClient: vi.fn().mockReturnValue(mockDb),
    lifter: {},
    trainingMax: {},
    workout: {},
    personalRecord: {},
    user: {},
    session: {},
    account: {},
    verification: {},
    workoutSet: {},
    assistanceExercise: {},
    assistanceTemplate: {},
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

import dashboardRoutes from "./dashboard.js";

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/api", dashboardRoutes);
  return app;
}

describe("GET /api/lifts", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  it("returns all 4 main lifts with display names", async () => {
    const res = await app.request("/api/lifts");
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.success).toBe(true);
    const data = json.data as Array<{ id: string; displayName: string }>;
    expect(data).toHaveLength(4);
    expect(data[0]).toEqual({ id: "squat", displayName: "Squat" });
    expect(data[1]).toEqual({ id: "bench_press", displayName: "Bench Press" });
    expect(data[2]).toEqual({ id: "deadlift", displayName: "Deadlift" });
    expect(data[3]).toEqual({ id: "overhead_press", displayName: "Overhead Press" });
  });
});

describe("GET /api/lifts/:liftId/cycle", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    mockGetResult = null;
    mockTrainingMaxes = [];
    mockWorkouts = [];
    mockPRs = [];
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/api/lifts/squat/cycle");
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid lift", async () => {
    const res = await app.request(
      "/api/lifts/invalid/cycle",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(400);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("Invalid lift");
  });

  it("returns 404 when training max not found", async () => {
    mockGetResult = null;
    const res = await app.request(
      "/api/lifts/squat/cycle",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(404);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("Training max not found for this lift");
  });
});

describe("GET /api/dashboard", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    mockGetResult = null;
    mockTrainingMaxes = [];
    mockWorkouts = [];
    mockPRs = [];
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/api/dashboard");
    expect(res.status).toBe(401);
  });

  it("returns 404 when lifter not found", async () => {
    mockGetResult = null;
    const res = await app.request(
      "/api/dashboard",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(404);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("Lifter not found");
  });
});

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

type MockRecord = Record<string, unknown>;
type MockTable = { _tableName: string } & Record<string, unknown>;

let mockDbState: {
  personalRecords: MockRecord[];
};

function selectResult(tableName: string): MockRecord[] {
  switch (tableName) {
    case "personalRecord": return mockDbState.personalRecords;
    default: return [];
  }
}

vi.mock("@fivethreeone/db", () => {
  const chains = new Map<string, Record<string, unknown>>();

  function getChain(tableName: string) {
    if (!chains.has(tableName)) {
      const data = () => selectResult(tableName);
      const chain: Record<string, unknown> = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        all: vi.fn(() => Promise.resolve(data())),
        get: vi.fn(() => {
          const results = data();
          return Promise.resolve(results.length > 0 ? results[0] : null);
        }),
        then: vi.fn((resolve: (val: unknown) => void) => {
          resolve(data());
        }),
      };
      chains.set(tableName, chain);
    }
    return chains.get(tableName)!;
  }

  const mockDb = {
    select: vi.fn(() => ({
      from: (table: MockTable) => getChain(table._tableName),
    })),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue({}) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  };

  const makeTable = (name: string): MockTable => ({ _tableName: name } as MockTable);

  return {
    createDbClient: vi.fn().mockReturnValue(mockDb),
    personalRecord: makeTable("personalRecord"),
    lifter: makeTable("lifter"),
    trainingMax: makeTable("trainingMax"),
    workout: makeTable("workout"),
    workoutSet: makeTable("workoutSet"),
    assistanceExercise: makeTable("assistanceExercise"),
    assistanceTemplate: makeTable("assistanceTemplate"),
    user: makeTable("user"),
    session: makeTable("session"),
    account: makeTable("account"),
    verification: makeTable("verification"),
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

import personalRecordRoutes from "./personal-records.js";

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/api", personalRecordRoutes);
  return app;
}

describe("GET /api/personal-records", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => { app = createApp(); });
  beforeEach(() => {
    mockDbState = { personalRecords: [] };
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/api/personal-records");
    expect(res.status).toBe(401);
  });

  it("returns PRs grouped by lift", async () => {
    mockDbState.personalRecords = [
      { id: "pr1", lifterId: "test-lifter-id", lift: "squat", prType: "tm", value: 100, achievedAt: Date.now(), workoutId: "w1" },
      { id: "pr2", lifterId: "test-lifter-id", lift: "squat", prType: "estimated_1rm", value: 120, achievedAt: Date.now(), workoutId: "w2" },
      { id: "pr3", lifterId: "test-lifter-id", lift: "squat", prType: "amrap_reps", value: 8, achievedAt: Date.now(), workoutId: "w2" },
      { id: "pr4", lifterId: "test-lifter-id", lift: "bench_press", prType: "tm", value: 80, achievedAt: Date.now(), workoutId: "w3" },
    ];

    const res = await app.request(
      "/api/personal-records",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.success).toBe(true);
    const data = json.data as Record<string, unknown>;
    expect(data.grouped).toBeDefined();
    const grouped = data.grouped as Record<string, unknown>;
    expect(grouped.squat).toBeDefined();
    expect(grouped.bench_press).toBeDefined();
    const squatPrs = grouped.squat as Array<Record<string, unknown>>;
    expect(squatPrs).toHaveLength(3);
    const benchPrs = grouped.bench_press as Array<Record<string, unknown>>;
    expect(benchPrs).toHaveLength(1);
  });

  it("records are ordered by achievedAt descending within each lift group", async () => {
    const newer = Date.now();
    const older = Date.now() - 100000;
    mockDbState.personalRecords = [
      { id: "pr2", lifterId: "test-lifter-id", lift: "squat", prType: "tm", value: 100, achievedAt: newer, workoutId: null },
      { id: "pr1", lifterId: "test-lifter-id", lift: "squat", prType: "tm", value: 90, achievedAt: older, workoutId: null },
    ];

    const res = await app.request(
      "/api/personal-records",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Record<string, unknown>;
    const grouped = data.grouped as Record<string, unknown>;
    const squatPrs = grouped.squat as Array<Record<string, unknown>>;
    expect(squatPrs[0].value).toBe(100);
    expect(squatPrs[1].value).toBe(90);
  });

  it("returns only lifts that have PRs", async () => {
    mockDbState.personalRecords = [
      { id: "pr1", lifterId: "test-lifter-id", lift: "squat", prType: "tm", value: 100, achievedAt: Date.now(), workoutId: null },
    ];

    const res = await app.request(
      "/api/personal-records",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Record<string, unknown>;
    const grouped = data.grouped as Record<string, unknown>;
    expect(Object.keys(grouped)).toEqual(["squat"]);
  });

  it("returns empty grouped object when no PRs exist", async () => {
    const res = await app.request(
      "/api/personal-records",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Record<string, unknown>;
    expect(data.grouped).toEqual({});
  });
});

describe("GET /api/personal-records/:liftId", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => { app = createApp(); });
  beforeEach(() => {
    mockDbState = { personalRecords: [] };
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/api/personal-records/squat");
    expect(res.status).toBe(401);
  });

  it("returns PRs for a specific lift ordered by date", async () => {
    const newer = Date.now();
    const older = Date.now() - 100000;
    mockDbState.personalRecords = [
      { id: "pr2", lifterId: "test-lifter-id", lift: "squat", prType: "tm", value: 100, achievedAt: newer, workoutId: null },
      { id: "pr1", lifterId: "test-lifter-id", lift: "squat", prType: "tm", value: 90, achievedAt: older, workoutId: null },
    ];

    const res = await app.request(
      "/api/personal-records/squat",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.success).toBe(true);
    const data = json.data as Array<Record<string, unknown>>;
    expect(data).toHaveLength(2);
    expect(data[0].value).toBe(100);
  });

  it("returns 400 for invalid lift", async () => {
    const res = await app.request(
      "/api/personal-records/invalid_lift",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(400);
  });

  it("returns empty array when no PRs for lift", async () => {
    const res = await app.request(
      "/api/personal-records/squat",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Array<Record<string, unknown>>;
    expect(data).toHaveLength(0);
  });
});

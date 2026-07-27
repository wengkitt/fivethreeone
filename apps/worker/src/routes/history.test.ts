import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

type MockRecord = Record<string, unknown>;
type MockTable = { _tableName: string } & Record<string, unknown>;

let mockDbState: {
  workouts: MockRecord[];
  workoutSets: MockRecord[];
  assistanceExercises: MockRecord[];
};

function selectResult(tableName: string): MockRecord[] {
  switch (tableName) {
    case "workout": return mockDbState.workouts;
    case "workoutSet": return mockDbState.workoutSets;
    case "assistanceExercise": return mockDbState.assistanceExercises;
    default: return [];
  }
}

let countSelectMode = false;

vi.mock("@fivethreeone/db", () => {
  const chains = new Map<string, Record<string, unknown>>();

  function getChain(tableName: string) {
    if (!chains.has(tableName)) {
      const data = () => selectResult(tableName);
      const chain: Record<string, unknown> = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        offset: vi.fn(() => chain),
        all: vi.fn(() => Promise.resolve(data())),
        get: vi.fn(() => {
          if (countSelectMode) {
            countSelectMode = false;
            return Promise.resolve({ value: data().length });
          }
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
    select: vi.fn((selection?: Record<string, unknown>) => {
      if (selection) {
        countSelectMode = true;
      }
      return {
        from: (table: MockTable) => getChain(table._tableName),
      };
    }),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue({}) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  };

  const makeTable = (name: string): MockTable => ({ _tableName: name } as MockTable);

  return {
    createDbClient: vi.fn().mockReturnValue(mockDb),
    workout: makeTable("workout"),
    workoutSet: makeTable("workoutSet"),
    assistanceExercise: makeTable("assistanceExercise"),
    lifter: makeTable("lifter"),
    trainingMax: makeTable("trainingMax"),
    personalRecord: makeTable("personalRecord"),
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

import historyRoutes from "./history.js";

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/api", historyRoutes);
  return app;
}

function makeCompletedWorkout(id: string, lift: string, week: number, cycle: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    lifterId: "test-lifter-id",
    lift,
    weekNumber: week,
    cycleNumber: cycle,
    status: "completed",
    notes: overrides.notes ?? null,
    completedAt: Date.now(),
    createdAt: Date.now() - 10000,
    ...overrides,
  };
}

function makeSet(id: string, workoutId: string, setNumber: number, isAmrap = false) {
  return {
    id,
    workoutId,
    setNumber,
    targetPercentage: isAmrap ? 85 : 65,
    calculatedWeight: 100,
    actualWeight: 100,
    targetReps: isAmrap ? 5 : 5,
    actualReps: isAmrap ? 8 : 5,
    isAmrap: isAmrap ? 1 : 0,
  };
}

function makeAssistance(id: string, workoutId: string) {
  return {
    id,
    workoutId,
    exerciseName: "Pull-ups",
    sets: 3,
    reps: 10,
    weight: null,
    notes: null,
    templateName: null,
  };
}

describe("GET /api/workouts", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => { app = createApp(); });
  beforeEach(() => {
    mockDbState = { workouts: [], workoutSets: [], assistanceExercises: [] };
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/api/workouts");
    expect(res.status).toBe(401);
  });

  it("returns paginated list of completed workouts", async () => {
    mockDbState.workouts = [
      makeCompletedWorkout("w1", "squat", 1, 1),
      makeCompletedWorkout("w2", "bench_press", 1, 1),
    ];

    const res = await app.request(
      "/api/workouts",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.success).toBe(true);
    const data = json.data as Record<string, unknown>;
    expect(data.workouts).toHaveLength(2);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(20);
  });

  it("filters by lift — sets up state with only matching workouts", async () => {
    mockDbState.workouts = [
      makeCompletedWorkout("w1", "squat", 1, 1),
      makeCompletedWorkout("w2", "squat", 2, 1),
    ];

    const res = await app.request(
      "/api/workouts?lift=squat",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Record<string, unknown>;
    const workouts = data.workouts as Array<Record<string, unknown>>;
    expect(workouts).toHaveLength(2);
    workouts.forEach((w) => expect(w.lift).toBe("squat"));
  });

  it("supports pagination with page and limit", async () => {
    mockDbState.workouts = Array.from({ length: 3 }, (_, i) =>
      makeCompletedWorkout(`w${i}`, "squat", (i % 4) + 1, 1),
    );

    const res = await app.request(
      "/api/workouts?page=1&limit=2",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Record<string, unknown>;
    expect((data.workouts as Array<unknown>).length).toBe(3);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(2);
  });

  it("includes sets and assistance exercises in response", async () => {
    mockDbState.workouts = [
      makeCompletedWorkout("w1", "squat", 1, 1),
    ];
    mockDbState.workoutSets = [
      makeSet("ws1", "w1", 1),
      makeSet("ws2", "w1", 2),
    ];
    mockDbState.assistanceExercises = [
      makeAssistance("ae1", "w1"),
    ];

    const res = await app.request(
      "/api/workouts",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Record<string, unknown>;
    const workouts = data.workouts as Array<Record<string, unknown>>;
    expect(workouts[0].sets).toHaveLength(2);
    expect(workouts[0].assistanceExercises).toHaveLength(1);
  });

  it("returns empty list when no workouts found", async () => {
    const res = await app.request(
      "/api/workouts",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Record<string, unknown>;
    expect(data.workouts).toHaveLength(0);
  });
});

describe("GET /api/lifts/:liftId/history", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => { app = createApp(); });
  beforeEach(() => {
    mockDbState = { workouts: [], workoutSets: [], assistanceExercises: [] };
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/api/lifts/squat/history");
    expect(res.status).toBe(401);
  });

  it("returns completed workouts for a specific lift across all cycles", async () => {
    mockDbState.workouts = [
      makeCompletedWorkout("w1", "squat", 1, 1),
      makeCompletedWorkout("w2", "squat", 2, 2),
    ];

    const res = await app.request(
      "/api/lifts/squat/history",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.success).toBe(true);
    const data = json.data as Array<Record<string, unknown>>;
    expect(data).toHaveLength(2);
    data.forEach((w) => expect(w.lift).toBe("squat"));
  });

  it("returns 400 for invalid lift", async () => {
    const res = await app.request(
      "/api/lifts/invalid_lift/history",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(400);
  });

  it("returns empty array when no history for lift", async () => {
    mockDbState.workouts = [];

    const res = await app.request(
      "/api/lifts/deadlift/history",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Array<Record<string, unknown>>;
    expect(data).toHaveLength(0);
  });
});

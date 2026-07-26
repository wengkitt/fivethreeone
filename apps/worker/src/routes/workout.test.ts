import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

type MockRecord = Record<string, unknown>;
type MockTable = { _tableName: string } & Record<string, unknown>;

let mockDbState: {
  lifter: MockRecord | null;
  trainingMaxes: MockRecord[];
  workouts: MockRecord[];
  workoutSets: MockRecord[];
  assistanceExercises: MockRecord[];
  assistanceTemplates: MockRecord[];
  personalRecords: MockRecord[];
  capturedUpdate: { table: string; data: Record<string, unknown> } | null;
};

function selectResult(tableName: string): MockRecord[] {
  switch (tableName) {
    case "lifter": return mockDbState.lifter ? [mockDbState.lifter] : [];
    case "trainingMax": return mockDbState.trainingMaxes;
    case "workout": return mockDbState.workouts;
    case "workoutSet": return mockDbState.workoutSets;
    case "assistanceExercise": return mockDbState.assistanceExercises;
    case "assistanceTemplate": return mockDbState.assistanceTemplates;
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
    insert: vi.fn((table: MockTable) => ({
      values: vi.fn((data: Record<string, unknown>) => {
        if (table._tableName === "personalRecord") {
          mockDbState.personalRecords.push(data);
        }
        return Promise.resolve({});
      }),
    })),
    update: vi.fn((table: MockTable) => ({
      set: vi.fn((data: Record<string, unknown>) => ({
        where: vi.fn(() => {
          if (table._tableName === "trainingMax") {
            mockDbState.capturedUpdate = { table: table._tableName, data };
          }
          return Promise.resolve(undefined);
        }),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    })),
    batch: vi.fn().mockResolvedValue([undefined]),
  };

  const makeTable = (name: string): MockTable => ({ _tableName: name } as MockTable);

  return {
    createDbClient: vi.fn().mockReturnValue(mockDb),
    lifter: makeTable("lifter"),
    trainingMax: makeTable("trainingMax"),
    workout: makeTable("workout"),
    workoutSet: makeTable("workoutSet"),
    assistanceExercise: makeTable("assistanceExercise"),
    assistanceTemplate: makeTable("assistanceTemplate"),
    personalRecord: makeTable("personalRecord"),
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

import workoutRoutes from "./workout.js";

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/api", workoutRoutes);
  return app;
}

describe("GET /api/workouts/current", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    mockDbState = {
      lifter: null,
      trainingMaxes: [],
      workouts: [],
      workoutSets: [],
      assistanceExercises: [],
      assistanceTemplates: [],
      personalRecords: [],
      capturedUpdate: null,
    };
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/api/workouts/current");
    expect(res.status).toBe(401);
  });

  it("returns 404 when lifter not found", async () => {
    mockDbState.lifter = null;
    const res = await app.request(
      "/api/workouts/current",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(404);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("Lifter not found");
  });

  it("returns correct sets for current lift/week based on TM", async () => {
    mockDbState.lifter = {
      id: "test-lifter-id",
      weightUnit: "kg",
      plateIncrement: 2500,
    };
    mockDbState.trainingMaxes = [
      { id: "tm1", lifterId: "test-lifter-id", lift: "squat", oneRm: 100, trainingMaxValue: 90, cycleNumber: 1 },
      { id: "tm2", lifterId: "test-lifter-id", lift: "bench_press", oneRm: 80, trainingMaxValue: 72, cycleNumber: 1 },
      { id: "tm3", lifterId: "test-lifter-id", lift: "deadlift", oneRm: 140, trainingMaxValue: 126, cycleNumber: 1 },
      { id: "tm4", lifterId: "test-lifter-id", lift: "overhead_press", oneRm: 60, trainingMaxValue: 54, cycleNumber: 1 },
    ];
    mockDbState.workouts = [];

    const res = await app.request(
      "/api/workouts/current",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.success).toBe(true);
    const data = json.data as Array<Record<string, unknown>>;
    expect(data).toHaveLength(4);

    const squat = data.find((d) => d.lift === "squat");
    expect(squat).toBeDefined();
    expect(squat!.weekNumber).toBe(1);
    expect(squat!.cycleNumber).toBe(1);
    expect(squat!.trainingMax).toBe(90);
    expect(squat!.status).toBe("not_started");
    expect(squat!.workoutId).toBeNull();
    const sets = squat!.sets as Array<Record<string, unknown>>;
    expect(sets).toHaveLength(3);
    expect(sets[0]).toMatchObject({ setNumber: 1, targetPercentage: 65, calculatedWeight: 57.5, targetReps: 5, isAmrap: false });
    expect(sets[1]).toMatchObject({ setNumber: 2, targetPercentage: 75, calculatedWeight: 67.5, targetReps: 5, isAmrap: false });
    expect(sets[2]).toMatchObject({ setNumber: 3, targetPercentage: 85, calculatedWeight: 75, targetReps: 5, isAmrap: true });
  });

  it("shows in_progress status when workout exists", async () => {
    mockDbState.lifter = {
      id: "test-lifter-id",
      weightUnit: "kg",
      plateIncrement: 2500,
    };
    mockDbState.trainingMaxes = [
      { id: "tm1", lifterId: "test-lifter-id", lift: "squat", oneRm: 100, trainingMaxValue: 90, cycleNumber: 1 },
    ];
    mockDbState.workouts = [
      { id: "w1", lifterId: "test-lifter-id", lift: "squat", weekNumber: 1, cycleNumber: 1, status: "in_progress", notes: null, completedAt: null },
    ];
    mockDbState.workoutSets = [
      { id: "ws1", workoutId: "w1", setNumber: 1, targetPercentage: 65, calculatedWeight: 65, actualWeight: null, targetReps: 5, actualReps: null, isAmrap: 0 },
      { id: "ws2", workoutId: "w1", setNumber: 2, targetPercentage: 75, calculatedWeight: 67.5, actualWeight: null, targetReps: 5, actualReps: null, isAmrap: 0 },
      { id: "ws3", workoutId: "w1", setNumber: 3, targetPercentage: 85, calculatedWeight: 75, actualWeight: null, targetReps: 5, actualReps: null, isAmrap: 1 },
    ];

    const res = await app.request(
      "/api/workouts/current",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Array<Record<string, unknown>>;
    const squat = data.find((d) => d.lift === "squat");
    expect(squat!.status).toBe("in_progress");
    expect(squat!.workoutId).toBe("w1");
    expect((squat!.sets as Array<Record<string, unknown>>)).toHaveLength(3);
  });

  it("shows completed status when cycle is finished (all 4 weeks done)", async () => {
    mockDbState.lifter = {
      id: "test-lifter-id",
      weightUnit: "kg",
      plateIncrement: 2500,
    };
    mockDbState.trainingMaxes = [
      { id: "tm1", lifterId: "test-lifter-id", lift: "squat", oneRm: 100, trainingMaxValue: 90, cycleNumber: 1 },
    ];
    mockDbState.workouts = [
      { id: "w1", lifterId: "test-lifter-id", lift: "squat", weekNumber: 1, cycleNumber: 1, status: "completed", notes: null, completedAt: Date.now() },
      { id: "w2", lifterId: "test-lifter-id", lift: "squat", weekNumber: 2, cycleNumber: 1, status: "completed", notes: null, completedAt: Date.now() },
      { id: "w3", lifterId: "test-lifter-id", lift: "squat", weekNumber: 3, cycleNumber: 1, status: "completed", notes: null, completedAt: Date.now() },
      { id: "w4", lifterId: "test-lifter-id", lift: "squat", weekNumber: 4, cycleNumber: 1, status: "completed", notes: "Great session", completedAt: Date.now() },
    ];
    mockDbState.workoutSets = [
      { id: "ws4", workoutId: "w4", setNumber: 1, targetPercentage: 40, calculatedWeight: 35, actualWeight: 35, targetReps: 5, actualReps: 5, isAmrap: 0 },
      { id: "ws5", workoutId: "w4", setNumber: 2, targetPercentage: 50, calculatedWeight: 45, actualWeight: 45, targetReps: 5, actualReps: 5, isAmrap: 0 },
      { id: "ws6", workoutId: "w4", setNumber: 3, targetPercentage: 60, calculatedWeight: 52.5, actualWeight: 52.5, targetReps: 5, actualReps: 5, isAmrap: 0 },
    ];

    const res = await app.request(
      "/api/workouts/current",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Array<Record<string, unknown>>;
    const squat = data.find((d) => d.lift === "squat");
    expect(squat!.status).toBe("completed");
    expect(squat!.workoutId).toBe("w4");
  });

  it("computes correct week number based on completed workouts", async () => {
    mockDbState.lifter = {
      id: "test-lifter-id",
      weightUnit: "kg",
      plateIncrement: 2500,
    };
    mockDbState.trainingMaxes = [
      { id: "tm1", lifterId: "test-lifter-id", lift: "squat", oneRm: 100, trainingMaxValue: 90, cycleNumber: 1 },
    ];
    mockDbState.workouts = [
      { id: "w1", lifterId: "test-lifter-id", lift: "squat", weekNumber: 1, cycleNumber: 1, status: "completed", notes: null, completedAt: Date.now() },
      { id: "w2", lifterId: "test-lifter-id", lift: "squat", weekNumber: 2, cycleNumber: 1, status: "completed", notes: null, completedAt: Date.now() },
    ];
    mockDbState.workoutSets = [];

    const res = await app.request(
      "/api/workouts/current",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Array<Record<string, unknown>>;
    const squat = data.find((d) => d.lift === "squat");
    expect(squat!.weekNumber).toBe(3);
  });
});

describe("POST /api/workouts", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    mockDbState = {
      lifter: null,
      trainingMaxes: [],
      workouts: [],
      workoutSets: [],
      assistanceExercises: [],
      assistanceTemplates: [],
      personalRecords: [],
      capturedUpdate: null,
    };
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/api/workouts", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("starts a new workout for a valid lift", async () => {
    mockDbState.lifter = {
      id: "test-lifter-id",
      weightUnit: "kg",
      plateIncrement: 2500,
    };
    mockDbState.trainingMaxes = [
      { id: "tm1", lifterId: "test-lifter-id", lift: "squat", oneRm: 100, trainingMaxValue: 90, cycleNumber: 1 },
    ];
    mockDbState.workouts = [];

    const res = await app.request(
      "/api/workouts",
      {
        method: "POST",
        body: JSON.stringify({ lift: "squat" }),
        headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
      },
    );
    expect(res.status).toBe(201);
    const json = await res.json() as Record<string, unknown>;
    expect(json.success).toBe(true);
    const data = json.data as Record<string, unknown>;
    expect(data.lift).toBe("squat");
    expect(data.weekNumber).toBe(1);
    expect(data.status).toBe("in_progress");
    const sets = data.sets as Array<Record<string, unknown>>;
    expect(sets).toHaveLength(3);
  });

  it("returns 400 for invalid lift", async () => {
    mockDbState.lifter = {
      id: "test-lifter-id",
      weightUnit: "kg",
      plateIncrement: 2500,
    };
    const res = await app.request(
      "/api/workouts",
      {
        method: "POST",
        body: JSON.stringify({ lift: "invalid_lift" }),
        headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
      },
    );
    expect(res.status).toBe(400);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("Invalid lift");
  });

  it("returns 404 when no TM found for lift", async () => {
    mockDbState.lifter = {
      id: "test-lifter-id",
      weightUnit: "kg",
      plateIncrement: 2500,
    };
    mockDbState.trainingMaxes = [];

    const res = await app.request(
      "/api/workouts",
      {
        method: "POST",
        body: JSON.stringify({ lift: "squat" }),
        headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
      },
    );
    expect(res.status).toBe(404);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("Training max not found for this lift");
  });

  it("returns existing in_progress workout instead of creating new one", async () => {
    mockDbState.lifter = {
      id: "test-lifter-id",
      weightUnit: "kg",
      plateIncrement: 2500,
    };
    mockDbState.trainingMaxes = [
      { id: "tm1", lifterId: "test-lifter-id", lift: "squat", oneRm: 100, trainingMaxValue: 90, cycleNumber: 1 },
    ];
    mockDbState.workouts = [
      { id: "existing-w1", lifterId: "test-lifter-id", lift: "squat", weekNumber: 1, cycleNumber: 1, status: "in_progress", notes: null, completedAt: null },
    ];
    mockDbState.workoutSets = [
      { id: "ws1", workoutId: "existing-w1", setNumber: 1, targetPercentage: 65, calculatedWeight: 65, actualWeight: null, targetReps: 5, actualReps: null, isAmrap: 0 },
    ];

    const res = await app.request(
      "/api/workouts",
      {
        method: "POST",
        body: JSON.stringify({ lift: "squat" }),
        headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
      },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.success).toBe(true);
    const data = json.data as Record<string, unknown>;
    expect(data.id).toBe("existing-w1");
  });
});

describe("GET /api/workouts/:id", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    mockDbState = {
      lifter: null,
      trainingMaxes: [],
      workouts: [],
      workoutSets: [],
      assistanceExercises: [],
      assistanceTemplates: [],
      personalRecords: [],
      capturedUpdate: null,
    };
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/api/workouts/some-id");
    expect(res.status).toBe(401);
  });

  it("returns workout with sets and assistance exercises", async () => {
    mockDbState.workouts = [
      { id: "w1", lifterId: "test-lifter-id", lift: "squat", weekNumber: 1, cycleNumber: 1, status: "in_progress", notes: "Test notes", completedAt: null, createdAt: Date.now() },
    ];
    mockDbState.workoutSets = [
      { id: "ws1", workoutId: "w1", setNumber: 1, targetPercentage: 65, calculatedWeight: 65, actualWeight: null, targetReps: 5, actualReps: null, isAmrap: 0 },
      { id: "ws2", workoutId: "w1", setNumber: 2, targetPercentage: 75, calculatedWeight: 67.5, actualWeight: null, targetReps: 5, actualReps: null, isAmrap: 0 },
    ];
    mockDbState.assistanceExercises = [
      { id: "ae1", workoutId: "w1", exerciseName: "Pull-ups", sets: 3, reps: 10, weight: null, notes: null, templateName: null },
    ];

    const res = await app.request(
      "/api/workouts/w1",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.success).toBe(true);
    const data = json.data as Record<string, unknown>;
    expect(data.id).toBe("w1");
    expect(data.lift).toBe("squat");
    expect(data.notes).toBe("Test notes");
    const sets = data.sets as Array<Record<string, unknown>>;
    expect(sets).toHaveLength(2);
    const exercises = data.assistanceExercises as Array<Record<string, unknown>>;
    expect(exercises).toHaveLength(1);
    expect(exercises[0].exerciseName).toBe("Pull-ups");
  });

  it("returns 404 for non-existent workout", async () => {
    mockDbState.workouts = [];
    const res = await app.request(
      "/api/workouts/nonexistent",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/workouts/:id", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    mockDbState = {
      lifter: null,
      trainingMaxes: [],
      workouts: [],
      workoutSets: [],
      assistanceExercises: [],
      assistanceTemplates: [],
      personalRecords: [],
      capturedUpdate: null,
    };
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/api/workouts/w1", { method: "PUT" });
    expect(res.status).toBe(401);
  });

  it("completes a workout with actual set data", async () => {
    mockDbState.workouts = [
      { id: "w1", lifterId: "test-lifter-id", lift: "squat", weekNumber: 1, cycleNumber: 1, status: "in_progress", notes: null, completedAt: null, createdAt: Date.now() },
    ];

    const res = await app.request(
      "/api/workouts/w1",
      {
        method: "PUT",
        body: JSON.stringify({
          notes: "Great session!",
          sets: [
            { id: "ws1", actualWeight: 65, actualReps: 5 },
            { id: "ws2", actualWeight: 67.5, actualReps: 5 },
            { id: "ws3", actualWeight: 75, actualReps: 8 },
          ],
          assistanceExercises: [
            { exerciseName: "Chin-ups", sets: 3, reps: 8, weight: null, notes: null },
          ],
        }),
        headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
      },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.success).toBe(true);
    const data = json.data as Record<string, unknown>;
    expect(data.status).toBe("completed");
    expect(data.notes).toBe("Great session!");
  });

  it("returns 404 for non-existent workout", async () => {
    mockDbState.workouts = [];
    const res = await app.request(
      "/api/workouts/nonexistent",
      {
        method: "PUT",
        body: JSON.stringify({ notes: "test" }),
        headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
      },
    );
    expect(res.status).toBe(404);
  });

  describe("cycle progression", () => {
    function setupProgressionTest(overrides: {
      lift?: string;
      trainingMaxValue?: number;
      cycleNumber?: number;
      completedWeeks?: number[];
      currentWeek?: number;
      personalRecords?: MockRecord[];
    }) {
      const lift = overrides.lift ?? "squat";
      const tmValue = overrides.trainingMaxValue ?? 100;
      const cycle = overrides.cycleNumber ?? 1;
      const completedWeeks = overrides.completedWeeks ?? [1, 2];
      const currentWeek = overrides.currentWeek ?? 3;

      mockDbState.lifter = {
        id: "test-lifter-id",
        weightUnit: "kg",
        plateIncrement: 2500,
      };
      mockDbState.trainingMaxes = [
        { id: "tm1", lifterId: "test-lifter-id", lift, oneRm: 111, trainingMaxValue: tmValue, cycleNumber: cycle },
      ];
      mockDbState.personalRecords = overrides.personalRecords ?? [];
      mockDbState.workouts = [
        {
          id: "current-w",
          lifterId: "test-lifter-id",
          lift,
          weekNumber: currentWeek,
          cycleNumber: cycle,
          status: "in_progress" as const,
          notes: null,
          completedAt: null,
        },
        ...completedWeeks.map((w, i) => ({
          id: `w${i}`,
          lifterId: "test-lifter-id",
          lift,
          weekNumber: w,
          cycleNumber: cycle,
          status: "completed" as const,
          notes: null,
          completedAt: Date.now(),
        })),
      ];
      mockDbState.workoutSets = [];
      return { lift, tmValue, cycle };
    }

    it("triggers TM increment after completing 3rd non-deload workout", async () => {
      setupProgressionTest({ lift: "squat", trainingMaxValue: 100 });

      const res = await app.request(
        "/api/workouts/current-w",
        {
          method: "PUT",
          body: JSON.stringify({ notes: "Hard session!" }),
          headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
        },
      );
      expect(res.status).toBe(200);

      expect(mockDbState.capturedUpdate).not.toBeNull();
      expect(mockDbState.capturedUpdate!.table).toBe("trainingMax");
      expect(mockDbState.capturedUpdate!.data.trainingMaxValue).toBe(105);
      expect(mockDbState.capturedUpdate!.data.cycleNumber).toBe(2);
    });

    it("increments bench press TM by 2.5kg", async () => {
      setupProgressionTest({ lift: "bench_press", trainingMaxValue: 100 });

      const res = await app.request(
        "/api/workouts/current-w",
        {
          method: "PUT",
          body: JSON.stringify({ notes: "Easy!" }),
          headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
        },
      );
      expect(res.status).toBe(200);

      expect(mockDbState.capturedUpdate).not.toBeNull();
      expect(mockDbState.capturedUpdate!.data.trainingMaxValue).toBe(102.5);
      expect(mockDbState.capturedUpdate!.data.cycleNumber).toBe(2);
    });

    it("increments overhead press TM by 2.5kg", async () => {
      setupProgressionTest({ lift: "overhead_press", trainingMaxValue: 60 });

      const res = await app.request(
        "/api/workouts/current-w",
        {
          method: "PUT",
          body: JSON.stringify({ notes: "Tough" }),
          headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
        },
      );
      expect(res.status).toBe(200);

      expect(mockDbState.capturedUpdate).not.toBeNull();
      expect(mockDbState.capturedUpdate!.data.trainingMaxValue).toBe(62.5);
      expect(mockDbState.capturedUpdate!.data.cycleNumber).toBe(2);
    });

    it("increments deadlift TM by 5kg", async () => {
      setupProgressionTest({ lift: "deadlift", trainingMaxValue: 140 });

      const res = await app.request(
        "/api/workouts/current-w",
        {
          method: "PUT",
          body: JSON.stringify({ notes: "Heavy!" }),
          headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
        },
      );
      expect(res.status).toBe(200);

      expect(mockDbState.capturedUpdate).not.toBeNull();
      expect(mockDbState.capturedUpdate!.data.trainingMaxValue).toBe(145);
      expect(mockDbState.capturedUpdate!.data.cycleNumber).toBe(2);
    });

    it("deload workout (week 4) does not trigger progression", async () => {
      setupProgressionTest({ completedWeeks: [1, 2, 3], currentWeek: 4 });

      const res = await app.request(
        "/api/workouts/current-w",
        {
          method: "PUT",
          body: JSON.stringify({ notes: "Deload" }),
          headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
        },
      );
      expect(res.status).toBe(200);

      expect(mockDbState.capturedUpdate).toBeNull();
    });

    it("completing week 1, 2, 4 (skipping week 3) does NOT trigger progression", async () => {
      setupProgressionTest({ completedWeeks: [1, 2], currentWeek: 4 });

      const res = await app.request(
        "/api/workouts/current-w",
        {
          method: "PUT",
          body: JSON.stringify({ notes: "Deload skip week 3" }),
          headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
        },
      );
      expect(res.status).toBe(200);
      expect(mockDbState.capturedUpdate).toBeNull();
    });

    it("same-week duplicate completions do not double-count", async () => {
      mockDbState.lifter = {
        id: "test-lifter-id",
        weightUnit: "kg",
        plateIncrement: 2500,
      };
      mockDbState.trainingMaxes = [
        { id: "tm1", lifterId: "test-lifter-id", lift: "squat", oneRm: 111, trainingMaxValue: 100, cycleNumber: 1 },
      ];
      mockDbState.personalRecords = [];
      mockDbState.workouts = [
        { id: "current-w", lifterId: "test-lifter-id", lift: "squat", weekNumber: 3, cycleNumber: 1, status: "in_progress", notes: null, completedAt: null },
        { id: "w1", lifterId: "test-lifter-id", lift: "squat", weekNumber: 1, cycleNumber: 1, status: "completed", notes: null, completedAt: Date.now() },
        { id: "w1b", lifterId: "test-lifter-id", lift: "squat", weekNumber: 1, cycleNumber: 1, status: "completed", notes: null, completedAt: Date.now() },
        { id: "w2", lifterId: "test-lifter-id", lift: "squat", weekNumber: 2, cycleNumber: 1, status: "completed", notes: null, completedAt: Date.now() },
      ];
      mockDbState.workoutSets = [];

      const res = await app.request(
        "/api/workouts/current-w",
        {
          method: "PUT",
          body: JSON.stringify({ notes: "Week 3" }),
          headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
        },
      );
      expect(res.status).toBe(200);

      expect(mockDbState.capturedUpdate).not.toBeNull();
      expect(mockDbState.capturedUpdate!.data.trainingMaxValue).toBe(105);
      expect(mockDbState.capturedUpdate!.data.cycleNumber).toBe(2);
    });

    it("creates a PR when new TM exceeds previous max", async () => {
      setupProgressionTest({ lift: "squat", trainingMaxValue: 100 });

      const res = await app.request(
        "/api/workouts/current-w",
        {
          method: "PUT",
          body: JSON.stringify({ notes: "PR time!" }),
          headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
        },
      );
      expect(res.status).toBe(200);

      expect(mockDbState.personalRecords.length).toBe(1);
      expect(mockDbState.personalRecords[0].prType).toBe("tm");
      expect(mockDbState.personalRecords[0].value).toBe(105);
      expect(mockDbState.personalRecords[0].lift).toBe("squat");
      expect(mockDbState.personalRecords[0].workoutId).toBe("current-w");
    });

    it("does not create a PR when new TM does not exceed historical max", async () => {
      setupProgressionTest({
        lift: "squat",
        trainingMaxValue: 100,
        personalRecords: [
          { id: "pr1", lifterId: "test-lifter-id", lift: "squat", prType: "tm", value: 200, achievedAt: Date.now(), workoutId: null },
        ],
      });

      const res = await app.request(
        "/api/workouts/current-w",
        {
          method: "PUT",
          body: JSON.stringify({ notes: "Not a PR" }),
          headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
        },
      );
      expect(res.status).toBe(200);

      // TM still advances
      expect(mockDbState.capturedUpdate).not.toBeNull();
      expect(mockDbState.capturedUpdate!.data.trainingMaxValue).toBe(105);
      // But no new PR
      expect(mockDbState.personalRecords.length).toBe(1);
      expect(mockDbState.personalRecords[0].value).toBe(200);
    });
  });
});

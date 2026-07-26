import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { Hono } from "hono";

type MockRecord = Record<string, unknown>;
type MockTable = { _tableName: string } & Record<string, unknown>;

let mockDbState: {
  lifter: MockRecord | null;
  assistanceTemplates: MockRecord[];
};

function selectResult(tableName: string): MockRecord[] {
  switch (tableName) {
    case "lifter": return mockDbState.lifter ? [mockDbState.lifter] : [];
    case "assistanceTemplate": return mockDbState.assistanceTemplates;
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
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue({}),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
    batch: vi.fn().mockResolvedValue([undefined]),
  };

  const makeTable = (name: string): MockTable => ({ _tableName: name } as MockTable);

  return {
    createDbClient: vi.fn().mockReturnValue(mockDb),
    lifter: makeTable("lifter"),
    assistanceTemplate: makeTable("assistanceTemplate"),
    trainingMax: makeTable("trainingMax"),
    workout: makeTable("workout"),
    workoutSet: makeTable("workoutSet"),
    assistanceExercise: makeTable("assistanceExercise"),
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

import templateRoutes from "./templates.js";

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/api", templateRoutes);
  return app;
}

describe("GET /api/templates", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    mockDbState = {
      lifter: null,
      assistanceTemplates: [],
    };
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/api/templates");
    expect(res.status).toBe(401);
  });

  it("returns built-in templates (BBB, FSL) and custom templates", async () => {
    mockDbState.lifter = { id: "test-lifter-id" };
    mockDbState.assistanceTemplates = [
      { id: "ct1", lifterId: "test-lifter-id", name: "My Custom", exercises: JSON.stringify([{ name: "Pull-ups", sets: 3, reps: 10, weight: null, notes: null }]), createdAt: Date.now() },
    ];

    const res = await app.request(
      "/api/templates",
      { headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.success).toBe(true);
    const data = json.data as Array<Record<string, unknown>>;
    expect(data.length).toBeGreaterThanOrEqual(3);

    const bbb = data.find((t) => t.id === "bbb");
    expect(bbb).toBeDefined();
    expect(bbb!.name).toBe("Boring But Big (BBB)");
    expect(bbb!.isBuiltIn).toBe(true);

    const fsl = data.find((t) => t.id === "fsl");
    expect(fsl).toBeDefined();
    expect(fsl!.name).toBe("First Set Last (FSL)");
    expect(fsl!.isBuiltIn).toBe(true);

    const custom = data.find((t) => t.id === "ct1");
    expect(custom).toBeDefined();
    expect(custom!.name).toBe("My Custom");
    expect(custom!.isBuiltIn).toBe(false);
  });
});

describe("POST /api/templates", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    mockDbState = {
      lifter: null,
      assistanceTemplates: [],
    };
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/api/templates", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("creates a custom template", async () => {
    mockDbState.lifter = { id: "test-lifter-id" };

    const res = await app.request(
      "/api/templates",
      {
        method: "POST",
        body: JSON.stringify({
          name: "My Template",
          exercises: [
            { name: "Pull-ups", sets: 3, reps: 10, weight: null, notes: null },
            { name: "Dips", sets: 3, reps: 8, weight: 20, notes: "Add weight" },
          ],
        }),
        headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
      },
    );
    expect(res.status).toBe(201);
    const json = await res.json() as Record<string, unknown>;
    expect(json.success).toBe(true);
    const data = json.data as Record<string, unknown>;
    expect(data.name).toBe("My Template");
    expect(data.isBuiltIn).toBe(false);
  });

  it("returns 400 for missing name", async () => {
    mockDbState.lifter = { id: "test-lifter-id" };

    const res = await app.request(
      "/api/templates",
      {
        method: "POST",
        body: JSON.stringify({ exercises: [] }),
        headers: { "Content-Type": "application/json", Cookie: "session_token=test" },
      },
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/templates/:id", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    mockDbState = {
      lifter: null,
      assistanceTemplates: [],
    };
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/api/templates/some-id", { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("deletes a custom template owned by the lifter", async () => {
    mockDbState.assistanceTemplates = [
      { id: "ct1", lifterId: "test-lifter-id", name: "My Template", exercises: "[]", createdAt: Date.now() },
    ];

    const res = await app.request(
      "/api/templates/ct1",
      { method: "DELETE", headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.success).toBe(true);
  });

  it("returns 404 for non-existent template", async () => {
    mockDbState.assistanceTemplates = [];

    const res = await app.request(
      "/api/templates/nonexistent",
      { method: "DELETE", headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(404);
  });

  it("does not allow deleting built-in templates", async () => {
    mockDbState.assistanceTemplates = [];

    const res = await app.request(
      "/api/templates/bbb",
      { method: "DELETE", headers: { Cookie: "session_token=test" } },
    );
    expect(res.status).toBe(400);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("Cannot delete built-in template");
  });
});

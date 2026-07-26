import { eq, and } from "drizzle-orm";
import { Hono } from "hono";
import { createDbClient, assistanceTemplate } from "@fivethreeone/db";
import { successResponse, errorResponse } from "@fivethreeone/shared";
import { authMiddleware, getAuth } from "../middleware/auth.js";

interface AssistanceExerciseInput {
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  notes: string | null;
}

const BUILT_IN_TEMPLATES = [
  {
    id: "bbb",
    name: "Boring But Big (BBB)",
    description: "5×10 at 50% of training max",
    isBuiltIn: true,
    exercises: [
      { name: "Main Lift Variation", sets: 5, reps: 10, weight: null, notes: "Use 50% of training max" },
    ],
  },
  {
    id: "fsl",
    name: "First Set Last (FSL)",
    description: "5×5 at first set weight",
    isBuiltIn: true,
    exercises: [
      { name: "Main Lift Variation", sets: 5, reps: 5, weight: null, notes: "Use first set weight from working sets" },
    ],
  },
];

const BUILT_IN_IDS = new Set(BUILT_IN_TEMPLATES.map((t) => t.id));

const templateRoutes = new Hono<{ Bindings: Env }>();

templateRoutes.get("/templates", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);

  const customTemplates = await db
    .select()
    .from(assistanceTemplate)
    .where(eq(assistanceTemplate.lifterId, auth.lifterId));

  const custom = customTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    isBuiltIn: false,
    exercises: JSON.parse(t.exercises) as AssistanceExerciseInput[],
    createdAt: t.createdAt,
  }));

  return c.json(successResponse([...BUILT_IN_TEMPLATES, ...custom]));
});

templateRoutes.post("/templates", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);

  const body = await c.req.json<{
    name: string;
    exercises: AssistanceExerciseInput[];
  }>();

  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return c.json(errorResponse("Template name is required"), 400);
  }

  if (!Array.isArray(body.exercises) || body.exercises.length === 0) {
    return c.json(errorResponse("At least one exercise is required"), 400);
  }

  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(assistanceTemplate).values({
    id,
    lifterId: auth.lifterId,
    name: body.name.trim(),
    exercises: JSON.stringify(body.exercises),
    createdAt: now,
  });

  return c.json(
    successResponse({
      id,
      name: body.name.trim(),
      isBuiltIn: false,
      exercises: body.exercises,
      createdAt: now,
    }),
    201,
  );
});

templateRoutes.delete("/templates/:id", authMiddleware, async (c) => {
  const auth = getAuth(c);
  const db = createDbClient(c.env);
  const id = c.req.param("id") ?? "";

  if (BUILT_IN_IDS.has(id)) {
    return c.json(errorResponse("Cannot delete built-in template"), 400);
  }

  const existing = await db
    .select()
    .from(assistanceTemplate)
    .where(and(eq(assistanceTemplate.id, id), eq(assistanceTemplate.lifterId, auth.lifterId)))
    .get();

  if (!existing) {
    return c.json(errorResponse("Template not found"), 404);
  }

  await db.delete(assistanceTemplate).where(eq(assistanceTemplate.id, id));

  return c.json(successResponse({ deleted: true }));
});

export default templateRoutes;

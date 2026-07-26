import { Hono } from "hono";
import { successResponse, MainLift } from "@fivethreeone/shared";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/", (c) => {
  return c.json(successResponse({ name: "Cloudflare" }));
});

app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("/api/lifts", (c) => {
  return c.json(successResponse(Object.values(MainLift)));
});

export default app;

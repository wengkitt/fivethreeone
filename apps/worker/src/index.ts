import { Hono } from "hono";
import { successResponse, MainLift } from "@fivethreeone/shared";
import authRoutes from "./routes/auth.js";
import lifterRoutes from "./routes/lifter.js";

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

app.route("/api/auth", authRoutes);
app.route("/api/lifter", lifterRoutes);

export default app;

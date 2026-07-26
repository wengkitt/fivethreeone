import { Hono } from "hono";
import { successResponse } from "@fivethreeone/shared";
import authRoutes from "./routes/auth.js";
import lifterRoutes from "./routes/lifter.js";
import dashboardRoutes from "./routes/dashboard.js";
import workoutRoutes from "./routes/workout.js";
import templateRoutes from "./routes/templates.js";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/", (c) => {
  return c.json(successResponse({ name: "Cloudflare" }));
});

app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

app.route("/api", dashboardRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/lifter", lifterRoutes);
app.route("/api", workoutRoutes);
app.route("/api", templateRoutes);

export default app;

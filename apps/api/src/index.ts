import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

const app = new Elysia()
  .use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }))
  .get("/health", () => ({ status: "ok" }))
  .listen(process.env.PORT || 3000);

console.log(`API running at http://localhost:${app.server?.port}`);

export type App = typeof app;

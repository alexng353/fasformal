import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authModule } from "./modules/auth";
import { settingsModule } from "./modules/settings";
import { adminModule } from "./modules/admin";
import { formModule } from "./modules/form";
import { reviewerModule } from "./modules/reviewer";

const app = new Elysia()
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      credentials: true,
    })
  )
  .get("/health", () => ({ status: "ok" }))
  .use(authModule)
  .use(settingsModule)
  .use(adminModule)
  .use(formModule)
  .use(reviewerModule)
  .listen(process.env.PORT || 3000);

console.log(`API running at http://localhost:${app.server?.port}`);

export type App = typeof app;

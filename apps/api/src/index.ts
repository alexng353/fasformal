import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { authModule } from "./modules/auth";
import { settingsModule } from "./modules/settings";
import { adminModule } from "./modules/admin";
import { formModule } from "./modules/form";
import { reviewerModule } from "./modules/reviewer";
import { db } from "./db";
import { years } from "./db/schema";
import { eq } from "drizzle-orm";

const app = new Elysia()
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      credentials: true,
    })
  )
  .get("/health", () => ({ status: "ok" }))
  .get(
    "/years/:slug",
    async ({ params, status }) => {
      const year = await db.query.years.findFirst({
        where: eq(years.formSlug, params.slug),
      });
      if (!year) return status(404, "Event not found");
      return {
        year: year.year,
        eventName: year.eventName,
        isActive: year.isActive,
        submissionDeadline: year.submissionDeadline?.toISOString() ?? null,
      };
    },
    { params: t.Object({ slug: t.String() }) }
  )
  .use(authModule)
  .use(settingsModule)
  .use(adminModule)
  .use(formModule)
  .use(reviewerModule)
  .listen(process.env.PORT || 3000);

console.log(`API running at http://localhost:${app.server?.port}`);

export type App = typeof app;

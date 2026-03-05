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
import path from "path";
import { existsSync } from "fs";

const webDistDir = path.resolve(import.meta.dir, "../../web/dist");
const hasWebDist = existsSync(webDistDir);

const app = new Elysia()
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      credentials: true,
    })
  )
  .group("/api", (app) =>
    app
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
  );

if (hasWebDist) {
  app.get("/*", ({ params }) => {
    const reqPath = (params as Record<string, string>)["*"] ?? "";
    const filePath = path.resolve(webDistDir, reqPath);

    if (
      reqPath &&
      filePath.startsWith(webDistDir + "/") &&
      existsSync(filePath) &&
      !filePath.endsWith("/")
    ) {
      const file = Bun.file(filePath);
      return new Response(file, {
        headers: { "Content-Type": file.type },
      });
    }

    return new Response(Bun.file(path.join(webDistDir, "index.html")), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  });
}

app.listen(process.env.PORT || 8888);

console.log(`API running at http://localhost:${app.server?.port}`);

export type App = typeof app;

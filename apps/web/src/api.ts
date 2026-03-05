import { treaty } from "@elysiajs/eden";
import type { App } from "../../api/src/index";

const client = treaty<App>(
  typeof window !== "undefined" ? window.location.origin : "http://localhost:8888",
  { fetch: { credentials: "include" } },
);

export const api = client.api;

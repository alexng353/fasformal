import { treaty } from "@elysiajs/eden";
import type { App } from "../../api/src/index";

export const api = treaty<App>("localhost:3000", {
  fetch: { credentials: "include" },
});

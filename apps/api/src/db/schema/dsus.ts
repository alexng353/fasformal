import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { years } from "./years";

export const dsus = pgTable(
  "dsus",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    yearId: uuid("year_id")
      .notNull()
      .references(() => years.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("dsus_year_name").on(t.yearId, t.name)]
);

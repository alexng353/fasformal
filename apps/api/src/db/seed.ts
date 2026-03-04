import { db } from "./index";
import { users, years, dsus } from "./schema";

async function seed() {
  console.log("Seeding database...");

  // Create default admin
  const passwordHash = await Bun.password.hash("admin123");
  const [admin] = await db
    .insert(users)
    .values({
      email: "admin@fasformal.com",
      passwordHash,
      role: "admin",
      name: "Default Admin",
    })
    .onConflictDoNothing()
    .returning();

  if (admin) {
    console.log(`Created admin: ${admin.email}`);
  }

  // Create sample year
  const [year] = await db
    .insert(years)
    .values({
      year: 2026,
      eventName: "FAS Formal 2026",
      ticketPrice: "85.00",
      conditionalPricingEnabled: true,
      studentPrice: "75.00",
      nonStudentPrice: "85.00",
      alumniPrice: "80.00",
      paymentEmail: "payments@fasformal.com",
      paymentDescriptionTemplate: "FAS Formal 2026 - {confirmation_number}",
      paymentDeadlineHours: 48,
      refundDeadline: new Date("2026-03-01T00:00:00Z"),
      tosText:
        "By purchasing a ticket, you agree to the terms and conditions of the FAS Formal event.",
      waiverLink: "https://example.com/waiver",
      waiverSubmissionEmail: "waivers@fasformal.com",
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  if (year) {
    console.log(`Created year: ${year.year}`);

    // Create sample DSUs
    const dsuNames = [
      "Computing Science",
      "Mathematics",
      "Statistics",
      "Physics",
      "Chemistry",
      "Biology",
    ];

    for (const name of dsuNames) {
      await db
        .insert(dsus)
        .values({ yearId: year.id, name })
        .onConflictDoNothing();
    }
    console.log(`Created ${dsuNames.length} DSUs`);
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});

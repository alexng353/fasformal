import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/reviewer/")({
  component: ReviewerDashboard,
});

function ReviewerDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Reviewer Dashboard</h1>
      <p className="mt-2 text-gray-600">
        View and verify attendee submissions for your assigned DSUs.
      </p>
    </div>
  );
}

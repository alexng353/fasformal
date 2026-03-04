import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/submissions")({
  component: SubmissionsPage,
});

function SubmissionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">All Submissions</h1>
      <p className="mt-2 text-gray-600">
        View and manage all attendee registrations.
      </p>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/invites")({
  component: InvitesPage,
});

function InvitesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Invite Links</h1>
      <p className="mt-2 text-gray-600">
        Create and manage invite links for staff.
      </p>
    </div>
  );
}

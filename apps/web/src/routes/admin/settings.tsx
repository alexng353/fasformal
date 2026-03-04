import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Event Settings</h1>
      <p className="mt-2 text-gray-600">Configure the current year's event.</p>
    </div>
  );
}

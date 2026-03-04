import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/attendee")({
  component: AttendeeLayout,
});

function AttendeeLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            <span className="text-xl font-bold text-gray-900">
              FAS Formal Registration
            </span>
          </div>
        </div>
      </nav>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

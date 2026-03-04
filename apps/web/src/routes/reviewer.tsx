import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { api } from "@/api";

export const Route = createFileRoute("/reviewer")({
  component: ReviewerLayout,
});

function ReviewerLayout() {
  const navigate = useNavigate();

  async function handleLogout() {
    await api.auth.admin.logout.post();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <span className="text-xl font-bold text-gray-900">
              FAS Formal Reviewer
            </span>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}

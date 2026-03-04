import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { api } from "@/api";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
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
            <div className="flex items-center gap-8">
              <span className="text-xl font-bold text-gray-900">
                FAS Formal Admin
              </span>
              <div className="flex gap-4">
                <Link
                  to="/admin"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium [&.active]:text-blue-600"
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/settings"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium [&.active]:text-blue-600"
                >
                  Settings
                </Link>
                <Link
                  to="/admin/submissions"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium [&.active]:text-blue-600"
                >
                  Submissions
                </Link>
                <Link
                  to="/admin/users"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium [&.active]:text-blue-600"
                >
                  Users
                </Link>
                <Link
                  to="/admin/invites"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium [&.active]:text-blue-600"
                >
                  Invites
                </Link>
              </div>
            </div>
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

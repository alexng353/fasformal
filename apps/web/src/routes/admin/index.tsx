import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: years } = useQuery({
    queryKey: ["years"],
    queryFn: async () => {
      const { data } = await api.settings.years.get();
      return data ?? [];
    },
  });

  const activeYear = years?.find((y: any) => y.isActive);

  const { data: submissions } = useQuery({
    queryKey: ["admin-submissions"],
    queryFn: async () => {
      const { data } = await api.admin.submissions.get({ query: {} });
      return data ?? [];
    },
  });

  const stats = submissions
    ? {
        total: submissions.length,
        pending: submissions.filter((s: any) => s.status === "pending").length,
        verified: submissions.filter((s: any) => s.status === "verified").length,
        paid: submissions.filter((s: any) => s.status === "paid").length,
        admitted: submissions.filter((s: any) => s.status === "admitted").length,
        completed: submissions.filter((s: any) => s.formCompleted).length,
      }
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Admin Dashboard
      </h1>

      {activeYear && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-600 font-medium">Active Event</p>
          <p className="text-lg font-bold text-blue-900">
            {(activeYear as any).eventName} ({(activeYear as any).year})
          </p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Total" value={stats.total} color="gray" />
          <StatCard label="Pending" value={stats.pending} color="gray" />
          <StatCard label="Verified" value={stats.verified} color="blue" />
          <StatCard label="Paid" value={stats.paid} color="green" />
          <StatCard label="Admitted" value={stats.admitted} color="emerald" />
          <StatCard
            label="Form Complete"
            value={stats.completed}
            color="purple"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/admin/submissions"
          className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition"
        >
          <h3 className="font-semibold text-gray-900">Submissions</h3>
          <p className="text-sm text-gray-500 mt-1">
            View and manage all attendee registrations
          </p>
        </Link>
        <Link
          to="/admin/settings"
          className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition"
        >
          <h3 className="font-semibold text-gray-900">Event Settings</h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure years, pricing, and event details
          </p>
        </Link>
        <Link
          to="/admin/users"
          className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition"
        >
          <h3 className="font-semibold text-gray-900">Staff Users</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage admin and reviewer accounts
          </p>
        </Link>
        <Link
          to="/admin/invites"
          className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition"
        >
          <h3 className="font-semibold text-gray-900">Invite Links</h3>
          <p className="text-sm text-gray-500 mt-1">
            Create invite links for new staff members
          </p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const bgColors: Record<string, string> = {
    gray: "bg-gray-50",
    blue: "bg-blue-50",
    green: "bg-green-50",
    emerald: "bg-emerald-50",
    purple: "bg-purple-50",
  };

  return (
    <div
      className={`${bgColors[color] || "bg-gray-50"} rounded-lg p-4 text-center`}
    >
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

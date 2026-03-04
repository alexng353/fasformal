import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import { useState } from "react";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  reviewer: "bg-blue-100 text-blue-700",
};

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function UsersPage() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await api.admin.users.get();
      return data ?? [];
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      await api.admin.users({ id }).delete();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeletingId(null);
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage admin and reviewer accounts.
          {users && (
            <span className="ml-2 text-gray-400">({users.length} total)</span>
          )}
        </p>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading users...</p>
      ) : !users || users.length === 0 ? (
        <p className="text-gray-500">No users found.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left bg-gray-50">
                <th className="py-3 px-4 font-medium text-gray-500">Name</th>
                <th className="py-3 px-4 font-medium text-gray-500">Email</th>
                <th className="py-3 px-4 font-medium text-gray-500">Role</th>
                <th className="py-3 px-4 font-medium text-gray-500">
                  Created
                </th>
                <th className="py-3 px-4 font-medium text-gray-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {u.name}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{u.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[u.role] || ""}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {deletingId === u.id ? (
                      <div className="inline-flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          Are you sure?
                        </span>
                        <button
                          onClick={() => deleteUser.mutate(u.id)}
                          disabled={deleteUser.isPending}
                          className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                        >
                          {deleteUser.isPending ? "Deleting..." : "Yes, delete"}
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(u.id)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteUser.isError && (
        <p className="mt-4 text-sm text-red-600">
          Failed to delete user. You cannot delete yourself.
        </p>
      )}
    </div>
  );
}

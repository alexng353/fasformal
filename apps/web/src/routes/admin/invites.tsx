import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import { useState } from "react";

export const Route = createFileRoute("/admin/invites")({
  component: InvitesPage,
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
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isExpired(date: string | Date): boolean {
  return new Date(date) < new Date();
}

function InvitesPage() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: inviteLinks, isLoading } = useQuery({
    queryKey: ["admin-invite-links"],
    queryFn: async () => {
      const { data } = await api.admin["invite-links"].get();
      return data ?? [];
    },
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      await api.admin["invite-links"]({ id }).delete();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invite-links"] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invite Links</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create and manage invite links for staff.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
        >
          {showCreateForm ? "Cancel" : "Create Invite"}
        </button>
      </div>

      {showCreateForm && (
        <CreateInviteForm
          onCreated={() => {
            setShowCreateForm(false);
            queryClient.invalidateQueries({
              queryKey: ["admin-invite-links"],
            });
          }}
        />
      )}

      {isLoading ? (
        <p className="text-gray-500">Loading invite links...</p>
      ) : !inviteLinks || inviteLinks.length === 0 ? (
        <p className="text-gray-500">No invite links found.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left bg-gray-50">
                <th className="py-3 px-4 font-medium text-gray-500">Role</th>
                <th className="py-3 px-4 font-medium text-gray-500">
                  Invite URL
                </th>
                <th className="py-3 px-4 font-medium text-gray-500">Uses</th>
                <th className="py-3 px-4 font-medium text-gray-500">
                  Expires
                </th>
                <th className="py-3 px-4 font-medium text-gray-500">
                  Created
                </th>
                <th className="py-3 px-4 font-medium text-gray-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {inviteLinks.map((link: any) => {
                const expired = isExpired(link.expiresAt);
                const exhausted = link.currentUses >= link.maxUses;
                const inviteUrl = `${window.location.origin}/invite/${link.token}`;

                return (
                  <tr
                    key={link.id}
                    className={`border-b border-gray-100 ${expired || exhausted ? "opacity-50" : ""}`}
                  >
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[link.role] || ""}`}
                      >
                        {link.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded max-w-xs truncate block">
                          {inviteUrl}
                        </code>
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(inviteUrl)
                          }
                          className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap"
                          title="Copy to clipboard"
                        >
                          Copy
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {link.currentUses}/{link.maxUses}
                      {exhausted && (
                        <span className="ml-1 text-xs text-red-500">
                          (exhausted)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {formatDate(link.expiresAt)}
                      {expired && (
                        <span className="ml-1 text-red-500">(expired)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {formatDate(link.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteLink.mutate(link.id)}
                        disabled={deleteLink.isPending}
                        className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteLink.isError && (
        <p className="mt-4 text-sm text-red-600">
          Failed to delete invite link. Please try again.
        </p>
      )}
    </div>
  );
}

function CreateInviteForm({ onCreated }: { onCreated: () => void }) {
  const [role, setRole] = useState<"admin" | "reviewer">("reviewer");
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInHours, setExpiresInHours] = useState(72);

  const createInvite = useMutation({
    mutationFn: async () => {
      await api.admin["invite-links"].post({
        role,
        maxUses,
        expiresInHours,
      });
    },
    onSuccess: () => {
      onCreated();
    },
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Create Invite Link
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="admin">Admin</option>
            <option value="reviewer">Reviewer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Uses
          </label>
          <input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expires In (hours)
          </label>
          <input
            type="number"
            min={1}
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
      {createInvite.isError && (
        <p className="mt-3 text-sm text-red-600">
          Failed to create invite link. Please try again.
        </p>
      )}
      <div className="mt-4">
        <button
          onClick={() => createInvite.mutate()}
          disabled={createInvite.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {createInvite.isPending ? "Creating..." : "Create Link"}
        </button>
      </div>
    </div>
  );
}

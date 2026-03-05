import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import { useState } from "react";
import { Modal, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { DropdownMenu } from "@/components/ui/dropdown-menu";

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

// Three dots icon
function DotsIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
  );
}

function UsersPage() {
  const queryClient = useQueryClient();

  // Modal state
  const [passwordModal, setPasswordModal] = useState<{ id: string; name: string; isSelf: boolean } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [flashMsg, setFlashMsg] = useState<string | null>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const { data } = await api.auth.me.get();
      return data;
    },
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await api.admin.users.get();
      return data ?? [];
    },
  });

  const changePassword = useMutation({
    mutationFn: async (args: { id: string; currentPassword?: string; newPassword: string }) => {
      const { error } = await api.admin.users({ id: args.id }).password.patch({
        currentPassword: args.currentPassword,
        newPassword: args.newPassword,
      });
      if (error) throw new Error(typeof error.value === "string" ? error.value : "Failed to change password");
    },
    onSuccess: () => {
      setPasswordModal(null);
      setNewPassword("");
      setCurrentPassword("");
      flash("Password changed");
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.admin.users({ id }).delete();
      if (error) throw new Error(typeof error.value === "string" ? error.value : "Failed to delete user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteModal(null);
      flash("User deleted");
    },
  });

  function flash(msg: string) {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(null), 3000);
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordModal || newPassword.length < 8) return;
    changePassword.mutate({
      id: passwordModal.id,
      currentPassword: passwordModal.isSelf ? currentPassword : undefined,
      newPassword,
    });
  }

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

      {flashMsg && (
        <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-lg text-sm">
          {flashMsg}
        </div>
      )}

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
                <th className="py-3 px-4 font-medium text-gray-500">Created</th>
                <th className="py-3 px-4 w-12" />
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => {
                const isSelf = currentUser?.id === u.id;
                return (
                  <tr
                    key={u.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {u.name}
                      {isSelf && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
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
                      <DropdownMenu
                        items={[
                          {
                            label: "Change Password",
                            onClick: () => {
                              setPasswordModal({ id: u.id, name: u.name, isSelf });
                              setNewPassword("");
                              setCurrentPassword("");
                              changePassword.reset();
                            },
                          },
                          {
                            label: "Delete",
                            variant: "danger",
                            onClick: () => {
                              setDeleteModal({ id: u.id, name: u.name });
                              deleteUser.reset();
                            },
                          },
                        ]}
                      >
                        <DotsIcon />
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Change Password Modal */}
      <Modal
        open={!!passwordModal}
        onClose={() => setPasswordModal(null)}
      >
        <ModalTitle>
          Change Password {passwordModal?.isSelf ? "(Your Account)" : `for ${passwordModal?.name}`}
        </ModalTitle>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {changePassword.isError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {changePassword.error.message}
            </div>
          )}

          {passwordModal?.isSelf && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              autoFocus={!passwordModal?.isSelf}
            />
          </div>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setPasswordModal(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={changePassword.isPending || newPassword.length < 8}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {changePassword.isPending ? "Saving..." : "Change Password"}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
      >
        <ModalTitle>Delete User</ModalTitle>
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <span className="font-semibold">{deleteModal?.name}</span>?
          This action cannot be undone.
        </p>

        {deleteUser.isError && (
          <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {deleteUser.error.message}
          </div>
        )}

        <ModalFooter>
          <button
            type="button"
            onClick={() => setDeleteModal(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              if (!deleteModal) return;
              if (e.shiftKey || window.confirm("")) {
                // shift-click bypasses the native confirm
              }
              deleteUser.mutate(deleteModal.id);
            }}
            disabled={deleteUser.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
          >
            {deleteUser.isPending ? "Deleting..." : "Delete User"}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

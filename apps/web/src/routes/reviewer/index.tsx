import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import { useState } from "react";

export const Route = createFileRoute("/reviewer/")({
  component: ReviewerDashboard,
});

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  verified: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  banned: "bg-red-100 text-red-700",
  waitlisted: "bg-yellow-100 text-yellow-700",
  admitted: "bg-emerald-100 text-emerald-700",
};

function ReviewerDashboard() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["reviewer-submissions", statusFilter],
    queryFn: async () => {
      const { data } = await api.reviewer.submissions.get({
        query: { status: statusFilter || undefined },
      });
      return data ?? [];
    },
  });

  const selectedSubmission = submissions?.find(
    (s: any) => s.id === selectedId
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Reviewer Dashboard
        </h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="paid">Paid</option>
          <option value="banned">Banned</option>
          <option value="waitlisted">Waitlisted</option>
          <option value="admitted">Admitted</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading submissions...</p>
      ) : !submissions || submissions.length === 0 ? (
        <p className="text-gray-500">No submissions found.</p>
      ) : (
        <div className="flex gap-6">
          {/* Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-3 px-4 font-medium text-gray-500">
                    Conf #
                  </th>
                  <th className="py-3 px-4 font-medium text-gray-500">Name</th>
                  <th className="py-3 px-4 font-medium text-gray-500">
                    Email
                  </th>
                  <th className="py-3 px-4 font-medium text-gray-500">
                    Status
                  </th>
                  <th className="py-3 px-4 font-medium text-gray-500">Step</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s: any) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedId === s.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-xs">
                      {s.confirmationNumber || "—"}
                    </td>
                    <td className="py-3 px-4">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{s.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[s.status] || ""}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {s.formCompleted ? "Complete" : `${s.currentStep}/11`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail panel */}
          {selectedSubmission && (
            <SubmissionDetail
              submission={selectedSubmission}
              onClose={() => setSelectedId(null)}
              onUpdate={() =>
                queryClient.invalidateQueries({
                  queryKey: ["reviewer-submissions"],
                })
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

function SubmissionDetail({
  submission,
  onClose,
  onUpdate,
}: {
  submission: any;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [status, setStatus] = useState(submission.status);
  const [reviewNote, setReviewNote] = useState(submission.reviewNote || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.reviewer.submissions({ id: submission.id }).patch({
        status,
        reviewNote: reviewNote || null,
      });
      onUpdate();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-96 bg-white border border-gray-200 rounded-lg p-6 space-y-4 sticky top-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          {submission.firstName} {submission.lastName}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          &times;
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium text-gray-500">Confirmation:</span>{" "}
          <span className="font-mono">
            {submission.confirmationNumber || "—"}
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-500">Email:</span>{" "}
          {submission.email}
        </div>
        <div>
          <span className="font-medium text-gray-500">DSU Type:</span>{" "}
          {submission.dsuType || "—"}
        </div>
        <div>
          <span className="font-medium text-gray-500">Student Status:</span>{" "}
          {submission.studentStatus || "—"}
        </div>
        <div>
          <span className="font-medium text-gray-500">DOB:</span>{" "}
          {submission.dateOfBirth || "—"}
        </div>
        <div>
          <span className="font-medium text-gray-500">Dietary:</span>{" "}
          {submission.dietaryRestrictions || "None"}
        </div>
        <div>
          <span className="font-medium text-gray-500">Emergency:</span>{" "}
          {submission.emergencyContactName || "—"} (
          {submission.emergencyContactPhone || "—"})
        </div>
        <div>
          <span className="font-medium text-gray-500">TOS:</span>{" "}
          {submission.tosAccepted ? "Accepted" : "Not accepted"}
        </div>
        <div>
          <span className="font-medium text-gray-500">Waiver:</span>{" "}
          {submission.waiverCompleted ? "Completed" : "Not completed"}
        </div>
        <div>
          <span className="font-medium text-gray-500">Payment agreed:</span>{" "}
          {submission.paymentAgreed ? "Yes" : "No"}
        </div>
        <div>
          <span className="font-medium text-gray-500">Price:</span>{" "}
          {submission.pricePaid ? `$${submission.pricePaid} CAD` : "—"}
        </div>
        <div>
          <span className="font-medium text-gray-500">Form:</span>{" "}
          {submission.formCompleted
            ? "Complete"
            : `Step ${submission.currentStep}/11`}
        </div>
      </div>

      <hr className="border-gray-200" />

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="paid">Paid</option>
            <option value="banned">Banned</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="admitted">Admitted</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Review Note
          </label>
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Optional note..."
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? "Saving..." : "Update Status"}
        </button>
      </div>
    </div>
  );
}

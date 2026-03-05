import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import { useState } from "react";
import { TOTAL_FORM_STEPS } from "@fasformal/shared";

export const Route = createFileRoute("/admin/submissions")({
  component: SubmissionsPage,
});

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  verified: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  banned: "bg-red-100 text-red-700",
  waitlisted: "bg-yellow-100 text-yellow-700",
  admitted: "bg-emerald-100 text-emerald-700",
};

const statusOptions = [
  "pending",
  "verified",
  "paid",
  "banned",
  "waitlisted",
  "admitted",
] as const;

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

function SubmissionsPage() {
  const queryClient = useQueryClient();
  type AttendeeStatus = "pending" | "verified" | "paid" | "banned" | "waitlisted" | "admitted";
  const [statusFilter, setStatusFilter] = useState<AttendeeStatus | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["admin-submissions", statusFilter],
    queryFn: async () => {
      const { data } = await api.admin.submissions.get({
        query: {
          status: statusFilter || undefined,
        },
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Submissions</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and manage all attendee registrations.
            {submissions && (
              <span className="ml-2 text-gray-400">
                ({submissions.length} total)
              </span>
            )}
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AttendeeStatus | "")}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading submissions...</p>
      ) : !submissions || submissions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No submissions found.</p>
          {statusFilter && (
            <button
              onClick={() => setStatusFilter("")}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Clear filter
            </button>
          )}
        </div>
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
                    DSU Type
                  </th>
                  <th className="py-3 px-4 font-medium text-gray-500">
                    Status
                  </th>
                  <th className="py-3 px-4 font-medium text-gray-500">Step</th>
                  <th className="py-3 px-4 font-medium text-gray-500">Date</th>
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
                      {s.firstName && s.lastName
                        ? `${s.firstName} ${s.lastName}`
                        : s.firstName || s.lastName || "—"}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{s.email}</td>
                    <td className="py-3 px-4">
                      {s.dsuType ? (
                        <span className="capitalize">{s.dsuType}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[s.status] || ""}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {s.formCompleted
                        ? "Complete"
                        : `${s.currentStep}/${TOTAL_FORM_STEPS}`}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(s.createdAt)}
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
                  queryKey: ["admin-submissions"],
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

  const updateStatus = useMutation({
    mutationFn: async () => {
      await api.admin.submissions({ id: submission.id }).status.patch({
        status,
        reviewNote: reviewNote || null,
      });
    },
    onSuccess: () => {
      onUpdate();
    },
  });

  return (
    <div className="w-96 shrink-0 bg-white border border-gray-200 rounded-lg p-6 space-y-4 sticky top-8 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          {submission.firstName} {submission.lastName}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          &times;
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <DetailRow label="Confirmation" mono>
          {submission.confirmationNumber || "—"}
        </DetailRow>
        <DetailRow label="Email">{submission.email}</DetailRow>
        <DetailRow label="Email Verified">
          {submission.emailVerified ? "Yes" : "No"}
        </DetailRow>
        <DetailRow label="DSU Type">
          <span className="capitalize">{submission.dsuType || "—"}</span>
        </DetailRow>
        <DetailRow label="Specified DSU">
          {submission.specifiedDsu || "—"}
        </DetailRow>
        <DetailRow label="Date of Birth">
          {submission.dateOfBirth || "—"}
        </DetailRow>
        <DetailRow label="Student Status">
          <span className="capitalize">
            {submission.studentStatus?.replace("_", " ") || "—"}
          </span>
        </DetailRow>
        <DetailRow label="Dietary">
          {submission.dietaryRestrictions || "None"}
        </DetailRow>
        <DetailRow label="Emergency Contact">
          {submission.emergencyContactName || "—"} (
          {submission.emergencyContactPhone || "—"})
        </DetailRow>

        {submission.dsuType === "partner" && (
          <>
            <DetailRow label="Partner Student">
              {submission.partnerStudentFullName || "—"}
            </DetailRow>
            <DetailRow label="Partner Email">
              {submission.partnerStudentEmail || "—"}
            </DetailRow>
          </>
        )}

        <DetailRow label="TOS">
          {submission.tosAccepted ? (
            <span>
              Accepted{" "}
              <span className="text-gray-400">
                {formatDate(submission.tosAcceptedAt)}
              </span>
            </span>
          ) : (
            "Not accepted"
          )}
        </DetailRow>
        <DetailRow label="Waiver">
          {submission.waiverCompleted ? "Completed" : "Not completed"}
        </DetailRow>
        <DetailRow label="Refund Awareness">
          {submission.refundAwarenessConfirmed ? "Confirmed" : "Not confirmed"}
        </DetailRow>
        <DetailRow label="Refund Date Answer">
          {submission.refundDateAnswer || "—"}
        </DetailRow>
        <DetailRow label="Payment Agreed">
          {submission.paymentAgreed ? (
            <span>
              Yes{" "}
              <span className="text-gray-400">
                {formatDate(submission.paymentAgreedAt)}
              </span>
            </span>
          ) : (
            "No"
          )}
        </DetailRow>
        <DetailRow label="Price Paid">
          {submission.pricePaid ? `$${submission.pricePaid} CAD` : "—"}
        </DetailRow>
        <DetailRow label="Form Progress">
          {submission.formCompleted
            ? "Complete"
            : `Step ${submission.currentStep}/${TOTAL_FORM_STEPS}`}
        </DetailRow>
        <DetailRow label="Created">{formatDate(submission.createdAt)}</DetailRow>
        <DetailRow label="Updated">{formatDate(submission.updatedAt)}</DetailRow>
        {submission.reviewNote && (
          <DetailRow label="Review Note">{submission.reviewNote}</DetailRow>
        )}
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
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
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
        {updateStatus.isError && (
          <p className="text-sm text-red-600">
            Failed to update status. Please try again.
          </p>
        )}
        <button
          onClick={() => updateStatus.mutate()}
          disabled={updateStatus.isPending}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {updateStatus.isPending ? "Saving..." : "Update Status"}
        </button>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="font-medium text-gray-500">{label}:</span>{" "}
      <span className={mono ? "font-mono text-xs" : ""}>{children}</span>
    </div>
  );
}

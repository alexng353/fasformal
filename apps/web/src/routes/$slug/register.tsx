import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/api";

export const Route = createFileRoute("/$slug/register")({
  component: SlugRegisterPage,
});

function SlugRegisterPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [yearInfo, setYearInfo] = useState<{
    year: number;
    eventName: string;
    isActive: boolean;
    submissionDeadline: string | null;
  } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingYear, setLoadingYear] = useState(true);

  useEffect(() => {
    async function loadYear() {
      try {
        const { data, error } = await api.years({ slug }).get();
        if (error || !data) {
          setNotFound(true);
        } else {
          setYearInfo(data as typeof yearInfo);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoadingYear(false);
      }
    }
    loadYear();
  }, [slug]);

  if (loadingYear) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900">Event Not Found</h1>
          <p className="mt-2 text-gray-600">
            No event found for "{slug}".
          </p>
        </div>
      </div>
    );
  }

  if (!yearInfo?.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {yearInfo?.eventName ?? "Event"}
          </h1>
          <p className="mt-2 text-gray-600">
            Registration is not currently open for this event.
          </p>
        </div>
      </div>
    );
  }

  const isClosed =
    yearInfo.submissionDeadline && new Date() > new Date(yearInfo.submissionDeadline);

  if (isClosed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {yearInfo.eventName}
          </h1>
          <p className="mt-2 text-gray-600">
            Registration is closed for this event.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: apiError } = await api.auth.attendee["request-code"].post({
        email,
      });
      if (apiError) {
        setError(
          typeof apiError.value === "string" ? apiError.value : "Failed to send code"
        );
        return;
      }
      navigate({ to: "/verify", search: { email } });
    } catch {
      setError("Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Register for {yearInfo.eventName}
          </h1>
          <p className="mt-2 text-gray-600">
            Enter your email to receive a verification code
          </p>
          {yearInfo.submissionDeadline && (
            <p className="mt-1 text-xs text-gray-400">
              Registration closes{" "}
              {new Date(yearInfo.submissionDeadline).toLocaleDateString("en-CA", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? "Sending code..." : "Send Verification Code"}
          </button>
        </form>
      </div>
    </div>
  );
}

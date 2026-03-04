import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/attendee/form")({
  validateSearch: (search: Record<string, unknown>) => ({
    step: Number(search.step) || 1,
  }),
  component: FormPage,
});

function FormPage() {
  const { step } = Route.useSearch();

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Registration</h1>
          <span className="text-sm text-gray-500">Step {step} of 11</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${(step / 11) * 100}%` }}
          />
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Step {step} content will go here.</p>
      </div>
    </div>
  );
}

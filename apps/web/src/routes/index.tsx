import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">FAS Formal</h1>
          <p className="mt-2 text-gray-600">
            SFU Faculty of Applied Sciences Formal Event
          </p>
        </div>
        <div className="space-y-4">
          <Link
            to="/register"
            className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition"
          >
            Register as Attendee
          </Link>
          <Link
            to="/login"
            className="block w-full text-center bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition"
          >
            Admin / Reviewer Login
          </Link>
        </div>
      </div>
    </div>
  );
}

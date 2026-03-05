import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/attendee/form")({
  validateSearch: (search: Record<string, unknown>) => ({
    step: Number(search.step) || 3,
  }),
  component: FormPage,
});

// ---------------------------------------------------------------------------
// Types inferred from the API response
// ---------------------------------------------------------------------------

type FormState = Awaited<
  ReturnType<typeof api.form.state.get>
>["data"];

type Attendee = NonNullable<FormState>["attendee"];
type YearConfig = NonNullable<FormState>["year"];
type Dsu = NonNullable<FormState>["dsus"][number];

// ---------------------------------------------------------------------------
// Shared UI pieces
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<number, string> = {
  3: "DSU Selection",
  4: "Personal Info",
  5: "Partner Info",
  6: "Terms of Service",
  7: "SFSS Waiver",
  8: "Refund Awareness",
  9: "Refund Date",
  10: "Payment Info",
  11: "Payment Agreement",
};

const VISIBLE_STEPS = [3, 4, 5, 6, 7, 8, 9, 10, 11];

function Stepper({
  currentStep,
  maxStep,
  skipPartner,
}: {
  currentStep: number;
  maxStep: number;
  skipPartner: boolean;
}) {
  const steps = skipPartner
    ? VISIBLE_STEPS.filter((s) => s !== 5)
    : VISIBLE_STEPS;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Registration</h1>
        <span className="text-sm text-gray-500">
          Step {steps.indexOf(currentStep) + 1} of {steps.length}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${((steps.indexOf(currentStep) + 1) / steps.length) * 100}%`,
          }}
        />
      </div>
      <div className="hidden sm:flex items-center gap-1 overflow-x-auto pb-2">
        {steps.map((s) => {
          const accessible = s <= maxStep;
          const active = s === currentStep;
          return (
            <div
              key={s}
              className={cn(
                "flex items-center gap-1 text-xs whitespace-nowrap px-2 py-1 rounded-full",
                active && "bg-blue-600 text-white font-medium",
                !active && accessible && "bg-blue-100 text-blue-700",
                !active && !accessible && "bg-gray-100 text-gray-400",
              )}
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-[10px] font-bold">
                {s}
              </span>
              {STEP_LABELS[s]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm mb-4">
      {message}
    </div>
  );
}

function TerminationMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-300 text-red-800 p-6 rounded-lg text-center">
      <p className="font-semibold text-lg mb-2">Registration Cannot Continue</p>
      <p>{message}</p>
    </div>
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition",
        props.className,
      )}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition",
        props.className,
      )}
    />
  );
}

function SubmitButton({
  loading,
  disabled,
  children,
}: {
  loading: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full sm:w-auto bg-blue-600 text-white py-2.5 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
    >
      {loading ? "Saving..." : children ?? "Continue"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Price calculation helper (mirrors server logic)
// ---------------------------------------------------------------------------

function calculatePrice(
  year: NonNullable<YearConfig>,
  attendee: Attendee,
): string {
  if (year.conditionalPricingEnabled) {
    if (attendee.dsuType === "alumni") {
      return year.alumniPrice || year.ticketPrice;
    }
    if (attendee.studentStatus === "not_student") {
      return year.nonStudentPrice || year.ticketPrice;
    }
    return year.studentPrice || year.ticketPrice;
  }
  return year.ticketPrice;
}

// ---------------------------------------------------------------------------
// Hook: step mutation
// ---------------------------------------------------------------------------

function useStepMutation(stepNumber: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.form.step({ stepNumber: String(stepNumber) }).patch(
        body as never,
      );
      if (res.error) {
        throw new Error(
          typeof res.error.value === "string"
            ? res.error.value
            : "Failed to save",
        );
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-state"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Step Components
// ---------------------------------------------------------------------------

function Step3({
  attendee,
  dsus,
  onSuccess,
}: {
  attendee: Attendee;
  dsus: Dsu[];
  onSuccess: () => void;
}) {
  const [dsuType, setDsuType] = useState<string>(attendee.dsuType ?? "dsu");
  const [dsuId, setDsuId] = useState<string>(attendee.dsuId ?? "");
  const [specifiedDsu, setSpecifiedDsu] = useState<string>(
    attendee.specifiedDsu ?? "",
  );
  const [error, setError] = useState("");

  const mutation = useStepMutation(3);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (dsuType === "dsu" && !dsuId) {
      setError("Please select a DSU.");
      return;
    }
    if ((dsuType === "alumni" || dsuType === "partner") && !specifiedDsu.trim()) {
      setError("Please specify your DSU / organization.");
      return;
    }

    mutation.mutate(
      {
        dsuType,
        dsuId: dsuType === "dsu" ? dsuId : null,
        specifiedDsu: dsuType !== "dsu" ? specifiedDsu.trim() : null,
      },
      { onSuccess },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">DSU Selection</h2>
      <p className="text-sm text-gray-600">
        Select how you are attending the event.
      </p>

      {error && <ErrorBanner message={error} />}
      {mutation.isError && <ErrorBanner message={mutation.error.message} />}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700 mb-2">
          Attendee Type
        </legend>
        {(
          [
            { value: "dsu", label: "DSU Member" },
            { value: "alumni", label: "Alumni" },
            { value: "partner", label: "Partner of a Student" },
          ] as const
        ).map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition",
              dsuType === opt.value
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300",
            )}
          >
            <input
              type="radio"
              name="dsuType"
              value={opt.value}
              checked={dsuType === opt.value}
              onChange={() => setDsuType(opt.value)}
              className="accent-blue-600"
            />
            <span className="text-sm font-medium text-gray-800">
              {opt.label}
            </span>
          </label>
        ))}
      </fieldset>

      {dsuType === "dsu" && (
        <div>
          <Label htmlFor="dsuId">Select Your DSU</Label>
          <select
            id="dsuId"
            value={dsuId}
            onChange={(e) => setDsuId(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          >
            <option value="">-- Select a DSU --</option>
            {dsus.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {(dsuType === "alumni" || dsuType === "partner") && (
        <div>
          <Label htmlFor="specifiedDsu">
            {dsuType === "alumni"
              ? "Which DSU were you a part of?"
              : "Your organization or affiliation"}
          </Label>
          <Input
            id="specifiedDsu"
            value={specifiedDsu}
            onChange={(e) => setSpecifiedDsu(e.target.value)}
            placeholder={
              dsuType === "alumni"
                ? "e.g. Computing Science Student Society"
                : "e.g. Partner of a CSSS member"
            }
          />
        </div>
      )}

      <SubmitButton loading={mutation.isPending} />
    </form>
  );
}

// ---- Step 4 ---------------------------------------------------------------

function Step4({
  attendee,
  onSuccess,
}: {
  attendee: Attendee;
  onSuccess: () => void;
}) {
  const [firstName, setFirstName] = useState(attendee.firstName ?? "");
  const [lastName, setLastName] = useState(attendee.lastName ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(attendee.dateOfBirth ?? "");
  const [dietaryRestrictions, setDietaryRestrictions] = useState(
    attendee.dietaryRestrictions ?? "",
  );
  const [studentStatus, setStudentStatus] = useState(
    attendee.studentStatus ?? "full_time",
  );
  const [emergencyContactName, setEmergencyContactName] = useState(
    attendee.emergencyContactName ?? "",
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    attendee.emergencyContactPhone ?? "",
  );
  const [error, setError] = useState("");

  const mutation = useStepMutation(4);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }
    if (!dateOfBirth) {
      setError("Date of birth is required.");
      return;
    }
    if (!studentStatus) {
      setError("Please select your student status.");
      return;
    }
    if (!emergencyContactName.trim() || !emergencyContactPhone.trim()) {
      setError("Emergency contact information is required.");
      return;
    }

    mutation.mutate(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        dietaryRestrictions: dietaryRestrictions.trim() || null,
        studentStatus,
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
      },
      { onSuccess },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">
        Personal Information
      </h2>

      {error && <ErrorBanner message={error} />}
      {mutation.isError && <ErrorBanner message={mutation.error.message} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="dateOfBirth">Date of Birth</Label>
        <Input
          id="dateOfBirth"
          type="date"
          required
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="dietaryRestrictions">
          Dietary Restrictions (optional)
        </Label>
        <TextArea
          id="dietaryRestrictions"
          rows={3}
          value={dietaryRestrictions}
          onChange={(e) => setDietaryRestrictions(e.target.value)}
          placeholder="e.g. vegetarian, nut allergy, gluten-free"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700 mb-2">
          Student Status
        </legend>
        {(
          [
            { value: "full_time", label: "Full-Time Student" },
            { value: "part_time", label: "Part-Time Student" },
            { value: "not_student", label: "Not a Student" },
          ] as const
        ).map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition",
              studentStatus === opt.value
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300",
            )}
          >
            <input
              type="radio"
              name="studentStatus"
              value={opt.value}
              checked={studentStatus === opt.value}
              onChange={() => setStudentStatus(opt.value)}
              className="accent-blue-600"
            />
            <span className="text-sm font-medium text-gray-800">
              {opt.label}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
          <Input
            id="emergencyContactName"
            required
            value={emergencyContactName}
            onChange={(e) => setEmergencyContactName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
          <Input
            id="emergencyContactPhone"
            type="tel"
            required
            value={emergencyContactPhone}
            onChange={(e) => setEmergencyContactPhone(e.target.value)}
            placeholder="e.g. 604-555-1234"
          />
        </div>
      </div>

      <SubmitButton loading={mutation.isPending} />
    </form>
  );
}

// ---- Step 5 ---------------------------------------------------------------

function Step5({
  attendee,
  onSuccess,
}: {
  attendee: Attendee;
  onSuccess: () => void;
}) {
  const [partnerStudentEmail, setPartnerStudentEmail] = useState(
    attendee.partnerStudentEmail ?? "",
  );
  const [partnerStudentFullName, setPartnerStudentFullName] = useState(
    attendee.partnerStudentFullName ?? "",
  );
  const [error, setError] = useState("");

  const mutation = useStepMutation(5);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!partnerStudentEmail.trim()) {
      setError("Partner's student email is required.");
      return;
    }
    if (!partnerStudentFullName.trim()) {
      setError("Partner's full name is required.");
      return;
    }

    mutation.mutate(
      {
        partnerStudentEmail: partnerStudentEmail.trim(),
        partnerStudentFullName: partnerStudentFullName.trim(),
      },
      { onSuccess },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">
        Partner Information
      </h2>
      <p className="text-sm text-gray-600">
        Since you are attending as a partner of a student, please provide the
        student's information.
      </p>

      {error && <ErrorBanner message={error} />}
      {mutation.isError && <ErrorBanner message={mutation.error.message} />}

      <div>
        <Label htmlFor="partnerStudentEmail">Partner's Student Email</Label>
        <Input
          id="partnerStudentEmail"
          type="email"
          required
          value={partnerStudentEmail}
          onChange={(e) => setPartnerStudentEmail(e.target.value)}
          placeholder="partner@sfu.ca"
        />
      </div>

      <div>
        <Label htmlFor="partnerStudentFullName">Partner's Full Name</Label>
        <Input
          id="partnerStudentFullName"
          required
          value={partnerStudentFullName}
          onChange={(e) => setPartnerStudentFullName(e.target.value)}
        />
      </div>

      <SubmitButton loading={mutation.isPending} />
    </form>
  );
}

// ---- Step 6 ---------------------------------------------------------------

function Step6({
  year,
  onSuccess,
}: {
  year: NonNullable<YearConfig>;
  onSuccess: () => void;
}) {
  const [accepted, setAccepted] = useState(false);
  const [showTermination, setShowTermination] = useState(false);

  const mutation = useStepMutation(6);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      setShowTermination(true);
      return;
    }
    setShowTermination(false);
    mutation.mutate({ tosAccepted: true }, { onSuccess });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">
        Terms of Service
      </h2>

      {mutation.isError && <ErrorBanner message={mutation.error.message} />}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto">
        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
          {year.tosText}
        </pre>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => {
            setAccepted(e.target.checked);
            if (e.target.checked) setShowTermination(false);
          }}
          className="mt-0.5 accent-blue-600 w-4 h-4"
        />
        <span className="text-sm text-gray-800">
          I accept the Terms of Service
        </span>
      </label>

      {showTermination && (
        <TerminationMessage message="You must accept the Terms of Service to continue." />
      )}

      <SubmitButton loading={mutation.isPending} disabled={!accepted} />
    </form>
  );
}

// ---- Step 7 ---------------------------------------------------------------

function Step7({
  year,
  onSuccess,
}: {
  year: NonNullable<YearConfig>;
  onSuccess: () => void;
}) {
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  const mutation = useStepMutation(7);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!completed) {
      setError("You must complete and submit the waiver before continuing.");
      return;
    }
    mutation.mutate({ waiverCompleted: true }, { onSuccess });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">SFSS Waiver</h2>

      {error && <ErrorBanner message={error} />}
      {mutation.isError && <ErrorBanner message={mutation.error.message} />}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <p className="text-sm text-gray-700">
          You need to fill out the SFSS waiver form and submit it to the waiver
          submission email address.
        </p>
        <div className="space-y-2">
          <p className="text-sm">
            <span className="font-medium text-gray-700">Waiver form: </span>
            <a
              href={year.waiverLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800 break-all"
            >
              {year.waiverLink}
            </a>
          </p>
          <p className="text-sm">
            <span className="font-medium text-gray-700">
              Submit completed waiver to:{" "}
            </span>
            <a
              href={`mailto:${year.waiverSubmissionEmail}`}
              className="text-blue-600 underline hover:text-blue-800"
            >
              {year.waiverSubmissionEmail}
            </a>
          </p>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={completed}
          onChange={(e) => setCompleted(e.target.checked)}
          className="mt-0.5 accent-blue-600 w-4 h-4"
        />
        <span className="text-sm text-gray-800">
          I have completed and submitted the waiver
        </span>
      </label>

      <SubmitButton loading={mutation.isPending} disabled={!completed} />
    </form>
  );
}

// ---- Step 8 ---------------------------------------------------------------

function Step8({
  year,
  onSuccess,
}: {
  year: NonNullable<YearConfig>;
  onSuccess: () => void;
}) {
  const [aware, setAware] = useState<"yes" | "no" | "">("");
  const [showTermination, setShowTermination] = useState(false);

  const mutation = useStepMutation(8);

  const refundDate = year.refundDeadline
    ? new Date(year.refundDeadline).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "TBD";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (aware === "no") {
      setShowTermination(true);
      return;
    }
    if (aware !== "yes") return;
    setShowTermination(false);
    mutation.mutate({ refundAwarenessConfirmed: true }, { onSuccess });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Refund Awareness</h2>

      {mutation.isError && <ErrorBanner message={mutation.error.message} />}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-gray-800">
          Are you aware that the refund deadline is{" "}
          <span className="font-semibold">{refundDate}</span>? After this date,
          no refunds will be issued.
        </p>
      </div>

      <fieldset className="space-y-3">
        {(
          [
            { value: "yes", label: "Yes, I am aware" },
            { value: "no", label: "No" },
          ] as const
        ).map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition",
              aware === opt.value
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300",
            )}
          >
            <input
              type="radio"
              name="refundAware"
              value={opt.value}
              checked={aware === opt.value}
              onChange={() => {
                setAware(opt.value);
                if (opt.value === "yes") setShowTermination(false);
              }}
              className="accent-blue-600"
            />
            <span className="text-sm font-medium text-gray-800">
              {opt.label}
            </span>
          </label>
        ))}
      </fieldset>

      {showTermination && (
        <TerminationMessage message="You must acknowledge the refund deadline to continue with registration." />
      )}

      <SubmitButton loading={mutation.isPending} disabled={aware !== "yes"} />
    </form>
  );
}

// ---- Step 9 ---------------------------------------------------------------

function Step9({
  year,
  onSuccess,
}: {
  year: NonNullable<YearConfig>;
  onSuccess: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const mutation = useStepMutation(9);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!answer) {
      setError("Please enter the refund deadline date.");
      return;
    }

    // Validate that the answer matches the actual refund deadline
    if (year.refundDeadline) {
      const actual = new Date(year.refundDeadline);
      const provided = new Date(answer);

      // Compare year-month-day only
      const actualDate = `${actual.getFullYear()}-${String(actual.getMonth() + 1).padStart(2, "0")}-${String(actual.getDate()).padStart(2, "0")}`;
      const providedDate = `${provided.getFullYear()}-${String(provided.getMonth() + 1).padStart(2, "0")}-${String(provided.getDate()).padStart(2, "0")}`;

      if (actualDate !== providedDate) {
        setError(
          "The date you entered does not match the refund deadline. Please check the previous step.",
        );
        return;
      }
    }

    mutation.mutate({ refundDateAnswer: answer }, { onSuccess });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">
        Refund Deadline Confirmation
      </h2>

      {error && <ErrorBanner message={error} />}
      {mutation.isError && <ErrorBanner message={mutation.error.message} />}

      <p className="text-sm text-gray-600">
        To confirm your understanding, please enter the refund deadline date.
      </p>

      <div>
        <Label htmlFor="refundDate">Refund Deadline Date</Label>
        <Input
          id="refundDate"
          type="date"
          required
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
      </div>

      <SubmitButton loading={mutation.isPending} />
    </form>
  );
}

// ---- Step 10 --------------------------------------------------------------

function Step10({
  attendee,
  year,
  onSuccess,
}: {
  attendee: Attendee;
  year: NonNullable<YearConfig>;
  onSuccess: () => void;
}) {
  const mutation = useStepMutation(10);

  const price = calculatePrice(year, attendee);
  const confirmationNumber = attendee.confirmationNumber ?? "N/A";

  // Substitute placeholders into the payment description template
  const fullName = [attendee.firstName, attendee.lastName].filter(Boolean).join(" ") || "N/A";
  const paymentDescription = year.paymentDescriptionTemplate
    .replace(/\{confirmationNumber\}/gi, confirmationNumber)
    .replace(/\{confirmation_number\}/gi, confirmationNumber)
    .replace(/\{name\}/gi, fullName);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({}, { onSuccess });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">
        Payment Information
      </h2>

      {mutation.isError && <ErrorBanner message={mutation.error.message} />}

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600 mb-1">Your Confirmation Number</p>
        <p className="text-2xl font-bold text-green-700 tracking-wider">
          {confirmationNumber}
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">
              Amount Due
            </span>
            <span className="text-lg font-bold text-gray-900">
              ${price} CAD
            </span>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <p className="text-sm font-medium text-gray-600 mb-1">
              Send e-Transfer to
            </p>
            <p className="text-sm text-gray-900 font-mono">
              {year.paymentEmail}
            </p>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <p className="text-sm font-medium text-gray-600 mb-1">
              e-Transfer Description / Message
            </p>
            <p className="text-sm text-gray-900 bg-white border border-gray-200 rounded p-2 font-mono">
              {paymentDescription}
            </p>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <p className="text-sm font-medium text-gray-600 mb-1">
              Payment Deadline
            </p>
            <p className="text-sm text-gray-900">
              Within {year.paymentDeadlineHours} hours of completing this form
            </p>
          </div>
        </div>
      </div>

      <SubmitButton loading={mutation.isPending} />
    </form>
  );
}

// ---- Step 11 --------------------------------------------------------------

function Step11({
  attendee,
  year,
  onSuccess,
}: {
  attendee: Attendee;
  year: NonNullable<YearConfig>;
  onSuccess: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  const mutation = useStepMutation(11);

  const price = calculatePrice(year, attendee);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!agreed) {
      setError("You must agree to the payment terms to complete registration.");
      return;
    }
    mutation.mutate({ paymentAgreed: true }, { onSuccess });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">
        Payment Agreement
      </h2>

      {error && <ErrorBanner message={error} />}
      {mutation.isError && <ErrorBanner message={mutation.error.message} />}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          By checking the box below, you agree to send the e-transfer payment as
          described in the previous step.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 accent-blue-600 w-4 h-4"
        />
        <span className="text-sm text-gray-800">
          I agree that I will send the e-transfer of{" "}
          <span className="font-semibold">${price} CAD</span> to{" "}
          <span className="font-semibold">{year.paymentEmail}</span> within{" "}
          <span className="font-semibold">{year.paymentDeadlineHours} hours</span>.
        </span>
      </label>

      <SubmitButton
        loading={mutation.isPending}
        disabled={!agreed}
      >
        Complete Registration
      </SubmitButton>
    </form>
  );
}

// ---- Completion Screen ----------------------------------------------------

function CompletionScreen({ attendee }: { attendee: Attendee }) {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Registration Complete
        </h2>
        <p className="mt-2 text-gray-600">
          Thank you for registering! Your form has been submitted successfully.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6 inline-block">
        <p className="text-sm text-gray-600 mb-1">Your Confirmation Number</p>
        <p className="text-3xl font-bold text-green-700 tracking-wider">
          {attendee.confirmationNumber ?? "N/A"}
        </p>
      </div>

      <p className="text-sm text-gray-500 max-w-md mx-auto">
        Please save your confirmation number. You will need it for your
        e-transfer payment description and for check-in at the event.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

function FormPage() {
  const { step } = Route.useSearch();
  const navigate = useNavigate();

  const {
    data: formState,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["form-state"],
    queryFn: async () => {
      const res = await api.form.state.get();
      if (res.error) {
        throw new Error(
          typeof res.error.value === "string"
            ? res.error.value
            : "Failed to load form",
        );
      }
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your registration...</p>
        </div>
      </div>
    );
  }

  if (isError || !formState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8">
          <ErrorBanner
            message={error?.message ?? "Failed to load registration form."}
          />
        </div>
      </div>
    );
  }

  const { attendee, year: yearOrNull, dsus } = formState;

  if (!yearOrNull) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8">
          <ErrorBanner message="Event configuration not found." />
        </div>
      </div>
    );
  }

  const year = yearOrNull;

  // If form is completed, show the completion screen
  if (attendee.formCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-lg w-full p-8">
          <CompletionScreen attendee={attendee} />
        </div>
      </div>
    );
  }

  // Clamp the visible step to what the attendee has unlocked.
  // Steps 1 and 2 (name/email and OTP) are handled by separate routes.
  const effectiveStep = Math.max(3, Math.min(step, attendee.currentStep));

  // If the URL step doesn't match the effective step, redirect
  if (step !== effectiveStep) {
    navigate({
      to: "/attendee/form",
      search: { step: effectiveStep },
      replace: true,
    });
  }

  // Skip partner step if not a partner
  const skipPartner = attendee.dsuType !== "partner";

  // Determine the next step after submission
  function goToNextStep(fromStep: number) {
    let next = fromStep + 1;
    // Skip partner step if not partner
    if (next === 5 && attendee.dsuType !== "partner") {
      next = 6;
    }
    if (next > 11) {
      // Reload to show completion
      navigate({ to: "/attendee/form", search: { step: 11 } });
      return;
    }
    navigate({ to: "/attendee/form", search: { step: next } });
  }

  function renderStep() {
    switch (effectiveStep) {
      case 3:
        return (
          <Step3
            attendee={attendee}
            dsus={dsus}
            onSuccess={() => goToNextStep(3)}
          />
        );
      case 4:
        return (
          <Step4 attendee={attendee} onSuccess={() => goToNextStep(4)} />
        );
      case 5:
        return (
          <Step5 attendee={attendee} onSuccess={() => goToNextStep(5)} />
        );
      case 6:
        return <Step6 year={year} onSuccess={() => goToNextStep(6)} />;
      case 7:
        return <Step7 year={year} onSuccess={() => goToNextStep(7)} />;
      case 8:
        return <Step8 year={year} onSuccess={() => goToNextStep(8)} />;
      case 9:
        return <Step9 year={year} onSuccess={() => goToNextStep(9)} />;
      case 10:
        return (
          <Step10
            attendee={attendee}
            year={year}
            onSuccess={() => goToNextStep(10)}
          />
        );
      case 11:
        return (
          <Step11
            attendee={attendee}
            year={year}
            onSuccess={() => {
              // After step 11, the query will re-fetch and show completion screen
              navigate({
                to: "/attendee/form",
                search: { step: 11 },
              });
            }}
          />
        );
      default:
        return (
          <p className="text-gray-600">
            This step is not available. Please start from step 3.
          </p>
        );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Stepper
          currentStep={effectiveStep}
          maxStep={attendee.currentStep}
          skipPartner={skipPartner}
        />

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
          {renderStep()}
        </div>

        {/* Back button for steps after 3 */}
        {effectiveStep > 3 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                let prev = effectiveStep - 1;
                if (prev === 5 && skipPartner) {
                  prev = 4;
                }
                navigate({
                  to: "/attendee/form",
                  search: { step: Math.max(3, prev) },
                });
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              &larr; Back to previous step
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

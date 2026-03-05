import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Year {
  id: string;
  year: number;
  eventName: string;
  ticketPrice: string;
  conditionalPricingEnabled: boolean;
  studentPrice: string | null;
  nonStudentPrice: string | null;
  alumniPrice: string | null;
  paymentEmail: string;
  paymentDescriptionTemplate: string;
  paymentDeadlineHours: number;
  refundDeadline: string | null;
  submissionDeadline: string | null;
  formSlug: string | null;
  tosText: string;
  waiverLink: string;
  waiverSubmissionEmail: string;
  emailDomainRestriction: string | null;
  isActive: boolean;
}

interface Dsu {
  id: string;
  yearId: string;
  name: string;
}

type Tab =
  | "general"
  | "registration"
  | "pricing"
  | "payment"
  | "refund"
  | "tos"
  | "restrictions"
  | "dsus";

const TABS: { key: Tab; label: string }[] = [
  { key: "general", label: "General" },
  { key: "registration", label: "Registration" },
  { key: "pricing", label: "Pricing" },
  { key: "payment", label: "Payment" },
  { key: "refund", label: "Refund" },
  { key: "tos", label: "TOS & Waiver" },
  { key: "restrictions", label: "Restrictions" },
  { key: "dsus", label: "DSU Management" },
];

// ---------------------------------------------------------------------------
// Shared input / label classes
// ---------------------------------------------------------------------------

const inputClass =
  "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";
const labelClass = "block text-sm font-medium text-gray-700";
const btnPrimary =
  "bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm font-medium";
const btnDanger =
  "bg-red-600 text-white py-1.5 px-3 rounded-lg hover:bg-red-700 disabled:opacity-50 transition text-sm";
const btnSecondary =
  "bg-white text-gray-700 border border-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition text-sm font-medium";

// ---------------------------------------------------------------------------
// Default form state for "Add Year"
// ---------------------------------------------------------------------------

function defaultFormState(): Year {
  return {
    id: "",
    year: new Date().getFullYear(),
    eventName: "",
    ticketPrice: "0.00",
    conditionalPricingEnabled: false,
    studentPrice: null,
    nonStudentPrice: null,
    alumniPrice: null,
    paymentEmail: "",
    paymentDescriptionTemplate: "",
    paymentDeadlineHours: 48,
    refundDeadline: null,
    submissionDeadline: null,
    formSlug: null,
    tosText: "",
    waiverLink: "",
    waiverSubmissionEmail: "",
    emailDomainRestriction: null,
    isActive: false,
  };
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

function SettingsPage() {
  const queryClient = useQueryClient();

  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [form, setForm] = useState<Year>(defaultFormState());
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // ---- Queries ----

  const yearsQuery = useQuery({
    queryKey: ["settings", "years"],
    queryFn: async () => {
      const { data, error } = await api.settings.years.get();
      if (error) throw error;
      return data as Year[];
    },
  });

  const years = yearsQuery.data ?? [];

  // When years load for the first time, auto-select the active one
  useEffect(() => {
    if (years.length > 0 && !selectedYearId && !isAdding) {
      const active = years.find((y) => y.isActive);
      const first = years[0];
      setSelectedYearId(active?.id ?? first?.id ?? null);
    }
  }, [years, selectedYearId, isAdding]);

  // Sync form when selecting a year
  useEffect(() => {
    if (selectedYearId) {
      const y = years.find((yr) => yr.id === selectedYearId);
      if (y) setForm({ ...y });
    }
  }, [selectedYearId, years]);

  // ---- Mutations ----

  const createYearMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const { data: result, error } = await api.settings.years.post({
        year: data.year,
        eventName: data.eventName,
        ticketPrice: data.ticketPrice,
        conditionalPricingEnabled: data.conditionalPricingEnabled,
        studentPrice: data.studentPrice,
        nonStudentPrice: data.nonStudentPrice,
        alumniPrice: data.alumniPrice,
        paymentEmail: data.paymentEmail,
        paymentDescriptionTemplate: data.paymentDescriptionTemplate,
        paymentDeadlineHours: data.paymentDeadlineHours,
        refundDeadline: data.refundDeadline,
        submissionDeadline: data.submissionDeadline,
        formSlug: data.formSlug,
        tosText: data.tosText,
        waiverLink: data.waiverLink,
        waiverSubmissionEmail: data.waiverSubmissionEmail,
        emailDomainRestriction: data.emailDomainRestriction,
      });
      if (error) throw error;
      return result as Year;
    },
    onSuccess: (newYear) => {
      queryClient.invalidateQueries({ queryKey: ["settings", "years"] });
      setIsAdding(false);
      setSelectedYearId(newYear.id);
      flash("Year created");
    },
  });

  const updateYearMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const { data: result, error } = await api.settings.years({ id: data.id }).patch({
        eventName: data.eventName,
        ticketPrice: data.ticketPrice,
        conditionalPricingEnabled: data.conditionalPricingEnabled,
        studentPrice: data.studentPrice,
        nonStudentPrice: data.nonStudentPrice,
        alumniPrice: data.alumniPrice,
        paymentEmail: data.paymentEmail,
        paymentDescriptionTemplate: data.paymentDescriptionTemplate,
        paymentDeadlineHours: data.paymentDeadlineHours,
        refundDeadline: data.refundDeadline,
        submissionDeadline: data.submissionDeadline,
        formSlug: data.formSlug,
        tosText: data.tosText,
        waiverLink: data.waiverLink,
        waiverSubmissionEmail: data.waiverSubmissionEmail,
        emailDomainRestriction: data.emailDomainRestriction,
      });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "years"] });
      flash("Settings saved");
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.settings.years({ id }).activate.post();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "years"] });
      flash("Year activated");
    },
  });

  // ---- Helpers ----

  function flash(msg: string) {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(null), 3000);
  }

  function handleSelectYear(id: string) {
    setIsAdding(false);
    setSelectedYearId(id);
    setActiveTab("general");
  }

  function handleAddYear() {
    setIsAdding(true);
    setSelectedYearId(null);
    setForm(defaultFormState());
    setActiveTab("general");
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (isAdding) {
      createYearMutation.mutate(form);
    } else {
      updateYearMutation.mutate(form);
    }
  }

  const isSaving = createYearMutation.isPending || updateYearMutation.isPending;
  const saveError = createYearMutation.error || updateYearMutation.error;

  // ---- Render ----

  if (yearsQuery.isLoading) {
    return (
      <div className="text-gray-500 py-12 text-center">Loading settings...</div>
    );
  }

  if (yearsQuery.isError) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Failed to load settings. Please try again.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Settings</h1>
          <p className="mt-1 text-gray-600">
            Configure event years and their settings.
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* ---- Year Sidebar ---- */}
        <div className="w-56 shrink-0">
          <button onClick={handleAddYear} className={cn(btnPrimary, "w-full mb-4")}>
            + Add Year
          </button>
          <div className="space-y-1">
            {years.map((y) => (
              <button
                key={y.id}
                onClick={() => handleSelectYear(y.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition",
                  selectedYearId === y.id && !isAdding
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <span>{y.year}</span>
                <span className="ml-2 text-gray-400">-</span>
                <span className="ml-2 text-xs text-gray-500 truncate">
                  {y.eventName}
                </span>
                {y.isActive && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Active
                  </span>
                )}
              </button>
            ))}
            {years.length === 0 && !isAdding && (
              <p className="text-sm text-gray-400 px-3">No years configured.</p>
            )}
          </div>
        </div>

        {/* ---- Form Panel ---- */}
        {(selectedYearId || isAdding) && (
          <div className="flex-1 min-w-0">
            {/* Header with Activate button */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {isAdding ? "New Year" : `${form.year} - ${form.eventName}`}
              </h2>
              {!isAdding && !form.isActive && (
                <button
                  onClick={() => activateMutation.mutate(form.id)}
                  disabled={activateMutation.isPending}
                  className={btnPrimary}
                >
                  {activateMutation.isPending ? "Activating..." : "Activate"}
                </button>
              )}
              {!isAdding && form.isActive && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  Currently Active
                </span>
              )}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <div className="flex gap-0 -mb-px">
                {TABS.map((tab) => {
                  // Hide DSU tab when creating a new year (no ID yet)
                  if (tab.key === "dsus" && isAdding) return null;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition",
                        activeTab === tab.key
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Flash message */}
            {saveMsg && (
              <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-lg text-sm">
                {saveMsg}
              </div>
            )}

            {/* Error */}
            {saveError && (
              <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {String(saveError)}
              </div>
            )}

            {/* Tab content */}
            {activeTab === "dsus" && !isAdding ? (
              <DsuManager yearId={form.id} />
            ) : (
              <form onSubmit={handleSave}>
                {activeTab === "general" && (
                  <GeneralTab form={form} setForm={setForm} isAdding={isAdding} />
                )}
                {activeTab === "registration" && (
                  <RegistrationTab form={form} setForm={setForm} />
                )}
                {activeTab === "pricing" && (
                  <PricingTab form={form} setForm={setForm} />
                )}
                {activeTab === "payment" && (
                  <PaymentTab form={form} setForm={setForm} />
                )}
                {activeTab === "refund" && (
                  <RefundTab form={form} setForm={setForm} />
                )}
                {activeTab === "tos" && (
                  <TosTab form={form} setForm={setForm} />
                )}
                {activeTab === "restrictions" && (
                  <RestrictionsTab form={form} setForm={setForm} />
                )}

                <div className="mt-6 flex gap-3">
                  <button type="submit" disabled={isSaving} className={btnPrimary}>
                    {isSaving
                      ? "Saving..."
                      : isAdding
                        ? "Create Year"
                        : "Save Changes"}
                  </button>
                  {isAdding && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        const first = years[0];
                        if (first) setSelectedYearId(first.id);
                      }}
                      className={btnSecondary}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* Empty state */}
        {!selectedYearId && !isAdding && (
          <div className="flex-1 flex items-center justify-center text-gray-400 py-24">
            Select a year or add a new one to get started.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab Components
// ---------------------------------------------------------------------------

interface TabProps {
  form: Year;
  setForm: React.Dispatch<React.SetStateAction<Year>>;
  isAdding?: boolean;
}

function GeneralTab({ form, setForm, isAdding }: TabProps) {
  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className={labelClass}>Year</label>
        <input
          type="number"
          required
          disabled={!isAdding}
          value={form.year}
          onChange={(e) =>
            setForm((f) => ({ ...f, year: parseInt(e.target.value) || 0 }))
          }
          className={cn(inputClass, !isAdding && "bg-gray-50 text-gray-500")}
        />
        {!isAdding && (
          <p className="mt-1 text-xs text-gray-400">
            Year cannot be changed after creation.
          </p>
        )}
      </div>
      <div>
        <label className={labelClass}>Event Name</label>
        <input
          type="text"
          required
          value={form.eventName}
          onChange={(e) =>
            setForm((f) => ({ ...f, eventName: e.target.value }))
          }
          placeholder="e.g. FAS Formal 2026"
          className={inputClass}
        />
      </div>
    </div>
  );
}

function RegistrationTab({ form, setForm }: TabProps) {
  const deadlineValue = form.submissionDeadline
    ? toLocalDatetimeString(form.submissionDeadline)
    : "";

  const canonicalUrl = form.formSlug
    ? `${window.location.origin}/${form.formSlug}/register`
    : null;

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className={labelClass}>Submission Deadline</label>
        <input
          type="datetime-local"
          value={deadlineValue}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              submissionDeadline: e.target.value
                ? new Date(e.target.value).toISOString()
                : null,
            }))
          }
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          After this date, new registrations will be blocked.
          Leave blank for no deadline.
        </p>
      </div>
      {form.submissionDeadline && (
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, submissionDeadline: null }))}
          className="text-sm text-red-600 hover:text-red-700"
        >
          Clear submission deadline
        </button>
      )}

      <div>
        <label className={labelClass}>Form Slug</label>
        <input
          type="text"
          value={form.formSlug ?? ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              formSlug: e.target.value || null,
            }))
          }
          placeholder="e.g. 2026"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          Creates a canonical registration link at{" "}
          <code className="bg-gray-100 px-1 rounded">/{form.formSlug || "<slug>"}/register</code>.
          Leave blank to disable.
        </p>
      </div>

      {canonicalUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800 font-medium mb-1">Registration Link</p>
          <code className="text-sm text-blue-700 break-all">{canonicalUrl}</code>
        </div>
      )}
    </div>
  );
}

function PricingTab({ form, setForm }: TabProps) {
  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className={labelClass}>Ticket Price ($)</label>
        <input
          type="text"
          required
          value={form.ticketPrice}
          onChange={(e) =>
            setForm((f) => ({ ...f, ticketPrice: e.target.value }))
          }
          placeholder="0.00"
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="conditionalPricing"
          checked={form.conditionalPricingEnabled}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              conditionalPricingEnabled: e.target.checked,
            }))
          }
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="conditionalPricing" className="text-sm text-gray-700">
          Enable conditional pricing (different prices by attendee type)
        </label>
      </div>

      {form.conditionalPricingEnabled && (
        <div className="space-y-4 pl-4 border-l-2 border-blue-100">
          <div>
            <label className={labelClass}>Student Price ($)</label>
            <input
              type="text"
              value={form.studentPrice ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  studentPrice: e.target.value || null,
                }))
              }
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Non-Student Price ($)</label>
            <input
              type="text"
              value={form.nonStudentPrice ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  nonStudentPrice: e.target.value || null,
                }))
              }
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Alumni Price ($)</label>
            <input
              type="text"
              value={form.alumniPrice ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  alumniPrice: e.target.value || null,
                }))
              }
              placeholder="0.00"
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentTab({ form, setForm }: TabProps) {
  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className={labelClass}>Payment Email</label>
        <input
          type="email"
          required
          value={form.paymentEmail}
          onChange={(e) =>
            setForm((f) => ({ ...f, paymentEmail: e.target.value }))
          }
          placeholder="treasurer@example.com"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          Email address where attendees send e-transfer payments.
        </p>
      </div>
      <div>
        <label className={labelClass}>Payment Description Template</label>
        <textarea
          required
          rows={3}
          value={form.paymentDescriptionTemplate}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              paymentDescriptionTemplate: e.target.value,
            }))
          }
          placeholder="e.g. FAS Formal 2026 - {confirmation_number}"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          Template shown to attendees as the e-transfer description/message.
          Placeholders: <code className="bg-gray-100 px-1 rounded">{"{confirmation_number}"}</code> (e.g.
          FF-2026-A3X7), <code className="bg-gray-100 px-1 rounded">{"{name}"}</code> (attendee's
          full name).
        </p>
      </div>
      <div>
        <label className={labelClass}>Payment Deadline (hours)</label>
        <input
          type="number"
          required
          min={1}
          value={form.paymentDeadlineHours}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              paymentDeadlineHours: parseInt(e.target.value) || 48,
            }))
          }
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          Hours after registration before payment is considered late.
        </p>
      </div>
    </div>
  );
}

function toLocalDatetimeString(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function RefundTab({ form, setForm }: TabProps) {
  const dateValue = form.refundDeadline
    ? toLocalDatetimeString(form.refundDeadline)
    : "";

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className={labelClass}>Refund Deadline</label>
        <input
          type="datetime-local"
          value={dateValue}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              refundDeadline: e.target.value
                ? new Date(e.target.value).toISOString()
                : null,
            }))
          }
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          After this date, refunds will no longer be available.
          Leave blank for no refund deadline.
        </p>
      </div>
      {form.refundDeadline && (
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, refundDeadline: null }))}
          className="text-sm text-red-600 hover:text-red-700"
        >
          Clear refund deadline
        </button>
      )}
    </div>
  );
}

function TosTab({ form, setForm }: TabProps) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <label className={labelClass}>Terms of Service Text</label>
        <textarea
          required
          rows={10}
          value={form.tosText}
          onChange={(e) =>
            setForm((f) => ({ ...f, tosText: e.target.value }))
          }
          placeholder="Enter the full terms of service text here..."
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Waiver Link</label>
        <input
          type="url"
          required
          value={form.waiverLink}
          onChange={(e) =>
            setForm((f) => ({ ...f, waiverLink: e.target.value }))
          }
          placeholder="https://..."
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          URL to the waiver document that attendees must sign.
        </p>
      </div>
      <div>
        <label className={labelClass}>Waiver Submission Email</label>
        <input
          type="email"
          required
          value={form.waiverSubmissionEmail}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              waiverSubmissionEmail: e.target.value,
            }))
          }
          placeholder="waivers@example.com"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          Email where signed waivers should be submitted.
        </p>
      </div>
    </div>
  );
}

function RestrictionsTab({ form, setForm }: TabProps) {
  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className={labelClass}>Email Domain Restriction</label>
        <input
          type="text"
          value={form.emailDomainRestriction ?? ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              emailDomainRestriction: e.target.value || null,
            }))
          }
          placeholder="e.g. ubc.ca"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          If set, only emails from this domain can register. Leave blank to
          allow any email domain.
        </p>
      </div>
      {form.emailDomainRestriction && (
        <button
          type="button"
          onClick={() =>
            setForm((f) => ({ ...f, emailDomainRestriction: null }))
          }
          className="text-sm text-red-600 hover:text-red-700"
        >
          Remove domain restriction
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DSU Manager (separate component with its own queries)
// ---------------------------------------------------------------------------

function DsuManager({ yearId }: { yearId: string }) {
  const queryClient = useQueryClient();
  const [newDsuName, setNewDsuName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const yearClient = api.settings.years({ id: yearId });

  const dsusQuery = useQuery({
    queryKey: ["settings", "years", yearId, "dsus"],
    queryFn: async () => {
      const { data, error } = await yearClient.dsus.get();
      if (error) throw error;
      return data as Dsu[];
    },
  });

  const addDsuMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await yearClient.dsus.post({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["settings", "years", yearId, "dsus"],
      });
      setNewDsuName("");
      setError(null);
    },
    onError: (err) => {
      setError(String(err));
    },
  });

  const deleteDsuMutation = useMutation({
    mutationFn: async (dsuId: string) => {
      const { error } = await yearClient.dsus({ dsuId }).delete();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["settings", "years", yearId, "dsus"],
      });
    },
    onError: (err) => {
      setError(String(err));
    },
  });

  function handleAddDsu(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newDsuName.trim();
    if (!trimmed) return;
    addDsuMutation.mutate(trimmed);
  }

  const dsusList = dsusQuery.data ?? [];

  return (
    <div className="max-w-lg">
      <p className="text-sm text-gray-600 mb-4">
        Departmental Student Unions associated with this event year.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Add DSU form */}
      <form onSubmit={handleAddDsu} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newDsuName}
          onChange={(e) => setNewDsuName(e.target.value)}
          placeholder="DSU name"
          className={cn(inputClass, "mt-0 flex-1")}
        />
        <button
          type="submit"
          disabled={addDsuMutation.isPending || !newDsuName.trim()}
          className={btnPrimary}
        >
          {addDsuMutation.isPending ? "Adding..." : "Add DSU"}
        </button>
      </form>

      {/* DSU list */}
      {dsusQuery.isLoading && (
        <p className="text-sm text-gray-400">Loading DSUs...</p>
      )}

      {dsusList.length === 0 && !dsusQuery.isLoading && (
        <p className="text-sm text-gray-400">No DSUs configured yet.</p>
      )}

      <div className="space-y-2">
        {dsusList.map((dsu) => (
          <div
            key={dsu.id}
            className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2.5"
          >
            <span className="text-sm text-gray-900">{dsu.name}</span>
            <button
              onClick={(e) => {
                if (
                  e.shiftKey ||
                  window.confirm(
                    `Remove DSU "${dsu.name}"? This may affect existing assignments.`
                  )
                ) {
                  deleteDsuMutation.mutate(dsu.id);
                }
              }}
              disabled={deleteDsuMutation.isPending}
              className={btnDanger}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

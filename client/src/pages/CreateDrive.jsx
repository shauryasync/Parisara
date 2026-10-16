import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Leaf,
  MapPin,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

const DRIVE_TYPES = [
  { label: "Cleanup", value: "cleanup" },
  { label: "Tree planting", value: "tree-planting" },
  { label: "Waste collection", value: "waste-collection" },
  { label: "Awareness", value: "awareness" },
  { label: "Restoration", value: "restoration" },
  { label: "Other", value: "other" },
];

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const toLocalDateTimeValue = (date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const parseLocalDateTime = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }
  return date;
};

const formatLocalDateTime = (value) => {
  const date = parseLocalDateTime(value);
  if (!date) return "Date and time to be set";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function CreateDrive() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    type: "cleanup",
    description: "",
    report: searchParams.get("report") || "",
    startsAt: "",
    endsAt: "",
    issueLocation: "",
    meetingPoint: "",
    maxParticipants: "",
    requiredMaterials: "",
    contactInformation: "",
    organizerNote: "",
    coOrganizers: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setError("");
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    if (!formData.title.trim() || !formData.description.trim() || !formData.meetingPoint.trim()) {
      setError("Drive title, description, and meeting point are required.");
      return;
    }

    const startsAt = parseLocalDateTime(formData.startsAt);
    const endsAt = parseLocalDateTime(formData.endsAt);
    if (!startsAt || startsAt <= new Date()) {
      setError("The start date and time must be in the future.");
      return;
    }
    if (!endsAt || endsAt <= startsAt) {
      setError("The end date and time must be after the start date and time.");
      return;
    }

    const report = formData.report.trim();
    if (report && !OBJECT_ID_PATTERN.test(report)) {
      setError("Enter a valid 24-character Report ID, or leave it blank for an independent Drive.");
      return;
    }

    const coOrganizers = formData.coOrganizers
      .split(/[,\n]/)
      .map((id) => id.trim())
      .filter(Boolean);
    if (coOrganizers.length > 2) {
      setError("You can add up to two co-organizers.");
      return;
    }
    if (coOrganizers.some((id) => !OBJECT_ID_PATTERN.test(id))) {
      setError("Each co-organizer must have a valid 24-character user ID.");
      return;
    }
    if (new Set(coOrganizers.map((id) => id.toLowerCase())).size !== coOrganizers.length) {
      setError("Co-organizer IDs must be unique.");
      return;
    }

    const maxParticipants = formData.maxParticipants ? Number(formData.maxParticipants) : undefined;
    if (
      maxParticipants !== undefined &&
      (!Number.isInteger(maxParticipants) || maxParticipants < 1)
    ) {
      setError("The participant limit must be a positive whole number.");
      return;
    }

    const payload = {
      title: formData.title.trim(),
      type: formData.type,
      description: formData.description.trim(),
      report: report || null,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      issueLocation: formData.issueLocation.trim(),
      meetingPoint: formData.meetingPoint.trim(),
      maxParticipants,
      requiredMaterials: formData.requiredMaterials
        .split(/[,\n]/)
        .map((material) => material.trim())
        .filter(Boolean),
      contactInformation: formData.contactInformation.trim(),
      organizerNote: formData.organizerNote.trim(),
      coOrganizers,
    };

    setLoading(true);
    try {
      const response = await api.post("/drives", payload);
      navigate(`/drives/${response.data.data._id}`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to create the Drive. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fieldClassName =
    "w-full rounded-xl border border-emerald-950/15 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-700/10";
  const labelClassName = "mb-2 block text-sm font-semibold text-stone-900";
  const earliestStart = new Date();
  earliestStart.setMinutes(earliestStart.getMinutes() + 1, 0, 0);
  const minStart = toLocalDateTimeValue(earliestStart);
  const selectedStart = parseLocalDateTime(formData.startsAt);
  const earliestEnd =
    selectedStart && selectedStart >= earliestStart
      ? new Date(selectedStart.getTime() + 60000)
      : earliestStart;
  const minEnd = toLocalDateTimeValue(earliestEnd);
  const materialsPreview = formData.requiredMaterials
    .split(/[,\n]/)
    .map((material) => material.trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-[#f4f6f0] text-stone-900">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-10">
        <header className="mb-8 max-w-3xl sm:mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-950">
            <Leaf size={14} aria-hidden="true" />
            Community action
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl">
            Start a community drive
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base sm:leading-7">
            Bring people together to take practical environmental action in your neighborhood. Share
            the plan, where to meet, and what participants should know.
          </p>
        </header>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <section className="rounded-3xl border border-emerald-950/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(27,82,64,0.04),0_2px_6px_rgba(0,0,0,0.02)] sm:p-7 lg:col-span-7">
            <form className="space-y-7" onSubmit={handleSubmit}>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClassName} htmlFor="title">
                    Drive title <span className="text-red-700">*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className={fieldClassName}
                    placeholder="e.g. Saturday cleanup at Mill Creek"
                    required
                    maxLength={120}
                  />
                </div>

                <div>
                  <label className={labelClassName} htmlFor="type">
                    Drive type <span className="text-red-700">*</span>
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className={fieldClassName}
                    required
                  >
                    {DRIVE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClassName} htmlFor="report">
                    Link to a report <span className="font-normal text-stone-500">(optional)</span>
                  </label>
                  <input
                    id="report"
                    name="report"
                    value={formData.report}
                    onChange={handleChange}
                    className={fieldClassName}
                    placeholder="Paste the report ID"
                    aria-describedby="report-guidance"
                  />
                  <p id="report-guidance" className="mt-2 text-xs leading-5 text-stone-500">
                    Link a community report to connect this Drive with the issue it addresses.
                  </p>
                </div>

                {formData.report.trim() && (
                  <p className="sm:col-span-2 -mt-3 rounded-xl border border-emerald-900/10 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-950">
                    This Drive will be linked to that report. The report needs at least five
                    supports before the Drive can be created.
                  </p>
                )}

                <div className="sm:col-span-2">
                  <label className={labelClassName} htmlFor="description">
                    What will participants do? <span className="text-red-700">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className={fieldClassName}
                    rows={4}
                    placeholder="Describe the activity, the area it will cover, and how people can help."
                    required
                    maxLength={3000}
                  />
                </div>

                <div>
                  <label className={labelClassName} htmlFor="startsAt">
                    <CalendarDays className="mr-1.5 inline" size={15} aria-hidden="true" />
                    Starts <span className="text-red-700">*</span>
                  </label>
                  <input
                    id="startsAt"
                    name="startsAt"
                    type="datetime-local"
                    value={formData.startsAt}
                    min={minStart}
                    step="60"
                    onChange={handleChange}
                    className={fieldClassName}
                    required
                  />
                </div>

                <div>
                  <label className={labelClassName} htmlFor="endsAt">
                    <CalendarDays className="mr-1.5 inline" size={15} aria-hidden="true" />
                    Ends <span className="text-red-700">*</span>
                  </label>
                  <input
                    id="endsAt"
                    name="endsAt"
                    type="datetime-local"
                    value={formData.endsAt}
                    min={minEnd}
                    step="60"
                    onChange={handleChange}
                    className={fieldClassName}
                    required
                  />
                  <p className="mt-2 text-xs text-stone-500">
                    The end time must be after the start time.
                  </p>
                </div>

                <div>
                  <label className={labelClassName} htmlFor="issueLocation">
                    <MapPin className="mr-1.5 inline" size={15} aria-hidden="true" />
                    Issue area <span className="font-normal text-stone-500">(optional)</span>
                  </label>
                  <input
                    id="issueLocation"
                    name="issueLocation"
                    value={formData.issueLocation}
                    onChange={handleChange}
                    className={fieldClassName}
                    placeholder="Area or site being addressed"
                    maxLength={300}
                  />
                </div>

                <div>
                  <label className={labelClassName} htmlFor="meetingPoint">
                    <MapPin className="mr-1.5 inline" size={15} aria-hidden="true" />
                    Meeting point <span className="text-red-700">*</span>
                  </label>
                  <input
                    id="meetingPoint"
                    name="meetingPoint"
                    value={formData.meetingPoint}
                    onChange={handleChange}
                    className={fieldClassName}
                    placeholder="Where should volunteers meet?"
                    required
                    maxLength={300}
                  />
                </div>

                <div>
                  <label className={labelClassName} htmlFor="maxParticipants">
                    <Users className="mr-1.5 inline" size={15} aria-hidden="true" />
                    Participant limit <span className="font-normal text-stone-500">(optional)</span>
                  </label>
                  <input
                    id="maxParticipants"
                    name="maxParticipants"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.maxParticipants}
                    onChange={handleChange}
                    className={fieldClassName}
                    placeholder="No limit"
                  />
                </div>

                <div>
                  <label className={labelClassName} htmlFor="contactInformation">
                    Contact information{" "}
                    <span className="font-normal text-stone-500">(optional)</span>
                  </label>
                  <input
                    id="contactInformation"
                    name="contactInformation"
                    value={formData.contactInformation}
                    onChange={handleChange}
                    className={fieldClassName}
                    placeholder="Email or phone for questions"
                    maxLength={300}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClassName} htmlFor="requiredMaterials">
                    What should participants bring?{" "}
                    <span className="font-normal text-stone-500">(optional)</span>
                  </label>
                  <textarea
                    id="requiredMaterials"
                    name="requiredMaterials"
                    value={formData.requiredMaterials}
                    onChange={handleChange}
                    className={fieldClassName}
                    rows={2}
                    placeholder="List items separated by commas or new lines"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClassName} htmlFor="organizerNote">
                    Note for participants{" "}
                    <span className="font-normal text-stone-500">(optional)</span>
                  </label>
                  <textarea
                    id="organizerNote"
                    name="organizerNote"
                    value={formData.organizerNote}
                    onChange={handleChange}
                    className={fieldClassName}
                    rows={2}
                    placeholder="Add any extra instructions for attendees"
                    maxLength={1000}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClassName} htmlFor="coOrganizers">
                    Co-organizers{" "}
                    <span className="font-normal text-stone-500">(optional, up to 2)</span>
                  </label>
                  <textarea
                    id="coOrganizers"
                    name="coOrganizers"
                    value={formData.coOrganizers}
                    onChange={handleChange}
                    className={fieldClassName}
                    rows={2}
                    placeholder="Paste user IDs, separated by commas or new lines"
                    aria-describedby="co-organizers-guidance"
                  />
                  <p id="co-organizers-guidance" className="mt-2 text-xs leading-5 text-stone-500">
                    Co-organizers must have an account. You will need each person&apos;s user ID.
                  </p>
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
                >
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  to="/drives"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-stone-300 px-5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 hover:text-stone-900"
                >
                  <ArrowLeft size={15} aria-hidden="true" />
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60"
                >
                  {loading ? "Creating drive..." : "Create drive"}
                  {!loading && <Plus size={16} aria-hidden="true" />}
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:col-span-5">
            <section
              aria-label="Live drive preview"
              className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white p-4 shadow-[0_12px_32px_rgba(27,82,64,0.08),0_4px_12px_rgba(0,0,0,0.03)] sm:p-5"
            >
              <div className="mb-4 flex items-center justify-between border-b border-emerald-950/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-600/60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-700" />
                  </span>
                  <h2 className="text-sm font-semibold tracking-wide text-emerald-950">
                    Drive preview
                  </h2>
                </div>
                <span className="text-[10px] font-medium text-stone-400">Updates as you type</span>
              </div>

              <article className="rounded-2xl border border-emerald-950/[0.05] bg-[#f8faf7] p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-bold text-sky-900">
                    {DRIVE_TYPES.find(({ value }) => value === formData.type)?.label}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-900">
                    Community drive
                  </span>
                </div>

                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100/70 px-3 py-1.5 text-[11px] font-semibold text-emerald-950">
                  <CalendarDays size={14} aria-hidden="true" />
                  {formatLocalDateTime(formData.startsAt)}
                </div>
                <h3 className="break-words text-lg font-semibold leading-snug text-emerald-950">
                  {formData.title.trim() || "Your drive title"}
                </h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-600">
                  {formData.description.trim() ||
                    "Describe the activity so volunteers know how they can take part."}
                </p>

                <div className="mt-4 space-y-2.5 border-t border-stone-200/80 pt-4 text-xs text-stone-600">
                  <p className="flex items-start gap-2">
                    <MapPin
                      size={14}
                      className="mt-0.5 shrink-0 text-emerald-800"
                      aria-hidden="true"
                    />
                    <span>
                      <span className="font-semibold text-stone-800">Meet at:</span>{" "}
                      {formData.meetingPoint.trim() || "Meeting point to be added"}
                    </span>
                  </p>
                  {formData.issueLocation.trim() && (
                    <p className="flex items-start gap-2">
                      <Leaf
                        size={14}
                        className="mt-0.5 shrink-0 text-emerald-800"
                        aria-hidden="true"
                      />
                      <span>
                        <span className="font-semibold text-stone-800">Area:</span>{" "}
                        {formData.issueLocation.trim()}
                      </span>
                    </p>
                  )}
                  <p className="flex items-start gap-2">
                    <Clock3
                      size={14}
                      className="mt-0.5 shrink-0 text-emerald-800"
                      aria-hidden="true"
                    />
                    <span>
                      <span className="font-semibold text-stone-800">Ends:</span>{" "}
                      {formatLocalDateTime(formData.endsAt)}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Users size={14} className="shrink-0 text-emerald-800" aria-hidden="true" />
                    {formData.maxParticipants
                      ? `Up to ${formData.maxParticipants} participants`
                      : "No participant limit"}
                  </p>
                </div>

                {(formData.report.trim() || materialsPreview.length > 0) && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-200/80 pt-3">
                    {formData.report.trim() && (
                      <span className="rounded-full bg-stone-200/70 px-2.5 py-1 text-[10px] font-semibold text-stone-700">
                        Linked to a report
                      </span>
                    )}
                    {materialsPreview.map((material, index) => (
                      <span
                        key={`${material}-${index}`}
                        className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-stone-600 ring-1 ring-stone-200"
                      >
                        {material}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            </section>

            <section className="rounded-2xl border border-emerald-950/10 bg-emerald-50/70 p-5">
              <div className="flex items-center gap-2 text-emerald-950">
                <ShieldCheck size={18} className="text-emerald-800" aria-hidden="true" />
                <h2 className="text-sm font-semibold">Help volunteers plan ahead</h2>
              </div>
              <ul className="mt-3 space-y-2.5 text-xs leading-5 text-stone-600">
                <li className="flex items-start gap-2">
                  <Check
                    size={14}
                    className="mt-0.5 shrink-0 text-emerald-800"
                    aria-hidden="true"
                  />
                  Choose a clear meeting point and give participants enough time to arrive.
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    size={14}
                    className="mt-0.5 shrink-0 text-emerald-800"
                    aria-hidden="true"
                  />
                  List any materials or instructions people should know before joining.
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    size={14}
                    className="mt-0.5 shrink-0 text-emerald-800"
                    aria-hidden="true"
                  />
                  Add a participant limit if the location or activity has a capacity.
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

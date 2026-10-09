import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
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

    const startsAt = new Date(formData.startsAt);
    const endsAt = new Date(formData.endsAt);
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      setError("Choose a valid start date and time in the future.");
      return;
    }
    if (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
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

    const maxParticipants = formData.maxParticipants
      ? Number(formData.maxParticipants)
      : undefined;
    if (maxParticipants !== undefined && (!Number.isInteger(maxParticipants) || maxParticipants < 1)) {
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
      setError(requestError.response?.data?.message || "Unable to create the Drive. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fieldClassName =
    "w-full rounded-lg border border-stone-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";
  const labelClassName = "mb-2 block text-sm font-semibold text-stone-800";

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          to="/feed"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-950"
        >
          <ArrowLeft size={16} />
          Back to Feed
        </Link>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-emerald-700">
              Community action
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-emerald-950">Start a Drive</h1>
            <p className="mt-2 text-stone-600">
              Bring people together to take practical action for the environment.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClassName} htmlFor="title">
                  Drive title <span className="text-red-600">*</span>
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
                  Drive type <span className="text-red-600">*</span>
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
                  Link to a Report <span className="font-normal text-stone-500">(optional)</span>
                </label>
                <input
                  id="report"
                  name="report"
                  value={formData.report}
                  onChange={handleChange}
                  className={fieldClassName}
                  placeholder="Paste the Report ID"
                  aria-describedby="report-guidance"
                />
              </div>

              {formData.report.trim() && (
                <p
                  id="report-guidance"
                  className="sm:col-span-2 -mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"
                >
                  This Drive will be linked to the Report. The Report must have at least five
                  supports before the Drive can be created.
                </p>
              )}

              <div className="sm:col-span-2">
                <label className={labelClassName} htmlFor="description">
                  Description <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={fieldClassName}
                  rows="4"
                  placeholder="What will volunteers do during this Drive?"
                  required
                  maxLength={3000}
                />
              </div>

              <div>
                <label className={labelClassName} htmlFor="startsAt">
                  <CalendarDays className="mr-1 inline" size={16} />
                  Start date and time <span className="text-red-600">*</span>
                </label>
                <input
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  value={formData.startsAt}
                  onChange={handleChange}
                  className={fieldClassName}
                  required
                />
              </div>

              <div>
                <label className={labelClassName} htmlFor="endsAt">
                  <CalendarDays className="mr-1 inline" size={16} />
                  End date and time <span className="text-red-600">*</span>
                </label>
                <input
                  id="endsAt"
                  name="endsAt"
                  type="datetime-local"
                  value={formData.endsAt}
                  onChange={handleChange}
                  className={fieldClassName}
                  required
                />
              </div>

              <div>
                <label className={labelClassName} htmlFor="issueLocation">
                  <MapPin className="mr-1 inline" size={16} />
                  Issue location
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
                  <MapPin className="mr-1 inline" size={16} />
                  Meeting point <span className="text-red-600">*</span>
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
                  <Users className="mr-1 inline" size={16} />
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
                  Contact information
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
                  Materials to bring
                </label>
                <textarea
                  id="requiredMaterials"
                  name="requiredMaterials"
                  value={formData.requiredMaterials}
                  onChange={handleChange}
                  className={fieldClassName}
                  rows="2"
                  placeholder="Separate items with commas or new lines"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClassName} htmlFor="organizerNote">
                  Note for participants
                </label>
                <textarea
                  id="organizerNote"
                  name="organizerNote"
                  value={formData.organizerNote}
                  onChange={handleChange}
                  className={fieldClassName}
                  rows="2"
                  placeholder="Any extra instructions for attendees"
                  maxLength={1000}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClassName} htmlFor="coOrganizers">
                  Co-organizers <span className="font-normal text-stone-500">(optional, up to 2)</span>
                </label>
                <textarea
                  id="coOrganizers"
                  name="coOrganizers"
                  value={formData.coOrganizers}
                  onChange={handleChange}
                  className={fieldClassName}
                  rows="2"
                  placeholder="Paste user IDs, separated by commas or new lines"
                  aria-describedby="co-organizers-guidance"
                />
                <p id="co-organizers-guidance" className="mt-1 text-xs text-stone-500">
                  Co-organizers must already have an account. You will need each person&apos;s user
                  ID.
                </p>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:justify-end">
              <Link
                to="/feed"
                className="rounded-lg border border-stone-300 px-5 py-3 text-center text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating Drive..." : "Create Drive"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Plus, Users } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";

const DRIVE_TYPES = [
  { label: "All types", value: "" },
  { label: "Cleanup", value: "cleanup" },
  { label: "Tree planting", value: "tree-planting" },
  { label: "Waste collection", value: "waste-collection" },
  { label: "Awareness", value: "awareness" },
  { label: "Restoration", value: "restoration" },
  { label: "Other", value: "other" },
];

const DRIVE_STATUSES = [
  { label: "Upcoming", value: "upcoming" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const PAGE_SIZE = 9;

const formatLabel = (value) =>
  value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const formatDate = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Date to be confirmed";
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const statusClass = (status) => {
  if (status === "ongoing") return "bg-amber-100 text-amber-800";
  if (status === "completed") return "bg-stone-100 text-stone-700";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  return "bg-emerald-100 text-emerald-800";
};

export default function Drives() {
  const [drives, setDrives] = useState([]);
  const [status, setStatus] = useState("upcoming");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDrives = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/drives", {
          params: { status, ...(type ? { type } : {}), page, limit: PAGE_SIZE },
          signal: controller.signal,
        });
        setDrives(response.data.data || []);
        setPages(response.data.pagination?.pages || 0);
        setTotal(response.data.pagination?.total || 0);
      } catch (requestError) {
        if (requestError.code !== "ERR_CANCELED") {
          setError(
            requestError.response?.data?.message || "Unable to load Drives. Please try again.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchDrives();
    return () => controller.abort();
  }, [status, type, page, retryKey]);

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  const handleTypeChange = (event) => {
    setType(event.target.value);
    setPage(1);
  };

  const fieldClassName =
    "rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-emerald-700">
              Take action together
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">
              Community Drives
            </h1>
            <p className="mt-2 max-w-2xl text-stone-600">
              Find local environmental activities, meet your neighbors, and make a difference.
            </p>
          </div>
          <Link
            to="/drives/create"
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:self-auto"
          >
            <Plus size={18} />
            Start a Drive
          </Link>
        </div>

        <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-emerald-950">Find a Drive</h2>
              {!loading && !error && (
                <p className="mt-1 text-sm text-stone-500">
                  {total} {total === 1 ? "Drive" : "Drives"} found
                </p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-stone-700">
                Status
                <select
                  aria-label="Filter Drives by status"
                  className={fieldClassName}
                  value={status}
                  onChange={handleStatusChange}
                >
                  {DRIVE_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-stone-700">
                Type
                <select
                  aria-label="Filter Drives by type"
                  className={fieldClassName}
                  value={type}
                  onChange={handleTypeChange}
                >
                  {DRIVE_TYPES.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>

        {loading ? (
          <div
            className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-stone-500"
            role="status"
          >
            Loading Drives...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
            <p role="alert" className="font-medium text-red-700">
              {error}
            </p>
            <button
              type="button"
              onClick={() => setRetryKey((current) => current + 1)}
              className="mt-4 rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-stone-50"
            >
              Try again
            </button>
          </div>
        ) : drives.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
            <CalendarDays className="mx-auto mb-3 text-emerald-700" size={28} />
            <h2 className="text-lg font-bold text-emerald-950">No Drives found</h2>
            <p className="mt-2 text-sm text-stone-500">
              Try another status or type, or start a new community Drive.
            </p>
            <Link
              to="/drives/create"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Plus size={16} />
              Start a Drive
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {drives.map((drive) => (
                <Link
                  key={drive._id}
                  to={`/drives/${drive._id}`}
                  className="group flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                      {formatLabel(drive.type)}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(drive.status)}`}
                    >
                      {formatLabel(drive.status)}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-emerald-950 group-hover:text-emerald-700">
                    {drive.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 flex-1 whitespace-pre-line text-sm leading-6 text-stone-600">
                    {drive.description}
                  </p>

                  <div className="mt-5 space-y-2.5 border-t border-stone-100 pt-4 text-sm text-stone-600">
                    <div className="flex items-start gap-2">
                      <CalendarDays className="mt-0.5 shrink-0 text-emerald-700" size={16} />
                      <span>
                        <span className="font-medium text-stone-800">Starts:</span>{" "}
                        {formatDate(drive.startsAt)}
                      </span>
                    </div>
                    {drive.meetingPoint && (
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 shrink-0 text-emerald-700" size={16} />
                        <span>{drive.meetingPoint}</span>
                      </div>
                    )}
                    {drive.maxParticipants && (
                      <div className="flex items-start gap-2">
                        <Users className="mt-0.5 shrink-0 text-emerald-700" size={16} />
                        <span>Up to {drive.maxParticipants} participants</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {pages > 1 && (
              <nav
                aria-label="Drive pages"
                className="mt-8 flex items-center justify-center gap-4"
              >
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-stone-600">
                  Page {page} of {pages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(pages, current + 1))}
                  disabled={page >= pages}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
}

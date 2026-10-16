import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Leaf, MapPin, Plus, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
  { label: "All drives", value: "all" },
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
  return `${date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })} · ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

const statusClass = (status) => {
  if (status === "ongoing") return "bg-amber-100 text-amber-900";
  if (status === "completed") return "bg-stone-100 text-stone-700";
  if (status === "cancelled") return "bg-red-100 text-red-800";
  return "bg-emerald-100 text-emerald-900";
};

export default function Drives() {
  const navigate = useNavigate();
  const isAuthenticated = Boolean(localStorage.getItem("token"));
  const [drives, setDrives] = useState([]);
  const [status, setStatus] = useState("upcoming");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joiningDriveId, setJoiningDriveId] = useState("");
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

  const handleJoinDrive = async (drive) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (
      drive.isJoined ||
      drive.isOrganizer ||
      drive.status === "completed" ||
      drive.status === "cancelled"
    ) {
      return;
    }

    setJoinError("");
    setJoiningDriveId(drive._id);
    try {
      const response = await api.post(`/drives/${drive._id}/join`);
      setDrives((current) =>
        current.map((item) =>
          item._id === drive._id
            ? {
                ...item,
                isJoined: response.data.data.isJoined,
                participantCount: response.data.data.participantCount,
              }
            : item,
        ),
      );
    } catch (requestError) {
      setJoinError(
        requestError.response?.data?.message || "Unable to join this drive. Please try again.",
      );
    } finally {
      setJoiningDriveId("");
    }
  };

  const heading = status === "all" ? "Community Drives" : `${formatLabel(status)} Community Drives`;

  return (
    <div className="min-h-screen bg-[#f4f6f0] text-stone-900">
      <section className="relative overflow-hidden bg-[#1b5240] py-12 text-white sm:py-16">
        <div
          className="pointer-events-none absolute -right-20 -bottom-24 h-96 w-96 rounded-full bg-emerald-950/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-1/3 -top-20 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-8 border-b border-white/10 pb-7 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-100">
                <Leaf size={14} aria-hidden="true" />
                {loading
                  ? "Community action"
                  : `${total} ${total === 1 ? "drive" : "drives"} to explore`}
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Take action together
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
                Join your community for local cleanups, tree planting, and environmental action.
                Find a drive near you and make a difference together.
              </p>
            </div>
            {isAuthenticated && (
              <Link
                to="/drives/create"
                className="inline-flex min-h-12 shrink-0 self-start items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-950 shadow-md transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Plus size={18} aria-hidden="true" />
                Start a new drive
              </Link>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="mr-1 text-xs font-semibold text-white/60">Status</span>
              {DRIVE_STATUSES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={status === option.value}
                  onClick={() => {
                    setStatus(option.value);
                    setPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    status === option.value
                      ? "bg-white text-emerald-950 shadow-sm"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="mr-1 text-xs font-semibold text-white/60">Drive type</span>
              {DRIVE_TYPES.map((option) => (
                <button
                  key={option.value || "all"}
                  type="button"
                  aria-pressed={type === option.value}
                  onClick={() => {
                    setType(option.value);
                    setPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    type === option.value
                      ? "bg-white/20 text-white ring-1 ring-white/30"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12">
        <div className="mb-6 flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
              {heading}
            </h2>
            {!loading && !error && (
              <span className="rounded-full bg-stone-200/70 px-2.5 py-1 text-xs font-semibold text-stone-600">
                {total} {total === 1 ? "drive" : "drives"}
              </span>
            )}
          </div>
          {!loading && !error && total > 0 && (
            <p className="text-sm text-stone-500">
              Page {page} of {Math.max(pages, 1)}
            </p>
          )}
        </div>

        {loading ? (
          <div
            className="rounded-2xl border border-emerald-950/[0.06] bg-white p-10 text-center text-stone-500 shadow-[0_8px_24px_rgba(27,82,64,0.04)]"
            role="status"
          >
            Loading community drives...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
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
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-14 text-center shadow-[0_8px_24px_rgba(27,82,64,0.04)]">
            <CalendarDays className="mx-auto mb-3 text-emerald-800" size={28} aria-hidden="true" />
            <h2 className="text-lg font-semibold text-stone-900">No drives found</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
              Try a different status or drive type. You can also start a new community drive.
            </p>
            {isAuthenticated && (
              <Link
                to="/drives/create"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                <Plus size={16} />
                Start a Drive
              </Link>
            )}
          </div>
        ) : (
          <>
            {joinError && (
              <p
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-800"
              >
                {joinError}
              </p>
            )}
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {drives.map((drive) => (
                <article
                  key={drive._id}
                  className="group flex h-full flex-col justify-between rounded-2xl border border-emerald-950/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(27,82,64,0.04),0_2px_6px_rgba(0,0,0,0.02)] transition duration-200 hover:-translate-y-1 hover:border-emerald-900/20 hover:shadow-[0_14px_32px_rgba(27,82,64,0.08)] sm:p-6"
                >
                  <div>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-bold text-sky-900">
                        {formatLabel(drive.type)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(drive.status)}`}
                      >
                        {formatLabel(drive.status)}
                      </span>
                    </div>
                    {drive.report && (
                      <span className="mb-3 inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-600">
                        Linked report · {drive.report.title}
                      </span>
                    )}
                    <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-950">
                      <CalendarDays size={14} aria-hidden="true" />
                      {formatDate(drive.startsAt)}
                    </div>
                    <Link
                      to={`/drives/${drive._id}`}
                      className="block rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                      <h3 className="text-lg font-semibold leading-snug tracking-tight text-stone-900 transition group-hover:text-emerald-900">
                        {drive.title}
                      </h3>
                    </Link>
                    {drive.meetingPoint && (
                      <p className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-stone-600">
                        <MapPin
                          className="mt-0.5 shrink-0 text-stone-400"
                          size={15}
                          aria-hidden="true"
                        />
                        {drive.meetingPoint}
                      </p>
                    )}
                    <p className="mt-4 line-clamp-3 whitespace-pre-line text-sm leading-6 text-stone-600">
                      {drive.description}
                    </p>
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-stone-50/80 p-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-xs font-bold uppercase text-white">
                        {(drive.organizer?.username || drive.organizer?.name || "C").charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">
                        {drive.organizer?.name ||
                          drive.organizer?.username ||
                          "Community organizer"}
                      </span>
                      {drive.isOrganizer && (
                        <span className="text-[10px] font-semibold text-emerald-800">
                          Organizer
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-stone-100 pt-4">
                    <div className="mb-3 flex items-center justify-between gap-2 text-xs text-stone-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={15} className="text-stone-400" aria-hidden="true" />
                        {drive.participantCount || 0} joined
                      </span>
                      {drive.maxParticipants && (
                        <span className="font-semibold text-emerald-900">
                          {Math.max(drive.maxParticipants - (drive.participantCount || 0), 0)} spots
                          left
                        </span>
                      )}
                    </div>
                    {drive.maxParticipants && (
                      <div
                        className="mb-4 h-2 overflow-hidden rounded-full bg-stone-100"
                        role="progressbar"
                        aria-label="Drive participant capacity"
                        aria-valuemin={0}
                        aria-valuemax={drive.maxParticipants}
                        aria-valuenow={Math.min(drive.participantCount || 0, drive.maxParticipants)}
                      >
                        <div
                          className="h-full rounded-full bg-emerald-800 transition-all"
                          style={{
                            width: `${Math.min(
                              ((drive.participantCount || 0) / drive.maxParticipants) * 100,
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        to={`/drives/${drive._id}`}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-emerald-900"
                      >
                        Details
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleJoinDrive(drive)}
                        disabled={
                          joiningDriveId === drive._id ||
                          drive.isJoined ||
                          drive.isOrganizer ||
                          drive.status === "completed" ||
                          drive.status === "cancelled" ||
                          Boolean(
                            drive.maxParticipants &&
                            drive.participantCount >= drive.maxParticipants,
                          )
                        }
                        className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                          drive.isJoined || drive.isOrganizer
                            ? "bg-emerald-50 text-emerald-900"
                            : "bg-sky-700 text-white shadow-sm hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
                        }`}
                      >
                        {joiningDriveId === drive._id
                          ? "Joining..."
                          : drive.isOrganizer
                            ? "Your drive"
                            : drive.isJoined
                              ? "Joined"
                              : drive.maxParticipants &&
                                  drive.participantCount >= drive.maxParticipants
                                ? "Full"
                                : drive.status === "completed" || drive.status === "cancelled"
                                  ? "Closed"
                                  : "Join drive"}
                        {!drive.isJoined && !drive.isOrganizer && (
                          <ArrowRight size={14} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {pages > 1 && (
              <nav
                aria-label="Drive pages"
                className="mt-10 flex items-center justify-center gap-4"
              >
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-full border border-emerald-900/15 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-stone-600" aria-live="polite">
                  Page {page} of {pages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(pages, current + 1))}
                  disabled={page >= pages}
                  className="rounded-full border border-emerald-900/15 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
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

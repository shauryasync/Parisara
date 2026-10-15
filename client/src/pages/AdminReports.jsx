import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  MapPin,
  RotateCcw,
  Search,
} from "lucide-react";
import api from "../services/api";

const PAGE_SIZE = 10;

const CATEGORIES = [
  { label: "Pollution", value: "pollution" },
  { label: "Waste", value: "waste" },
  { label: "Deforestation", value: "deforestation" },
  { label: "Water", value: "water" },
  { label: "Other", value: "other" },
];

const STATUSES = [
  { label: "Reported", value: "reported" },
  { label: "In progress", value: "in-progress" },
  { label: "Resolved", value: "resolved" },
];

const formatLabel = (value = "") =>
  value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const formatDate = (value) => {
  if (!value) return "Unknown date";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const inputClassName =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

const isValidReportsResponse = (payload) => {
  const pagination = payload?.pagination;

  return (
    payload?.success === true &&
    Array.isArray(payload.data) &&
    payload.data.every(
      (report) =>
        report &&
        typeof report._id === "string" &&
        typeof report.title === "string" &&
        typeof report.details === "string" &&
        typeof report.placename === "string" &&
        typeof report.category === "string" &&
        typeof report.status === "string" &&
        typeof report.isHidden === "boolean",
    ) &&
    pagination &&
    Number.isSafeInteger(pagination.page) &&
    pagination.page > 0 &&
    Number.isSafeInteger(pagination.limit) &&
    pagination.limit > 0 &&
    Number.isSafeInteger(pagination.total) &&
    pagination.total >= 0 &&
    Number.isSafeInteger(pagination.totalPages) &&
    pagination.totalPages === Math.ceil(pagination.total / pagination.limit) &&
    typeof pagination.hasMore === "boolean"
  );
};

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [pendingAction, setPendingAction] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let correctingPage = false;

    const fetchReports = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/admin/reports", {
          params: {
            page,
            limit: PAGE_SIZE,
            visibility,
            ...(category ? { category } : {}),
            ...(status ? { status } : {}),
            ...(search ? { search } : {}),
          },
          signal: controller.signal,
        });

        if (!isValidReportsResponse(response.data)) {
          throw new Error("The server returned an invalid reports response.");
        }

        const responsePagination = response.data.pagination;
        if (responsePagination.page !== page || responsePagination.limit !== PAGE_SIZE) {
          throw new Error("The server returned unexpected report pagination values.");
        }
        const lastPage = Math.max(1, responsePagination.totalPages);
        if (page > lastPage) {
          correctingPage = true;
          setPage(lastPage);
          return;
        }

        setReports(response.data.data);
        setPagination(responsePagination);
      } catch (requestError) {
        if (requestError.code !== "ERR_CANCELED") {
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              "Unable to load reports. Please retry.",
          );
        }
      } finally {
        if (!controller.signal.aborted && !correctingPage) setLoading(false);
      }
    };

    fetchReports();
    return () => controller.abort();
  }, [page, visibility, category, status, search, retryKey]);

  const updateFilters = (update) => {
    update();
    setPage(1);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    updateFilters(() => setSearch(searchDraft.trim()));
  };

  const clearFilters = () => {
    setSearchDraft("");
    setSearch("");
    setVisibility("all");
    setCategory("");
    setStatus("");
    setPage(1);
  };

  const runAction = async (report, action, request) => {
    const actionKey = `${report._id}:${action}`;
    setPendingAction(actionKey);
    setActionError("");

    try {
      await request();
      setRetryKey((current) => current + 1);
      return true;
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message ||
          `Unable to complete the ${action} action. Please retry.`,
      );
      return false;
    } finally {
      setPendingAction("");
    }
  };

  const hideReport = (report, reason) =>
    runAction(report, "hide", () =>
      api.patch(`/admin/reports/${report._id}/hide`, { reason }),
    );

  const restoreReport = (report) =>
    runAction(report, "restore", () => api.patch(`/admin/reports/${report._id}/restore`));

  const updateStatus = (report, nextStatus) =>
    runAction(report, "update status", () =>
      api.patch(`/admin/reports/${report._id}/status`, { status: nextStatus }),
    );

  const totalPages = Math.max(1, pagination.totalPages);

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-emerald-300">
              <FileText size={20} aria-hidden="true" />
              <span className="text-sm font-semibold">Moderation queue</span>
            </div>
            <h2 className="text-xl font-semibold text-white">Reports</h2>
            {!loading && !error && (
              <p className="mt-1 text-sm text-slate-400">
                {pagination.total} {pagination.total === 1 ? "report" : "reports"} found
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="self-start rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            Clear filters
          </button>
        </div>

        <form onSubmit={handleSearch} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
            Search reports
            <span className="relative">
              <Search
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="search"
                className={`${inputClassName} pl-9`}
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Title, details, or location"
                aria-label="Search reports"
              />
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
            Visibility
            <select
              className={inputClassName}
              value={visibility}
              onChange={(event) =>
                updateFilters(() => setVisibility(event.target.value))
              }
            >
              <option value="all">All reports</option>
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
            Category
            <select
              className={inputClassName}
              value={category}
              onChange={(event) => updateFilters(() => setCategory(event.target.value))}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
            Status
            <select
              className={inputClassName}
              value={status}
              onChange={(event) => updateFilters(() => setStatus(event.target.value))}
            >
              <option value="">All statuses</option>
              {STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {actionError && (
        <p className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-300" role="alert">
          {actionError}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-10 text-center text-slate-400" role="status">
          Loading reports...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-900/60 bg-slate-950/50 p-8 text-center">
          <p className="text-red-300" role="alert">{error}</p>
          <button
            type="button"
            onClick={() => setRetryKey((current) => current + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-10 text-center">
          <FileText className="mx-auto mb-3 text-slate-500" size={28} aria-hidden="true" />
          <h3 className="font-semibold text-white">No reports found</h3>
          <p className="mt-1 text-sm text-slate-400">Try changing or clearing your filters.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {reports.map((report) => (
              <ReportModerationCard
                key={report._id}
                report={report}
                pendingAction={pendingAction}
                onHide={hideReport}
                onRestore={restoreReport}
                onStatusChange={updateStatus}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Page {pagination.page || page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

const ReportModerationCard = ({ report, pendingAction, onHide, onRestore, onStatusChange }) => {
  const [reason, setReason] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [statusDraft, setStatusDraft] = useState(report.status);
  const busy = Boolean(pendingAction);
  const authorName = report.reportedBy?.name || report.reportedBy?.username || "Community member";

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50">
      {report.images?.[0] && !imageFailed ? (
        <img
          src={report.images[0]}
          alt={`Image for ${report.title}`}
          className="h-52 w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : imageFailed ? (
        <div
          className="flex h-24 items-center justify-center bg-slate-900 text-sm text-slate-400"
          role="img"
          aria-label={`Image unavailable for ${report.title}`}
        >
          Image unavailable
        </div>
      ) : null}
      <div className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-slate-400">
              By {authorName}
              {report.reportedBy?.username ? ` (@${report.reportedBy.username})` : ""} ·{" "}
              {formatDate(report.createdAt)}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">{report.title}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-300">
              {formatLabel(report.category)}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                report.isHidden
                  ? "bg-red-950 text-red-300"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {report.isHidden ? "Hidden" : "Visible"}
            </span>
          </div>
        </div>

        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
          {report.details}
        </p>
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <MapPin size={16} aria-hidden="true" />
          {report.placename || "Location not provided"}
        </p>

        {report.isHidden && (
          <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-3 text-sm">
            <p className="font-medium text-red-300">
              Hidden {report.moderatedAt ? `on ${formatDate(report.moderatedAt)}` : ""}
            </p>
            {report.moderationReason && (
              <p className="mt-1 text-red-200/80">Reason: {report.moderationReason}</p>
            )}
            {report.moderatedBy?.name && (
              <p className="mt-1 text-red-200/70">By {report.moderatedBy.name}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:max-w-xs sm:flex-1">
            Moderation status
            <select
              className={inputClassName}
              value={statusDraft}
              disabled={busy}
              onChange={async (event) => {
                const nextStatus = event.target.value;
                setStatusDraft(nextStatus);
                const saved = await onStatusChange(report, nextStatus);
                if (!saved) setStatusDraft(report.status);
              }}
              aria-label={`Change status for ${report.title}`}
            >
              {STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {pendingAction === `${report._id}:update status` && (
              <span className="text-xs text-emerald-300" role="status">
                Saving status...
              </span>
            )}
          </label>

          {report.isHidden ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRestore(report)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-800 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-wait disabled:opacity-50"
            >
              <Eye size={16} aria-hidden="true" />
              {pendingAction === `${report._id}:restore` ? "Restoring..." : "Restore report"}
            </button>
          ) : (
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={async (event) => {
                event.preventDefault();
                if (
                  !window.confirm(
                    `Hide "${report.title}" from public view? You can restore it later.`,
                  )
                ) {
                  return;
                }
                const hidden = await onHide(report, reason.trim());
                if (hidden) setReason("");
              }}
            >
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
                Reason to hide
                <input
                  className={inputClassName}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={500}
                  required
                  placeholder="Required for moderation"
                  aria-label={`Reason to hide ${report.title}`}
                />
              </label>
              <button
                type="submit"
                disabled={busy || !reason.trim()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-900 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-wait disabled:opacity-50"
              >
                <EyeOff size={16} aria-hidden="true" />
                {pendingAction === `${report._id}:hide` ? "Hiding..." : "Hide report"}
              </button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
};

export default AdminReports;

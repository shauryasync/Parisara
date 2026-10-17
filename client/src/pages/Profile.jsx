import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Camera,
  Check,
  Clock3,
  FileText,
  Leaf,
  Mail,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  ThumbsUp,
} from "lucide-react";
import api from "../services/api";
import ActivityFeed from "../components/ActivityFeed";
import ReportCard from "../components/ReportCard";

const PROFILE_PAGE_SIZE = 10;
const SAVED_PAGE_SIZE = 10;

const REPORT_STATUSES = [
  { label: "All reports", value: "" },
  { label: "Reported", value: "reported" },
  { label: "In progress", value: "in-progress" },
  { label: "Resolved", value: "resolved" },
];

const formatLabel = (value = "") =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDate = (dateString, options) => {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime())
    ? "Date to be confirmed"
    : date.toLocaleDateString("en-US", options);
};

const mapReport = (report) => ({
  id: report._id,
  title: report.title,
  description: report.details,
  category: report.category,
  location: report.placename,
  status: report.status,
  images: report.images || [],
  image: report.images?.[0] || null,
  supportCount: report.supportCount || 0,
  supportedByCurrentUser: report.supportedByCurrentUser || false,
  savedByCurrentUser: report.savedByCurrentUser || false,
  commentCount: report.commentCount || 0,
  shares: 0,
  author: { name: report.reportedBy?.name || report.reportedBy?.username || "Anonymous" },
  authorId: report.reportedBy?._id,
  createdAt: report.createdAt,
  comments: (report.recentComments || []).map((comment) => ({
    id: comment._id,
    author: comment.user?.name || comment.user?.username || "Community member",
    text: comment.content,
  })),
  linkedDrives: (report.linkedDrives || []).map((drive) => ({
    id: drive._id,
    title: drive.title,
    startsAt: drive.startsAt,
    meetingPoint: drive.meetingPoint,
    status: drive.status,
  })),
});

const Profile = () => {
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportSupportTotal, setReportSupportTotal] = useState(0);
  const [reportCommentTotal, setReportCommentTotal] = useState(0);
  const [reportPage, setReportPage] = useState(1);
  const [reportsHaveMore, setReportsHaveMore] = useState(false);
  const [drives, setDrives] = useState([]);
  const [driveTotal, setDriveTotal] = useState(0);
  const [savedReports, setSavedReports] = useState([]);
  const [savedPage, setSavedPage] = useState(1);
  const [savedHaveMore, setSavedHaveMore] = useState(false);
  const [activeTab, setActiveTab] = useState("reports");
  const [activeStatus, setActiveStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return undefined;
    }

    const controller = new AbortController();
    const loadProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const [profileResponse, reportResponse, driveResponse, savedResponse] = await Promise.all([
          api.get("/me", { signal: controller.signal }),
          api.get("/reports/get-reports", {
            params: { mine: true, page: 1, limit: PROFILE_PAGE_SIZE },
            signal: controller.signal,
          }),
          api.get("/drives", {
            params: { status: "all", joined: true, page: 1, limit: 50 },
            signal: controller.signal,
          }),
          api.get("/reports/saved", {
            params: { page: 1, limit: SAVED_PAGE_SIZE },
            signal: controller.signal,
          }),
        ]);

        setUser(profileResponse.data);
        setReports((reportResponse.data.data || []).map(mapReport));
        setReportTotal(reportResponse.data.pagination?.totalReports || 0);
        setReportSupportTotal(reportResponse.data.myReportSupportCount || 0);
        setReportCommentTotal(reportResponse.data.myReportCommentCount || 0);
        setReportPage(1);
        setReportsHaveMore(Boolean(reportResponse.data.pagination?.hasMore));
        setDrives(driveResponse.data.data || []);
        setDriveTotal(driveResponse.data.pagination?.joinedTotal || 0);
        setSavedReports((savedResponse.data.data || []).map(mapReport));
        setSavedPage(1);
        setSavedHaveMore(Boolean(savedResponse.data.pagination?.hasMore));
      } catch (requestError) {
        if (requestError.code !== "ERR_CANCELED") {
          setError(requestError.response?.data?.message || "Could not load your profile.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadProfile();
    return () => controller.abort();
  }, [navigate, retryKey]);

  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "P";

  const visibleReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesStatus = !activeStatus || report.status === activeStatus;
      const matchesSearch =
        !normalizedSearch ||
        [report.title, report.description, report.category, report.location]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesSearch;
    });
  }, [reports, activeStatus, search]);

  const visibleSavedReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return savedReports.filter((report) =>
      [report.title, report.description, report.category, report.location]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [savedReports, search]);

  const visibleDrives = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return drives.filter((drive) =>
      [drive.title, drive.description, drive.type, drive.issueLocation, drive.meetingPoint]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [drives, search]);

  const handleAvatarChange = async (event) => {
    const image = event.target.files?.[0];
    event.target.value = "";
    if (!image) return;

    setAvatarError("");
    setUploadingAvatar(true);
    const payload = new FormData();
    payload.append("avatar", image);

    try {
      const response = await api.patch("/me/avatar", payload);
      setUser((current) => ({ ...current, avatar: response.data.avatar }));
      if (response.data.cleanupWarning) setAvatarError(response.data.cleanupWarning);
      window.dispatchEvent(new Event("parisara:profile-updated"));
    } catch (requestError) {
      setAvatarError(
        requestError.response?.data?.message || "Unable to update your profile photo.",
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    setActionError("");
    try {
      if (activeTab === "reports") {
        const nextPage = reportPage + 1;
        const response = await api.get("/reports/get-reports", {
          params: { mine: true, page: nextPage, limit: PROFILE_PAGE_SIZE },
        });
        setReports((current) => [...current, ...(response.data.data || []).map(mapReport)]);
        setReportPage(nextPage);
        setReportsHaveMore(Boolean(response.data.pagination?.hasMore));
      } else if (activeTab === "saved") {
        const nextPage = savedPage + 1;
        const response = await api.get("/reports/saved", {
          params: { page: nextPage, limit: SAVED_PAGE_SIZE },
        });
        setSavedReports((current) => [...current, ...(response.data.data || []).map(mapReport)]);
        setSavedPage(nextPage);
        setSavedHaveMore(Boolean(response.data.pagination?.hasMore));
      }
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message || "Unable to load more items. Please try again.",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    setActionError("");
    try {
      await api.delete(`/reports/get-reports/${reportId}`);
      const deletedReport = reports.find((report) => report.id === reportId);
      setReports((current) => current.filter((report) => report.id !== reportId));
      if (deletedReport) {
        setReportSupportTotal((total) => Math.max(0, total - deletedReport.supportCount));
        setReportCommentTotal((total) => Math.max(0, total - deletedReport.commentCount));
      }
      setReportTotal((total) => Math.max(0, total - 1));
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message || "Unable to delete report. Please try again.",
      );
    }
  };

  const handleUnsave = async (report) => {
    setActionError("");
    try {
      await api.delete(`/reports/${report.id}/save`);
      setSavedReports((current) => current.filter((item) => item.id !== report.id));
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message || "Unable to remove saved report. Please try again.",
      );
    }
  };

  const tabs = [
    { label: "My reports", value: "reports", count: reportTotal, icon: FileText },
    { label: "Joined drives", value: "drives", count: driveTotal, icon: Leaf },
    { label: "Saved", value: "saved", count: savedReports.length, icon: Check },
    { label: "Activity", value: "activity", icon: Clock3 },
  ];

  if (loading) {
    return (
      <div
        className="min-h-[60vh] bg-[#f4f6f0] px-4 py-16 text-center text-sm text-stone-500"
        role="status"
      >
        Loading your profile...
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-[60vh] bg-[#f4f6f0] px-4 py-16" role="alert">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-6 text-center">
          <p className="text-sm text-red-800">{error || "Profile unavailable."}</p>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="mt-4 rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f0] text-stone-800">
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="relative overflow-hidden rounded-3xl border border-emerald-950/[0.07] bg-white p-5 shadow-[0_8px_24px_rgba(27,82,64,0.04),0_2px_6px_rgba(0,0,0,0.02)] sm:p-7">
          <div
            className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-28 right-1/3 h-56 w-56 rounded-full bg-sky-100/70 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="relative h-20 w-20 shrink-0 sm:h-24 sm:w-24">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.name}'s profile`}
                    className="h-full w-full rounded-full object-cover ring-4 ring-white shadow-sm"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold tracking-wide text-emerald-950 ring-4 ring-white shadow-sm">
                    {initials}
                  </div>
                )}
                <span
                  className="absolute bottom-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-900 text-white ring-2 ring-white"
                  title={`${formatLabel(user.role)} account`}
                >
                  <ShieldCheck size={15} aria-hidden="true" />
                </span>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                  aria-label="Choose a profile photo"
                  disabled={uploadingAvatar}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  aria-label={user.avatar ? "Change profile photo" : "Add profile photo"}
                  title={user.avatar ? "Change profile photo" : "Add profile photo"}
                  className="absolute bottom-0.5 left-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-900 text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-70"
                >
                  <Camera size={15} aria-hidden="true" />
                </button>
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-900/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-950">
                    Community profile
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-stone-600">
                    <ShieldCheck size={13} aria-hidden="true" />
                    {formatLabel(user.role)}
                  </span>
                </div>
                <h1 className="break-words text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
                  {user.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-stone-500 sm:text-sm">
                  <span className="font-semibold text-emerald-900">@{user.username}</span>
                  <span className="hidden text-stone-300 sm:inline" aria-hidden="true">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Mail size={14} className="text-stone-400" aria-hidden="true" />
                    {user.email}
                  </span>
                  {user.createdAt && (
                    <>
                      <span className="hidden text-stone-300 sm:inline" aria-hidden="true">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-stone-400" aria-hidden="true" />
                        Member since{" "}
                        {formatDate(user.createdAt, { month: "short", year: "numeric" })}
                      </span>
                    </>
                  )}
                </div>
                {(avatarError || uploadingAvatar) && (
                  <p
                    className={`mt-2 text-xs ${avatarError ? "text-red-700" : "text-stone-500"}`}
                    role={avatarError ? "alert" : "status"}
                  >
                    {avatarError || "Uploading profile photo..."}
                  </p>
                )}
              </div>
            </div>
            <Link
              to="/reports/create-report"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              <Plus size={17} aria-hidden="true" />
              Create report
            </Link>
          </div>
        </section>

        <section
          aria-label="Your community contributions"
          className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        >
          {[
            {
              label: "Reports submitted",
              value: reportTotal,
              detail: "Shared with the community",
              icon: FileText,
              iconStyle: "bg-emerald-100 text-emerald-900",
            },
            {
              label: "Support received",
              value: reportSupportTotal,
              detail: "Across your reports",
              icon: ThumbsUp,
              iconStyle: "bg-sky-100 text-sky-800",
            },
            {
              label: "Community comments",
              value: reportCommentTotal,
              detail: "On your reports",
              icon: MessageCircle,
              iconStyle: "bg-stone-100 text-stone-700",
            },
            {
              label: "Drives joined",
              value: driveTotal,
              detail: "Community activities",
              icon: Leaf,
              iconStyle: "bg-amber-100 text-amber-800",
            },
          ].map(({ label, value, detail, icon: Icon, iconStyle }) => (
            <div
              key={label}
              className="group rounded-2xl border border-emerald-950/[0.06] bg-white p-4 shadow-[0_8px_24px_rgba(27,82,64,0.04),0_2px_6px_rgba(0,0,0,0.02)] transition hover:border-emerald-900/20 sm:p-5"
            >
              <span
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full transition group-hover:scale-105 ${iconStyle}`}
              >
                <Icon size={19} aria-hidden="true" />
              </span>
              <p className="text-2xl font-bold tracking-tight text-stone-950">{value}</p>
              <p className="mt-1 text-xs font-semibold text-stone-700 sm:text-sm">{label}</p>
              <p className="mt-1 text-[11px] text-stone-500">{detail}</p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <section className="min-w-0 space-y-4 lg:col-span-8">
            <div className="rounded-2xl border border-emerald-950/[0.06] bg-white p-2 shadow-[0_8px_24px_rgba(27,82,64,0.04),0_2px_6px_rgba(0,0,0,0.02)]">
              <div
                className="flex gap-1 overflow-x-auto"
                role="tablist"
                aria-label="Profile sections"
              >
                {tabs.map(({ label, value, count, icon: Icon }) => {
                  const active = activeTab === value;
                  return (
                    <button
                      key={value}
                      id={`profile-tab-${value}`}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-controls={`profile-panel-${value}`}
                      onClick={() => {
                        setActiveTab(value);
                        setSearch("");
                        setActiveStatus("");
                      }}
                      className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                        active
                          ? "bg-emerald-950 text-white shadow-sm"
                          : "text-stone-600 hover:bg-stone-50 hover:text-emerald-950"
                      }`}
                    >
                      <Icon size={15} aria-hidden="true" />
                      {label}
                      {count !== undefined && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                            active ? "bg-white/15 text-white" : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeTab !== "activity" && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full min-w-0 sm:max-w-xs">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={
                      activeTab === "drives" ? "Filter your drives..." : "Filter by keyword..."
                    }
                    aria-label={`Filter ${activeTab}`}
                    className="w-full rounded-xl border border-emerald-950/10 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-800 shadow-sm outline-none placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                {activeTab === "reports" && (
                  <div className="flex flex-wrap items-center gap-2">
                    {REPORT_STATUSES.map((status) => (
                      <button
                        key={status.value || "all"}
                        type="button"
                        aria-pressed={activeStatus === status.value}
                        onClick={() => setActiveStatus(status.value)}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                          activeStatus === status.value
                            ? "bg-emerald-950 text-white"
                            : "border border-stone-200 bg-white text-stone-600 hover:border-emerald-900/30 hover:text-emerald-950"
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {actionError && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-800"
              >
                {actionError}
              </p>
            )}

            <div
              id={`profile-panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`profile-tab-${activeTab}`}
              className="space-y-4"
            >
              {activeTab === "reports" &&
                (visibleReports.length > 0 ? (
                  visibleReports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      canEdit
                      onDelete={handleDelete}
                      readOnlyInteractions
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-12 text-center">
                    <FileText className="mx-auto text-stone-400" size={24} aria-hidden="true" />
                    <h2 className="mt-3 text-base font-semibold text-stone-800">
                      {search || activeStatus ? "No reports match these filters" : "No reports yet"}
                    </h2>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
                      {search || activeStatus
                        ? "Try another keyword or status to find the report you’re looking for."
                        : "Create your first report to start sharing environmental issues with the community."}
                    </p>
                    {!search && !activeStatus && (
                      <Link
                        to="/reports/create-report"
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                      >
                        <Plus size={15} aria-hidden="true" />
                        Create a report
                      </Link>
                    )}
                  </div>
                ))}

              {activeTab === "drives" &&
                (visibleDrives.length > 0 ? (
                  visibleDrives.map((drive) => (
                    <Link
                      key={drive._id}
                      to={`/drives/${drive._id}`}
                      className="group flex flex-col gap-4 rounded-2xl border border-emerald-950/[0.06] bg-white p-4 shadow-[0_8px_24px_rgba(27,82,64,0.04),0_2px_6px_rgba(0,0,0,0.02)] transition hover:border-emerald-900/20 sm:flex-row sm:items-center sm:p-5"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-900/10 text-emerald-900">
                        <Leaf size={21} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-stone-900 transition group-hover:text-emerald-900">
                            {drive.title}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">
                            {formatLabel(drive.status)}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs text-stone-500">
                          {formatLabel(drive.type)}
                          {drive.issueLocation ? ` · ${drive.issueLocation}` : ""}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays size={13} aria-hidden="true" />
                            {formatDate(drive.startsAt, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          {drive.meetingPoint && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin size={13} aria-hidden="true" />
                              {drive.meetingPoint}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-sky-700 group-hover:text-sky-900">
                        View drive
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-12 text-center">
                    <Leaf className="mx-auto text-stone-400" size={24} aria-hidden="true" />
                    <h2 className="mt-3 text-base font-semibold text-stone-800">
                      {search ? "No drives match this search" : "No joined drives yet"}
                    </h2>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
                      {search
                        ? "Try a different keyword."
                        : "Join a community drive to take local environmental action together."}
                    </p>
                    {!search && (
                      <Link
                        to="/drives"
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                      >
                        Explore drives
                      </Link>
                    )}
                  </div>
                ))}

              {activeTab === "saved" &&
                (visibleSavedReports.length > 0 ? (
                  visibleSavedReports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      readOnlyInteractions
                      onUnsave={handleUnsave}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-12 text-center">
                    <Check className="mx-auto text-stone-400" size={24} aria-hidden="true" />
                    <h2 className="mt-3 text-base font-semibold text-stone-800">
                      {search ? "No saved reports match this search" : "No saved reports yet"}
                    </h2>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
                      Save reports from the feed to keep them handy here.
                    </p>
                    {!search && (
                      <Link
                        to="/feed"
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                      >
                        Browse the feed
                      </Link>
                    )}
                  </div>
                ))}

              {activeTab === "activity" && <ActivityFeed />}
            </div>

            {((activeTab === "reports" && reportsHaveMore && !search && !activeStatus) ||
              (activeTab === "saved" && savedHaveMore && !search)) && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="mx-auto block rounded-full border border-emerald-900/20 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </section>

          <aside className="space-y-4 lg:col-span-4">
            <section className="rounded-2xl border border-emerald-950/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(27,82,64,0.04),0_2px_6px_rgba(0,0,0,0.02)]">
              <h2 className="text-base font-bold text-stone-900">Your report status</h2>
              <p className="mt-1 text-xs text-stone-500">
                A quick view of the reports you’ve shared.
              </p>
              <div className="mt-4 space-y-3">
                {[
                  {
                    label: "Reported",
                    count: reports.filter((report) => report.status === "reported").length,
                    dot: "bg-red-500",
                  },
                  {
                    label: "In progress",
                    count: reports.filter((report) => report.status === "in-progress").length,
                    dot: "bg-amber-400",
                  },
                  {
                    label: "Resolved",
                    count: reports.filter((report) => report.status === "resolved").length,
                    dot: "bg-emerald-600",
                  },
                ].map(({ label, count, dot }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 text-stone-600">
                      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
                      {label}
                    </span>
                    <span className="font-semibold text-stone-800">{count}</span>
                  </div>
                ))}
              </div>
              {reportsHaveMore && (
                <p className="mt-3 border-t border-stone-100 pt-3 text-[11px] leading-relaxed text-stone-500">
                  Counts reflect the reports currently loaded. Load more reports to update them.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-emerald-950/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(27,82,64,0.04),0_2px_6px_rgba(0,0,0,0.02)]">
              <h2 className="text-base font-bold text-stone-900">Keep contributing</h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">
                Share an environmental concern or join a local drive to support action in your
                community.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  to="/reports/create-report"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-800"
                >
                  <Plus size={15} aria-hidden="true" />
                  Create a report
                </Link>
                <Link
                  to="/drives"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-emerald-950 transition hover:bg-stone-50"
                >
                  <Leaf size={15} aria-hidden="true" />
                  Explore community drives
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Profile;

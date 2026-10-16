import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  TrendingUp,
  MapPin,
  CalendarDays,
  Flame,
  Search,
  SlidersHorizontal,
  AlertTriangle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ReportCard from "../components/ReportCard";
import ActivityFeed from "../components/ActivityFeed";
import api from "../services/api";

const CATEGORIES = [
  { label: "Pollution", value: "pollution" },
  { label: "Waste", value: "waste" },
  { label: "Water", value: "water" },
  { label: "Deforestation", value: "deforestation" },
];
const STATUSES = [
  { label: "Reported", value: "reported" },
  { label: "In Progress", value: "in-progress" },
  { label: "Resolved", value: "resolved" },
];

const FILTERS = [
  { label: "Nearby", icon: MapPin, key: "nearby" },
  { label: "Recent", icon: Clock, key: "recent" },
  { label: "Trending", icon: TrendingUp, key: "trending" },
];
const PAGE_SIZE = 10;
const TRENDING_ZONE_PREVIEW_COUNT = 3;

const formatLabel = (value) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDriveDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

function mapReport(report) {
  return {
    id: report._id,
    title: report.title,
    description: report.details,
    category: report.category,
    location: report.placename,
    status: report.status,
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
  };
}

export default function Feed() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("nearby");
  const [activeCategories, setActiveCategories] = useState([]);
  const [activeStatuses, setActiveStatuses] = useState([]);
  const [rawReports, setRawReports] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [myReportCount, setMyReportCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFetchingReports, setIsFetchingReports] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [supportError, setSupportError] = useState(null);
  const [supportingReportId, setSupportingReportId] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [savingReportId, setSavingReportId] = useState(null);
  const [commentError, setCommentError] = useState(null);
  const [commentingReportId, setCommentingReportId] = useState(null);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  const isAuthenticated = Boolean(localStorage.getItem("token"));
  const [drives, setDrives] = useState([]);
  const [joinedDriveCount, setJoinedDriveCount] = useState(0);
  const [loadingDrives, setLoadingDrives] = useState(isAuthenticated);
  const [drivesError, setDrivesError] = useState(null);
  const [trendingZones, setTrendingZones] = useState([]);
  const [showAllTrendingZones, setShowAllTrendingZones] = useState(false);
  const [loadingTrendingZones, setLoadingTrendingZones] = useState(true);
  const [trendingZonesError, setTrendingZonesError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadTrendingZones = async () => {
      setLoadingTrendingZones(true);
      setTrendingZonesError(null);
      try {
        const response = await api.get("/reports/trending-zones", {
          signal: controller.signal,
        });
        setTrendingZones(response.data.data || []);
      } catch (requestError) {
        if (requestError.code !== "ERR_CANCELED") {
          setTrendingZonesError(
            requestError.response?.data?.message || "Unable to load trending zones.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoadingTrendingZones(false);
      }
    };

    loadTrendingZones();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();
    const fetchDrives = async () => {
      try {
        setLoadingDrives(true);
        setDrivesError(null);
        const response = await api.get("/drives", {
          params: { status: "upcoming", joined: true, limit: 5 },
          signal: controller.signal,
        });
        setDrives(response.data.data || []);
        setJoinedDriveCount(response.data.pagination?.joinedTotal ?? 0);
      } catch (requestError) {
        if (requestError.code !== "ERR_CANCELED") {
          setDrivesError(requestError.response?.data?.message || "Unable to load your Drives");
        }
      } finally {
        if (!controller.signal.aborted) setLoadingDrives(false);
      }
    };
    fetchDrives();
    return () => controller.abort();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!localStorage.getItem("token")) return;

    api
      .get("/me")
      .then((response) => setCurrentUser(response.data || null))
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();

    activeCategories.forEach((category) => params.append("category", category));
    activeStatuses.forEach((status) => params.append("status", status));
    if (search.trim()) params.set("search", search.trim());
    if (activeFilter === "recent") params.set("sort", "recent");
    params.set("page", page);
    params.set("limit", PAGE_SIZE);

    const loadReports = async () => {
      try {
        setIsFetchingReports(true);
        setLoadingMore(page > 1);
        setError(null);
        const response = await api.get("/reports/get-reports", {
          params,
          signal: controller.signal,
        });
        const fetchedReports = (response.data.data || []).map(mapReport);
        setRawReports((previousReports) =>
          page === 1 ? fetchedReports : [...previousReports, ...fetchedReports],
        );
        setMyReportCount(response.data.myReportCount || 0);
        setHasMore(response.data.pagination?.hasMore || false);
      } catch (err) {
        if (err.code !== "ERR_CANCELED") {
          setError(err.response?.data?.message || "Unable to load the feed");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setIsFetchingReports(false);
          setLoadingMore(false);
        }
      }
    };

    loadReports();
    return () => controller.abort();
  }, [activeCategories, activeStatuses, activeFilter, search, page]);

  const reports = useMemo(() => {
    const newestFirst = (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();

    if (activeFilter === "recent") {
      return [...rawReports].sort(newestFirst);
    }

    if (activeFilter === "trending") {
      return [...rawReports].sort((first, second) => {
        const engagementDifference =
          second.supportCount + second.commentCount - (first.supportCount + first.commentCount);

        return engagementDifference || newestFirst(first, second);
      });
    }

    return rawReports;
  }, [rawReports, activeFilter]);

  const handleSupport = async (report) => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    setSupportError(null);
    setSupportingReportId(report.id);

    try {
      const response = report.supportedByCurrentUser
        ? await api.delete(`/reports/${report.id}/support`)
        : await api.post(`/reports/${report.id}/support`);
      const { count, supportedByCurrentUser } = response.data.data;

      setRawReports((previousReports) =>
        previousReports.map((item) =>
          item.id === report.id ? { ...item, supportCount: count, supportedByCurrentUser } : item,
        ),
      );
      setActivityRefreshKey((key) => key + 1);
    } catch (err) {
      setSupportError(err.response?.data?.message || "Unable to update support. Please try again.");
    } finally {
      setSupportingReportId(null);
    }
  };

  const handleSave = async (report) => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    setSaveError(null);
    setSavingReportId(report.id);

    try {
      const response = report.savedByCurrentUser
        ? await api.delete(`/reports/${report.id}/save`)
        : await api.post(`/reports/${report.id}/save`);

      const { savedByCurrentUser } = response.data.data;

      setRawReports((previousReports) =>
        previousReports.map((item) =>
          item.id === report.id ? { ...item, savedByCurrentUser } : item,
        ),
      );
      setActivityRefreshKey((key) => key + 1);
    } catch (err) {
      setSaveError(err.response?.data?.message || "Unable to update saved report.");
    } finally {
      setSavingReportId(null);
    }
  };

  const handleComment = async (report, content) => {
    if (!currentUser) {
      navigate("/login");
      return false;
    }

    setCommentError(null);
    setCommentingReportId(report.id);

    try {
      const response = await api.post(`/reports/${report.id}/comments`, { content });
      const { comment, count } = response.data.data;
      const newPreviewComment = {
        id: comment._id,
        author: currentUser.name || currentUser.username || "You",
        text: comment.content,
      };

      setRawReports((previousReports) =>
        previousReports.map((item) =>
          item.id === report.id
            ? {
                ...item,
                commentCount: count,
                comments: [newPreviewComment, ...item.comments].slice(0, 2),
              }
            : item,
        ),
      );
      setActivityRefreshKey((key) => key + 1);
      return true;
    } catch (err) {
      setCommentError(err.response?.data?.message || "Unable to post comment. Please try again.");
      return false;
    } finally {
      setCommentingReportId(null);
    }
  };

  const user = currentUser || { name: "Guest", username: "", role: "Visitor" };

  const toggleCategory = (cat) => {
    setPage(1);
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const toggleStatus = (status) => {
    setPage(1);
    setActiveStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  const selectFilter = (filter) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const searchZone = (zoneName) => {
    setActiveFilter("recent");
    setSearch(zoneName);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setActiveCategories([]);
    setActiveStatuses([]);
    setActiveFilter("nearby");
    setPage(1);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f0] font-feed text-stone-800">
      <Navbar user={user} />

      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-start gap-5 px-4 py-5 sm:px-6 lg:grid-cols-12 xl:gap-6">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:col-span-3">
          <section className="rounded-2xl border border-emerald-950/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(27,82,64,0.04),0_2px_6px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full object-cover ring-4 ring-emerald-50"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-900 font-feed text-lg font-semibold text-white ring-4 ring-emerald-50">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-emerald-950">{user.name}</h2>
                <p className="mt-0.5 text-xs text-stone-500">{formatLabel(user.role)}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-stone-600">
              Every local observation helps build a healthier, more resilient community.
            </p>
            <div className="mt-4 flex items-center justify-around border-t border-stone-100 pt-4 text-center">
              <div>
                <p className="font-feed text-2xl font-semibold text-emerald-950">
                  {myReportCount}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                  Reports shared
                </p>
              </div>
              <span className="h-8 w-px bg-stone-200" aria-hidden="true" />
              <div>
                <p className="font-feed text-2xl font-semibold text-emerald-950">
                  {loadingDrives || drivesError ? "—" : joinedDriveCount}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                  Drives joined
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-950/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(27,82,64,0.04),0_2px_6px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-950">
                <SlidersHorizontal size={15} aria-hidden="true" />
                Issue filters
              </h2>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-sky-700 transition hover:text-sky-900 hover:underline"
              >
                Reset
              </button>
            </div>

            <div className="mt-4">
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
                Categories
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  aria-pressed={activeCategories.length === 0}
                  onClick={() => {
                    setActiveCategories([]);
                    setPage(1);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                    activeCategories.length === 0
                      ? "bg-emerald-900/10 text-emerald-950"
                      : "text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <span>All issues</span>
                  {activeCategories.length === 0 && (
                    <span className="h-2 w-2 rounded-full bg-emerald-800" />
                  )}
                </button>
                {CATEGORIES.map((category) => {
                  const active = activeCategories.includes(category.value);
                  return (
                    <button
                      key={category.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleCategory(category.value)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                        active
                          ? "bg-emerald-900/10 font-semibold text-emerald-950"
                          : "text-stone-600 hover:bg-stone-50 hover:text-emerald-900"
                      }`}
                    >
                      <span>{category.label}</span>
                      {active && <span className="h-2 w-2 rounded-full bg-emerald-800" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 border-t border-stone-100 pt-4">
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
                Status
              </p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((status) => {
                  const active = activeStatuses.includes(status.value);
                  return (
                    <button
                      key={status.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleStatus(status.value)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                        active
                          ? "border-emerald-900/20 bg-emerald-900/10 text-emerald-950"
                          : "border-stone-200 bg-white text-stone-600 hover:border-emerald-800/30 hover:text-emerald-900"
                      }`}
                    >
                      {formatLabel(status.label)}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </aside>

        <main className="flex flex-col gap-4 lg:col-span-6">
          <section className="flex flex-col gap-3 rounded-2xl border border-emerald-950/[0.06] bg-white p-3.5 shadow-[0_8px_24px_rgba(27,82,64,0.04),0_2px_6px_rgba(0,0,0,0.02)] sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Search reports, locations, or categories..."
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                aria-label="Search environmental reports"
                className="w-full rounded-xl border border-emerald-950/[0.08] bg-[#f6f7f3] py-2.5 pl-10 pr-3 text-sm text-stone-800 placeholder:text-stone-500 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <Link
              to="/reports/create-report"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#c95031] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#ad4025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c95031]"
            >
              <AlertTriangle size={15} aria-hidden="true" />
              Report issue
            </Link>
          </section>

          <section
            aria-label="Feed sorting"
            className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map(({ label, icon: Icon, key }) => {
                const active = activeFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectFilter(key)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                      active
                        ? "bg-emerald-950 text-white shadow-sm"
                        : "border border-emerald-950/[0.07] bg-white text-stone-600 hover:text-emerald-950"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-stone-500" aria-live="polite">
              {reports.length} {reports.length === 1 ? "report" : "reports"}
              {search.trim() ? " found" : ""}
            </p>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}
          {(supportError || saveError || commentError) && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-800"
            >
              {supportError || saveError || commentError}
            </p>
          )}

          <div className="flex flex-col gap-4">
            {loading && reports.length === 0 ? (
              <div
                role="status"
                className="rounded-2xl border border-emerald-950/[0.06] bg-white p-6 text-sm text-stone-500 shadow-sm"
              >
                Loading community reports...
              </div>
            ) : (
              reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  isAuthenticated={Boolean(currentUser)}
                  onSupport={handleSupport}
                  supporting={supportingReportId === report.id}
                  onSave={handleSave}
                  saving={savingReportId === report.id}
                  onComment={handleComment}
                  commenting={commentingReportId === report.id}
                />
              ))
            )}
          </div>

          {!loading && !error && reports.length === 0 && (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-12 text-center">
              <h2 className="font-feed text-xl font-semibold text-emerald-950">
                No reports match these filters
              </h2>
              <p className="mt-2 text-sm text-stone-500">
                Try a different search or clear your filters to see more community reports.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 rounded-full bg-emerald-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
              >
                Clear filters
              </button>
            </div>
          )}

          {hasMore && reports.length > 0 && (
            <button
              type="button"
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={isFetchingReports}
              className="self-center rounded-full border border-emerald-900/15 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? "Loading more reports..." : "Load more reports"}
            </button>
          )}
        </main>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:col-span-3">
          {currentUser && <ActivityFeed compact refreshKey={activityRefreshKey} />}
          <section className="rounded-2xl border border-emerald-950/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(27,82,64,0.04),0_2px_6px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-950">
                <Flame size={16} className="text-[#c95031]" />
                Trending hotspots
              </h2>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">
                Live
              </span>
            </div>
            <p className="mb-3 mt-3 text-xs leading-relaxed text-stone-500">
              Active report locations from the last 30 days
            </p>
            {loadingTrendingZones ? (
              <p role="status" className="text-xs text-stone-500">
                Loading trending hotspots...
              </p>
            ) : trendingZonesError ? (
              <p role="alert" className="text-xs text-red-700">
                {trendingZonesError}
              </p>
            ) : trendingZones.length === 0 ? (
              <p className="rounded-xl bg-stone-50 px-3 py-4 text-xs text-stone-500">
                No active report hotspots yet.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  {(showAllTrendingZones
                    ? trendingZones
                    : trendingZones.slice(0, TRENDING_ZONE_PREVIEW_COUNT)
                  ).map((zone) => (
                    <button
                      key={zone.name}
                      type="button"
                      onClick={() => searchZone(zone.name)}
                      className="group flex w-full items-start justify-between gap-3 rounded-xl p-2.5 text-left transition hover:bg-[#f6f7f3]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-stone-800 transition group-hover:text-emerald-800">
                          {zone.name}
                        </span>
                        <span className="mt-1 block text-[11px] text-stone-500">
                          {zone.reportCount} active {zone.reportCount === 1 ? "report" : "reports"}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                          zone.reportCount >= 20
                            ? "bg-[#c95031]/10 text-[#a83e24]"
                            : zone.reportCount >= 10
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-900/10 text-emerald-900"
                        }`}
                      >
                        {zone.reportCount >= 20
                          ? "High"
                          : zone.reportCount >= 10
                            ? "Elevated"
                            : "Active"}
                      </span>
                    </button>
                  ))}
                </div>
                {trendingZones.length > TRENDING_ZONE_PREVIEW_COUNT && (
                  <button
                    type="button"
                    aria-expanded={showAllTrendingZones}
                    onClick={() => setShowAllTrendingZones((expanded) => !expanded)}
                    className="mt-2 w-full rounded-lg px-2 py-2 text-center text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                  >
                    {showAllTrendingZones
                      ? "Show less"
                      : `View all ${trendingZones.length} hotspots`}
                  </button>
                )}
              </>
            )}
          </section>

          <section className="rounded-2xl border border-emerald-950/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(27,82,64,0.04),0_2px_6px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-950">
                <CalendarDays size={16} className="text-emerald-800" />
                Upcoming drives
              </h2>
              <Link to="/drives" className="text-xs font-semibold text-sky-700 hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-3">
              {!isAuthenticated ? (
                <p className="text-xs leading-relaxed text-stone-500">
                  <Link to="/login" className="font-semibold text-emerald-800 hover:underline">
                    Sign in
                  </Link>{" "}
                  to see the drives you have joined.
                </p>
              ) : loadingDrives ? (
                <p role="status" className="text-xs text-stone-500">
                  Loading your drives...
                </p>
              ) : drivesError ? (
                <p role="alert" className="text-xs text-red-700">
                  {drivesError}
                </p>
              ) : drives.length === 0 ? (
                <p className="rounded-xl bg-stone-50 px-3 py-4 text-xs leading-relaxed text-stone-500">
                  You haven&apos;t joined any upcoming drives.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {drives.map((drive) => (
                    <Link
                      key={drive._id}
                      to={`/drives/${drive._id}`}
                      className="flex items-center gap-3 rounded-xl bg-[#f6f7f3] p-3 transition hover:bg-emerald-50"
                    >
                      <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-emerald-900 text-white">
                        <span className="text-[8px] font-bold uppercase tracking-wide">
                          {new Date(drive.startsAt).toLocaleDateString("en-US", { month: "short" })}
                        </span>
                        <span className="text-sm font-bold leading-none">
                          {new Date(drive.startsAt).getDate()}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-stone-800">
                          {drive.title}
                        </span>
                        <span className="mt-1 block text-[11px] text-stone-500">
                          {formatDriveDate(drive.startsAt)}
                          {drive.maxParticipants ? ` · ${drive.maxParticipants} spots` : ""}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <footer className="mt-8 border-t border-emerald-950/[0.06] bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            <span className="mr-2 font-feed text-base font-bold text-emerald-950">
              Parisara
            </span>
            Community action for environmental stewardship.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to="/drives" className="transition hover:text-emerald-800">
              Community drives
            </Link>
            <Link to="/reports/create-report" className="transition hover:text-emerald-800">
              Report an issue
            </Link>
            <Link to="/activity" className="transition hover:text-emerald-800">
              My activity
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

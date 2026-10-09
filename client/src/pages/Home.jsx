import { useEffect, useMemo, useState } from "react";
import { Clock, TrendingUp, MapPin, CalendarDays, Flame, Search } from "lucide-react";
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

// Static placeholder — swap for a GET /api/v1/zones?trending=true later.
const TRENDING_ZONES = [
  { name: "Mill Creek Trail", reports: 12, priority: "High" },
  { name: "Oakridge Park", reports: 7, priority: "Medium" },
  { name: "Cedar Creek Greenbelt", reports: 5, priority: "Medium" },
];



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

  const [drives, setDrives] = useState([]);
  const [loadingDrives, setLoadingDrives] = useState(true);
  const [drivesError, setDrivesError] = useState(null);
  const isAuthenticated = Boolean(localStorage.getItem("token"));

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
  }, [activeCategories, activeStatuses, search, page]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8 text-center text-stone-500">Loading feed...</div>
    );
  }

  if (error) {
    return <div className="min-h-screen bg-stone-50 p-8 text-center text-red-600">{error}</div>;
  }

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

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Navbar user={user} />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* left: profile + category filter */}
        <aside className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-20">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-emerald-900 truncate">{user.name}</div>
              <div className="text-xs text-stone-400">{formatLabel(user.role)}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-4 grid grid-cols-3 text-center divide-x divide-stone-200">
            <div>
              <div className="font-bold text-emerald-900">{myReportCount}</div>
              <div className="text-xs text-stone-400">Reports</div>
            </div>
            <div>
              <div className="font-bold text-emerald-900">0</div>
              <div className="text-xs text-stone-400">Drives</div>
            </div>
            <div>
              <div className="font-bold text-emerald-900">0</div>
              <div className="text-xs text-stone-400">Impact</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <h3 className="text-sm font-bold text-emerald-900 mb-3">Filters</h3>
            <p className="text-xs font-semibold text-stone-400 mb-2">Category</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map((category) => {
                const active = activeCategories.includes(category.value);
                return (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => toggleCategory(category.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      active
                        ? "bg-emerald-800 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs font-semibold text-stone-400 mb-2">Status</p>
            <div className="flex flex-col gap-1.5">
              {STATUSES.map((status) => (
                <label
                  key={status.value}
                  className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={activeStatuses.includes(status.value)}
                    onChange={() => toggleStatus(status.value)}
                    className="rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  {status.label}
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* centre: feed */}
        <main className="lg:col-span-6 flex flex-col gap-6">
          <section className="bg-white rounded-2xl border border-stone-200 p-3 sticky top-20 z-10">
            <div className="mb-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="text"
                  placeholder="Search reports, places, categories..."
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3 text-sm text-stone-700 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map(({ label, icon: Icon, key }) => {
                const active = activeFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveFilter(key)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
                      active
                        ? "bg-emerald-900 text-white"
                        : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="flex flex-col gap-6">
            {(supportError || saveError || commentError) && (
              <p role="alert" className="text-sm text-red-700">
                {supportError || saveError || commentError}
              </p>
            )}
            {reports.map((report) => (
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
            ))}
          </div>

          {reports.length === 0 && (
            <div className="text-center py-16 text-stone-400 text-sm">
              No reports yet — be the first to report an issue nearby.
            </div>
          )}

          {hasMore && reports.length > 0 && (
            <button
              type="button"
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={isFetchingReports}
              className="self-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </main>

        {/* right: upcoming drives or events [future scope] */}
        <aside className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-20">
          {currentUser && <ActivityFeed compact refreshKey={activityRefreshKey} />}
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <h3 className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2">
              <Flame size={16} className="text-emerald-700" />
              Trending Zones
            </h3>
            <div className="flex flex-col gap-3">
              {TRENDING_ZONES.map((zone) => (
                <div key={zone.name} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-emerald-900">{zone.name}</div>
                    <div className="text-xs text-stone-400">{zone.reports} active reports</div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      zone.priority === "High"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {zone.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <h3 className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2">
              <CalendarDays size={16} className="text-emerald-700" />
              Your Upcoming Drives
            </h3>
            {!isAuthenticated ? (
              <div className="text-xs text-stone-500">
                <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
                  Sign in
                </Link>{" "}
                to see the Drives you have joined.
              </div>
            ) : loadingDrives ? (
              <div className="text-xs text-stone-400">Loading drives...</div>
            ) : drivesError ? (
              <div className="text-xs text-red-600">{drivesError}</div>
            ) : drives.length === 0 ? (
              <div className="text-xs text-stone-400">You haven&apos;t joined any upcoming Drives.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {drives.map((drive) => (
                  <Link
                    key={drive._id}
                    to={`/drives/${drive._id}`}
                    className="text-sm cursor-pointer hover:bg-stone-50 p-1 -mx-1 rounded transition-colors"
                  >
                    <div className="font-medium text-emerald-900">{drive.title}</div>
                    <div className="text-xs text-stone-400">
                      {formatDriveDate(drive.startsAt)}
                      {drive.maxParticipants ? ` · ${drive.maxParticipants} max spots` : ""}
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <Link
              to="/drives"
              className="block w-full mt-3 py-2 text-center text-xs font-bold text-emerald-700 hover:underline"
            >
              View all drives →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

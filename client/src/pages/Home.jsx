import { useEffect, useMemo, useState } from "react";
import { Clock, TrendingUp, MapPin, CalendarDays, Flame } from "lucide-react";
import Navbar from "../components/Navbar";
import ReportCard from "../components/ReportCard";
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

// Static placeholder — swap for a GET /api/v1/zones?trending=true later.
const TRENDING_ZONES = [
  { name: "Mill Creek Trail", reports: 12, priority: "High" },
  { name: "Oakridge Park", reports: 7, priority: "Medium" },
  { name: "Cedar Creek Greenbelt", reports: 5, priority: "Medium" },
];

// Static placeholder — swap for a GET /api/v1/drives?upcoming=true later.
const UPCOMING_DRIVES = [
  { title: "Riverside Cleanup", date: "Sat, Sep 27", spots: 8 },
  { title: "Community Sapling Plant", date: "Sun, Oct 5", spots: 15 },
];

const formatLabel = (value) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

function mapReport(report) {
  return {
    id: report._id,
    title: report.title,
    description: report.details,
    category: report.category,
    location: report.placename,
    status: report.status,
    image: report.images?.[0] || null,
    likes: report.likes?.length || 0,
    shares: 0,
    author: { name: report.reportedBy?.name || report.reportedBy?.username || "Anonymous" },
    authorId: report.reportedBy?._id,
    createdAt: report.createdAt,
    comments: (report.comments || []).map((comment) => ({
      author: comment.username?.name || comment.username?.username || "Community member",
      text: comment.text,
    })),
  };
}

export default function Feed() {
  const [activeFilter, setActiveFilter] = useState("nearby");
  const [activeCategories, setActiveCategories] = useState([]);
  const [activeStatuses, setActiveStatuses] = useState([]);
  const [rawReports, setRawReports] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadFeed = async () => {
      try {
        const [profileResponse, reportsResponse] = await Promise.all([
          api.get("/me"),
          api.get("/reports/get-reports"),
        ]);

        setCurrentUser(profileResponse.data);
        setRawReports((reportsResponse.data.data || []).map(mapReport));
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load the feed");
      } finally {
        setLoading(false);
      }
    };

    loadFeed();
  }, []);

  const reports = useMemo(
    () =>
      rawReports.filter((report) => {
        const categoryMatches =
          activeCategories.length === 0 || activeCategories.includes(report.category);
        const statusMatches = activeStatuses.length === 0 || activeStatuses.includes(report.status);

        return categoryMatches && statusMatches;
      }),
    [rawReports, activeCategories, activeStatuses],
  );

  const myReportCount = rawReports.filter((report) => report.authorId === currentUser?._id).length;
  const user = currentUser || { name: "", username: "", role: "user" };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8 text-center text-stone-500">Loading feed...</div>
    );
  }

  if (error) {
    return <div className="min-h-screen bg-stone-50 p-8 text-center text-red-600">{error}</div>;
  }

  const toggleCategory = (cat) => {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const toggleStatus = (status) => {
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
          <section className="bg-white rounded-2xl border border-stone-200 p-3 flex flex-wrap items-center gap-2 sticky top-20 z-10">
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
          </section>

          <div className="flex flex-col gap-6">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>

          {reports.length === 0 && (
            <div className="text-center py-16 text-stone-400 text-sm">
              No reports yet — be the first to report an issue nearby.
            </div>
          )}
        </main>

        {/* right: upcoming drives or events [future scope] */}
        <aside className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-20">
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
              Upcoming Drives
            </h3>
            <div className="flex flex-col gap-3">
              {UPCOMING_DRIVES.map((drive) => (
                <div key={drive.title} className="text-sm">
                  <div className="font-medium text-emerald-900">{drive.title}</div>
                  <div className="text-xs text-stone-400">
                    {drive.date} · {drive.spots} spots open
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="w-full mt-3 py-2 text-center text-xs font-bold text-emerald-700 hover:underline"
            >
              View all drives →
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

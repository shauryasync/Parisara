import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, FileText, MessageCircle, ThumbsUp } from "lucide-react";
import api from "../services/api";

const activityDetails = {
  report_created: {
    label: "You reported",
    icon: FileText,
    color: "text-orange-700",
    marker: "bg-orange-600",
  },
  report_supported: {
    label: "You supported",
    icon: ThumbsUp,
    color: "text-emerald-800",
    marker: "bg-emerald-700",
  },
  comment_created: {
    label: "You commented on",
    icon: MessageCircle,
    color: "text-slate-600",
    marker: "bg-slate-500",
  },
  report_saved: {
    label: "You saved",
    icon: Bookmark,
    color: "text-emerald-800",
    marker: "bg-emerald-700",
  },
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const timeUnits = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

const formatRelativeTime = (dateString) => {
  const elapsedSeconds = (new Date(dateString).getTime() - Date.now()) / 1000;

  if (!Number.isFinite(elapsedSeconds)) return "";

  const unit = timeUnits.find(([, seconds]) => Math.abs(elapsedSeconds) >= seconds);
  if (!unit) return relativeTimeFormatter.format(Math.round(elapsedSeconds), "second");

  return relativeTimeFormatter.format(Math.round(elapsedSeconds / unit[1]), unit[0]);
};

const ActivityFeed = ({ compact = false, refreshKey = 0 }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    const loadActivities = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/activity");
        if (isCurrent) setActivities(response.data.data || []);
      } catch (loadError) {
        if (isCurrent) {
          setError(loadError.response?.data?.message || "Could not load your activity.");
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    loadActivities();

    return () => {
      isCurrent = false;
    };
  }, [reloadCount, refreshKey]);

  const visibleActivities = compact ? activities.slice(0, 4) : activities;
  const Heading = compact ? "h2" : "h1";

  return (
    <section
      aria-labelledby="activity-feed-heading"
      className={compact ? "rounded-xl border border-stone-200 bg-white p-4" : ""}
    >
      <div className={compact ? "mb-3 flex items-center justify-between gap-3" : "mb-5"}>
        <div>
          <Heading
            id="activity-feed-heading"
            className={
              compact ? "text-sm font-bold text-emerald-900" : "text-2xl font-bold text-emerald-950"
            }
          >
            {compact ? "Your activity" : "My activity"}
          </Heading>
          {!compact && (
            <p className="mt-1 text-sm text-stone-500">
              Your recent contributions to the community
            </p>
          )}
        </div>
        {compact && (
          <Link
            to="/activity"
            className="shrink-0 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
          >
            View all
          </Link>
        )}
      </div>

      {loading ? (
        <p
          className={
            compact
              ? "text-sm text-stone-500"
              : "rounded-xl border border-stone-200 bg-white px-5 py-8 text-sm text-stone-500"
          }
        >
          Loading your activity...
        </p>
      ) : error ? (
        <div
          className={compact ? "text-sm" : "rounded-xl border border-red-200 bg-white px-5 py-8"}
          role="alert"
        >
          <p className="text-sm text-red-800">{error}</p>
          <button
            type="button"
            onClick={() => setReloadCount((count) => count + 1)}
            className="mt-3 text-sm font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950"
          >
            Try again
          </button>
        </div>
      ) : activities.length === 0 ? (
        <div
          className={
            compact
              ? "py-2"
              : "rounded-xl border border-dashed border-stone-300 bg-white px-5 py-12 text-center"
          }
        >
          <p className="font-semibold text-stone-700">No activity yet</p>
          {!compact && (
            <p className="mt-1 text-sm text-stone-500">
              Reports you create, support, comment on, or save will appear here.
            </p>
          )}
        </div>
      ) : (
        <ol
          className={
            compact
              ? "divide-y divide-stone-200"
              : "divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white px-5"
          }
        >
          {visibleActivities.map((activity) => {
            const details = activityDetails[activity.action];
            if (!details) return null;

            const Icon = details.icon;
            const reportTitle = activity.report?.title || "a report";
            const relativeTime = formatRelativeTime(activity.createdAt);

            return (
              <li
                key={activity._id}
                className={
                  compact
                    ? "flex gap-3 py-3 first:pt-1 last:pb-1"
                    : "flex gap-4 py-5 first:pt-5 last:pb-5"
                }
              >
                <span
                  className={`mt-1 flex shrink-0 items-center justify-center rounded-full bg-stone-100 ${compact ? "h-7 w-7" : "h-9 w-9"} ${details.color}`}
                  aria-hidden="true"
                >
                  <Icon size={compact ? 14 : 17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className={`flex flex-wrap items-baseline gap-x-1.5 gap-y-1 ${compact ? "text-xs" : "text-sm"}`}
                  >
                    <span className="font-medium text-stone-700">{details.label}</span>
                    {activity.report?._id ? (
                      <Link
                        to={`/reports/${activity.report._id}`}
                        className="font-semibold text-emerald-950 underline decoration-stone-300 underline-offset-2 hover:decoration-emerald-700"
                      >
                        {reportTitle}
                      </Link>
                    ) : (
                      <span className="font-semibold text-emerald-950">{reportTitle}</span>
                    )}
                  </div>
                  {activity.action === "comment_created" && activity.comment?.content && (
                    <p
                      className={`mt-1.5 break-words text-stone-600 ${compact ? "text-xs" : "text-sm"}`}
                    >
                      &ldquo;{activity.comment.content}&rdquo;
                    </p>
                  )}
                  <time dateTime={activity.createdAt} className="mt-1 block text-xs text-stone-500">
                    {relativeTime}
                    {!compact && activity.report?.placename
                      ? ` · ${activity.report.placename}`
                      : ""}
                  </time>
                </div>
                <span
                  className={`mt-2 h-2 w-2 shrink-0 rounded-full ${details.marker}`}
                  aria-hidden="true"
                />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

export default ActivityFeed;

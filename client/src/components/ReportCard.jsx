import { useState } from "react";
import {
  MapPin,
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  Send,
  Pencil,
  Trash2,
  CalendarDays,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ReportImageGallery from "./ReportImageGallery";

const CATEGORY_STYLES = {
  water: "bg-teal-100 text-teal-800",
  waste: "bg-amber-100 text-amber-800",
  pollution: "bg-emerald-100 text-emerald-800",
  deforestation: "bg-emerald-900 text-emerald-50",
  other: "bg-stone-100 text-stone-700",
};

const STATUS_STYLES = {
  reported: "bg-red-500",
  "in-progress": "bg-amber-400",
  resolved: "bg-emerald-600",
};

function timeAgo(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  if (!Number.isFinite(diffMs)) return "Recently";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 0) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const formatLabel = (value) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const ReportCard = ({
  report,
  canEdit = false,
  onDelete,
  isAuthenticated = Boolean(localStorage.getItem("token")),
  onSupport,
  supporting = false,
  onSave,
  saving = false,
  onComment,
  commenting = false,
  readOnlyInteractions = false,
  onUnsave,
}) => {
  const navigate = useNavigate();

  const [comment, setComment] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const catStyle = CATEGORY_STYLES[report.category] || "bg-stone-100 text-stone-700";
  const authorName =
    typeof report.author?.name === "string" && report.author.name.trim()
      ? report.author.name.trim()
      : "Community member";
  const comments = report.comments || [];
  const linkedDrives = report.linkedDrives || [];
  const supportCount = report.supportCount ?? report.likes ?? 0;
  const commentCount = report.commentCount ?? comments.length;
  const statusDotStyle = STATUS_STYLES[report.status] || "bg-stone-400";
  const reportImages = report.images?.length
    ? report.images
    : report.image
      ? [report.image]
      : [];

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    const content = comment.trim();

    if (!content) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const sent = await onComment?.(report, content);
    if (sent) setComment("");
  };

  const openComments = () => navigate(`/reports/${report.id}#comments`);

  const handleShare = async () => {
    setShareMessage("");
    const shareData = {
      title: report.title,
      url: `${window.location.origin}/reports/${report.id}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        setShareMessage("Link copied to clipboard.");
      } else {
        setShareMessage("Sharing is unavailable in this browser.");
      }
    } catch (shareError) {
      if (shareError.name !== "AbortError") {
        setShareMessage("Could not share this report.");
      }
    }
  };

  return (
    <article className="rounded-2xl border border-emerald-950/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(27,82,64,0.04),0_2px_6px_rgba(0,0,0,0.02)] transition hover:border-emerald-900/20 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-900 ring-1 ring-emerald-900/10">
            {authorName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-stone-900">{authorName}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-stone-500">
              <span>{timeAgo(report.createdAt)}</span>
              {report.location && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex min-w-0 items-center gap-1 truncate">
                    <MapPin size={12} className="shrink-0 text-emerald-700" />
                    {report.location}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${catStyle}`}>
            {formatLabel(report.category)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-700">
            <span className={`h-2 w-2 rounded-full ${statusDotStyle}`} />
            {formatLabel(report.status)}
          </span>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/reports/${report.id}/edit`)}
                aria-label="Edit report"
                title="Edit report"
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-emerald-700"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(report.id)}
                aria-label="Delete report"
                title="Delete report"
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-emerald-700"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h2 className="font-feed text-xl font-semibold leading-snug text-emerald-950">
          <button
            type="button"
            onClick={() => navigate(`/reports/${report.id}`)}
            className="text-left transition hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            {report.title}
          </button>
        </h2>
        {report.description && (
          <p className="mt-2 text-sm leading-relaxed text-stone-600">{report.description}</p>
        )}
      </div>

      {reportImages.length > 0 ? (
        <ReportImageGallery images={reportImages} title={report.title} />
      ) : (
        <button
          type="button"
          onClick={() => navigate(`/reports/${report.id}`)}
          aria-label={`Open report: ${report.title}`}
          className="mt-4 flex h-44 w-full items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500 transition hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          No photo attached
        </button>
      )}

      {linkedDrives.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {linkedDrives.map((drive) => (
            <Link
              key={drive.id}
              to={`/drives/${drive.id}`}
              className="flex items-center gap-3 rounded-xl border border-emerald-950/[0.06] bg-[#f6f7f3] p-3 transition hover:border-emerald-900/20 hover:bg-emerald-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-900 text-white">
                <CalendarDays size={17} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-emerald-950">
                  {drive.title}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-stone-500">
                  {drive.startsAt && (
                    <span>
                      {new Date(drive.startsAt).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  {drive.meetingPoint && (
                    <>
                      {drive.startsAt && <span aria-hidden="true">·</span>}
                      <span className="inline-flex min-w-0 items-center gap-1 truncate">
                        <MapPin size={11} className="shrink-0" aria-hidden="true" />
                        {drive.meetingPoint}
                      </span>
                    </>
                  )}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-emerald-900/10 px-2 py-1 text-[10px] font-semibold text-emerald-900">
                {formatLabel(drive.status)}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-100 pt-3.5 text-sm">
        {readOnlyInteractions ? (
          <>
            <span className="flex items-center gap-1.5 text-stone-600">
              <ThumbsUp size={16} />
              <span>{supportCount} supports</span>
            </span>
            <span className="flex items-center gap-1.5 text-stone-600">
              <MessageCircle size={16} />
              <span>{commentCount} comments</span>
            </span>
            <span className="flex items-center gap-1.5 text-stone-600">
              <Share2 size={16} />
              <span>{report.shares || 0} shares</span>
            </span>
            {onUnsave && (
              <button
                type="button"
                onClick={() => onUnsave(report)}
                aria-label={`Remove ${report.title} from saved reports`}
                title="Remove saved report"
                className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-800 transition hover:bg-stone-100"
              >
                <Bookmark size={16} fill="currentColor" />
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSupport?.(report)}
              disabled={supporting || !onSupport}
              aria-pressed={Boolean(report.supportedByCurrentUser)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                report.supportedByCurrentUser
                  ? "bg-emerald-900/10 text-emerald-900"
                  : "bg-stone-100 text-stone-600 hover:bg-emerald-900/10 hover:text-emerald-900"
              }`}
            >
              <ThumbsUp size={15} fill={report.supportedByCurrentUser ? "currentColor" : "none"} />
              <span>{supportCount} supports</span>
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={openComments}
                aria-label={`View ${commentCount} comments on ${report.title}`}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-100 hover:text-emerald-800"
              >
                <MessageCircle size={15} />
                <span>{commentCount} comments</span>
              </button>
              <button
                type="button"
                onClick={() => onSave?.(report)}
                disabled={saving || !onSave}
                aria-pressed={Boolean(report.savedByCurrentUser)}
                aria-label={report.savedByCurrentUser ? "Remove saved report" : "Save report"}
                title={report.savedByCurrentUser ? "Remove saved report" : "Save report"}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition disabled:opacity-60 ${
                  report.savedByCurrentUser
                    ? "text-emerald-800"
                    : "text-stone-500 hover:bg-stone-100 hover:text-emerald-800"
                }`}
              >
                <Bookmark size={16} fill={report.savedByCurrentUser ? "currentColor" : "none"} />
              </button>
              <button
                type="button"
                onClick={handleShare}
                aria-label={`Share ${report.title}`}
                title="Share report"
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-emerald-800"
              >
                <Share2 size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {!readOnlyInteractions && shareMessage && (
        <p role="status" className="mt-2 text-xs text-stone-500">
          {shareMessage}
        </p>
      )}

      {!readOnlyInteractions && comments.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 rounded-xl bg-stone-50 p-3 text-sm">
          {comments.slice(0, 2).map((c, i) => (
            <div key={c.id || i}>
              <span className="font-bold text-emerald-900 mr-1.5">{c.author}:</span>
              <span className="text-stone-600">{c.text}</span>
            </div>
          ))}
          {commentCount > comments.length && (
            <button
              type="button"
              onClick={openComments}
              className="text-left text-xs font-bold text-emerald-700 hover:underline mt-1"
            >
              View all {commentCount} comments
            </button>
          )}
        </div>
      )}

      {!readOnlyInteractions && isAuthenticated ? (
        <form
          onSubmit={handleCommentSubmit}
          className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-3"
        >
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            aria-label={`Add a comment to ${report.title}`}
            className="min-w-0 flex-1 rounded-full border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="submit"
            disabled={!comment.trim() || commenting || !onComment}
            aria-label="Send comment"
            title="Send comment"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-white transition hover:bg-emerald-800 disabled:opacity-40"
          >
            <Send size={14} aria-hidden="true" />
          </button>
        </form>
      ) : !readOnlyInteractions ? (
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mt-3 border-t border-stone-100 pt-3 text-left text-sm font-semibold text-emerald-800 hover:text-emerald-600"
        >
          Sign in to comment
        </button>
      ) : null}
    </article>
  );
};

export default ReportCard;

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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const CATEGORY_STYLES = {
  water: "bg-teal-100 text-teal-800",
  waste: "bg-amber-100 text-amber-800",
  pollution: "bg-emerald-100 text-emerald-800",
  deforestation: "bg-emerald-900 text-emerald-50",
  other: "bg-stone-100 text-stone-700",
};

function timeAgo(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
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
}) => {
  const navigate = useNavigate();

  const [comment, setComment] = useState("");
  const catStyle = CATEGORY_STYLES[report.category] || "bg-stone-100 text-stone-700";
  const authorName =
    typeof report.author?.name === "string" && report.author.name.trim()
      ? report.author.name.trim()
      : "Community member";
  const comments = report.comments || [];
  const supportCount = report.supportCount ?? report.likes ?? 0;
  const commentCount = report.commentCount ?? comments.length;

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

  return (
    <article className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 flex flex-col hover:shadow-md transition">
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-semibold flex-shrink-0">
            {authorName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-emerald-900 truncate">{authorName}</div>
            <div className="text-xs text-stone-400">{timeAgo(report.createdAt)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${catStyle}`}>
            {formatLabel(report.category)}
          </span>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/reports/${report.id}/edit`)}
                aria-label="Edit report"
                title="Edit report"
                className="w-8 h-8 rounded-full text-stone-500 flex items-center justify-center hover:bg-stone-100 hover:text-emerald-700 transition"
              >
                <Pencil size={16} />
              </button>

              <button
                type="button"
                onClick={() => onDelete(report.id)}
                aria-label="Delete report"
                title="Delete report"
                className="w-8 h-8 rounded-full text-stone-500 flex items-center justify-center hover:bg-stone-100 hover:text-emerald-700 transition"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {report.image ? (
        <button
          type="button"
          onClick={() => navigate(`/reports/${report.id}`)}
          aria-label={`Open report: ${report.title}`}
          className="relative w-full h-52 rounded-xl overflow-hidden mb-4 bg-stone-100 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          <img src={report.image} alt={report.title} className="w-full h-full object-cover" />
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur text-emerald-900 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            {formatLabel(report.status)}
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => navigate(`/reports/${report.id}`)}
          aria-label={`Open report: ${report.title}`}
          className="w-full h-52 rounded-xl mb-4 bg-stone-100 flex items-center justify-center text-stone-400 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          No photo attached
        </button>
      )}

      <h2 className="font-bold text-emerald-900 mb-1.5 leading-tight">
        <button
          type="button"
          onClick={() => navigate(`/reports/${report.id}`)}
          className="text-left hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          {report.title}
        </button>
      </h2>
      <p className="text-sm text-stone-500 mb-2.5 line-clamp-2">{report.description}</p>

      <div className="flex items-center gap-1.5 text-stone-500 mb-4 text-sm">
        <MapPin size={16} className="text-emerald-600" />
        <span>{report.location}</span>
      </div>

      <div className="flex items-center justify-between py-2.5 border-y border-stone-200 text-sm mb-3">
        <button
          type="button"
          onClick={() => onSupport?.(report)}
          disabled={supporting || !onSupport}
          aria-pressed={Boolean(report.supportedByCurrentUser)}
          className={`flex items-center gap-1.5 font-semibold transition disabled:opacity-60 ${
            report.supportedByCurrentUser
              ? "text-emerald-700"
              : "text-stone-500 hover:text-emerald-700"
          }`}
        >
          <ThumbsUp size={16} fill={report.supportedByCurrentUser ? "currentColor" : "none"} />
          <span>{supportCount} support</span>
        </button>
        <button
          type="button"
          onClick={openComments}
          aria-label={`View ${commentCount} comments on ${report.title}`}
          className="flex items-center gap-1.5 text-stone-500 hover:text-emerald-700 transition"
        >
          <MessageCircle size={16} />
          <span>{commentCount} comments</span>
        </button>
        <button
          type="button"
          onClick={() => onSave?.(report)}
          disabled={saving || !onSave}
          aria-pressed={Boolean(report.savedByCurrentUser)}
          aria-label={report.savedByCurrentUser ? "Remove saved report" : "Save report"}
          className={`flex items-center gap-1.5 font-semibold transition disabled:opacity-60 ${
            report.savedByCurrentUser ? "text-emerald-700" : "text-stone-500 hover:text-emerald-700"
          }`}
        >
          <Bookmark size={16} fill={report.savedByCurrentUser ? "currentColor" : "none"} />
          <span>{report.savedByCurrentUser ? "Saved" : "Save"}</span>
        </button>
        <button className="flex items-center gap-1.5 text-stone-500 hover:text-emerald-700 transition">
          <Share2 size={16} />
          <span>{report.shares} shares</span>
        </button>
      </div>

      {comments.length > 0 && (
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-stone-50 mb-3 text-sm">
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

      {isAuthenticated ? (
        <form
          onSubmit={handleCommentSubmit}
          className="flex items-center gap-2 pt-2 border-t border-stone-200"
        >
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            aria-label={`Add a comment to ${report.title}`}
            className="flex-1 bg-white border border-stone-300 rounded-full px-3.5 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
          />
          <button
            type="submit"
            disabled={!comment.trim() || commenting || !onComment}
            aria-label="Send comment"
            title="Send comment"
            className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 transition"
          >
            <Send size={14} aria-hidden="true" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="pt-2 border-t border-stone-200 text-left text-sm font-semibold text-emerald-800 hover:text-emerald-600"
        >
          Sign in to comment
        </button>
      )}
    </article>
  );
};

export default ReportCard;

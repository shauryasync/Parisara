import { useState } from "react";
import { MapPin, ThumbsUp, MessageCircle, Share2, Send } from "lucide-react";

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

const ReportCard = ({ report }) => {
  const [comment, setComment] = useState("");
  const catStyle = CATEGORY_STYLES[report.category] || "bg-stone-100 text-stone-700";

  return (
    <article className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 flex flex-col hover:shadow-md transition">
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-semibold flex-shrink-0">
            {report.author.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-emerald-900 truncate">{report.author.name}</div>
            <div className="text-xs text-stone-400">{timeAgo(report.createdAt)}</div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${catStyle}`}>
          {formatLabel(report.category)}
        </span>
      </div>

      {report.image ? (
        <div className="relative w-full h-52 rounded-xl overflow-hidden mb-4 bg-stone-100">
          <img src={report.image} alt={report.title} className="w-full h-full object-cover" />
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur text-emerald-900 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            {formatLabel(report.status)}
          </div>
        </div>
      ) : (
        <div className="w-full h-52 rounded-xl mb-4 bg-stone-100 flex items-center justify-center text-stone-400 text-sm">
          No photo attached
        </div>
      )}

      <h2 className="font-bold text-emerald-900 mb-1.5 leading-tight hover:text-emerald-700 cursor-pointer">
        {report.title}
      </h2>
      <p className="text-sm text-stone-500 mb-2.5 line-clamp-2">{report.description}</p>

      <div className="flex items-center gap-1.5 text-stone-500 mb-4 text-sm">
        <MapPin size={16} className="text-emerald-600" />
        <span>{report.location}</span>
      </div>

      <div className="flex items-center justify-between py-2.5 border-y border-stone-200 text-sm mb-3">
        <button className="flex items-center gap-1.5 text-emerald-800 font-semibold hover:text-emerald-600 transition">
          <ThumbsUp size={16} />
          <span>{report.likes} likes</span>
        </button>
        <button className="flex items-center gap-1.5 text-stone-500 hover:text-emerald-700 transition">
          <MessageCircle size={16} />
          <span>{report.comments.length} comments</span>
        </button>
        <button className="flex items-center gap-1.5 text-stone-500 hover:text-emerald-700 transition">
          <Share2 size={16} />
          <span>{report.shares} shares</span>
        </button>
      </div>

      {report.comments.length > 0 && (
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-stone-50 mb-3 text-sm">
          {report.comments.slice(0, 2).map((c, i) => (
            <div key={i}>
              <span className="font-bold text-emerald-900 mr-1.5">{c.author}:</span>
              <span className="text-stone-600">{c.text}</span>
            </div>
          ))}
          {report.comments.length > 2 && (
            <button className="text-left text-xs font-bold text-emerald-700 hover:underline mt-1">
              View all {report.comments.length} comments
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-stone-200">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-white border border-stone-300 rounded-full px-3.5 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
        />
        <button
          type="button"
          disabled={!comment.trim()}
          className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 transition"
        >
          <Send size={14} />
        </button>
      </div>
    </article>
  );
};

export default ReportCard;

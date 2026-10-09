import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Info,
  ExternalLink,
  MessageSquare,
  Send,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "../services/api";

const formatDriveDate = (dateString) => {
  if (!dateString) return "TBD";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDriveType = (type) => {
  if (!type) return "";
  return type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatCommentDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function DriveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [drive, setDrive] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [outcomeText, setOutcomeText] = useState("");

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  useEffect(() => {
    let isActive = true;
    const fetchDriveAndUser = async () => {
      setLoading(true);
      setError("");
      try {
        const [driveRes, userRes] = await Promise.all([
          api.get(`/drives/${id}`),
          localStorage.getItem("token") ? api.get("/me").catch(() => null) : Promise.resolve(null),
        ]);
        if (isActive) {
          setDrive(driveRes.data.data);
          setCurrentUser(userRes?.data || null);
        }
      } catch (err) {
        if (isActive) {
          setError(err.response?.data?.message || "Error fetching the drive details.");
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchDriveAndUser();
    return () => {
      isActive = false;
    };
  }, [id]);

  useEffect(() => {
    let isActive = true;
    const fetchComments = async () => {
      setCommentsLoading(true);
      setCommentsError("");
      try {
        const res = await api.get(`/drives/${id}/comments`);
        if (isActive) {
          setComments(res.data.data || []);
        }
      } catch (err) {
        if (isActive) {
          setCommentsError("Could not load comments.");
        }
      } finally {
        if (isActive) setCommentsLoading(false);
      }
    };

    fetchComments();
    return () => {
      isActive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8 text-center text-stone-500">
        Loading drive details...
      </div>
    );
  }

  if (error) {
    return <div className="min-h-screen bg-stone-50 p-8 text-center text-red-600">{error}</div>;
  }

  if (!drive) return null;

  const handleJoin = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setActionLoading(true);
    setActionError("");
    try {
      const res = await api.post(`/drives/${id}/join`);
      setDrive((prev) => ({
        ...prev,
        participantCount: res.data.data.participantCount,
        isJoined: res.data.data.isJoined,
      }));
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not join drive.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setActionLoading(true);
    setActionError("");
    try {
      const res = await api.delete(`/drives/${id}/join`);
      setDrive((prev) => ({
        ...prev,
        participantCount: res.data.data.participantCount,
        isJoined: res.data.data.isJoined,
      }));
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not leave drive.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDrive = async () => {
    if (!window.confirm("Are you sure you want to cancel this drive?")) return;
    setActionLoading(true);
    setActionError("");
    try {
      const res = await api.patch(`/drives/${id}/cancel`);
      setDrive((prev) => ({
        ...prev,
        ...res.data.data,
      }));
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not cancel drive.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteDrive = async () => {
    setActionLoading(true);
    setActionError("");
    try {
      const res = await api.patch(`/drives/${id}/complete`, { outcome: outcomeText });
      setDrive((prev) => ({
        ...prev,
        ...res.data.data,
      }));
      setShowCompleteModal(false);
      setOutcomeText("");
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not complete drive.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await api.post(`/drives/${id}/comments`, { content: newCommentText.trim() });
      setComments((prev) => [...prev, res.data.data]);
      setNewCommentText("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to post comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    setDeletingCommentId(commentId);
    try {
      await api.delete(`/drives/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete comment.");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const isOrganizer =
    currentUser && (drive.organizer?._id === currentUser._id || drive.organizer === currentUser._id);

  const isCoOrganizer =
    currentUser && drive.coOrganizers?.some((c) => (c._id || c) === currentUser._id);

  const canManage = isOrganizer || isCoOrganizer;

  const organizerName = drive.organizer?.name || drive.organizer?.username || "Unknown Organizer";

  const getStatusBadge = () => {
    switch (drive.status) {
      case "ongoing":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock size={12} /> Ongoing
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <XCircle size={12} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600">
            Upcoming
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link
          to="/feed"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-emerald-700 transition mb-6"
        >
          <ArrowLeft size={16} />
          Back to Feed
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden mb-8">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                {formatDriveType(drive.type)}
              </span>
              {getStatusBadge()}
            </div>

            <h1 className="text-3xl font-bold text-emerald-950 mb-4">{drive.title}</h1>

            <div className="flex flex-wrap gap-y-3 gap-x-6 text-sm text-stone-600 mb-8 border-b border-stone-100 pb-6">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-stone-400" />
                <span>{formatDriveDate(drive.startsAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-stone-400" />
                <span>{drive.meetingPoint}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={18} className="text-stone-400" />
                <span>
                  {drive.participantCount || 0} joined
                  {drive.maxParticipants ? ` / ${drive.maxParticipants} max` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Info size={18} className="text-stone-400" />
                <span>Organized by {organizerName}</span>
              </div>
            </div>

            {drive.status === "cancelled" && (
              <div className="bg-red-50 rounded-xl p-5 border border-red-200 mb-8">
                <h3 className="text-sm font-bold text-red-950 mb-1 flex items-center gap-2">
                  <XCircle size={16} className="text-red-600" /> Drive Cancelled
                </h3>
                <p className="text-sm text-red-800">
                  This drive has been cancelled by the organizer.
                </p>
              </div>
            )}

            {drive.status === "completed" && (
              <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200 mb-8">
                <h3 className="text-sm font-bold text-emerald-950 mb-2 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" /> Drive Completed
                </h3>
                <p className="text-sm text-emerald-900">
                  {drive.outcome || "This community drive has been successfully completed!"}
                </p>
              </div>
            )}

            <div className="prose prose-stone max-w-none mb-8">
              <h2 className="text-xl font-semibold text-emerald-900 mb-3">About this Drive</h2>
              <p className="whitespace-pre-wrap">{drive.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {drive.requiredMaterials && drive.requiredMaterials.length > 0 && (
                <div className="bg-stone-50 rounded-xl p-5 border border-stone-200">
                  <h3 className="text-sm font-bold text-emerald-900 mb-3">Required Materials</h3>
                  <ul className="list-disc list-inside text-sm text-stone-600 space-y-1">
                    {drive.requiredMaterials.map((material, idx) => (
                      <li key={idx}>{material}</li>
                    ))}
                  </ul>
                </div>
              )}

              {drive.coOrganizers && drive.coOrganizers.length > 0 && (
                <div className="bg-stone-50 rounded-xl p-5 border border-stone-200">
                  <h3 className="text-sm font-bold text-emerald-900 mb-3">Co-Organizers</h3>
                  <ul className="list-disc list-inside text-sm text-stone-600 space-y-1">
                    {drive.coOrganizers.map((co) => (
                      <li key={co._id}>{co.name || co.username}</li>
                    ))}
                  </ul>
                </div>
              )}

              {drive.contactInformation && (
                <div className="bg-stone-50 rounded-xl p-5 border border-stone-200 md:col-span-2">
                  <h3 className="text-sm font-bold text-emerald-900 mb-2">Contact Information</h3>
                  <p className="text-sm text-stone-600">{drive.contactInformation}</p>
                </div>
              )}
            </div>

            {drive.report && (
              <div className="border-t border-stone-200 pt-6 mt-6">
                <h3 className="text-sm font-bold text-emerald-900 mb-3">Linked Report</h3>
                <Link
                  to={`/reports/${typeof drive.report === "object" ? drive.report._id : drive.report}`}
                  className="inline-flex items-center gap-2 text-sm text-emerald-700 font-medium hover:underline bg-emerald-50 px-4 py-3 rounded-lg w-full border border-emerald-100"
                >
                  <ExternalLink size={16} />
                  {typeof drive.report === "object" && drive.report.title
                    ? drive.report.title
                    : "View original issue"}
                </Link>
              </div>
            )}

            {actionError && (
              <div className="mt-6 text-sm text-red-600 font-medium p-3 bg-red-50 rounded-lg border border-red-100">
                {actionError}
              </div>
            )}

            {drive.status !== "completed" && drive.status !== "cancelled" && (
              <div className="mt-6 bg-stone-50 rounded-xl p-6 border border-stone-200">
                {canManage ? (
                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                    <div>
                      <h4 className="font-bold text-emerald-900">Manage Drive</h4>
                      <p className="text-xs text-stone-500">You are an organizer for this drive.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      {drive.status === "upcoming" && (
                        <button
                          type="button"
                          onClick={handleCancelDrive}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50"
                        >
                          Cancel Drive
                        </button>
                      )}
                      {(drive.status === "ongoing" || new Date() >= new Date(drive.startsAt)) && (
                        <button
                          type="button"
                          onClick={() => setShowCompleteModal(true)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                          Complete Drive
                        </button>
                      )}
                    </div>
                  </div>
                ) : drive.isJoined ? (
                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                    <div>
                      <h4 className="font-bold text-emerald-900">You're in!</h4>
                      <p className="text-xs text-stone-500">You are participating in this drive.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLeave}
                      disabled={actionLoading}
                      className="w-full sm:w-auto px-4 py-2 bg-stone-200 text-stone-700 rounded-lg text-sm font-semibold hover:bg-stone-300 transition disabled:opacity-50"
                    >
                      {actionLoading ? "Leaving..." : "Leave Drive"}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                    <div>
                      <h4 className="font-bold text-emerald-900">Join this drive</h4>
                      <p className="text-xs text-stone-500">Commit to helping out.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleJoin}
                      disabled={
                        actionLoading ||
                        (drive.maxParticipants && drive.participantCount >= drive.maxParticipants)
                      }
                      className="w-full sm:w-auto px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                      {actionLoading
                        ? "Joining..."
                        : drive.maxParticipants && drive.participantCount >= drive.maxParticipants
                        ? "Drive Full"
                        : "Join Drive"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {showCompleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200">
              <h3 className="text-lg font-bold text-emerald-950 mb-2">Complete Drive</h3>
              <p className="text-sm text-stone-600 mb-4">
                Mark this drive as completed and optionally add an outcome summary.
              </p>
              <textarea
                value={outcomeText}
                onChange={(e) => setOutcomeText(e.target.value)}
                placeholder="e.g. Cleared 200kg of waste with 15 volunteers!"
                className="w-full p-3 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4 resize-none h-24"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompleteDrive}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Confirm Complete"}
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 md:p-8">
          <h2 className="text-xl font-bold text-emerald-950 mb-6 flex items-center gap-2">
            <MessageSquare size={20} className="text-emerald-700" /> Drive Coordination Comments
          </h2>

          {currentUser ? (
            <form onSubmit={handleAddComment} className="mb-8">
              <div className="flex flex-col gap-3">
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Ask a question or offer to bring materials..."
                  className="w-full p-3 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-20"
                  required
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingComment || !newCommentText.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    <Send size={14} />
                    {submittingComment ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 text-center mb-8">
              <p className="text-sm text-stone-600">
                <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
                  Sign in
                </Link>{" "}
                to join the discussion and coordinate with participants.
              </p>
            </div>
          )}

          {commentsLoading ? (
            <div className="text-center py-6 text-sm text-stone-500">Loading comments...</div>
          ) : commentsError ? (
            <div className="text-center py-6 text-sm text-red-600">{commentsError}</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-sm text-stone-500 bg-stone-50 rounded-xl">
              No comments yet. Be the first to start the conversation!
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const authorName = comment.user?.name || comment.user?.username || "Community Member";
                const isAuthor =
                  currentUser &&
                  (comment.user?._id === currentUser._id || comment.user === currentUser._id);
                return (
                  <div
                    key={comment._id}
                    className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-emerald-950">{authorName}</span>
                        <span className="text-xs text-stone-400">
                          {formatCommentDate(comment.createdAt)}
                        </span>
                      </div>
                      {isAuthor && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment._id)}
                          disabled={deletingCommentId === comment._id}
                          className="text-stone-400 hover:text-red-600 transition p-1"
                          title="Delete comment"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-stone-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

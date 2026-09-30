import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Share2, ThumbsUp, MapPin, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../services/api";

const ReportDetail = () => {
  const { id } = useParams();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [actionError, setActionError] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [supporting, setSupporting] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      setFetchError("");
      setActionError("");
      setReport(null);

      try {
        const response = await api.get(`/reports/get-reports/${id}`);
        setReport(response.data.data);
      } catch (requestError) {
        setFetchError(requestError.response?.data?.message || "Error fetching the report.");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [id]);

  useEffect(() => {
    let isActive = true;

    const loadComments = async () => {
      setCommentsError("");
      setCommentsLoading(true);
      setComments([]);

      try {
        const [commentsResponse, profileResponse] = await Promise.all([
          api.get(`/reports/${id}/comments`),
          localStorage.getItem("token") ? api.get("/me").catch(() => null) : Promise.resolve(null),
        ]);

        if (isActive) {
          setComments(commentsResponse.data.data.comments || []);
          setCurrentUser(profileResponse?.data || null);
        }
      } catch (error) {
        if (isActive) {
          setCommentsError(error.response?.data?.message || "Could not load comments.");
        }
      } finally {
        if (isActive) setCommentsLoading(false);
      }
    };

    loadComments();

    return () => {
      isActive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!loading && report && window.location.hash === "#comments") {
      document.getElementById("comments")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading, report]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    const content = commentText.trim();

    if (!content) return;
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    setSubmittingComment(true);
    setCommentsError("");

    try {
      const response = await api.post(`/reports/${id}/comments`, { content });
      const newComment = response.data.data.comment;
      const commentForList = {
        ...newComment,
        user: currentUser || { _id: newComment.user, name: "You" },
      };

      setComments((currentComments) => [commentForList, ...currentComments]);
      setCommentText("");
    } catch (error) {
      setCommentsError(error.response?.data?.message || "Could not add your comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    setDeletingCommentId(commentId);
    setCommentsError("");

    try {
      await api.delete(`/reports/comments/${commentId}`);
      setComments((currentComments) =>
        currentComments.filter((comment) => comment._id !== commentId),
      );
    } catch (error) {
      setCommentsError(error.response?.data?.message || "Could not delete this comment.");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleSupport = async () => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    setSupporting(true);
    setActionError("");
    try {
      const response = report.supportedByCurrentUser
        ? await api.delete(`/reports/${id}/support`)
        : await api.post(`/reports/${id}/support`);

      const supportData = response.data.data;

      setReport((currentReport) => ({
        ...currentReport,
        supportCount: supportData.count,
        supportedByCurrentUser: supportData.supportedByCurrentUser,
      }));
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || "Could not update support.");
    } finally {
      setSupporting(false);
    }
  };

  const handleShare = async () => {
    setShareMessage("");
    const shareData = { title: report.title, url: window.location.href };

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

  if (loading) return <p role="status">Loading report...</p>;
  if (fetchError) return <p role="alert">{fetchError}</p>;
  if (!report) return null;

  const author = report.reportedBy?.name || report.reportedBy?.username || "Community Member";

  const status = report.status?.replace(/-/g, " ") || "Unknown";
  const coordinates = report.geo?.coordinates;
  const hasCoordinates =
    Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(Number.isFinite);
  const mapPlace = hasCoordinates
    ? `${coordinates[1]}, ${coordinates[0]}`
    : report.placename?.trim();
  const mapURL = mapPlace
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapPlace)}&output=embed`
    : "";

  return (
    <div
      className="min-h-screen bg-stone-50 px-4 py-6 text-stone-800 sm:px-6"
      data-report-id={id}
      aria-busy={loading}
    >
      <div className="mx-auto max-w-6xl">
        <Link
          to="/feed"
          className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-stone-600 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
        >
          <ArrowLeft size={18} aria-hidden="true" /> Back to reports
        </Link>

        <header className="relative flex min-h-64 items-end overflow-hidden rounded-lg bg-stone-800 sm:min-h-80">
          {report.images?.[0] && (
            <img
              src={report.images[0]}
              alt={report.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="relative p-5 text-white sm:p-8">
            <div className="mb-3 flex gap-2 text-xs font-semibold">
              <span className="rounded bg-emerald-100 px-2.5 py-1 text-emerald-950 capitalize">
                {status}
              </span>
              <span className="rounded bg-white/90 px-2.5 py-1 text-stone-800 capitalize">
                {report.category}
              </span>
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">{report.title}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <MapPin size={16} />
              {report.placename}
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-900"
                  aria-hidden="true"
                >
                  {author.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm">
                    Reported by <strong>{author}</strong>
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                    <CalendarDays size={14} aria-hidden="true" />
                    {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share report"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
                >
                  <Share2 size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleSupport}
                  disabled={supporting}
                  aria-pressed={Boolean(report.supportedByCurrentUser)}
                  aria-label={report.supportedByCurrentUser ? "Remove support" : "Support report"}
                  className="flex min-h-10 items-center gap-2 rounded-full bg-stone-100 px-3.5 text-sm font-semibold hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:opacity-60"
                >
                  <ThumbsUp size={17} aria-hidden="true" />
                  {report.supportCount || 0}
                </button>
              </div>
            </section>

            {(actionError || shareMessage) && (
              <p role={actionError ? "alert" : "status"} className="text-sm text-stone-600">
                {actionError || shareMessage}
              </p>
            )}

            <section className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-stone-900">Description</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-600">
                {report.details}
              </p>
            </section>

            <section
              id="comments"
              className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6"
              aria-labelledby="comments-heading"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 id="comments-heading" className="text-lg font-semibold text-stone-900">
                  Comments <span className="text-stone-500">({comments.length})</span>
                </h2>
              </div>

              {commentsError && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {commentsError}
                </p>
              )}

              {localStorage.getItem("token") ? (
                <form onSubmit={handleSubmitComment} className="mt-4">
                  <label htmlFor="comment-content" className="sr-only">
                    Write a comment
                  </label>
                  <textarea
                    id="comment-content"
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="Write a comment..."
                    rows={3}
                    maxLength={1000}
                    className="w-full resize-y rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={!commentText.trim() || submittingComment}
                      className="min-h-10 rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submittingComment ? "Posting..." : "Post comment"}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="mt-4 text-sm text-stone-600">
                  <Link to="/login" className="font-semibold text-emerald-800 hover:underline">
                    Sign in
                  </Link>{" "}
                  to add a comment.
                </p>
              )}

              {commentsLoading ? (
                <p role="status" className="mt-5 text-sm text-stone-500">
                  Loading comments...
                </p>
              ) : comments.length === 0 ? (
                <p className="mt-5 text-sm text-stone-500">No comments yet.</p>
              ) : (
                <div className="mt-5 divide-y divide-stone-200">
                  {comments.map((comment) => {
                    const commentUserId = comment.user?._id || comment.user;
                    const isOwner =
                      currentUser?._id && String(commentUserId) === String(currentUser._id);
                    const commentAuthor =
                      comment.user?.name || comment.user?.username || "Community member";

                    return (
                      <article key={comment._id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-stone-900">{commentAuthor}</p>
                            <time
                              dateTime={comment.createdAt}
                              className="mt-0.5 block text-xs text-stone-500"
                            >
                              {new Date(comment.createdAt).toLocaleString()}
                            </time>
                          </div>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment._id)}
                              disabled={deletingCommentId === comment._id}
                              aria-label="Delete your comment"
                              title="Delete your comment"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-stone-700">
                          {comment.content}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            <h2 className="border-b border-stone-200 px-4 py-3 font-semibold text-stone-900">
              Location
            </h2>
            {mapURL ? (
              <iframe
                title={`Map showing ${report.placename || "report location"}`}
                src={mapURL}
                loading="lazy"
                className="h-56 w-full border-0 bg-stone-100"
              />
            ) : (
              <div className="flex h-56 items-center justify-center bg-stone-100 px-5 text-center text-sm text-stone-500">
                No location is available for this report.
              </div>
            )}
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-stone-600">
              <MapPin size={16} className="shrink-0 text-emerald-800" aria-hidden="true" />
              {report.placename || "Location not provided"}
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ReportDetail;

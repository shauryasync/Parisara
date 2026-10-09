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
  Pencil,
  UserPlus,
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

const toDateTimeInputValue = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const fetchDriveParticipants = async (driveId) => {
  const response = await api.get(`/drives/${driveId}/participants`);
  return response.data.data;
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
  const [participants, setParticipants] = useState([]);
  const [participantsDriveId, setParticipantsDriveId] = useState(null);
  const [participantsError, setParticipantsError] = useState("");
  const [editingDetails, setEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [editData, setEditData] = useState(null);
  const [coOrganizerUserId, setCoOrganizerUserId] = useState("");
  const [coOrganizerLoading, setCoOrganizerLoading] = useState(false);
  const [coOrganizerError, setCoOrganizerError] = useState("");

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

    fetchDriveParticipants(id)
      .then((data) => {
        if (isActive) {
          setParticipants(data.participants || []);
          setParticipantsError("");
          setParticipantsDriveId(id);
        }
      })
      .catch((requestError) => {
        if (isActive) {
          setParticipantsError(
            requestError.response?.data?.message || "Could not load the participant list.",
          );
          setParticipantsDriveId(id);
        }
      });

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
      } catch {
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
      try {
        const participantData = await fetchDriveParticipants(id);
        setParticipants(participantData.participants || []);
        setParticipantsError("");
        setParticipantsDriveId(id);
      } catch (requestError) {
        setParticipantsError(
          requestError.response?.data?.message || "Could not refresh the participant list.",
        );
      }
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
      try {
        const participantData = await fetchDriveParticipants(id);
        setParticipants(participantData.participants || []);
        setParticipantsError("");
        setParticipantsDriveId(id);
      } catch (requestError) {
        setParticipantsError(
          requestError.response?.data?.message || "Could not refresh the participant list.",
        );
      }
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
    setCommentsError("");
    try {
      const res = await api.post(`/drives/${id}/comments`, { content: newCommentText.trim() });
      setComments((prev) => [...prev, res.data.data]);
      setNewCommentText("");
    } catch (err) {
      setCommentsError(err.response?.data?.message || "Failed to post comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    setDeletingCommentId(commentId);
    setCommentsError("");
    try {
      await api.delete(`/drives/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      setCommentsError(err.response?.data?.message || "Failed to delete comment.");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const refreshDrive = async () => {
    const response = await api.get(`/drives/${id}`);
    setDrive(response.data.data);
  };

  const openEditForm = () => {
    setEditData({
      title: drive.title || "",
      type: drive.type || "cleanup",
      description: drive.description || "",
      startsAt: toDateTimeInputValue(drive.startsAt),
      endsAt: toDateTimeInputValue(drive.endsAt),
      issueLocation: drive.issueLocation || "",
      meetingPoint: drive.meetingPoint || "",
      maxParticipants: drive.maxParticipants ?? "",
      requiredMaterials: (drive.requiredMaterials || []).join(", "),
      contactInformation: drive.contactInformation || "",
      organizerNote: drive.organizerNote || "",
    });
    setEditingDetails(true);
    setActionError("");
  };

  const handleSaveDetails = async (event) => {
    event.preventDefault();
    setActionError("");
    const startsAt = new Date(editData.startsAt);
    const endsAt = new Date(editData.endsAt);
    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime()) ||
      endsAt <= startsAt
    ) {
      setActionError("Choose valid start and end dates, with the end after the start.");
      return;
    }

    const maxParticipants =
      editData.maxParticipants === "" ? null : Number(editData.maxParticipants);
    if (maxParticipants !== null && (!Number.isInteger(maxParticipants) || maxParticipants < 1)) {
      setActionError("The participant limit must be a positive whole number.");
      return;
    }

    setSavingDetails(true);
    try {
      await api.patch(`/drives/${id}`, {
        title: editData.title.trim(),
        type: editData.type,
        description: editData.description.trim(),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        issueLocation: editData.issueLocation.trim(),
        meetingPoint: editData.meetingPoint.trim(),
        maxParticipants,
        requiredMaterials: editData.requiredMaterials
          .split(/[,\n]/)
          .map((material) => material.trim())
          .filter(Boolean),
        contactInformation: editData.contactInformation.trim(),
        organizerNote: editData.organizerNote.trim(),
      });
      await refreshDrive();
      setEditingDetails(false);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || "Could not update Drive details.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleAddCoOrganizer = async (event) => {
    event.preventDefault();
    setCoOrganizerError("");
    setCoOrganizerLoading(true);
    try {
      await api.post(`/drives/${id}/co-organizers`, { userId: coOrganizerUserId.trim() });
      await refreshDrive();
      setCoOrganizerUserId("");
    } catch (requestError) {
      setCoOrganizerError(
        requestError.response?.data?.message || "Could not add the co-organizer.",
      );
    } finally {
      setCoOrganizerLoading(false);
    }
  };

  const handleRemoveCoOrganizer = async (userId) => {
    setCoOrganizerError("");
    setCoOrganizerLoading(true);
    try {
      await api.delete(`/drives/${id}/co-organizers/${userId}`);
      await refreshDrive();
    } catch (requestError) {
      setCoOrganizerError(
        requestError.response?.data?.message || "Could not remove the co-organizer.",
      );
    } finally {
      setCoOrganizerLoading(false);
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

            {canManage && (
              <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-emerald-950">Drive management</h2>
                    <p className="mt-1 text-sm text-stone-500">
                      Update details and manage up to two co-organizers.
                    </p>
                  </div>
                  {!editingDetails && (
                    <button
                      type="button"
                      onClick={openEditForm}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                    >
                      <Pencil size={15} />
                      Edit details
                    </button>
                  )}
                </div>

                {editingDetails && (
                  <form onSubmit={handleSaveDetails} className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-stone-700 sm:col-span-2">
                      Title
                      <input
                        value={editData.title}
                        onChange={(event) =>
                          setEditData((current) => ({ ...current, title: event.target.value }))
                        }
                        maxLength={120}
                        required
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
                      />
                    </label>
                    <label className="text-sm font-semibold text-stone-700">
                      Drive type
                      <select
                        value={editData.type}
                        onChange={(event) =>
                          setEditData((current) => ({ ...current, type: event.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-normal"
                      >
                        {[
                          ["cleanup", "Cleanup"],
                          ["tree-planting", "Tree planting"],
                          ["waste-collection", "Waste collection"],
                          ["awareness", "Awareness"],
                          ["restoration", "Restoration"],
                          ["other", "Other"],
                        ].map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-stone-700">
                      Meeting point
                      <input
                        value={editData.meetingPoint}
                        onChange={(event) =>
                          setEditData((current) => ({
                            ...current,
                            meetingPoint: event.target.value,
                          }))
                        }
                        required
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
                      />
                    </label>
                    <label className="text-sm font-semibold text-stone-700">
                      Starts at
                      <input
                        type="datetime-local"
                        value={editData.startsAt}
                        onChange={(event) =>
                          setEditData((current) => ({ ...current, startsAt: event.target.value }))
                        }
                        required
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
                      />
                    </label>
                    <label className="text-sm font-semibold text-stone-700">
                      Ends at
                      <input
                        type="datetime-local"
                        value={editData.endsAt}
                        onChange={(event) =>
                          setEditData((current) => ({ ...current, endsAt: event.target.value }))
                        }
                        required
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
                      />
                    </label>
                    <label className="text-sm font-semibold text-stone-700">
                      Maximum participants
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editData.maxParticipants}
                        onChange={(event) =>
                          setEditData((current) => ({
                            ...current,
                            maxParticipants: event.target.value,
                          }))
                        }
                        placeholder="No limit"
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
                      />
                    </label>
                    <label className="text-sm font-semibold text-stone-700">
                      Issue location
                      <input
                        value={editData.issueLocation}
                        onChange={(event) =>
                          setEditData((current) => ({
                            ...current,
                            issueLocation: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
                      />
                    </label>
                    <label className="text-sm font-semibold text-stone-700 sm:col-span-2">
                      Description
                      <textarea
                        value={editData.description}
                        onChange={(event) =>
                          setEditData((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        required
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
                      />
                    </label>
                    <label className="text-sm font-semibold text-stone-700">
                      Required materials (comma or line separated)
                      <textarea
                        value={editData.requiredMaterials}
                        onChange={(event) =>
                          setEditData((current) => ({
                            ...current,
                            requiredMaterials: event.target.value,
                          }))
                        }
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
                      />
                    </label>
                    <label className="text-sm font-semibold text-stone-700">
                      Contact information
                      <textarea
                        value={editData.contactInformation}
                        onChange={(event) =>
                          setEditData((current) => ({
                            ...current,
                            contactInformation: event.target.value,
                          }))
                        }
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
                      />
                    </label>
                    <label className="text-sm font-semibold text-stone-700 sm:col-span-2">
                      Organizer note
                      <textarea
                        value={editData.organizerNote}
                        onChange={(event) =>
                          setEditData((current) => ({
                            ...current,
                            organizerNote: event.target.value,
                          }))
                        }
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
                      />
                    </label>
                    <div className="flex justify-end gap-2 sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => setEditingDetails(false)}
                        className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                      >
                        Discard
                      </button>
                      <button
                        type="submit"
                        disabled={savingDetails}
                        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        {savingDetails ? "Saving..." : "Save details"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-6 border-t border-stone-200 pt-5">
                  <h3 className="font-semibold text-emerald-950">Co-organizers</h3>
                  {drive.coOrganizers?.length ? (
                    <ul className="mt-2 space-y-2">
                      {drive.coOrganizers.map((coOrganizer) => (
                        <li
                          key={coOrganizer._id}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="text-stone-700">
                            {coOrganizer.name || coOrganizer.username}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCoOrganizer(coOrganizer._id)}
                            disabled={coOrganizerLoading}
                            className="text-sm font-semibold text-red-700 hover:underline disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-stone-500">No co-organizers added.</p>
                  )}
                  {(drive.coOrganizers || []).length < 2 && (
                    <form
                      onSubmit={handleAddCoOrganizer}
                      className="mt-4 flex flex-col gap-2 sm:flex-row"
                    >
                      <label htmlFor="co-organizer-user-id" className="sr-only">
                        Co-organizer user ID
                      </label>
                      <input
                        id="co-organizer-user-id"
                        value={coOrganizerUserId}
                        onChange={(event) => setCoOrganizerUserId(event.target.value)}
                        placeholder="Enter a user ID"
                        required
                        className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        disabled={coOrganizerLoading || !coOrganizerUserId.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        <UserPlus size={15} />
                        Add co-organizer
                      </button>
                    </form>
                  )}
                  {coOrganizerError && (
                    <p role="alert" className="mt-3 text-sm text-red-700">
                      {coOrganizerError}
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-emerald-950">
            <Users size={20} className="text-emerald-700" />
            Participants ({drive.participantCount || 0}
            {drive.maxParticipants ? ` / ${drive.maxParticipants}` : ""})
          </h2>
          {participantsDriveId !== id ? (
            <p role="status" className="text-sm text-stone-500">
              Loading participants...
            </p>
          ) : participantsError ? (
            <p role="alert" className="text-sm text-red-700">
              {participantsError}
            </p>
          ) : participants.length === 0 ? (
            <p className="text-sm text-stone-500">No participants have joined this Drive yet.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {participants.map((participant) => (
                <li
                  key={participant._id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-4 py-3"
                >
                  <span className="font-semibold text-stone-800">
                    {participant.user?.name || participant.user?.username || "Community member"}
                  </span>
                  <time
                    dateTime={participant.joinedAt}
                    className="shrink-0 text-xs text-stone-500"
                  >
                    Joined {formatCommentDate(participant.joinedAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

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

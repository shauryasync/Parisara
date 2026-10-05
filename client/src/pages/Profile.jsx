import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Mail, MessageCircle, Plus, ShieldCheck, ThumbsUp } from "lucide-react";
import api from "../services/api";
import ReportCard from "../components/ReportCard";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [myreports, setMyReports] = useState([]);

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

  const handleDelete = async (reportId) => {
    const confirmed = window.confirm("Are you sure you want to delete this report?");

    if (!confirmed) return;

    try {
      await api.delete(`/reports/get-reports/${reportId}`);

      setMyReports((previousReports) => previousReports.filter((report) => report.id !== reportId));
    } catch (error) {
      console.error(error);
      window.alert(error.response?.data?.message || "Unable to delete report");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        const [profileResponse, reportsResponse] = await Promise.all([
          api.get("/me"),
          api.get("/reports/get-reports"),
        ]);

        const userData = profileResponse.data;
        const mappedReports = (reportsResponse.data.data || []).map(mapReport);

        setUser(userData);
        const ownReports = mappedReports.filter((report) => report.authorId === userData._id);

        setMyReports(ownReports);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load your profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 px-4 py-12 text-center text-sm text-stone-500">
        Loading your profile...
      </div>
    );
  }

  if (error || !user) {
    return (
      <div
        className="min-h-screen bg-stone-50 px-4 py-12 text-center text-sm text-red-700"
        role="alert"
      >
        {error || "Profile unavailable."}
      </div>
    );
  }

  const supportTotal = myreports.reduce((total, report) => total + report.supportCount, 0);
  const commentTotal = myreports.reduce((total, report) => total + report.commentCount, 0);
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="flex flex-col gap-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-900">
              {initials || "P"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-emerald-700">Community profile</p>
              <h1 className="mt-1 truncate text-2xl font-bold text-emerald-950">{user.name}</h1>
              <p className="mt-0.5 text-sm text-stone-500">@{user.username}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={14} aria-hidden="true" /> {user.email}
                </span>
                <span className="inline-flex items-center gap-1.5 capitalize">
                  <ShieldCheck size={14} aria-hidden="true" /> {user.role}
                </span>
              </div>
            </div>
          </div>
          <Link
            to="/reports/create-report"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Plus size={16} aria-hidden="true" /> Create report
          </Link>
        </section>

        <section
          aria-label="Your contribution totals"
          className="mt-5 grid grid-cols-3 divide-x divide-stone-200 rounded-xl border border-stone-200 bg-white py-4"
        >
          <div className="flex flex-col items-center gap-1 text-center">
            <FileText size={17} className="text-emerald-700" aria-hidden="true" />
            <span className="text-lg font-bold text-emerald-950">{myreports.length}</span>
            <span className="text-xs text-stone-500">Reports</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <ThumbsUp size={17} className="text-emerald-700" aria-hidden="true" />
            <span className="text-lg font-bold text-emerald-950">{supportTotal}</span>
            <span className="text-xs text-stone-500">Support received</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <MessageCircle size={17} className="text-emerald-700" aria-hidden="true" />
            <span className="text-lg font-bold text-emerald-950">{commentTotal}</span>
            <span className="text-xs text-stone-500">Comments</span>
          </div>
        </section>

        <section className="mt-9">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-emerald-950">My reports</h2>
              <p className="mt-1 text-sm text-stone-500">
                Reports you have shared with the community
              </p>
            </div>
            <span className="text-sm font-semibold text-stone-500">{myreports.length} total</span>
          </div>

          {myreports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white px-5 py-12 text-center">
              <p className="font-semibold text-stone-700">No reports yet</p>
              <p className="mt-1 text-sm text-stone-500">
                Create your first report to see it here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {myreports.map((myreport) => (
                <ReportCard
                  key={myreport.id}
                  report={myreport}
                  canEdit
                  onDelete={handleDelete}
                  readOnlyInteractions
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Profile;

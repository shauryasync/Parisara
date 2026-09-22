import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import ReportCard from "../components/ReportCard";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
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
        setReports(mappedReports);

        const ownReports = mappedReports.filter((report) => report.authorId === userData._id);

        setMyReports(ownReports);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="text-center">
      <h1 className="text-5xl  font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-pink-500">
        My Profile
      </h1>
      <h2>User: {user.name}</h2>
      <h2>Email: {user.email}</h2>
      <h2>Reports: {myreports.length}</h2>

      <section className="mx-auto mt-10 max-w-5xl px-4 text-left">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-emerald-900">My Reports</h2>
          <p className="text-sm text-stone-500">Your submitted environmental reports</p>
        </div>

        {myreports.length === 0 ? (
          <p className="text-slate-400">You haven't written any blogs yet.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {myreports.map((myreport) => (
              <ReportCard key={myreport.id} report={myreport} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Profile;

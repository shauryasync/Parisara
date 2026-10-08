import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, MapPin, Users, Info, ExternalLink } from "lucide-react";
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

export default function DriveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [drive, setDrive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDrive = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/drives/${id}`);
        setDrive(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Error fetching the drive details.");
      } finally {
        setLoading(false);
      }
    };
    fetchDrive();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8 text-center text-stone-500">
        Loading drive...
      </div>
    );
  }

  if (error) {
    return <div className="min-h-screen bg-stone-50 p-8 text-center text-red-600">{error}</div>;
  }

  if (!drive) return null;

  const organizerName = drive.organizer?.name || drive.organizer?.username || "Unknown Organizer";

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

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                {formatDriveType(drive.type)}
              </span>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 capitalize">
                {drive.status}
              </span>
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

            <div className="mt-8 bg-stone-100 rounded-xl p-6 text-center border border-stone-200">
              <p className="text-stone-500 text-sm font-medium">Soon</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

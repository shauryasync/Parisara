import { useEffect, useState } from "react";
import { ArrowLeft, FileText, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

const adminSections = [
  {
    icon: LayoutDashboard,
    title: "Overview",
    description: "Dashboard landing page",
  },
  {
    icon: FileText,
    title: "Reports",
    description: "Review and moderate reports",
  },
  {
    icon: Users,
    title: "Users",
    description: "Search users and manage roles",
  },
];

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const verifyAdmin = async () => {
      try {
        const response = await api.get("/me");

        if (response.data.role !== "admin") {
          navigate("/feed", { replace: true });
          return;
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || "Could not verify admin access.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifyAdmin();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-12 text-center text-slate-300" role="status">
        Verifying admin access...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen bg-slate-950 px-6 py-12 text-center text-red-300"
        role="alert"
      >
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/30">
          <header className="flex items-center gap-4 border-b border-slate-800 px-6 py-5 sm:px-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-800 text-emerald-50">
              <ShieldCheck size={28} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Parisara</h1>
              <p className="text-sm text-slate-400">Administration</p>
            </div>
          </header>

          <div className="grid gap-8 px-6 py-7 sm:grid-cols-2 sm:px-8">
            <nav aria-label="Admin sections" className="space-y-3">
              {adminSections.map(({ icon: Icon, title, description }, index) => (
                <div
                  key={title}
                  className={`rounded-2xl p-4 ${
                    index === 0 ? "bg-slate-800/80 text-white" : "text-slate-300"
                  }`}
                >
                  <Icon className="mb-3" size={23} aria-hidden="true" />
                  <h2 className="font-semibold">{title}</h2>
                  <p className="mt-1 text-sm text-slate-400">{description}</p>
                </div>
              ))}
              <Link
                to="/feed"
                className="flex items-center gap-3 rounded-2xl p-4 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <ArrowLeft size={23} aria-hidden="true" />
                <span>
                  <span className="block font-semibold">Back to Parisara</span>
                  <span className="mt-1 block text-sm text-slate-400">
                    Return to the community
                  </span>
                </span>
              </Link>
            </nav>

            <div className="grid content-start gap-4 sm:grid-cols-2">
              {adminSections.map(({ icon: Icon, title, description }) => (
                <section
                  key={title}
                  className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5"
                >
                  <Icon className="mb-4 text-emerald-300" size={24} aria-hidden="true" />
                  <h2 className="font-semibold text-white">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
                </section>
              ))}
            </div>
          </div>

          <footer className="border-t border-slate-800 px-6 py-4 text-sm text-slate-400 sm:px-8">
            Admin workspace
          </footer>
        </section>
      </div>
    </div>
  );
};

export default Admin;

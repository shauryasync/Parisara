import { useEffect, useState } from "react";
import { ArrowLeft, FileText, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import api from "../services/api";

const adminSections = [
  {
    icon: LayoutDashboard,
    title: "Overview",
    description: "Dashboard landing page",
    to: "/admin",
  },
  {
    icon: FileText,
    title: "Reports",
    description: "Review and moderate reports",
    to: "/admin/reports",
  },
  {
    icon: Users,
    title: "Users",
    description: "Search users and manage roles",
    to: "/admin/users",
  },
];

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const verifyAdmin = async () => {
      try {
        const response = await api.get("/me");

        if (isMounted && response.data.role !== "admin") {
          navigate("/feed", { replace: true });
        }
      } catch (requestError) {
        if (!isMounted || requestError.response?.status === 401) {
          return;
        }

        if (requestError.response?.status === 403) {
          navigate("/feed", { replace: true });
          return;
        }

        setError(
          requestError.response?.data?.message ||
            "Could not verify admin access. Please try again.",
        );
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
  }, [navigate, retryKey]);

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
        <p>{error}</p>
        <button
          type="button"
          onClick={() => {
            setError("");
            setLoading(true);
            setRetryKey((current) => current + 1);
          }}
          className="mt-5 rounded-lg bg-slate-800 px-4 py-2 font-medium text-white transition hover:bg-slate-700"
        >
          Retry
        </button>
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
              {adminSections.map(({ icon: Icon, title, description, to }) => (
                <NavLink
                  to={to}
                  end={to === "/admin"}
                  key={title}
                  className={({ isActive }) =>
                    `block rounded-2xl p-4 transition hover:bg-slate-800/80 ${
                      isActive ? "bg-slate-800/80 text-white" : "text-slate-300"
                    }`
                  }
                >
                  <Icon className="mb-3" size={23} aria-hidden="true" />
                  <h2 className="font-semibold">{title}</h2>
                  <p className="mt-1 text-sm text-slate-400">{description}</p>
                </NavLink>
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

            <div className="min-w-0">
              <Outlet />
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

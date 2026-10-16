import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = localStorage.getItem("token");
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const currentUser =
    isAuthenticated && profile?.locationKey === location.key ? profile.user : null;
  const currentProfileError =
    isAuthenticated && profileError?.locationKey === location.key ? profileError.message : "";

  useEffect(() => {
    let isMounted = true;

    if (!isAuthenticated) {
      return () => {
        isMounted = false;
      };
    }

    const loadCurrentUser = async () => {
      try {
        const response = await api.get("/me");
        if (isMounted) {
          setProfile({ locationKey: location.key, user: response.data });
          setProfileError(null);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Could not verify the current user role:", error);
          setProfileError({
            locationKey: location.key,
            message: "Could not verify account status.",
          });
        }
      }
    };

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, location.key]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setProfile(null);
    setProfileError(null);
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-950/5 bg-white/95 shadow-[0_4px_20px_rgba(27,82,64,0.05)] backdrop-blur">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/feed"
          className="flex shrink-0 items-center gap-2.5 font-feed text-xl font-bold tracking-tight text-emerald-950"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-900 font-feed text-sm font-bold text-white">
            P
          </span>
          <span>Parisara</span>
        </Link>

        {isAuthenticated ? (
          <>
            <nav className="hidden items-center gap-3 text-xs font-semibold text-stone-500 sm:flex xl:gap-5">
              <Link
                to="/feed"
                className={
                  location.pathname === "/feed"
                    ? "border-b-2 border-emerald-900 pb-1 text-emerald-900"
                    : "hover:text-emerald-800 transition"
                }
              >
                Feed
              </Link>
              <Link
                to="/drives"
                className={
                  location.pathname === "/drives"
                    ? "border-b-2 border-emerald-900 pb-1 text-emerald-900"
                    : "hover:text-emerald-800 transition"
                }
              >
                Drives
              </Link>
              <Link
                to="/reports/create-report"
                className={
                  location.pathname === "/reports/create-report"
                    ? "border-b-2 border-emerald-900 pb-1 text-emerald-900"
                    : "hover:text-emerald-800 transition"
                }
              >
                Create report
              </Link>
              <Link
                to="/drives/create"
                className={
                  location.pathname === "/drives/create"
                    ? "border-b-2 border-emerald-900 pb-1 text-emerald-900"
                    : "hover:text-emerald-800 transition"
                }
              >
                Start a Drive
              </Link>
              <Link
                to="/activity"
                className={
                  location.pathname === "/activity"
                    ? "border-b-2 border-emerald-900 pb-1 text-emerald-900"
                    : "hover:text-emerald-800 transition"
                }
              >
                My activity
              </Link>
              {currentUser?.role === "admin" && (
                <Link
                  to="/admin"
                  className={
                    location.pathname === "/admin"
                      ? "border-b-2 border-emerald-900 pb-1 text-emerald-900"
                      : "hover:text-emerald-800 transition"
                  }
                >
                  Admin
                </Link>
              )}
              <Link
                to="/me"
                className={
                  location.pathname === "/me"
                    ? "border-b-2 border-emerald-900 pb-1 text-emerald-900"
                    : "hover:text-emerald-800 transition"
                }
              >
                Profile
              </Link>
            </nav>

            <div className="flex shrink-0 items-center gap-3">
              {currentUser && (
                <div className="hidden text-right sm:block">
                  <div className="max-w-32 truncate text-sm font-bold text-emerald-900">
                    {currentUser.name}
                  </div>
                  <div className="text-xs text-stone-400">{currentUser.role}</div>
                </div>
              )}
              {currentProfileError && (
                <span className="hidden text-xs text-red-700 sm:inline" role="status">
                  {currentProfileError}
                </span>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full px-3 py-2 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-emerald-800"
              >
                Log out
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link
              to="/drives"
              className={
                location.pathname === "/drives"
                  ? "text-emerald-800"
                  : "text-stone-600 hover:text-emerald-800 transition"
              }
            >
              Drives
            </Link>
            <Link to="/login" className="text-stone-600 hover:text-emerald-800 transition">
              Sign in
            </Link>
            <Link to="/register" className="text-stone-600 hover:text-emerald-800 transition">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;

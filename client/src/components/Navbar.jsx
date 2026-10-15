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
    <header className="border-b border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        <Link to="/feed" className="text-xl font-black tracking-tight text-emerald-900">
          Parisara
        </Link>

        {isAuthenticated ? (
          <>
            <nav className="hidden sm:flex items-center gap-6 text-sm font-semibold text-stone-500">
              <Link
                to="/feed"
                className={
                  location.pathname === "/feed"
                    ? "text-emerald-800"
                    : "hover:text-emerald-800 transition"
                }
              >
                Feed
              </Link>
              <Link
                to="/drives"
                className={
                  location.pathname === "/drives"
                    ? "text-emerald-800"
                    : "hover:text-emerald-800 transition"
                }
              >
                Drives
              </Link>
              <Link
                to="/reports/create-report"
                className={
                  location.pathname === "/reports/create-report"
                    ? "text-emerald-800"
                    : "hover:text-emerald-800 transition"
                }
              >
                Create report
              </Link>
              <Link
                to="/drives/create"
                className={
                  location.pathname === "/drives/create"
                    ? "text-emerald-800"
                    : "hover:text-emerald-800 transition"
                }
              >
                Start a Drive
              </Link>
              <Link
                to="/activity"
                className={
                  location.pathname === "/activity"
                    ? "text-emerald-800"
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
                      ? "text-emerald-800"
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
                    ? "text-emerald-800"
                    : "hover:text-emerald-800 transition"
                }
              >
                Profile
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              {currentUser && (
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-bold text-emerald-900">{currentUser.name}</div>
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
                className="text-sm font-semibold text-stone-500 hover:text-emerald-800 transition"
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

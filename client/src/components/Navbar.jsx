import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  PlusCircle,
  ChevronDown,
  User,
  Clock,
  ShieldCheck,
  LogOut,
  Compass,
  CalendarDays,
} from "lucide-react";
import api from "../services/api";

const Navbar = ({ user: propUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = Boolean(localStorage.getItem("token"));
  const [profile, setProfile] = useState(null);
  const [dropdownPath, setDropdownPath] = useState(null);
  const dropdownRef = useRef(null);

  const isDropdownOpen = dropdownPath === location.pathname;
  const currentUser =
    propUser || (isAuthenticated && profile?.locationKey === location.key ? profile.user : null);

  useEffect(() => {
    let isMounted = true;

    if (!isAuthenticated || propUser) {
      return () => {
        isMounted = false;
      };
    }

    const loadCurrentUser = async () => {
      try {
        const response = await api.get("/me");
        if (isMounted) {
          setProfile({ locationKey: location.key, user: response.data });
        }
      } catch (error) {
        if (isMounted) {
          console.error("Could not verify current user:", error);
        }
      }
    };

    loadCurrentUser();
    window.addEventListener("parisara:profile-updated", loadCurrentUser);

    return () => {
      isMounted = false;
      window.removeEventListener("parisara:profile-updated", loadCurrentUser);
    };
  }, [isAuthenticated, location.key, propUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownPath(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setDropdownPath(null);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setProfile(null);
    setDropdownPath(null);
    navigate("/login");
  };

  const isFeedActive = location.pathname === "/feed" || location.pathname === "/";
  const isDrivesActive =
    location.pathname.startsWith("/drives") && location.pathname !== "/drives/create";

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-white/95 shadow-[0_4px_20px_rgba(27,82,64,0.05)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-6 lg:px-8">
        {/* Left: Brand Identity & Primary Nav Links */}
        <div className="flex items-center gap-6 lg:gap-9">
          <Link
            to="/feed"
            aria-label="Parisara home"
            className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
          >
            <img
              src="/parisara-mark.png"
              alt="Parisara logo"
              className="h-9 w-9 object-contain"
            />
            <span className="text-xl font-bold tracking-tight text-emerald-950">
              Parisara
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-1 rounded-full bg-stone-50 p-1 text-sm font-semibold md:flex">
            <Link
              to="/feed"
              aria-current={isFeedActive ? "page" : undefined}
              className={`rounded-full px-3.5 py-2 transition-colors ${
                isFeedActive
                  ? "bg-white text-emerald-950 shadow-sm ring-1 ring-emerald-950/5"
                  : "text-stone-600 hover:bg-white/80 hover:text-emerald-900"
              }`}
            >
              Feed
            </Link>
            <Link
              to="/drives"
              aria-current={isDrivesActive ? "page" : undefined}
              className={`rounded-full px-3.5 py-2 transition-colors ${
                isDrivesActive
                  ? "bg-white text-emerald-950 shadow-sm ring-1 ring-emerald-950/5"
                  : "text-stone-600 hover:bg-white/80 hover:text-emerald-900"
              }`}
            >
              Drives
            </Link>
          </nav>
        </div>

        {/* Right: Actions & User Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {isAuthenticated ? (
            <>
              {/* Primary Action Buttons */}
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  to="/reports/create-report"
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-emerald-900/20 bg-[#edf8f2] px-4 py-2 text-sm font-semibold text-[#0a4d37] shadow-sm transition-all hover:border-emerald-900/35 hover:bg-[#e1f3ea] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 active:scale-[0.98]"
                >
                  <PlusCircle className="h-4 w-4 stroke-[2.2] text-[#0a4d37]" aria-hidden="true" />
                  <span>Create Report</span>
                </Link>

                <Link
                  to="/drives/create"
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[#0a523c] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#073f2e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                  <span>Start a Drive</span>
                </Link>

                {/* Subtle Divider */}
                <div className="mx-1.5 h-7 w-px bg-stone-200" aria-hidden="true" />
              </div>

              {/* Profile Avatar & Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() =>
                    setDropdownPath((path) => (path === location.pathname ? null : location.pathname))
                  }
                  className="group flex items-center gap-2 rounded-full p-1 transition hover:bg-stone-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800/30"
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  aria-label="User account menu"
                >
                  <div className="relative shrink-0">
                    {currentUser?.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-900/10"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold uppercase text-emerald-950 ring-2 ring-emerald-900/10">
                        {(currentUser?.name || currentUser?.username || "P").charAt(0)}
                      </div>
                    )}
                    <span
                      className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-600 ring-2 ring-white"
                      aria-hidden="true"
                    />
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-stone-400 transition-transform duration-200 group-hover:text-stone-600 ${
                      isDropdownOpen ? "rotate-180 text-emerald-900" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 origin-top-right rounded-2xl border border-emerald-950/10 bg-white p-1.5 shadow-[0_12px_32px_rgba(27,82,64,0.1),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-3">
                      <p className="truncate text-sm font-bold text-emerald-950">
                        {currentUser?.name || "Community Member"}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        @{currentUser?.username || "user"}
                      </p>
                      {currentUser?.role === "admin" && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                          <ShieldCheck className="h-3 w-3" />
                          Admin
                        </span>
                      )}
                    </div>

                    <div className="my-1 h-px bg-stone-100" />

                    {/* Mobile Navigation Links */}
                    <div className="md:hidden">
                      <Link
                        to="/feed"
                        onClick={() => setDropdownPath(null)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-emerald-50 hover:text-emerald-950"
                      >
                        <Compass className="h-4 w-4 text-stone-400" />
                        <span>Feed</span>
                      </Link>
                      <Link
                        to="/drives"
                        onClick={() => setDropdownPath(null)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-emerald-50 hover:text-emerald-950"
                      >
                        <CalendarDays className="h-4 w-4 text-stone-400" />
                        <span>Drives</span>
                      </Link>
                      <div className="my-1 h-px bg-stone-100" />
                    </div>

                    {/* Mobile Quick Action Buttons */}
                    <div className="sm:hidden">
                      <Link
                        to="/reports/create-report"
                        onClick={() => setDropdownPath(null)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50"
                      >
                        <PlusCircle className="h-4 w-4 text-emerald-800" />
                        <span>Create Report</span>
                      </Link>
                      <Link
                        to="/drives/create"
                        onClick={() => setDropdownPath(null)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50"
                      >
                        <Plus className="h-4 w-4 text-emerald-800" />
                        <span>Start a Drive</span>
                      </Link>
                      <div className="my-1 h-px bg-stone-100" />
                    </div>

                    <Link
                      to="/me"
                      onClick={() => setDropdownPath(null)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-emerald-50 hover:text-emerald-950"
                    >
                      <User className="h-4 w-4 text-stone-400" />
                      <span>Profile</span>
                    </Link>

                    <Link
                      to="/activity"
                      onClick={() => setDropdownPath(null)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-emerald-50 hover:text-emerald-950"
                    >
                      <Clock className="h-4 w-4 text-stone-400" />
                      <span>My Activity</span>
                    </Link>

                    {currentUser?.role === "admin" && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownPath(null)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-emerald-50 hover:text-emerald-950"
                      >
                        <ShieldCheck className="h-4 w-4 text-stone-400" />
                        <span>Admin Dashboard</span>
                      </Link>
                    )}

                    <div className="my-1 h-px bg-stone-100" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-red-50 hover:text-red-700"
                    >
                      <LogOut className="h-4 w-4 text-stone-400" />
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-full px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 hover:text-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center rounded-full bg-[#0a523c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#073f2e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 active:scale-[0.98]"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
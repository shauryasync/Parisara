import { Link, useLocation, useNavigate } from "react-router-dom";

const Navbar = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        <Link
          to={isAuthenticated ? "/feed" : "/login"}
          className="text-xl font-black tracking-tight text-emerald-900"
        >
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
              {user && (
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-bold text-emerald-900">{user.name}</div>
                  <div className="text-xs text-stone-400">{user.role}</div>
                </div>
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

import { useNavigate, Link } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };
  return (
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-end py-4">
        {isAuthenticated ? (
          <div className="hidden sm:flex sm:items-center">
            <button
              onClick={handleLogout}
              className="text-gray-800 text-sm font-semibold hover:text-purple-600"
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="hidden sm:flex sm:items-center">
            <Link
              to="/login"
              className="text-gray-800 text-sm font-semibold hover:text-purple-600 mr-4"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="text-gray-800 text-sm font-semibold border px-4 py-2 rounded-lg hover:text-purple-600 hover:border-purple-600"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;

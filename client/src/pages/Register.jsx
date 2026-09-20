import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerUser = async (e) => {
    e.preventDefault();

    try {
      await api.post("/register", {
        name,
        username,
        email,
        password,
      });
      alert("Registration Successful");
      navigate("/login");
    } catch (error) {
      alert(error.response?.data?.message || "Registration Failed");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent">
      <div className="w-80 max-w-screen-lg sm:w-96 p-4">
        <h4 className="text-2xl font-bold text-slate-800">Sign Up</h4>
        <p className="mt-1 text-sm font-normal text-slate-500">
          Nice to meet you! Enter your details to register.
        </p>

        <form onSubmit={registerUser} className="mt-8 mb-2">
          <div className="mb-4 flex flex-col gap-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-800">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 text-sm bg-transparent border rounded-md border-slate-200 placeholder:text-slate-400 text-slate-700 focus:outline-none focus:border-slate-900 transition-all duration-200"
                required
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-800">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_]+"
                className="w-full px-3 py-2 text-sm bg-transparent border rounded-md border-slate-200 placeholder:text-slate-400 text-slate-700 focus:outline-none focus:border-slate-900 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-800">Your Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@mail.com"
                className="w-full px-3 py-2 text-sm bg-transparent border rounded-md border-slate-200 placeholder:text-slate-400 text-slate-700 focus:outline-none focus:border-slate-900 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-800">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full px-3 py-2 text-sm bg-transparent border rounded-md border-slate-200 placeholder:text-slate-400 text-slate-700 focus:outline-none focus:border-slate-900 transition-all duration-200"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="terms"
              className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              required
            />
            <label htmlFor="terms" className="text-sm font-normal text-slate-500">
              I agree to the{" "}
              <a href="#" className="font-medium text-slate-900 hover:underline">
                Terms and Conditions
              </a>
            </label>
          </div>

          <button
            type="submit"
            className="w-full mt-6 bg-black text-white font-medium text-sm py-2 px-4 rounded-md uppercase tracking-wider hover:bg-slate-800 transition-all active:scale-[0.98]"
          >
            Sign Up
          </button>

          {/* <p className="mt-4 text-center text-sm font-normal text-slate-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="font-medium text-slate-900 hover:underline bg-transparent border-none p-0 cursor-pointer"
            >
              Sign In
            </button> 
          </p> */}
        </form>
      </div>
    </div>
  );
};

export default Register;

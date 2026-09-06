import { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/login", {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      alert("Login Successful...Welcome!");
      navigate("/me");
    } catch (error) {
      alert(error.response?.data?.message || "Login Failed");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent">
      <div className="w-80 max-w-screen-lg sm:w-96 p-4">
        <h4 className="text-2xl font-bold text-slate-800">Log In</h4>
        <p className="mt-1 text-sm font-normal text-slate-500">
          Nice to meet you! Enter your details to login.
        </p>

        <form onSubmit={loginUser} className="mt-8 mb-2">
          <div className="mb-4 flex flex-col gap-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-800">
                Your Email
              </label>
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
              <label className="block mb-2 text-sm font-semibold text-slate-800">
                Password
              </label>
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

          <button
            type="submit"
            className="w-full mt-6 bg-black text-white font-medium text-sm py-2 px-4 rounded-md uppercase tracking-wider hover:bg-slate-800 transition-all active:scale-[0.98]"
          >
            Log in
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

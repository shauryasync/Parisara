import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [message, setMessage] = useState(
    token ? "Verifying your email..." : "Verification link is missing its token.",
  );
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    api
      .get("/verify-email", { params: { token } })
      .then((response) => {
        if (!active) return;
        setMessage(response.data.message);
        setVerified(true);
      })
      .catch((error) => {
        if (!active) return;
        setMessage(error.response?.data?.message || "Could not verify your email. Please try again.");
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="w-80 max-w-screen-lg p-4 text-center sm:w-96">
        <h1 className="text-2xl font-bold text-slate-800">Email verification</h1>
        <p className="mt-4 text-sm text-slate-600">{message}</p>
        {verified && (
          <Link to="/login" className="mt-6 inline-block font-medium text-emerald-800 hover:underline">
            Go to login
          </Link>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;

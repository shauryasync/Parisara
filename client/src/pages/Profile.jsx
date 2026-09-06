import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    api
      .get("/me")
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="text-center">
      <h1 className="text-5xl  font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-pink-500">
        My Profile
      </h1>
      <h2>User: {user.name}</h2>
      <h2>Email: {user.email}</h2>
    </div>
  );
};

export default Profile;

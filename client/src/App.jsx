import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import CreateReport from "./pages/CreateReport";
import Home from "./pages/Home";

function App() {
  const location = useLocation();

  return (
    <div>
      {location.pathname !== "/feed" && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/register" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/me" element={<Profile />} />
          <Route path="/feed" element={<Home />} />
          <Route path="/reports/create-report" element={<CreateReport />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

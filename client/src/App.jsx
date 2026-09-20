import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import { Route, Routes, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import CreateReport from "./pages/CreateReport";

function App() {
  return (
    <div>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/register" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/me" element={<Profile />} />
          <Route path="/reports/create-report" element={<CreateReport />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

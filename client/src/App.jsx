import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import { Route, Routes, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";

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
        </Routes>
      </main>
    </div>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AddMedication from "./pages/AddMedication";
import Medications from "./pages/Medications";

import CaregiverDashboard from "./pages/CaregiverDashboard";
/* ─── Auth guard ──────────────────────────────────── */
function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");

  if (!token) return <Navigate to="/" replace />;
  if (role && userRole !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}


/* ─── Placeholder pages ──────────────────────────── */
const AdminPanel = () => (
  <div style={{ padding: 40, textAlign: "center" }}>
    <h2>Admin Panel</h2>
    <p style={{ color: "#64748b" }}>Coming soon…</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Patient routes */}
        <Route path="/patient" element={
          <ProtectedRoute role="patient"><Dashboard /></ProtectedRoute>
        } />
        <Route path="/add" element={
          <ProtectedRoute role="patient"><AddMedication /></ProtectedRoute>
        } />
        <Route path="/medications" element={
          <ProtectedRoute role="patient"><Medications /></ProtectedRoute>
        } />

        {/* Caregiver */}
        <Route path="/caregiver" element={
          <ProtectedRoute role="caregiver"><CaregiverDashboard /></ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminPanel /></ProtectedRoute>
        } />

        {/* Legacy redirect */}
        <Route path="/dashboard" element={<Navigate to="/patient" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./Login.css";
import ParticleCanvas from "../components/ParticleCanvas";

function Signup() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await API.post("/auth/register", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role || "patient",
      });

      const { user, accessToken, refreshToken } = res.data.data;

      localStorage.setItem("token", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("role", user.role);
      localStorage.setItem("userName", user.name);
      localStorage.setItem("userId", user._id);
      if (user.role === "caregiver") {
        navigate("/caregiver");
      } else {
        navigate("/patient");
      }
    } catch (err) {
      const message = err.response?.data?.error?.message || "Registration failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <ParticleCanvas />
      <div className="login-bg-blob login-bg-blob--blue" />
      <div className="login-bg-blob login-bg-blob--purple" />
      <div className="login-bg-blob login-bg-blob--cyan" />

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">💊</div>
          <span className="login-logo-text">MedAssist</span>
        </div>

        <h1 className="login-title">Create Account</h1>
        <p className="login-subtitle">Sign up to manage your medications</p>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSignup}>
          <div className="login-input-group">
            <label className="login-input-label">Full Name</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">👤</span>
              <input className="login-input" type="text" placeholder="Raj Kumar"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>

          <div className="login-input-group">
            <label className="login-input-label">Email</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">✉️</span>
              <input className="login-input" type="email" placeholder="you@example.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          <div className="login-input-group">
            <label className="login-input-label">Account Type</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">🩺</span>
              <select className="login-input" style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'inherit' }}
                value={form.role || "patient"} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="patient" style={{ color: '#333' }}>Patient</option>
                <option value="caregiver" style={{ color: '#333' }}>Caregiver</option>
              </select>
            </div>
          </div>

          <div className="login-input-group">
            <label className="login-input-label">Phone</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">📱</span>
              <input className="login-input" type="tel" placeholder="+919876543210"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>

          <div className="login-input-group">
            <label className="login-input-label">Password</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">🔒</span>
              <input className="login-input" type="password" placeholder="••••••••"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Creating Account…" : "Sign Up"}
          </button>
        </form>

        <div className="login-signup-link" style={{ marginTop: 24 }}>
          Already have an account? <a href="/">Login here</a>
        </div>
      </div>
    </div>
  );
}

export default Signup;

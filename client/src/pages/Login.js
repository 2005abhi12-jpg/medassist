import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./Login.css";
import ParticleCanvas from "../components/ParticleCanvas";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await API.post("/auth/login", { email, password });

      const { user, accessToken, refreshToken } = res.data.data;

      localStorage.setItem("token", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("role", user.role);
      localStorage.setItem("userName", user.name);
      localStorage.setItem("userId", user._id);

      // Navigate based on role
      if (user.role === "patient") navigate("/patient");
      else if (user.role === "caregiver") navigate("/caregiver");
      else if (user.role === "admin") navigate("/admin");
      else navigate("/");
    } catch (err) {
      const message = err.response?.data?.error?.message || "Login failed. Check your credentials.";
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
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">💊</div>
          <span className="login-logo-text">MedAssist</span>
        </div>

        <h1 className="login-title">Secure Access</h1>
        <p className="login-subtitle">Login to your account</p>

        {/* Error message */}
        {error && <div className="login-error">{error}</div>}

        {/* Form */}
        <form className="login-form" onSubmit={handleLogin}>
          {/* Email */}
          <div className="login-input-group">
            <label className="login-input-label">Email</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">✉️</span>
              <input
                id="login-email"
                className="login-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-input-group">
            <label className="login-input-label">Password</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">🔒</span>
              <input
                id="login-password"
                className="login-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>

        {/* Divider */}
        <div className="login-divider">
          <div className="login-divider-line" />
          <span className="login-divider-text">or continue with</span>
          <div className="login-divider-line" />
        </div>

        {/* OAuth */}
        <div className="login-oauth-row">
          <button className="login-oauth-btn">Google</button>
          <button className="login-oauth-btn">Apple</button>
        </div>

        {/* Signup link */}
        <div className="login-signup-link">
          Don't have an account? <a href="/signup">Sign up here</a>
        </div>
      </div>
    </div>
  );
}

export default Login;

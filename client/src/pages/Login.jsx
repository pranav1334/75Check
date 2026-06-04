import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(formData);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.msg ||
          "Login failed"
      );
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-split-card">
        <div className="auth-left">
          <div className="auth-logo">75✓</div>
          <h1>Welcome Back!</h1>
          <p>
            Track your attendance, check your bunk limit, and stay above 75%.
          </p>

          <Link to="/register" className="side-btn">
            Create Account
          </Link>
        </div>

        <div className="auth-right">
          <form className="modern-auth-form" onSubmit={handleSubmit}>
            <h2>Welcome</h2>
            <p>Login into your account to continue</p>

            {error && <div className="error-box">{error}</div>}

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
            />

            <span className="forgot-text">Forgot your password?</span>

            <button type="submit">Login</button>

            <p className="bottom-text">
              Don&apos;t have an account? <Link to="/register">Sign up</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
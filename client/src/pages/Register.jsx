import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
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
      await register(formData);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.msg ||
          "Registration failed"
      );
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-split-card">
        <div className="auth-left">
          <div className="auth-logo">75✓</div>
          <h1>Hello Student!</h1>
          <p>
            Create your 75Check account and manage subject-wise attendance easily.
          </p>

          <Link to="/login" className="side-btn">
            Sign In
          </Link>
        </div>

        <div className="auth-right">
          <form className="modern-auth-form" onSubmit={handleSubmit}>
            <h2>Create Account</h2>
            <p>Register to start tracking your attendance</p>

            {error && <div className="error-box">{error}</div>}

            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
            />

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

            <button type="submit">Sign Up</button>

            <p className="bottom-text">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Register;
import React, { useState, useEffect } from "react";
import "./LoginModal.css";
import { safeFetchJson } from "../utils/api";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "963065836254-h2pdhhkdgt5c9p4vim5ervkdc13iqhl9.apps.googleusercontent.com";

export default function LoginModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLoginSuccess = async (response) => {
    try {
      const data = await safeFetchJson(`${API_BASE}/api/admin/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential })
      });

      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminEmail", data.user.email);
      localStorage.setItem("userRole", data.user.role);

      // Decode Google JWT to get profile picture and name
      try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        if (payload.picture) localStorage.setItem("userAvatar", payload.picture);
        if (payload.name) localStorage.setItem("userName", payload.name);
      } catch (e) { /* ignore decode errors */ }

      onClose();
      window.location.reload();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  useEffect(() => {
    const initializeGoogle = () => {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleLoginSuccess
        });
        window.google.accounts.id.renderButton(
          document.getElementById("google-modal-signin-btn"),
          { theme: "filled_blue", size: "large", width: 280, shape: "pill" }
        );
      }
    };

    if (window.google) {
      initializeGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          initializeGoogle();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const data = await safeFetchJson(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminEmail", data.user.email);
      localStorage.setItem("userRole", data.user.role);
      if (data.user.name) localStorage.setItem("userName", data.user.name);
      if (data.user.picture) localStorage.setItem("userAvatar", data.user.picture);
      onClose();
      window.location.reload();
    } catch (err) {
      setErrorMessage(err.message || "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal-x" onClick={onClose}>
          &times;
        </button>

        <header className="login-modal-header">
          <h2 className="login-modal-title">Sign In</h2>
          <p className="login-modal-subtitle">Log in to your ZC Chess Club account</p>
        </header>

        {errorMessage && (
          <div className="login-modal-error">
            {errorMessage}
          </div>
        )}

        <form className="login-modal-form" onSubmit={handleEmailSubmit}>
          <div className="modal-input-group">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="modal-input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-modal-btn" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="login-modal-divider">
          <span>OR</span>
        </div>

        <div className="google-signin-container">
          <div id="google-modal-signin-btn"></div>
        </div>

        <p className="login-modal-footer">
          Don't have an account?{" "}
          <a href="/signup" onClick={(e) => { e.preventDefault(); onClose(); window.location.href="/signup"; }}>
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
}

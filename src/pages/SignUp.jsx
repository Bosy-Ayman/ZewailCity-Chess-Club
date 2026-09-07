import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import "./SignUp.css"; 
import { Link, useNavigate } from "react-router-dom";
import { Trophy, GraduationCap, FolderKanban, UserPlus } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "1028308432321-defaultplaceholder.apps.googleusercontent.com";

export default function SignUp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [id, setId] = useState("");
  const [phone, setPhone] = useState("");
  const [major, setMajor] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [googleCredential, setGoogleCredential] = useState("");
  
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLoginSuccess = async (response) => {
    try {
      const credential = response.credential;
      const parts = credential.split('.');
      if (parts.length !== 3) {
        throw new Error("Invalid Google credential format");
      }
      const payload = JSON.parse(window.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      setEmail(payload.email || "");
      setFullName(payload.name || "");
      setGoogleCredential(credential);
      setErrorMessage("");
      setSuccessMessage("Google account connected! Please enter your Student ID, Phone Number, and Major below to finish signing up.");
    } catch (err) {
      setErrorMessage(err.message || "Google account connection failed.");
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
          document.getElementById("google-signup-btn"),
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

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!googleCredential && password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      let res;
      if (googleCredential) {
        res = await fetch(`${API_BASE}/api/admin/google-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            credential: googleCredential, 
            name: fullName, 
            idNumber: id, 
            phone, 
            major,
            batch: "2026"
          })
        });
      } else {
        res = await fetch(`${API_BASE}/api/admin/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email, 
            password, 
            name: fullName, 
            idNumber: id, 
            phone, 
            major,
            batch: "2026"
          })
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account.");
      }

      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminEmail", data.user.email);
      localStorage.setItem("userRole", data.user.role);

      setSuccessMessage("Account created successfully!");
      setTimeout(() => {
        navigate("/admin");
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message || "Sign up failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="signup-split-container">
        {/* Left Panel: Signup Form */}
        <div className="signup-form-panel">
          <div className="signup-card-split premium-card">
            <div className="flex items-center justify-center gap-2 mb-2">
              <UserPlus className="text-accent" size={24} />
              <h2 className="signup-title-split m-0">Create Your Account</h2>
            </div>
            <p className="signup-subtitle-split">Join the Zewail City Chess Club today.</p>

            {errorMessage && <div className="signup-alert-split error">{errorMessage}</div>}
            {successMessage && <div className="signup-alert-split success">{successMessage}</div>}

            <form className="signup-form-split" onSubmit={handleSignUpSubmit}>
              <div className="signup-form-row">
                <div className="signup-input-wrapper">
                  <label className="signup-input-label" htmlFor="su-fullname">Full Name</label>
                  <input
                    id="su-fullname"
                    type="text"
                    placeholder="e.g. Ahmed Kamal"
                    className="signup-input-split"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    readOnly={!!googleCredential}
                    autoComplete="name"
                  />
                </div>
                <div className="signup-input-wrapper">
                  <label className="signup-input-label" htmlFor="su-email">Email Address</label>
                  <input
                    id="su-email"
                    type="email"
                    placeholder="your@email.com"
                    className="signup-input-split"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    readOnly={!!googleCredential}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="signup-form-row">
                <div className="signup-input-wrapper">
                  <label className="signup-input-label" htmlFor="su-id">Student ID</label>
                  <input
                    id="su-id"
                    type="text"
                    placeholder="e.g. 202301234"
                    className="signup-input-split"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="signup-input-wrapper">
                  <label className="signup-input-label" htmlFor="su-phone">Phone Number</label>
                  <input
                    id="su-phone"
                    type="tel"
                    placeholder="e.g. 01012345678"
                    className="signup-input-split"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div className="signup-form-row">
                <div className="signup-input-wrapper">
                  <label className="signup-input-label" htmlFor="su-major">Major</label>
                  <input
                    id="su-major"
                    type="text"
                    placeholder="e.g. Computer Science"
                    className="signup-input-split"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
              </div>

              {!googleCredential && (
                <div className="signup-form-row">
                  <div className="signup-input-wrapper">
                    <label className="signup-input-label" htmlFor="su-password">Password</label>
                    <input
                      id="su-password"
                      type="password"
                      placeholder="Min. 8 characters"
                      className="signup-input-split"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="signup-input-wrapper">
                    <label className="signup-input-label" htmlFor="su-confirm-password">Confirm Password</label>
                    <input
                      id="su-confirm-password"
                      type="password"
                      placeholder="Re-enter password"
                      className="signup-input-split"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}

              <button type="submit" className="premium-btn-primary signup-button-split" disabled={isLoading}>
                {isLoading ? "Creating account..." : googleCredential ? "Complete Google Sign-Up" : "Sign Up"}
              </button>
            </form>

            <div className="signup-divider-split">
              <span>OR</span>
            </div>

            <div className="google-signup-container-split">
              <div id="google-signup-btn"></div>
            </div>

            <p className="signup-login-prompt">
              Already have an account? <Link to="/">Log in</Link>
            </p>
          </div>
        </div>

        {/* Right Panel: Additional Club Info */}
        <div className="signup-info-panel">
          <div className="signup-info-content">
            <span className="info-badge">Membership Benefits</span>
            <h2>ZC Chess Club Perks</h2>
            <p className="info-intro">
              Access Zewail City's premier intellectual space. Develop your logical thinking, network with players, and sharpen your tactics.
            </p>

            <div className="perks-list">
              <div className="perk-item">
                <div className="perk-icon">
                  <Trophy size={20} className="text-accent" />
                </div>
                <div className="perk-text">
                  <h3>Dynamic Tournaments</h3>
                  <p>Compete in Blitz, Rapid, and Classic Swiss & Knockout events directly tracked on our calendar.</p>
                </div>
              </div>

              <div className="perk-item">
                <div className="perk-icon">
                  <GraduationCap size={20} className="text-accent" />
                </div>
                <div className="perk-text">
                  <h3>Structured Training</h3>
                  <p>Access puzzles, strategic training, and master opening databases prepared by seasoned players.</p>
                </div>
              </div>

              <div className="perk-item">
                <div className="perk-icon">
                  <FolderKanban size={20} className="text-accent" />
                </div>
                <div className="perk-text">
                  <h3>Club Applications</h3>
                  <p>Apply to join club departments (OC, HR, Multimedia, Training) and review progress in the Admin Panel.</p>
                </div>
              </div>
            </div>

            <div className="info-quote">
              <p>"Chess is the struggle against the error."</p>
              <span>— Johannes Zukertort</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

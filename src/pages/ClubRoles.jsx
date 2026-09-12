// src/pages/ClubRoles.js

import "./ClubRoles.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import LoginModal from "../components/LoginModal";
import { CheckCircle2, ArrowRight, Clock, Briefcase } from "lucide-react";


export default function ClubRoles() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [myApplications, setMyApplications] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authPromptRole, setAuthPromptRole] = useState(null);

  useEffect(() => {
    const email = localStorage.getItem("adminEmail");
    const token = localStorage.getItem("adminToken");
    
    if (email && token) {
      setIsLoggedIn(true);
      const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");
      fetch(`${API_BASE}/api/applications`)
        .then(res => {
          const contentType = res.headers.get("content-type");
          if (res.ok && contentType && contentType.includes("application/json")) {
            return res.json();
          }
          return [];
        })
        .then(data => {
          if (Array.isArray(data)) {
            const filtered = data.filter(app => app.email && app.email.toLowerCase() === email.toLowerCase());
            setMyApplications(filtered);
          }
        })
        .catch(err => console.error("Error fetching applications in ClubRoles:", err));
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  const roles = [
    {
      id: "hr",
      department: "Human Resources",
      icon: "👥",
      title: "HR Member",
      desc: "Manage club members, coordinate department communication, oversee recruitment, and organize internal team-building initiatives.",
      image: "/Images/Positions/HR.jpg",
      path: "/apply/hr",
      perks: ["Leadership Experience", "Campus Network", "Recruitment Management"]
    },
    {
      id: "oc",
      department: "Tournament Organizing Committee",
      icon: "♟️",
      title: "OC Member",
      desc: "Plan and execute flagship chess championships, manage clocks and bracket boards, and ensure professional FIDE-standard fair play.",
      image: "/Images/Positions/arbiter.jpeg",
      path: "/apply/oc-member",
      perks: ["Arbiter Certification", "Event Management", "Tournament Directing"]
    },
    {
      id: "media",
      department: "Multimedia & Design",
      icon: "🎨",
      title: "Media Member",
      desc: "Produce visual branding, photography, video highlight reels, and creative social media campaigns for club tournaments.",
      image: "/Images/Positions/media.jpeg",
      path: "/apply/multimedia",
      perks: ["Design Portfolio", "Content Production", "Brand Identity"]
    },
    {
      id: "trainer",
      department: "Training & Masterclasses",
      icon: "🧠",
      title: "Trainer Member",
      desc: "Analyze master games, prepare opening and endgame lecture materials, and conduct live group coaching for club members.",
      image: "/Images/Positions/trainer.jpg",
      path: "/apply/trainer",
      perks: ["Tactical Mastery", "Coaching Experience", "Grandmaster Curriculum"]
    },
    {
      id: "trainee",
      department: "Trainee Development Pathway",
      icon: "🌱",
      title: "Trainee Member",
      desc: "Develop your chess tactical foundations from scratch through structured training sessions, puzzle challenges, and friendly scrims.",
      image: "/Images/Positions/trainee2.jpg",
      path: "/apply/trainee",
      perks: ["Personal Mentorship", "Weekly Tournaments", "Structured Roadmap"]
    },
  ];

  const getExistingApplication = (role) => {
    if (!myApplications || myApplications.length === 0) return null;
    return myApplications.find(app => {
      const appDept = (app.department || "").toLowerCase();
      const appTitle = (app.roleTitle || "").toLowerCase();
      const roleDept = (role.department || "").toLowerCase();
      const roleTitle = (role.title || "").toLowerCase();

      if (appTitle && roleTitle && (appTitle.includes(roleTitle) || roleTitle.includes(appTitle))) return true;
      if (appDept && roleDept && (roleDept.includes(appDept) || appDept.includes(roleDept))) return true;
      if (role.id === "hr" && (appDept.includes("hr") || appTitle.includes("hr") || appDept.includes("human"))) return true;
      if (role.id === "oc" && (appDept.includes("organ") || appTitle.includes("oc") || appTitle.includes("organ"))) return true;
      if (role.id === "media" && (appDept.includes("media") || appDept.includes("multi") || appTitle.includes("media"))) return true;
      if (role.id === "trainer" && appDept.includes("train") && !appDept.includes("trainee") && !appTitle.includes("trainee")) return true;
      if (role.id === "trainee" && (appDept.includes("trainee") || appTitle.includes("trainee"))) return true;
      return false;
    });
  };

  const [alreadyAppliedNotice, setAlreadyAppliedNotice] = useState(null);

  const handleApplyClick = (e, role) => {
    e.preventDefault();
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setAuthPromptRole(role);
      return;
    }

    const existingApp = getExistingApplication(role);
    if (existingApp) {
      setAlreadyAppliedNotice({
        role,
        app: existingApp
      });
      return;
    }

    navigate(role.path);
  };

  const scrollToTracker = () => {
    setAlreadyAppliedNotice(null);
    const element = document.getElementById("application-tracker-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const proceedToAuth = (isSignUp = true) => {
    setAuthPromptRole(null);
    if (isSignUp) {
      navigate("/signup");
    } else {
      setShowLoginModal(true);
    }
  };

  return (
    <div className="club-wrapper">
      {/* 🧭 Header */}
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <main className="clubroles-container">
        {/* 🌟 Intro Section */}
        <section className="intro-text">
          <div className="roles-hero-badge">
            <Briefcase size={14} />
            <span>Join the Leadership Team</span>
          </div>
          <h1 className="site-page-title">Club Role Opportunities</h1>
          <p>
            Explore available leadership, organizing, and development roles in ZC Chess Club. Apply today to build your skills and shape our community!
          </p>
        </section>

        {/* 🧩 Available Roles */}
        <div className="roles-section-header">
          <h2 className="section-title">Available Positions ({roles.length})</h2>
          <span className="roles-season-tag">Spring / Fall 2026 Recruitment</span>
        </div>

        <div className="role-card-container">
          {roles.map((role) => {
            const existingApp = getExistingApplication(role);
            const isAccepted = existingApp && existingApp.status === "Accepted";
            const isRejected = existingApp && existingApp.status === "Rejected";

            return (
              <div key={role.id} className={`role-card glass-panel ${existingApp ? "role-card--applied" : ""}`}>
                <div className="role-info">
                  <div className="role-header-line">
                    <span className="role-icon-badge">{role.icon}</span>
                    <span className="department">{role.department}</span>
                    {existingApp && (
                      <span className={`role-card-status-chip chip-${(existingApp.status || 'pending').toLowerCase()}`}>
                        {isAccepted ? "🎉 Accepted" : isRejected ? "Reviewed" : "✅ Already Applied"}
                      </span>
                    )}
                  </div>
                  <h3 className="title">{role.title}</h3>
                  <p className="desc">{role.desc}</p>
                  
                  {role.perks && (
                    <div className="role-perks-list">
                      {role.perks.map((perk, pIdx) => (
                        <span key={pIdx} className="role-perk-tag">
                          <CheckCircle2 size={12} /> {perk}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="role-action-row">
                    {existingApp ? (
                      <button 
                        className={`apply-btn apply-btn--applied ${isAccepted ? "btn-accepted" : isRejected ? "btn-rejected" : "btn-pending"}`}
                        onClick={(e) => handleApplyClick(e, role)}
                      >
                        <span>
                          {isAccepted 
                            ? `🎉 You're Accepted! (View Status)` 
                            : isRejected 
                            ? `📋 Application Reviewed (Details)` 
                            : `✅ Already Applied (${existingApp.status || 'Under Review'})`}
                        </span>
                        <ArrowRight size={15} />
                      </button>
                    ) : (
                      <button 
                        className="apply-btn"
                        onClick={(e) => handleApplyClick(e, role)}
                      >
                        <span>Apply for {role.title}</span>
                        <ArrowRight size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className="role-image"
                  style={{ backgroundImage: `url(${role.image})` }}
                >
                  <div className="role-image-overlay" />
                  <span className="role-image-badge">{role.department}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 📋 Your Application Status */}
        {isLoggedIn && myApplications.length > 0 && (
          <section className="applications-status-section" id="application-tracker-section">
            <div className="status-section-header">
              <div className="status-badge-icon"><Clock size={16} /></div>
              <h2>Your Application Status ({myApplications.length})</h2>
            </div>
            
            <div className="status-cards-grid">
              {myApplications.map((app) => (
                <div key={app._id} className="status-card glass-panel">
                  <div className="status-card-info">
                    <span className="status-card-dept">{app.department || "Club Department"}</span>
                    <h4 className="status-card-title">{app.roleTitle || "Applicant"}</h4>
                    <p className="status-card-date">
                      Submitted on: {new Date(app.submissionDate || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="status-badge-wrapper">
                    <span 
                      className={`status-pill ${app.status?.toLowerCase() || 'pending'}`}
                    >
                      {app.status || 'Under Review'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ℹ️ Already Applied Notification Modal */}
      {alreadyAppliedNotice && (
        <div className="auth-prompt-overlay" onClick={() => setAlreadyAppliedNotice(null)}>
          <div className="auth-prompt-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={() => setAlreadyAppliedNotice(null)}>✕</button>
            <div className="auth-prompt-header">
              <span className="auth-prompt-icon">
                {alreadyAppliedNotice.app.status === "Accepted" ? "🎉" : alreadyAppliedNotice.app.status === "Rejected" ? "📋" : "✅"}
              </span>
              <h3>
                {alreadyAppliedNotice.app.status === "Accepted" 
                  ? "Congratulations! You're Accepted!" 
                  : alreadyAppliedNotice.app.status === "Rejected"
                  ? "Application Reviewed"
                  : "Application Already Submitted"}
              </h3>
              <p>
                You have already applied for the <strong>{alreadyAppliedNotice.role.title}</strong> ({alreadyAppliedNotice.role.department}) position on{" "}
                <strong>{new Date(alreadyAppliedNotice.app.submissionDate || Date.now()).toLocaleDateString()}</strong>.
              </p>
              
              <div className="already-applied-status-box">
                <span className="status-lbl">Current Status:</span>
                <span className={`status-pill ${alreadyAppliedNotice.app.status?.toLowerCase() || 'pending'}`}>
                  {alreadyAppliedNotice.app.status || "Under Review"}
                </span>
              </div>

              <p className="already-applied-note">
                {alreadyAppliedNotice.app.status === "Accepted"
                  ? "Welcome to the team! Our High Board will contact you regarding onboarding."
                  : "There is no need to submit another application. You can view all your active submissions below."}
              </p>
            </div>

            <div className="auth-prompt-actions">
              <button 
                className="auth-signup-btn"
                onClick={scrollToTracker}
              >
                📊 View My Application Tracker ↓
              </button>
              <button 
                className="auth-cancel-btn"
                onClick={() => setAlreadyAppliedNotice(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔐 Auth Prompt Modal */}
      {authPromptRole && (
        <div className="auth-prompt-overlay" onClick={() => setAuthPromptRole(null)}>
          <div className="auth-prompt-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={() => setAuthPromptRole(null)}>✕</button>
            <div className="auth-prompt-header">
              <span className="auth-prompt-icon">🔐</span>
              <h3>Sign In or Sign Up to Apply</h3>
              <p>
                To submit an application for <strong>{authPromptRole.title}</strong> ({authPromptRole.department}) and track your candidacy, please sign in with your Zewail City account.
              </p>
            </div>

            <div className="auth-prompt-actions">
              <button 
                className="auth-signup-btn"
                onClick={() => proceedToAuth(true)}
              >
                Create New Account (Sign Up) →
              </button>
              <button 
                className="auth-signin-btn"
                onClick={() => proceedToAuth(false)}
              >
                Already have an account? Sign In
              </button>
              <button 
                className="auth-cancel-btn"
                onClick={() => setAuthPromptRole(null)}
              >
                Continue Browsing Roles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔑 Direct Login Modal */}
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}

      {/* 🦶 Footer */}
      <Footer />
    </div>
  );
}
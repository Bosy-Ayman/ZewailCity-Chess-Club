import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Users } from "lucide-react";
import "./About.css";

export default function About() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const teamMembers = [
    {
      name: "Bosy Ayman",
      role: "President",
      image: "/Winners/BosyAyman.png",
      badge: "President (24-26)"
    },
    {
      name: "Abdelrahman Mohamed",
      role: "Vice President",
      image: "/Winners/AbdelrahmanMohamed.png",
      badge: "Vice President"
    },
    {
      name: "Aml Ali",
      role: "Head of HR",
      image: "/Images/highboard/24-25/Aml.png",
      badge: "Human Resources"
    },
    {
      name: "Momen Mahmoud",
      role: "Head of Training",
      image: "/Images/highboard/24-25/Momen.png",
      badge: "Training"
    },
    {
      name: "Rana Ahmed",
      role: "Head of Multimedia",
      image: "/Images/highboard/24-25/Rana.jpg",
      badge: "Multimedia"
    },
    {
      name: "Alaa Ibrahim",
      role: "Head of Organization",
      image: "/Images/highboard/24-25/Alaa.png",
      badge: "Organization"
    },
    {
      name: "Adham Elawady",
      role: "Head of PR",
      image: "/Images/highboard/24-25/Adham.png",
      badge: "Public Relations"
    },
  ];

  return (
    <div className="about-page">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="about-content">
        <div className="about-wrapper">
          <div className="about-header">
            <div className="about-hero-badge">
              <Users size={14} />
              <span>Established 2018 • Zewail City</span>
            </div>
            <h1 className="title">About ZC Chess Club</h1>
            <p className="subtitle">
              Fostering strategic mastery, competitive excellence, and a vibrant community of passionate tacticians.
            </p>
          </div>

          <div className="about-section-card">
            <h2 className="section-title">Our Mission</h2>
            <p className="section-text">
              Our mission is to promote the art and science of chess, foster a welcoming community of campus tacticians,
              and provide competitive arenas for players of all skill levels. We strive to create an inclusive environment
              where members learn master opening theory, hone calculation precision, and represent Zewail City in national leagues.
            </p>
          </div>

          <div className="about-section-card">
            <h2 className="section-title">Our Values</h2>
            <p className="section-text">
              We are dedicated to excellence, integrity, and sportsmanship. We view chess not merely as a board game, but as an
              intellectual discipline that cultivates critical problem-solving, cognitive resilience, and strategic foresight.
            </p>
          </div>

          {/* 👥 Current High Board Leadership Showcase */}
          <div className="about-leadership-section">
            <div className="leadership-header">
              <h2 className="section-title">High Board Leadership (2025/2026)</h2>
              <p className="section-text" style={{ marginBottom: "20px" }}>
                Meet the dedicated student board directing tournament operations, training masterclasses, and community outreach.
              </p>
            </div>

            <div className="team-grid">
              {teamMembers.map((member, idx) => (
                <div key={idx} className="team-member glass-panel">
                  <div className="member-avatar-wrapper">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="avatar"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/Icons/unknown.png";
                      }}
                    />
                  </div>
                  <span className="member-badge">{member.badge}</span>
                  <h4 className="member-name">{member.name}</h4>
                  <p className="member-role">{member.role}</p>
                </div>
              ))}
            </div>

            <div className="highboard-cta-box">
              <a href="/history?tab=highboard" className="view-history-board-btn">
                📜 View All Past High Boards (2018 – Present) →
              </a>
            </div>
          </div>

          <div className="about-section-card" style={{ marginTop: "30px" }}>
            <h2 className="section-title">Contact Us</h2>
            <p className="section-text">
              Have questions or want to collaborate with our club? Reach out directly to our leadership at{" "}
              <a href="mailto:zcchessclub@zewailcity.edu.eg">zcchessclub@zewailcity.edu.eg</a>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

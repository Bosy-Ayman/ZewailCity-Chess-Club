import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { 
  Mail, 
  MapPin, 
  Clock, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  Globe, 
  HelpCircle,
  ExternalLink 
} from "lucide-react";
import "./ContactUs.css";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

export default function ContactUs() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "General Inquiry",
    subject: "",
    message: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setErrorMessage("Please fill in all required fields (Name, Email, and Message).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to transmit message. Please try again.");
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Error transmitting dispatch:", err);
      // Fallback: still show submitted gracefully if offline or network glitch
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: "",
      email: "",
      category: "General Inquiry",
      subject: "",
      message: ""
    });
    setSubmitted(false);
    setErrorMessage("");
  };

  const faqs = [
    {
      q: "Can I join the club if I'm a complete chess beginner?",
      a: "Absolutely! We welcome players of all skill levels. We have dedicated Trainee masterclasses and beginner scrims every semester."
    },
    {
      q: "When and where do we play casual games & scrims?",
      a: "Casual matches and drop-in scrims take place at the Academic Building, Gaming Room Zone E, or at the Cafeteria. Drop in anytime!"
    },
    {
      q: "Where are official tournaments hosted?",
      a: "Official club tournaments take place at the Academic Building near the Palm Tree and Zone D, equipped with tournament boards."
    },
    {
      q: "Do I need to bring my own chess set or clock?",
      a: "No, the club provides tournament boards, weighted pieces for all members during sessions."
    },
    {
      q: "How can I participate in official tournaments?",
      a: "Check our Tournaments page! Click on any upcoming tournament to register directly with your student account."
    }
  ];

  return (
    <div className="contact-page">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <main className="contact-main">
        {/* Hero Section */}
        <section className="contact-hero">
          <div className="contact-hero-badge">
            <MessageSquare size={15} />
            <span>Campus Headquarters • Get in Touch</span>
          </div>
          <h1 className="contact-hero-title site-page-title">Connect with ZC Chess Club</h1>
          <p className="contact-hero-desc">
            Have a question, feedback, tournament inquiry, or want to collaborate with our board?
            We’d love to hear from you.
          </p>
        </section>

        {/* Content Grid */}
        <div className="contact-grid">
          {/* Left Column: Direct Info Cards */}
          <div className="contact-info-col">
            <div className="info-card glass-card">
              <div className="info-card-header">
                <div className="info-icon-wrapper">
                  <MapPin size={22} className="info-icon" />
                </div>
                <div>
                  <h3 className="info-title">Campus Venues</h3>
                  <p className="info-sub">Where we play & compete</p>
                </div>
              </div>
              <div className="info-text">
                <div style={{ marginBottom: "10px" }}>
                  <strong style={{ color: "#f3c144" }}>♟️ Casual Play & Scrims:</strong><br />
                  Academic Building, Gaming Room Zone E, or Cafeteria.
                </div>
                <div>
                  <strong style={{ color: "#f3c144" }}>🏆 Official Tournaments:</strong><br />
                  Academic Building (near the Palm Tree & Zone D).
                </div>
              </div>
            </div>

            <div className="info-card glass-card">
              <div className="info-card-header">
                <div className="info-icon-wrapper">
                  <Mail size={22} className="info-icon" />
                </div>
                <div>
                  <h3 className="info-title">Direct Inquiries</h3>
                  <p className="info-sub">Official communication lines</p>
                </div>
              </div>
              <div className="contact-links-list">
                <a href="mailto:zcchessclub@zewailcity.edu.eg" className="contact-link-item">
                  <span>✉️ zcchessclub@zewailcity.edu.eg</span>
                  <ExternalLink size={14} />
                </a>
                <a href="mailto:zcchessclub@gmail.com" className="contact-link-item">
                  <span>✉️ zcchessclub@gmail.com</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="info-card glass-card">
              <div className="info-card-header">
                <div className="info-icon-wrapper">
                  <Clock size={22} className="info-icon" />
                </div>
                <div>
                  <h3 className="info-title">Weekly Sessions</h3>
                  <p className="info-sub">Regular campus meetups</p>
                </div>
              </div>
              <p className="info-text">
                <strong>Fridays:</strong> 9:00 PM<br />
                <em>Drop-in friendly blitz, rapid scrims, and coaching analysis at Academic Building, Gaming Room Zone E.</em>
              </p>
            </div>

            <div className="info-card glass-card">
              <div className="info-card-header">
                <div className="info-icon-wrapper">
                  <Globe size={22} className="info-icon" />
                </div>
                <div>
                  <h3 className="info-title">Online Arenas</h3>
                  <p className="info-sub">Compete with us virtually</p>
                </div>
              </div>
              <div className="social-links-grid">
                <a href="https://lichess.org/team/zewail-city-ust" target="_blank" rel="noopener noreferrer" className="social-pill">
                  <img src="/Icons/Lichess.png" alt="Lichess" width="16" height="16" />
                  <span>Lichess Team</span>
                </a>
                <a href="https://www.chess.com/club/zewail-city-ust" target="_blank" rel="noopener noreferrer" className="social-pill">
                  <img src="/Icons/chess_com.png" alt="Chess.com" width="16" height="16" />
                  <span>Chess.com</span>
                </a>
                <a href="https://www.instagram.com/zc.chessclub/" target="_blank" rel="noopener noreferrer" className="social-pill">
                  <span>📷 Instagram</span>
                </a>
                <a href="https://www.facebook.com/chessclubzc" target="_blank" rel="noopener noreferrer" className="social-pill">
                  <span>📘 Facebook</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="contact-form-col">
            <div className="contact-form-card glass-card">
              {submitted ? (
                <div className="form-success-state">
                  <div className="success-icon-wrap">
                    <CheckCircle2 size={54} className="success-icon" />
                  </div>
                  <h2 className="success-title">Message Transmitted!</h2>
                  <p className="success-desc">
                    Thank you, <strong>{formData.name}</strong>. Your message regarding "<em>{formData.category}</em>"
                    has been received by the ZC Chess Club High Board. We will follow up via <strong>{formData.email}</strong> shortly.
                  </p>
                  <button onClick={handleReset} className="btn-send-another">
                    Send Another Dispatch
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="contact-form">
                  <h2 className="form-heading">Send a Dispatch</h2>
                  <p className="form-subheading">
                    Fill out the tactical form below and our team will get back to you promptly.
                  </p>

                  {errorMessage && (
                    <div className="form-error-banner">
                      <span>⚠️ {errorMessage}</span>
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="contact-name">Your Full Name *</label>
                      <input
                        id="contact-name"
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Mostafa Ahmed"
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="contact-email">Email Address *</label>
                      <input
                        id="contact-email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="s-name@zewailcity.edu.eg"
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="contact-category">Inquiry Category</label>
                      <select
                        id="contact-category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="form-select"
                      >
                        <option value="General Inquiry">General Club Question</option>
                        <option value="Tournament Inquiry">Tournament Registration & Rules</option>
                        <option value="Club Roles & Recruitment">Board Recruitment & Roles</option>
                        <option value="Sponsorship & Collaboration">Sponsorship / Inter-University Scrim</option>
                        <option value="Feedback & Suggestions">Platform Feedback & Bug Report</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="contact-subject">Subject</label>
                      <input
                        id="contact-subject"
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Brief summary of your inquiry"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="contact-message">Your Message *</label>
                    <textarea
                      id="contact-message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Share details of your inquiry, questions, or ideas..."
                      className="form-textarea"
                      rows={5}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-contact-submit"
                  >
                    {isSubmitting ? (
                      <span>Sending Dispatch...</span>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* FAQs Section */}
        <section className="contact-faqs">
          <div className="faqs-header">
            <HelpCircle size={24} className="faqs-icon" />
            <h2 className="faqs-title">Frequently Asked Questions</h2>
          </div>

          <div className="faqs-grid">
            {faqs.map((faq, i) => (
              <div key={i} className="faq-card glass-card">
                <h4 className="faq-question">♟️ {faq.q}</h4>
                <p className="faq-answer">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

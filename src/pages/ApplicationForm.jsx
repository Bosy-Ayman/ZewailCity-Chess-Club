import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import './ApplicationForm.css'; // Import the new CSS

// A reusable component for the application forms
const ApplicationForm = ({ title, department, roleDescription, roleSpecificContent }) => {
  const navigate = useNavigate();

  // State for submission status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Profile data state
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    idNumber: "",
    phone: "",
    major: "",
    batch: "2026"
  });

  const [showBasicInfo, setShowBasicInfo] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    const email = localStorage.getItem("adminEmail");
    if (!email) {
      navigate("/?login=true");
      return;
    }

    const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
    fetch(`${API_BASE}/api/profile?email=${email}`)
      .then(res => res.json())
      .then(data => {
        setProfile(data);
      })
      .catch(err => {
        console.error("Error loading user profile:", err);
        setProfile(prev => ({ ...prev, email }));
      });
  }, [navigate]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    // Validate that profile details exist
    if (!profile.name || !profile.idNumber || !profile.phone || !profile.major) {
      setError("Please complete all basic information fields. Toggle 'Verify / Edit Profile Fields' to enter missing details.");
      setIsLoading(false);
      return;
    }

    const formElements = e.target.elements;
    
    // --- 1. Gather All Form Data ---
    const payload = {
      // --- Section 1: Basic Info from Profile ---
      name: profile.name,
      email: profile.email,
      idNumber: profile.idNumber,
      phone: profile.phone,
      major: profile.major,
      batch: profile.batch || "2026",
      
      // --- Role Info ---
      roleTitle: title || "Member",
      department: department || title || "General Committee",
    };

    // Find and add all role-specific fields (like 'hr-experience')
    if (roleSpecificContent?.props?.children) {
        const specificInputs = roleSpecificContent.props.children;
        React.Children.forEach(specificInputs, (section) => {
            if (section && section.props && section.props.children) {
                React.Children.forEach(section.props.children, (input) => {
                    if (input && input.props && input.props.name) {
                        payload[input.props.name] = formElements[input.props.name]?.value;
                    }
                    if (input && input.props && input.props.htmlFor) {
                         const matchingInput = formElements[input.props.htmlFor];
                         if (matchingInput && matchingInput.name) {
                             payload[matchingInput.name] = matchingInput.value;
                         }
                    }
                });
            }
        });
    }

    // --- 2. Send Data to API ---
    try {
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_BASE}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        e.target.reset();
      } else {
        setError(result.error || 'Submission failed. Please try again.');
      }
    } catch (err) {
      setError('A network error occurred. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-page-wrapper">
      <Header />
      
      <main className="form-container">
        <h1>♟️ ZC Chess Club Recruitment Form</h1>
        <p className="form-description">
          "Chess is the gymnasium of the mind." – Blaise Pascal. We are currently accepting applications for the 
          {title} team.
        </p>

        <form onSubmit={handleSubmit}>
          {/* --- Section 1: Basic Information (Pre-filled summary card) --- */}
          <section className="form-section basic-info-section">
            <h2>Section 1: Basic Information</h2>
            <p className="section-note">
              {roleDescription}
            </p>
            
            <div className="profile-summary-box" style={{ 
              padding: "20px", 
              background: "#181611", 
              border: "1px solid #675832", 
              borderRadius: "8px", 
              marginBottom: "20px",
              lineHeight: "1.6"
            }}>
              <h3 style={{ color: "white", marginTop: 0, marginBottom: "12px", fontSize: "1.1rem" }}>Applying As:</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                <div><strong>Name:</strong> {profile.name || <span style={{ color: "#e74c3c", fontStyle: "italic" }}>Not Set</span>}</div>
                <div><strong>Email:</strong> {profile.email}</div>
                <div><strong>ID:</strong> {profile.idNumber || <span style={{ color: "#e74c3c", fontStyle: "italic" }}>Not Set</span>}</div>
                <div><strong>Phone:</strong> {profile.phone || <span style={{ color: "#e74c3c", fontStyle: "italic" }}>Not Set</span>}</div>
                <div><strong>Major:</strong> {profile.major || <span style={{ color: "#e74c3c", fontStyle: "italic" }}>Not Set</span>}</div>
                <div><strong>Batch:</strong> {profile.batch || "2026"}</div>
              </div>
              <div style={{ marginTop: "15px", borderTop: "1px dashed #342c19", paddingTop: "10px", textAlign: "right" }}>
                <button 
                  type="button" 
                  onClick={() => setShowBasicInfo(!showBasicInfo)}
                  style={{ 
                    background: "none", 
                    border: "none", 
                    color: "#f4c653", 
                    cursor: "pointer", 
                    fontSize: "0.85rem", 
                    textDecoration: "underline",
                    fontWeight: "bold" 
                  }}
                >
                  {showBasicInfo ? "Hide Profile Inputs" : "Verify / Edit Profile Fields"}
                </button>
              </div>
            </div>

            {showBasicInfo && (
              <div className="profile-inputs-slide" style={{ animation: "fadeIn 0.3s ease" }}>
                <label htmlFor="name">Name*</label>
                <input type="text" id="name" name="name" value={profile.name} onChange={handleProfileChange} required />
                
                <label htmlFor="id">ID*</label>
                <input type="text" id="id" name="idNumber" value={profile.idNumber} onChange={handleProfileChange} required />
                
                <label htmlFor="phone">Phone Number*</label>
                <input type="tel" id="phone" name="phone" value={profile.phone} onChange={handleProfileChange} required />
                
                <label htmlFor="major">Major*</label>
                <input type="text" id="major" name="major" value={profile.major} onChange={handleProfileChange} required />
                
                <label htmlFor="batch">Batch*</label>
                <input type="text" id="batch" name="batch" value={profile.batch} onChange={handleProfileChange} required />
              </div>
            )}
            
            <label htmlFor="role-choice">Applying for Role*</label>
            <input type="text" id="role-choice" name="role-choice" value={title} readOnly style={{ opacity: 0.8, cursor: "not-allowed" }} />
          </section>
          
          {/* --- Role Specific Content (Dynamic) --- */}
          {roleSpecificContent}
          
          {/* --- Submission & Status Messages --- */}
          <div className="form-status" aria-live="polite">
            {success && (
              <p className="status-success">
                Application for {title} submitted successfully! We will review your details soon.
              </p>
            )}
            {error && (
              <p className="status-error">
                <strong>Error:</strong> {error}
              </p>
            )}
          </div>
          
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </main>
      
      <Footer />
    </div>
  );
};

export default ApplicationForm;
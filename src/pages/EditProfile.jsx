import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom";
import "./EditProfile.css"; 
export default function EditProfile() {
  const navigate = useNavigate();

  // Mock initial user data (you can replace with props or API data)
  const [formData, setFormData] = useState({
    fullName: "Bosy Ayman",
    email: "bosy@example.com",
    id: "123456789",
    phone: "01012345678",
    major: "Data Science and AI",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  // Handle input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    // Simple validation example: passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    // TODO: Implement save logic here (API call)

    alert("Profile saved successfully!");
    navigate("/profile"); // Go back to profile page
  };

  return (
    <div className="edit-profile-page">
      <Header />

      <div className="edit-profile-container">
        <h2>Edit Profile</h2>

        <form className="edit-profile-form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={handleChange}
            required
            className="edit-input"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="edit-input"
          />
          <input
            type="text"
            name="id"
            placeholder="ID"
            value={formData.id}
            onChange={handleChange}
            required
            className="edit-input"
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
            required
            className="edit-input"
          />
          <input
            type="text"
            name="major"
            placeholder="Major"
            value={formData.major}
            onChange={handleChange}
            required
            className="edit-input"
          />
          <input
            type="password"
            name="password"
            placeholder="New Password"
            value={formData.password}
            onChange={handleChange}
            className="edit-input"
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm New Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="edit-input"
          />

          {error && <p className="error-message">{error}</p>}

          <div className="edit-profile-buttons">
            <button type="submit" className="save-button">
              Save
            </button>
            <button
              type="button"
              className="cancel-button"
              onClick={() => navigate("/profile")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}

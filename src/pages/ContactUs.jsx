import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./ContactUs.css";

export default function ContactUs() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="contact-page">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <main className="contact-container">
        <h1 className="form-title">Contact Us</h1>

        <form className="contact-form">
          <input type="text" placeholder="Your Name" className="form-input" />
          <input type="email" placeholder="Your Email" className="form-input" />
          <input type="text" placeholder="Subject" className="form-input" />
          <textarea placeholder="Your Message" className="form-textarea" />

          <button className="send-button">Send Message</button>
        </form>
      </main>

      <Footer />
    </div>
  );
}

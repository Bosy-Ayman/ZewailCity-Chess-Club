import React, { useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Shield } from "lucide-react";
import "./PrivacyPolicy.css";

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="privacy-page">
      <Header />
      
      <main className="privacy-container">
        <div className="privacy-header">
          <Shield size={48} className="privacy-icon" />
          <h1>Privacy Policy</h1>
          <p className="privacy-last-updated">Last Updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="privacy-content premium-card">
          <section>
            <h2>1. Introduction</h2>
            <p>
              Welcome to the ZC Chess Club Web Application. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section>
            <h2>2. The Data We Collect About You</h2>
            <p>
              We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
            </p>
            <ul>
              <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier, and student ID.</li>
              <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
              <li><strong>Profile Data:</strong> includes your username and password, tournaments you have participated in, puzzle ratings, and your role within the club.</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Personal Data</h2>
            <p>
              We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
            </p>
            <ul>
              <li>To register you as a new club member or website user.</li>
              <li>To manage your participation in tournaments and club activities.</li>
              <li>To administer and protect our club and this website.</li>
              <li>To communicate important updates, announcements, and news regarding ZC Chess Club.</li>
            </ul>
          </section>

          <section>
            <h2>4. Third-Party Authentication (Google Sign-In)</h2>
            <p>
              Our application uses Google Sign-In for authentication. When you log in using your Google account, we receive basic profile information (such as your name, email address, and profile picture) as permitted by your Google privacy settings. We do not have access to your Google password or any other sensitive data associated with your Google account.
            </p>
          </section>

          <section>
            <h2>5. Data Security</h2>
            <p>
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. Access to your personal data is limited to those club administrators who have a legitimate need to know.
            </p>
          </section>

          <section>
            <h2>6. Your Legal Rights</h2>
            <p>
              Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:
            </p>
            <ul>
              <li>Request access to your personal data.</li>
              <li>Request correction of your personal data.</li>
              <li>Request erasure of your personal data.</li>
            </ul>
          </section>

          <section>
            <h2>7. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy or our privacy practices, please contact the club administration at <a href="mailto:zcchessclub@gmail.com">zcchessclub@gmail.com</a>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;

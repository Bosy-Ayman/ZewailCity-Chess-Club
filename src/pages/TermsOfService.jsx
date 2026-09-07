import React, { useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FileText } from "lucide-react";
import "./TermsOfService.css";

const TermsOfService = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="terms-page">
      <Header />
      
      <main className="terms-container">
        <div className="terms-header">
          <FileText size={48} className="terms-icon" />
          <h1>Terms of Service</h1>
          <p className="terms-last-updated">Last Updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="terms-content premium-card">
          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using the ZC Chess Club Web Application, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>
              ZC Chess Club provides users with an online platform to manage chess tournaments, view puzzle challenges, and participate in club activities. The service is provided "as is" and "as available".
            </p>
          </section>

          <section>
            <h2>3. User Accounts</h2>
            <p>
              To use certain features of the service, you must register for an account using Google Sign-In. You are responsible for maintaining the confidentiality of your account and password. ZC Chess Club reserves the right to refuse service, terminate accounts, or remove content in its sole discretion.
            </p>
          </section>

          <section>
            <h2>4. User Conduct</h2>
            <p>
              Users agree not to use the service to:
            </p>
            <ul>
              <li>Upload or distribute any content that is unlawful, defamatory, or fraudulent.</li>
              <li>Attempt to gain unauthorized access to any portion of the service or any other systems or networks connected to the service.</li>
              <li>Interfere with or disrupt the service or servers.</li>
              <li>Cheat, manipulate tournament brackets, or exploit any system vulnerabilities.</li>
            </ul>
          </section>

          <section>
            <h2>5. Intellectual Property</h2>
            <p>
              All content included on this site, such as text, graphics, logos, button icons, images, and software, is the property of ZC Chess Club or its content suppliers and protected by copyright laws.
            </p>
          </section>

          <section>
            <h2>6. Limitation of Liability</h2>
            <p>
              ZC Chess Club shall not be liable for any direct, indirect, incidental, special, consequential or exemplary damages resulting from your use of the service or any unauthorized access to your account.
            </p>
          </section>

          <section>
            <h2>7. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Your continued use of the service following any such modification constitutes your agreement to follow and be bound by the terms as modified.
            </p>
          </section>

          <section>
            <h2>8. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at <a href="mailto:zcchessclub@gmail.com">zcchessclub@gmail.com</a>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;

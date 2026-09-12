import React, { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Home, Trophy, Puzzle, Users, ArrowLeft } from "lucide-react";
import "./NotFound.css";

export default function NotFound() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="notfound-page">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <main className="notfound-container">
        <div className="notfound-card">
          <div className="notfound-badge">
            <span>Illegal Move</span>
          </div>

          <div className="notfound-graphic">
            <span className="notfound-piece">♚</span>
            <h1 className="notfound-title">404</h1>
          </div>

          <h2 className="notfound-subtitle">King in Check! Square Not Found</h2>
          <p className="notfound-desc">
            The diagonal you are traversing does not exist or has been removed from the board.
            Re-evaluate your position and choose a valid move below.
          </p>

          <div className="notfound-actions">
            <Link to="/" className="btn-notfound-primary">
              <Home size={18} />
              Return to Home
            </Link>
            <Link to="/tournaments" className="btn-notfound-secondary">
              <Trophy size={18} />
              Tournaments
            </Link>
            <Link to="/puzzlechallenge" className="btn-notfound-secondary">
              <Puzzle size={18} />
              Daily Puzzles
            </Link>
            <Link to="/community" className="btn-notfound-secondary">
              <Users size={18} />
              Community
            </Link>
          </div>

          <div className="notfound-back-link">
            <button onClick={() => window.history.back()} className="btn-history-back">
              <ArrowLeft size={16} /> Go Back to Previous Move
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

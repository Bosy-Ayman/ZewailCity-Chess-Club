import React from "react";
import { Link } from "react-router-dom";
import "./TopHeader.css";

const TopHeader = ({ sidebarOpen, toggleSidebar }) => {
  return (
    <>
      <header className="top-header">
        <div className="logo-title">
          <div className="logo-icon">
            <img src="/Icons/rook.png" alt="Chess Rook Logo" />
          </div>
          <h2 className="logo-text">ZC Chess Club</h2>
        </div>

        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/tournaments">Tournaments</Link>
          <Link to="/about">About Us</Link>
          <Link to="/contact">Contact</Link>
        </nav>

        <div className="hamburger" onClick={toggleSidebar}>
          ☰
        </div>
      </header>

      {sidebarOpen && (
        <div className="mobile-sidebar">
          <Link to="/">Home</Link>
          <Link to="/tournaments">Tournaments</Link>
          <Link to="/about">About Us</Link>
          <Link to="/contact">Contact</Link>
        </div>
      )}
    </>
  );
};

export default TopHeader;

import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        {/* Brand */}
        <div className="footer-brand">
          <span className="footer-logo-text">♟ ZC Chess Club</span>
          <p className="footer-tagline">Where every move matters.</p>
        </div>

        {/* Links */}
        <nav className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/tournaments">Tournaments</Link>
          <Link to="/history">History</Link>
          <Link to="/calendar">Calendar</Link>
          <Link to="/about">About</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>

        {/* Socials */}
        <div className="footer-socials-col">
          <h4 className="socials-title">Follow Us</h4>
          <div className="footer-socials">
            <a href="https://www.facebook.com/chessclubzc" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
                <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm8,191.63V152h24a8,8,0,0,0,0-16H136V112a16,16,0,0,1,16-16h16a8,8,0,0,0,0-16H152a32,32,0,0,0-32,32v24H96a8,8,0,0,0,0,16h24v63.63a88,88,0,1,1,16,0Z" />
              </svg>
            </a>
            <a href="https://www.instagram.com/zc.chessclub/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
                <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160ZM176,24H80A56.06,56.06,0,0,0,24,80v96a56.06,56.06,0,0,0,56,56h96a56.06,56.06,0,0,0,56-56V80A56.06,56.06,0,0,0,176,24Zm40,152a40,40,0,0,1-40,40H80a40,40,0,0,1-40-40V80A40,40,0,0,1,80,40h96a40,40,0,0,1,40,40Z" />
              </svg>
            </a>
            <a href="https://lichess.org/team/zewail-city-ust" target="_blank" rel="noopener noreferrer" aria-label="Lichess">
              <img src="/Icons/Lichess.png" alt="Lichess" width="18" height="18" />
            </a>
            <a href="https://www.chess.com/club/zewail-city-ust" target="_blank" rel="noopener noreferrer" aria-label="Chess.com">
              <img src="/Icons/chess_com.png" alt="Chess.com" width="22" height="22" />
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} ZC Chess Club. All rights reserved.</p>
      </div>
    </footer>
  );
}

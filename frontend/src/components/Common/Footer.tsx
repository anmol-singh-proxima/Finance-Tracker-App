import './Footer.css';

/**
 * App footer (TR-UX-02): pinned to the bottom of the viewport by the app
 * shell's flex column (App.css) — it never overlaps content, it just sits at
 * the end of short pages. Link targets are placeholders until real pages exist.
 */
const APP_VERSION = '1.0.0'; // Keep in sync with frontend/package.json.

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <span className="footer-title">💰 Finance Tracker</span>
          <span className="footer-tagline">
            Built with <span aria-label="love">❤️</span> · v{APP_VERSION}
          </span>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
          <a href="#contact">Contact</a>
        </nav>
        <p className="footer-copyright">
          © {new Date().getFullYear()} Finance Tracker. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
    setMenuOpen(false);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand" onClick={closeMenu}>
        <picture>
          <source srcSet="/logo-dark.png" media="(prefers-color-scheme: dark)" />
          <img src="/logo.png" alt="OpenDecisionFlow" className="navbar-logo" />
        </picture>
      </NavLink>
      <button
        className="navbar-hamburger"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        {menuOpen ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="3" y1="6" x2="17" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="3" y1="14" x2="17" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </button>
      <div className={`navbar-links${menuOpen ? " navbar-links--open" : ""}`}>
        <NavLink
          to="/app"
          end
          className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
          onClick={closeMenu}
        >
          Browse
        </NavLink>
        <NavLink
          to="/app/history"
          className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
          onClick={closeMenu}
        >
          History
        </NavLink>
        <NavLink
          to="/app/manage"
          className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
          onClick={closeMenu}
        >
          Manage
        </NavLink>
        <NavLink
          to="/app/docs"
          className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
          onClick={closeMenu}
        >
          Docs
        </NavLink>
        <div className="navbar-user">
          <Link to="/app/settings" className="navbar-username" onClick={closeMenu}>{user?.username}</Link>
          <button className="btn-logout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}

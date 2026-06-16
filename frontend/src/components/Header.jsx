import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  IconHome, IconMap, IconTarget, IconUsers, IconTrendingUp,
  IconClock, IconZap, IconMenu, IconX,
} from "./Icons.jsx";

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Ferme le menu au changement de route
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Bloque le scroll body quand le menu est ouvert
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: "/",           label: "Accueil",    icon: <IconHome size={18} /> },
    { path: "/map",        label: "Carte",      icon: <IconMap size={18} /> },
    { path: "/missions",   label: "Missions",   icon: <IconTarget size={18} /> },
    { path: "/team",       label: "Équipe",     icon: <IconUsers size={18} /> },
    { path: "/progression",label: "Progression",icon: <IconTrendingUp size={18} /> },
    { path: "/history",    label: "Historique", icon: <IconClock size={18} /> },
  ];

  return (
    <>
      <header className="navbar">
        {/* Logo */}
        <Link to="/" className="navbar-left" style={{ textDecoration: "none" }}>
          <div className="nav-logo"><IconZap size={18} /></div>
          <span className="nav-title">SportsIn</span>
        </Link>

        {/* Navigation desktop */}
        <nav className="nav-links">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${isActive(link.path) ? "active" : ""}`}
            >
              <span className="nav-link-icon">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User section desktop */}
        <div className="nav-user">
          {user && (
            <span className="nav-email">
              {user.username || user.email}
            </span>
          )}
          <button className="nav-logout" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>

        {/* Hamburger mobile */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <IconX size={22} /> : <IconMenu size={22} />}
        </button>
      </header>

      {/* Overlay mobile */}
      {menuOpen && (
        <div className="nav-overlay" onClick={() => setMenuOpen(false)} />
      )}

      {/* Drawer mobile */}
      <nav className={`nav-drawer ${menuOpen ? "nav-drawer--open" : ""}`}>
        {user && (
          <div className="nav-drawer-user">
            <span className="nav-drawer-email">{user.username || user.email}</span>
          </div>
        )}

        <ul className="nav-drawer-links">
          {navLinks.map((link) => (
            <li key={link.path}>
              <Link
                to={link.path}
                className={`nav-drawer-link ${isActive(link.path) ? "active" : ""}`}
              >
                <span className="nav-drawer-link-icon">{link.icon}</span>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <button className="nav-drawer-logout" onClick={handleLogout}>
          Déconnexion
        </button>
      </nav>
    </>
  );
}

export default Header;

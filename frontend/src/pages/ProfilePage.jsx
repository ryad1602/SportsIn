import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext.jsx";
import { authAPI } from "../api/api.js";
import Header from "../components/Header.jsx";
import { cardVariants } from "../components/PageTransition.jsx";
import { IconArrowRight, IconCheck, IconUser } from "../components/Icons.jsx";
import "../styles/profile.css";

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [newPseudo, setNewPseudo]         = useState("");
  const [savingPseudo, setSavingPseudo]   = useState(false);

  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);
  const [savingPassword, setSavingPassword]   = useState(false);

  const handleUpdatePseudo = async (e) => {
    e.preventDefault();
    if (!newPseudo.trim()) return;
    setSavingPseudo(true);
    const tid = toast.loading("Mise à jour du pseudo…");
    try {
      const updated = await authAPI.updateProfile(user.id, { pseudo: newPseudo.trim() });
      const updatedUser = { ...user, pseudo: updated.pseudo };
      sessionStorage.setItem("insport_user", JSON.stringify(updatedUser));
      if (setUser) setUser(updatedUser);
      setNewPseudo("");
      toast.success("Pseudo mis à jour !", { id: tid });
    } catch (err) {
      toast.error(err.message || "Erreur lors de la mise à jour", { id: tid });
    } finally {
      setSavingPseudo(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSavingPassword(true);
    const tid = toast.loading("Mise à jour du mot de passe…");
    try {
      await authAPI.updateProfile(user.id, { password: newPassword });
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Mot de passe mis à jour !", { id: tid });
    } catch (err) {
      toast.error(err.message || "Erreur lors de la mise à jour", { id: tid });
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="profile-container">
        <Header />
        <main className="profile-main">
          <p style={{ color: "var(--gray-400)" }}>Aucun utilisateur connecté.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <Header />
      <main className="profile-main">

        <button className="profile-back" onClick={() => navigate("/")}>
          <IconArrowRight size={14} style={{ transform: "rotate(180deg)" }} />
          Retour
        </button>

        {/* Avatar + nom */}
        <motion.div className="profile-header"
          variants={cardVariants} initial="hidden" animate="visible" custom={0}>
          <div className="profile-avatar">
            {user.pseudo?.charAt(0).toUpperCase() || <IconUser size={28} />}
          </div>
          <div className="profile-header-info">
            <h1 className="profile-name">{user.pseudo}</h1>
            <p className="profile-email">{user.email}</p>
          </div>
        </motion.div>

        {/* Infos actuelles */}
        <motion.div className="profile-card"
          variants={cardVariants} initial="hidden" animate="visible" custom={1}>
          <p className="profile-card-title">Informations du compte</p>
          <div className="profile-info-row">
            <span className="profile-info-label">Pseudo</span>
            <span className="profile-info-value">{user.pseudo}</span>
          </div>
          <div className="profile-info-row">
            <span className="profile-info-label">Email</span>
            <span className="profile-info-value">{user.email}</span>
          </div>
        </motion.div>

        {/* Changer pseudo */}
        <motion.div className="profile-card"
          variants={cardVariants} initial="hidden" animate="visible" custom={2}>
          <p className="profile-card-title">Changer le pseudo</p>
          <form onSubmit={handleUpdatePseudo}>
            <div className="profile-field">
              <label className="profile-label">Nouveau pseudo</label>
              <input
                className="profile-input"
                type="text"
                placeholder={user.pseudo}
                value={newPseudo}
                onChange={(e) => setNewPseudo(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <button
              type="submit"
              className="profile-submit"
              disabled={savingPseudo || !newPseudo.trim()}
            >
              <IconCheck size={16} />
              {savingPseudo ? "Enregistrement…" : "Mettre à jour le pseudo"}
            </button>
          </form>
        </motion.div>

        {/* Changer mot de passe */}
        <motion.div className="profile-card"
          variants={cardVariants} initial="hidden" animate="visible" custom={3}>
          <p className="profile-card-title">Changer le mot de passe</p>
          <form onSubmit={handleUpdatePassword}>
            <div className="profile-field">
              <label className="profile-label">Nouveau mot de passe</label>
              <div className="profile-input-wrap">
                <input
                  className="profile-input profile-input--padded"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="profile-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Masquer" : "Afficher"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>
            <div className="profile-field">
              <label className="profile-label">Confirmer le mot de passe</label>
              <input
                className="profile-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              className="profile-submit"
              disabled={savingPassword || !newPassword || !confirmPassword}
            >
              <IconCheck size={16} />
              {savingPassword ? "Enregistrement…" : "Mettre à jour le mot de passe"}
            </button>
          </form>
        </motion.div>

      </main>
    </div>
  );
}

export default ProfilePage;

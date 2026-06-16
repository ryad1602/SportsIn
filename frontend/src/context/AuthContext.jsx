import { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "../api/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("insport_token");
    const savedUser = localStorage.getItem("insport_user");

    if (savedToken && savedUser) {
      const userData = JSON.parse(savedUser);
      setToken(savedToken);
      setUser(userData);
      // Restaure le team ID dans sessionStorage si l'utilisateur a une équipe
      // et qu'il n'y a pas déjà un team ID pour cet onglet
      if (userData.equipeId && !sessionStorage.getItem("insport_team_id")) {
        sessionStorage.setItem("insport_team_id", userData.equipeId);
      }
    }
    setLoading(false);
  }, []);

  async function login(identifier, password) {
    const response = await authAPI.login(identifier, password);

    if (!response.success) {
      throw new Error(response.error || "Erreur de connexion");
    }

    const { token: newToken, user: userData } = response;

    setToken(newToken);
    setUser(userData);

    localStorage.setItem("insport_token", newToken);
    localStorage.setItem("insport_user", JSON.stringify(userData));

    // Pré-peuple le team ID dans sessionStorage depuis le profil de connexion
    if (userData.equipeId) {
      sessionStorage.setItem("insport_team_id", userData.equipeId);
    } else {
      sessionStorage.removeItem("insport_team_id");
    }

    return userData;
  }

  async function register(pseudo, email, password) {
    const response = await authAPI.register(pseudo, email, password);

    if (!response.success) {
      throw new Error(response.error || "Erreur lors de l'inscription");
    }

    const { token: newToken, user: userData } = response;

    setToken(newToken);
    setUser(userData);

    localStorage.setItem("insport_token", newToken);
    localStorage.setItem("insport_user", JSON.stringify(userData));

    // Nouvel utilisateur : pas encore d'équipe
    sessionStorage.removeItem("insport_team_id");

    return userData;
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("insport_token");
    localStorage.removeItem("insport_user");
    sessionStorage.removeItem("insport_team_id");
  }

  const value = {
    user,
    setUser,
    token,
    isAuthenticated: !!token,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div style={{ color: "white", padding: 20 }}>Loading...</div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import { useAuth } from "./context/AuthContext.jsx";

import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import MapPage from "./pages/MapPage.jsx";
import TeamPage from "./pages/TeamPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import CreateGamePage from "./pages/CreateGamePage.jsx";
import GameLobbyPage from "./pages/GameLobbyPage.jsx";
import ActiveSessionPage from "./pages/ActiveSessionPage.jsx";
import GameResultPage from "./pages/GameResultPage.jsx";
import ActivityHistoryPage from "./pages/ActivityHistoryPage.jsx";
import SessionDetailPage from "./pages/SessionDetailPage.jsx";
import MissionsPage from "./pages/MissionsPage.jsx";
import ProgressionPage from "./pages/ProgressionPage.jsx";

import GuardedRoute from "./components/GuardedRoute.jsx";
import Header from "./components/Header.jsx";
import PageTransition from "./components/PageTransition.jsx";

function App() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e1e2e",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#f1f5f9",
            fontFamily: "var(--font-sans)",
          },
        }}
      />
      {/* On n’affiche le Header que si l’utilisateur est connecté */}
      {user && <Header />}

      <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Routes publiques */}
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />

        {/* Menu principal */}
        <Route
          path="/"
          element={
            <GuardedRoute>
              <HomePage />
            </GuardedRoute>
          }
        />

        {/* Carte */}
        <Route
          path="/map"
          element={
            <GuardedRoute>
              <MapPage />
            </GuardedRoute>
          }
        />

        {/* Équipe */}
        <Route
          path="/team"
          element={
            <GuardedRoute>
              <TeamPage />
            </GuardedRoute>
          }
        />

        {/* Profil */}
        <Route
          path="/profile"
          element={
            <GuardedRoute>
              <ProfilePage />
            </GuardedRoute>
          }
        />

        {/* Créer un jeu */}
        <Route
          path="/game/create"
          element={
            <GuardedRoute>
              <CreateGamePage />
            </GuardedRoute>
          }
        />

        {/* Lobby de jeu */}
        <Route
          path="/game/lobby/:gameId"
          element={
            <GuardedRoute>
              <GameLobbyPage />
            </GuardedRoute>
          }
        />

        {/* Session active */}
        <Route
          path="/session/active"
          element={
            <GuardedRoute>
              <ActiveSessionPage />
            </GuardedRoute>
          }
        />

        {/* Résultats du jeu */}
        <Route
          path="/game/result/:sessionId"
          element={
            <GuardedRoute>
              <GameResultPage />
            </GuardedRoute>
          }
        />

        {/* Historique des activités */}
        <Route
          path="/history"
          element={
            <GuardedRoute>
              <ActivityHistoryPage />
            </GuardedRoute>
          }
        />

        {/* Détail d'une session */}
        <Route
          path="/session/:sessionId"
          element={
            <GuardedRoute>
              <SessionDetailPage />
            </GuardedRoute>
          }
        />

        {/* Missions */}
        <Route
          path="/missions"
          element={
            <GuardedRoute>
              <MissionsPage />
            </GuardedRoute>
          }
        />

        {/* Progression & Perks */}
        <Route
          path="/progression"
          element={
            <GuardedRoute>
              <ProgressionPage />
            </GuardedRoute>
          }
        />
      </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;
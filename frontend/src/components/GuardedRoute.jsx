import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import PageTransition from "./PageTransition.jsx";

function GuardedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <PageTransition>{children}</PageTransition>;
}

export default GuardedRoute;
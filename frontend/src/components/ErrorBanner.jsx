import { IconAlertTriangle } from "./Icons.jsx";

/**
 * ErrorBanner — bannière d'erreur inline réutilisable.
 *
 * Props:
 *   message   string     — texte de l'erreur
 *   onDismiss function   — callback pour fermer (optionnel)
 */
export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="error-banner animate-slideDown">
      <IconAlertTriangle size={18} />
      <p>{message}</p>
      {onDismiss && (
        <button className="error-banner__close" onClick={onDismiss} aria-label="Fermer">
          ×
        </button>
      )}
    </div>
  );
}

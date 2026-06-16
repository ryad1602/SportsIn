/**
 * EmptyState — état vide réutilisable pour toutes les pages.
 *
 * Props:
 *   icon      ReactNode  — icône SVG à afficher (ex. <IconTarget size={40} />)
 *   title     string     — titre principal
 *   message   string     — description optionnelle
 *   action    ReactNode  — bouton ou lien optionnel
 *   size      "sm"|"md"  — taille (défaut "md")
 */
export default function EmptyState({ icon, title, message, action, size = "md" }) {
  return (
    <div className={`empty-state empty-state--${size}`}>
      {icon && <span className="empty-state__icon">{icon}</span>}
      {title && <p className="empty-state__title">{title}</p>}
      {message && <p className="empty-state__message">{message}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

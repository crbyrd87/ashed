import { color, type, weight } from "../theme";

// "Nothing here yet" — icon, one line of what is missing, one line of what to
// do about it. Repeated in AdminConsole, Notifications, PartnerDashboard,
// Badges, Humidor and the Wishlist tab.
export default function EmptyState({ icon, title, body, children, style }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", ...style }}>
      {icon && <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>}
      {title && (
        <div style={{ fontSize: type.lg, fontWeight: weight.bodyBold, color: color.text, marginBottom: 8 }}>
          {title}
        </div>
      )}
      {body && (
        <div style={{ fontSize: type.md, color: color.faint, lineHeight: 1.6 }}>{body}</div>
      )}
      {children}
    </div>
  );
}

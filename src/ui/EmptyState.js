import { font, color, type, weight } from "../theme";
import Button from "./Button";

// "Nothing here yet": an icon, one line of what is missing, one line of what
// to do about it, and at most one action.
export default function EmptyState({ icon, title, body, actionLabel, onAction, children, style }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", ...style }}>
      {icon && (
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
          {icon}
        </div>
      )}
      {title && (
        <div style={{
          fontFamily: font.display, fontSize: type.lg, fontWeight: weight.displayMed,
          color: color.textPrimary, marginBottom: 8,
        }}>
          {title}
        </div>
      )}
      {body && (
        <div style={{ fontSize: type.sm, color: color.textMuted, lineHeight: 1.55, maxWidth: 300, margin: "0 auto" }}>
          {body}
        </div>
      )}
      {actionLabel && onAction && (
        <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
          <Button variant="secondary" full={false} onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
      {children}
    </div>
  );
}

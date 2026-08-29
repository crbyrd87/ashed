import { font, color, radius, type } from "../theme";

// Inline banner. A 2px left edge rather than a full border, so it reads as an
// annotation on the page instead of another card.
//
// This is what replaces alert() and window.confirm(). In a webview those
// render the platform's raw dialog with the domain name in the title, which is
// the single most damaging thing in the app once it is wrapped for the stores.
export default function Notice({ text, isError = false, children, style }) {
  if (!text && !children) return null;
  const tone = isError ? color.danger : color.positive;
  return (
    <div
      role="status"
      style={{
        background: color.surface,
        borderLeft: `2px solid ${tone}`,
        borderRadius: radius.sm,
        padding: "10px 14px",
        fontFamily: font.sans,
        fontSize: type.sm,
        color: isError ? color.dangerText : color.textBody,
        ...style,
      }}
    >
      {text}
      {children}
    </div>
  );
}

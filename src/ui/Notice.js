import { color, radius, type } from "../theme";

// The inline banner that reports the outcome of a save. Repeated with slightly
// different tints in Settings, PartnerDashboard, AdminConsole and BandScanner.
export default function Notice({ text, isError = false, style }) {
  if (!text) return null;
  const tone = isError ? color.danger : color.greenBright;
  return (
    <div
      role="status"
      style={{
        background: `${tone}22`,
        border: `1px solid ${tone}55`,
        borderRadius: radius.md,
        padding: "10px 14px",
        fontSize: type.md,
        color: isError ? color.dangerText : color.greenBright,
        textAlign: "center",
        ...style,
      }}
    >
      {text}
    </div>
  );
}

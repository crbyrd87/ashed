import { color, radius, type, weight } from "../theme";

// The small rounded tag used for strength, wrapper, origin and status. Five
// near-identical treatments across three files before this.
export default function Pill({ children, tone = color.muted, filled = false, size = "md", style }) {
  const small = size === "sm";
  return (
    <span style={{
      display: "inline-block",
      borderRadius: radius.pill,
      padding: small ? "2px 8px" : "4px 10px",
      fontSize: type.xs,
      fontWeight: weight.bodyMed,
      lineHeight: 1.4,
      color: filled ? color.bg : tone,
      background: filled ? tone : `${tone}1a`,
      border: `1px solid ${tone}${filled ? "" : "44"}`,
      whiteSpace: "nowrap",
      ...style,
    }}>
      {children}
    </span>
  );
}

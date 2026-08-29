import { color, radius } from "../theme";

// One implementation. There were two — a clickable div in CheckIn and a
// button in Settings, on different golds and different knob sizes.
export default function Toggle({ checked, onChange, label, disabled = false, style }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 48, height: 28,
        borderRadius: radius.pill,
        background: checked ? color.gold : color.surfaceRaised,
        border: "none", padding: 0,
        position: "relative", flexShrink: 0,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        WebkitTapHighlightColor: "transparent",
        transition: "background 160ms",
        ...style,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: 3,
        width: 22, height: 22, borderRadius: "50%",
        background: color.textPrimary,
        transform: checked ? "translateX(20px)" : "translateX(0)",
        transition: "transform 160ms",
      }} />
    </button>
  );
}

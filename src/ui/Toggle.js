import { color, radius } from "../theme";

// There were two implementations: CheckIn used a clickable div tinted with
// `gold` and a 20px knob, Settings a real <button> tinted with `goldLegacy`
// and an 18px knob. Settled on the button, which is keyboard reachable, on
// `gold`, which theme.js marks canonical, and on the 20px knob.
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
        width: 44, height: 24, borderRadius: radius.xl,
        background: checked ? color.gold : color.line,
        border: "none", cursor: disabled ? "default" : "pointer",
        position: "relative", transition: "background 0.2s",
        flexShrink: 0, padding: 0, opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <div style={{
        position: "absolute", top: 2, left: checked ? 22 : 2,
        width: 20, height: 20, borderRadius: "50%",
        background: color.heading, transition: "left 0.2s",
      }} />
    </button>
  );
}

import { color, radius } from "../theme";

// There were two implementations: CheckIn used a clickable div tinted with
// `gold`, Settings a real button tinted with `goldLegacy`. Settled on the
// button (keyboard reachable) and on `gold`, which theme.js marks canonical.
export default function Toggle({ checked, onChange, label, style }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: radius.xl,
        background: checked ? color.gold : color.line,
        border: "none", cursor: "pointer", position: "relative",
        transition: "background 0.2s", flexShrink: 0, padding: 0,
        ...style,
      }}
    >
      <div style={{
        position: "absolute", top: 2, left: checked ? 22 : 2,
        width: 20, height: 20, borderRadius: "50%",
        background: color.bg, transition: "left 0.2s",
      }} />
    </button>
  );
}

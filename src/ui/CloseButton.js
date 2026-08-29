import { SANS, color } from "../theme";

// The × was byte-identical in three files and near-identical in four more, at
// four different sizes. A real <button> with a label, so it is reachable by
// keyboard and announced by a screen reader (Session 12 depends on this).
export default function CloseButton({ onClose, size = 24, label = "Close", style }) {
  return (
    <button
      onClick={onClose}
      aria-label={label}
      style={{
        background: "none", border: "none", color: color.muted,
        fontSize: size, lineHeight: 1, cursor: "pointer", fontFamily: SANS,
        // 48px keeps the target comfortable without changing the glyph size.
        minWidth: 48, minHeight: 48,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 0,
        ...style,
      }}
    >
      ×
    </button>
  );
}

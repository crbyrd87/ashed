import { font, color, TAP } from "../theme";

// Wraps everything tappable. A real <button> with the browser's styling
// stripped, so a clickable div becomes a button without changing how it looks.
//
// minHeight/minWidth default to TAP (48), which satisfies both Apple and
// Material. Pass minHeight={0} for a control inside a dense row where forcing
// 48 would break the layout.
export default function Pressable({
  onClick,
  label,
  disabled = false,
  minHeight = TAP,
  minWidth,
  style,
  children,
  ...rest
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        // Reset: a button brings its own background, border, padding, font
        // and centred text, none of which the original div had.
        background: "none", border: "none", padding: 0, margin: 0,
        font: "inherit", fontFamily: font.sans, color: "inherit",
        textAlign: "left", appearance: "none",
        WebkitTapHighlightColor: "transparent",
        cursor: disabled ? "default" : "pointer",
        minHeight,
        ...(minWidth !== undefined ? { minWidth } : null),
        ...style,
      }}
      onPointerDown={(e) => { if (!disabled) e.currentTarget.style.background = color.surfaceRaised; }}
      onPointerUp={(e) => { e.currentTarget.style.background = style?.background ?? "none"; }}
      onPointerLeave={(e) => { e.currentTarget.style.background = style?.background ?? "none"; }}
      {...rest}
    >
      {children}
    </button>
  );
}

import { SANS } from "../theme";

// A real <button> with the browser's default styling stripped, so a clickable
// div can become a button without changing how it looks. Use this when the
// control contains no other interactive elements.
//
// minHeight defaults to 48, which satisfies both Apple's and Android's minimum
// (design review recs 10, 11, 12). Pass minHeight={0} for a control inside a
// dense row, where forcing 48 would break the layout — the Feed row is the
// case that matters, and it is only safe to raise once the row is thinned.
export default function Pressable({
  onClick,
  label,
  disabled = false,
  minHeight = 48,
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
        font: "inherit", fontFamily: SANS, color: "inherit",
        textAlign: "left", appearance: "none",
        cursor: disabled ? "default" : "pointer",
        minHeight,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

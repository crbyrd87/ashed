import { font, color, radius, type } from "../theme";

// Chip. Used for flavour tags, pairing chips, filters and badge names.
// No fill until selected; the border carries it.
export default function Pill({ children, selected = false, onClick, style, ...rest }) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      {...(onClick ? { type: "button", onClick } : null)}
      style={{
        display: "inline-flex", alignItems: "center",
        height: 36,
        padding: "0 14px",
        borderRadius: radius.pill,
        border: `1px solid ${selected ? color.gold : color.borderStrong}`,
        background: selected ? color.surfaceRaised : "none",
        color: color.textBody,
        fontFamily: font.sans,
        fontSize: type.sm,
        whiteSpace: "nowrap",
        cursor: onClick ? "pointer" : "default",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

import { font, color, radius, type, weight } from "../theme";

// Four variants named for their job, not their colour.
// primary is the ONE filled button on a screen — never two.
const VARIANTS = {
  primary:   { bg: color.gold,  fg: color.bg,         border: "none" },
  secondary: { bg: "none",      fg: color.textBody,   border: `1px solid ${color.borderStrong}` },
  ghost:     { bg: "none",      fg: color.textMuted,  border: "none" },
  danger:    { bg: "none",      fg: color.danger,     border: `1px solid ${color.danger}` },
};

export default function Button({
  variant = "primary",
  disabled = false,
  full = true,
  style,
  children,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        width: full ? "100%" : undefined,
        height: 52,
        background: disabled ? color.surfaceRaised : v.bg,
        color: disabled ? color.textFaint : v.fg,
        border: v.border,
        borderRadius: radius.md,
        padding: "0 18px",
        fontSize: type.md,
        fontWeight: weight.bodyBold,
        fontFamily: font.sans,
        cursor: disabled ? "default" : "pointer",
        WebkitTapHighlightColor: "transparent",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        // No hover states: this is a touch app.
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

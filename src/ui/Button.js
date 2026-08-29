import { SANS, color, radius, type, weight } from "../theme";

// Variants named for their job, not their colour, so a redesign can restyle
// them without every call site having to change.
const VARIANTS = {
  primary:   { bg: `linear-gradient(135deg, ${color.greenBright}, ${color.greenDeep})`, fg: color.white,   border: "none" },
  gold:      { bg: `linear-gradient(135deg, ${color.gold}, ${color.goldDeep})`,         fg: color.bg,      border: "none" },
  secondary: { bg: color.surfaceRaised,  fg: color.text,   border: `1px solid ${color.lineStrong}` },
  ghost:     { bg: "none",               fg: color.muted,  border: `1px solid ${color.line}` },
  danger:    { bg: "none",               fg: color.dangerText, border: `1px solid ${color.danger}` },
};

export default function Button({
  variant = "primary",
  size = "md",                 // "md" full-height action, "sm" inline control
  disabled = false,
  full = false,
  style,
  children,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const small = size === "sm";
  return (
    <button
      disabled={disabled}
      style={{
        width: full ? "100%" : undefined,
        background: disabled ? color.line : v.bg,
        color: disabled ? color.faint : v.fg,
        border: v.border,
        borderRadius: small ? radius.pill : radius.lg,
        padding: small ? "8px 14px" : 14,
        // 48px satisfies both Apple's and Android's minimum (Session 12).
        minHeight: small ? 36 : 48,
        fontSize: small ? type.xs : type.base,
        fontWeight: weight.bold,
        fontFamily: SANS,
        cursor: disabled ? "default" : "pointer",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

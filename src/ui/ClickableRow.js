import { font, color, type } from "../theme";
import Pressable from "./Pressable";

// The home screen row, reused everywhere: a 60px tappable line with an
// optional leading icon, a label, an optional sub-label, and a trailing slot
// holding a chevron, a mono count or a gold label.
//
// The divider between rows is the parent's responsibility, not the row's —
// otherwise every list ends with a trailing rule it did not ask for.
export default function ClickableRow({
  icon,
  label,
  sublabel,
  trailing,
  onClick,
  ariaLabel,
  style,
  children,
  ...rest
}) {
  // A row that wraps its own interactive children cannot be a <button>: HTML
  // forbids nesting them. Those keep the div-with-role treatment.
  if (children) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={ariaLabel || label}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(e); }
        }}
        style={{ cursor: "pointer", fontFamily: font.sans, ...style }}
        {...rest}
      >
        {children}
      </div>
    );
  }
  return (
    <Pressable
      onClick={onClick}
      label={ariaLabel}
      minHeight={60}
      style={{
        width: "100%",
        display: "flex", alignItems: "center", gap: 14,
        ...style,
      }}
      {...rest}
    >
      {icon && <span style={{ display: "flex", flexShrink: 0 }}>{icon}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: "block", fontSize: type.md, color: color.textBody,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {label}
        </span>
        {sublabel && (
          <span style={{ display: "block", fontSize: type.sm, color: color.textMuted, marginTop: 1 }}>
            {sublabel}
          </span>
        )}
      </span>
      {trailing && <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{trailing}</span>}
    </Pressable>
  );
}

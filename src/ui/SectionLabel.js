import { font, color, type, weight, TRACK_LABEL } from "../theme";

// The small uppercase label above a group. Previously varied between 10 and
// 11px, letterSpacing 1 and 2, and three different colours.
//
// `rule` draws a hairline filling the remaining width; `action` puts a gold
// text link at the far right.
export default function SectionLabel({ children, tone = color.textFaint, rule = false, action, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, ...style }}>
      <span style={{
        fontFamily: font.sans,
        fontSize: type.xs,
        letterSpacing: TRACK_LABEL,
        textTransform: "uppercase",
        fontWeight: weight.bodyMed,
        color: tone,
        whiteSpace: "nowrap",
      }}>
        {children}
      </span>
      {(rule || action) && <span style={{ flex: 1, height: 1, background: color.border }} />}
      {action}
    </div>
  );
}

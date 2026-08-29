import { color, type, weight } from "../theme";

// The small uppercase label above a group. 73 near-identical copies across 15
// files, varying only in size and tone — design review rec 8.
export default function SectionLabel({ children, tone = color.muted, size = type.xs, style }) {
  return (
    <div style={{
      fontSize: size, color: tone, letterSpacing: 1,
      fontWeight: weight.medium, textTransform: "uppercase",
      ...style,
    }}>
      {children}
    </div>
  );
}

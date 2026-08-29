import { color, radius } from "../theme";

// Replaces the plain-text loading states — "Loading feed…", "Loading badges…",
// "Searching…". A skeleton shaped like the content tells you what is coming;
// a sentence in the middle of an empty screen does not.
//
// The keyframes are injected once rather than repeated in four inline <style>
// blocks, which is how the AI progress bar was done.
const PULSE = "ashed-pulse";
if (typeof document !== "undefined" && !document.getElementById(PULSE)) {
  const el = document.createElement("style");
  el.id = PULSE;
  el.textContent = `@keyframes ${PULSE}{0%,100%{opacity:1}50%{opacity:.55}}`;
  document.head.appendChild(el);
}

export function Skeleton({ width = "100%", height = 13, style }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width, height,
        background: color.surfaceRaised,
        borderRadius: radius.sm,
        animation: `${PULSE} 1.4s ease-in-out infinite`,
        ...style,
      }}
    />
  );
}

// One list row: a wide line for the title, a shorter one beneath it.
export function SkeletonRow({ style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 0", ...style }}>
      <Skeleton width="62%" height={17} />
      <Skeleton width="38%" height={13} />
    </div>
  );
}

export default Skeleton;

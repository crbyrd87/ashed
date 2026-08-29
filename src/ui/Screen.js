import { SANS, color, layout } from "../theme";

// A full-screen panel: opaque, no scrim, occupies the whole viewport. Distinct
// from Sheet, which layers a dismissible panel over whatever is behind it.
// Notifications, Settings, Friends and the two dashboards are all this shape.
export default function Screen({
  zIndex = layout.overlayZ,
  maxWidth = layout.maxWidth,
  style,
  children,
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: color.bg, zIndex,
      overflowY: "auto", fontFamily: SANS, color: color.text,
      maxWidth, margin: "0 auto",
      ...style,
    }}>
      {children}
    </div>
  );
}

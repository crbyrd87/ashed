import { font, color, radius, layout } from "../theme";

// Bottom sheet and centred dialog.
//
// The app had two incompatible centring approaches — maxWidth + margin auto in
// CheckIn, Friends, Notifications, Recommendations and FeedModal, versus
// left:50% + translateX in Settings and the nav — so on a wide window sheets
// jumped horizontally between screens. Settled here, in one place.
//
// zIndex stays a prop: several overlays deliberately layer over other
// overlays, so the existing values are load-bearing.
const SCRIM = "rgba(10,8,6,0.72)";

export default function Sheet({
  onClose,
  align = "bottom",              // "bottom" slides up from the edge; "center" is a dialog
  zIndex = layout.overlayZ,
  maxWidth = layout.maxWidth,
  maxHeight,
  padding,
  handle = false,
  dismissOnScrim = true,
  panelStyle,
  children,
}) {
  const bottom = align === "bottom";
  return (
    <div
      onClick={dismissOnScrim && onClose ? onClose : undefined}
      style={{
        position: "fixed", inset: 0, background: SCRIM, zIndex,
        display: "flex", justifyContent: "center",
        alignItems: bottom ? "flex-end" : "center",
        padding: bottom ? 0 : 24,
        fontFamily: font.sans,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth, margin: "0 auto",
          background: color.surface,
          borderTop: `1px solid ${color.border}`,
          ...(bottom ? null : { border: `1px solid ${color.border}` }),
          borderRadius: bottom ? `${radius.sheet}px ${radius.sheet}px 0 0` : radius.sheet,
          maxHeight: maxHeight || (bottom ? "85vh" : "90vh"),
          overflowY: "auto",
          padding: padding !== undefined ? padding : (bottom ? "0 20px 20px" : 24),
          // The home indicator sits over the last 34px on a modern iPhone.
          paddingBottom: bottom ? "calc(20px + env(safe-area-inset-bottom))" : undefined,
          fontFamily: font.sans,
          ...panelStyle,
        }}
      >
        {handle && (
          <div style={{ paddingTop: 12, paddingBottom: 18, display: "flex", justifyContent: "center" }}>
            <div style={{ width: 36, height: 4, background: color.borderStrong, borderRadius: 2 }} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

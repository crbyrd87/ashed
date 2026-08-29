import { SANS, color, radius, layout } from "../theme";

// Design review rec 27: the app had five different ways of centring an overlay,
// with scrim opacities of 0.7 / 0.75 / 0.85 and panel widths of 380 / 420 / 480.
// Centring, scrim and radius are settled here.
//
// zIndex stays a required-ish prop rather than a constant. Several overlays open
// on top of other overlays — UpgradePrompt over a screen, CigarSubmitModal over
// CheckIn — so the existing values are load-bearing and are passed in, not
// unified away.
const SCRIM = "rgba(0,0,0,0.8)";

export default function Sheet({
  onClose,
  align = "bottom",              // "bottom" slides up from the edge; "center" is a dialog
  zIndex = layout.overlayZ,
  maxWidth = layout.maxWidth,
  maxHeight,
  padding,
  handle = false,                // the little grab bar on bottom sheets
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
        fontFamily: SANS,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth,
          background: color.bg,
          border: `1px solid ${color.lineStrong}`,
          ...(bottom ? { borderBottom: "none" } : null),
          borderRadius: bottom ? `${radius.xxl}px ${radius.xxl}px 0 0` : radius.xxl,
          maxHeight: maxHeight || (bottom ? "85vh" : "90vh"),
          overflowY: "auto",
          padding: padding !== undefined ? padding : (bottom ? "20px 20px 36px" : 24),
          fontFamily: SANS,
          ...panelStyle,
        }}
      >
        {handle && (
          <div style={{ width: 40, height: 4, background: color.lineStrong, borderRadius: 2, margin: "0 auto 20px" }} />
        )}
        {children}
      </div>
    </div>
  );
}

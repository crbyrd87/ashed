import { useState } from "react";
import { font, color, layout, type, weight, TAP } from "../theme";
import Icon from "./Icon";
import Pressable from "./Pressable";

// A full-screen panel: opaque, no scrim, the whole viewport. Distinct from
// Sheet, which layers a dismissible panel over what is behind it.
//
// Passing `title` renders the standard 56px header — back button, serif title,
// optional trailing action. Without it, Screen is a plain container, so the
// screens that still draw their own header keep working while they migrate.
export default function Screen({
  title,
  onBack,
  action,
  zIndex = layout.overlayZ,
  maxWidth = layout.maxWidth,
  style,
  children,
}) {
  // The header's bottom edge appears only once there is content above it, so
  // a short screen has no rule hanging under its title.
  const [scrolled, setScrolled] = useState(false);

  return (
    <div
      onScroll={title ? (e) => setScrolled(e.currentTarget.scrollTop > 4) : undefined}
      style={{
        position: "fixed", inset: 0, background: color.bg, zIndex,
        overflowY: "auto", fontFamily: font.sans, color: color.textBody,
        maxWidth, margin: "0 auto",
        paddingTop: title ? "env(safe-area-inset-top)" : undefined,
        ...style,
      }}
    >
      {title && (
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          height: 56, display: "flex", alignItems: "center", gap: 4,
          padding: "0 8px",
          background: color.bg,
          borderBottom: `1px solid ${scrolled ? color.border : "transparent"}`,
        }}>
          {onBack && (
            <Pressable onClick={onBack} label="Back" minWidth={TAP}
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon.Back size={21} color={color.textBody} />
            </Pressable>
          )}
          <div style={{
            flex: 1, minWidth: 0,
            fontFamily: font.display, fontSize: type.lg, fontWeight: weight.displayMed,
            color: color.textPrimary,
            paddingLeft: onBack ? 0 : 12,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {title}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

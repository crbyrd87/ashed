import { color, TAP } from "../theme";
import Icon from "./Icon";
import Pressable from "./Pressable";

// Replaces every bare × glyph. 48×48, labelled, so an icon-only control is
// both reachable and announced.
export default function CloseButton({ onClose, label = "Close", style }) {
  return (
    <Pressable
      onClick={onClose}
      label={label}
      minWidth={TAP}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", ...style }}
    >
      <Icon.Close size={20} color={color.textMuted} />
    </Pressable>
  );
}

import { SANS } from "../theme";

// A row that is clickable as a whole but contains its own buttons — a feed
// card with fire and comment actions, a notification with a dismiss control.
// HTML forbids nesting a button inside a button, so this stays a div and takes
// on the keyboard behaviour a button would have given it for free: focusable,
// activated by Enter or Space, and announced as a button.
export default function ClickableRow({ onClick, label, style, children, ...rest }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          // Space scrolls the page by default; a button must not.
          e.preventDefault();
          onClick(e);
        }
      }}
      style={{ cursor: "pointer", fontFamily: SANS, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

import { useEffect, useRef } from "react";

// Make the browser's Back button close an overlay instead of leaving the app.
//
// The app has no router: screens are a `tab` variable and overlays are booleans,
// so nothing the user opens creates a history entry. On Android that means the
// hardware Back button exits the app from inside a sheet, which is the wrong
// thing every time. It also means a task-led home screen would strand people on
// every screen they open.
//
// This does not add URLs. It adds one history entry per open overlay, so Back
// unwinds them in the order they were opened. Real routes can come later, when
// the redesign has settled what the screens are; this is the piece that has to
// exist either way.
//
// Usage:  useBackDismiss(showSettings, () => setShowSettings(false));

// Innermost overlay last. A single listener dispatches to the top of this
// stack, so nesting a sheet over a screen closes only the sheet.
const stack = [];

// Set when we pop an entry ourselves, to ignore the popstate it causes.
let ignorePops = 0;

let listening = false;

function handlePop() {
  if (ignorePops > 0) {
    ignorePops--;
    return;
  }
  const top = stack.pop();
  if (top) top.close();
}

export function useBackDismiss(isOpen, onClose) {
  // Held in a ref so a new inline arrow function on each render does not
  // re-run the effect, which would push a second history entry.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    if (!listening) {
      listening = true;
      window.addEventListener("popstate", handlePop);
    }

    const entry = { close: () => onCloseRef.current() };
    stack.push(entry);
    window.history.pushState({ ashedOverlay: stack.length }, "");

    return () => {
      const i = stack.indexOf(entry);
      if (i === -1) {
        // Already removed by handlePop, so Back is what closed this. The
        // history entry is gone with it and there is nothing to clean up.
        return;
      }
      // Closed some other way — a close button, a save, picking an item. The
      // entry we pushed is still sitting in history, so consume it, or the
      // next Back press would appear to do nothing.
      stack.splice(i, 1);
      ignorePops++;
      window.history.back();
    };
  }, [isOpen]);
}

export default useBackDismiss;

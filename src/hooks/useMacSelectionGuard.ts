import { useEffect } from "react";
import { isMacOS } from "@/lib/platform";

const ALLOW_SELECTION_SELECTOR = [
  ".xterm",
  ".cm-editor",
  ".select-text",
  "[data-allow-text-selection='true']",
  "input",
  "textarea",
  "[contenteditable='true']",
  "[role='textbox']",
].join(",");

function isInsideAllowedSelectionArea(node: Node | null) {
  if (!node) return false;

  const element = node instanceof Element ? node : node.parentElement;
  return Boolean(element?.closest(ALLOW_SELECTION_SELECTOR));
}

function shouldKeepSelection(eventTarget: EventTarget | null) {
  if (eventTarget instanceof Node && isInsideAllowedSelectionArea(eventTarget)) {
    return true;
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return true;

  return (
    isInsideAllowedSelectionArea(selection.anchorNode) ||
    isInsideAllowedSelectionArea(selection.focusNode)
  );
}

function clearSelectionIfNeeded(eventTarget: EventTarget | null) {
  if (shouldKeepSelection(eventTarget)) return;

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;

  selection.removeAllRanges();
}

export function useMacSelectionGuard() {
  useEffect(() => {
    if (!isMacOS) return;

    const handleWheel = (event: WheelEvent) => {
      clearSelectionIfNeeded(event.target);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      clearSelectionIfNeeded(event.target);
    };

    const handleMouseEnd = (event: MouseEvent) => {
      clearSelectionIfNeeded(event.target);
    };

    const handleBlur = () => {
      clearSelectionIfNeeded(document.activeElement);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        clearSelectionIfNeeded(document.activeElement);
      }
    };

    document.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointerup", handlePointerEnd, true);
    document.addEventListener("pointercancel", handlePointerEnd, true);
    document.addEventListener("mouseup", handleMouseEnd, true);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("wheel", handleWheel, true);
      document.removeEventListener("pointerup", handlePointerEnd, true);
      document.removeEventListener("pointercancel", handlePointerEnd, true);
      document.removeEventListener("mouseup", handleMouseEnd, true);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}

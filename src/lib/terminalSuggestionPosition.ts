import type { CSSProperties } from "react";

export interface SuggestionCursorPosition {
  top: number;
  left: number;
  lineTop?: number;
}

const VIEWPORT_MARGIN = 8;
const POPUP_GAP = 4;
const MIN_POPUP_HEIGHT = 72;

export function getSuggestionPopupStyle(
  cursorPosition: SuggestionCursorPosition,
  popupWidth: number,
  preferredMaxHeight = 240,
): CSSProperties {
  if (typeof window === "undefined") {
    return {
      top: cursorPosition.top,
      left: cursorPosition.left,
      maxHeight: preferredMaxHeight,
    };
  }

  const clampedLeft = Math.max(
    VIEWPORT_MARGIN / 2,
    Math.min(cursorPosition.left, window.innerWidth - popupWidth - VIEWPORT_MARGIN),
  );

  const lineTop = cursorPosition.lineTop ?? cursorPosition.top;
  const belowTop = cursorPosition.top + POPUP_GAP;
  const aboveAnchorTop = Math.max(VIEWPORT_MARGIN, lineTop - POPUP_GAP);
  const availableBelow = Math.max(0, window.innerHeight - belowTop - VIEWPORT_MARGIN);
  const availableAbove = Math.max(0, aboveAnchorTop - VIEWPORT_MARGIN);
  const openAbove = availableBelow < preferredMaxHeight && availableAbove > availableBelow;
  const availableHeight = openAbove ? availableAbove : availableBelow;
  const maxHeight = Math.max(
    MIN_POPUP_HEIGHT,
    Math.min(preferredMaxHeight, availableHeight || preferredMaxHeight),
  );

  if (openAbove) {
    return {
      top: aboveAnchorTop,
      left: clampedLeft,
      maxHeight,
      transform: "translateY(-100%)",
    };
  }

  return {
    top: Math.max(
      VIEWPORT_MARGIN,
      Math.min(belowTop, window.innerHeight - VIEWPORT_MARGIN - maxHeight),
    ),
    left: clampedLeft,
    maxHeight,
  };
}

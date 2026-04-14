export const DEFAULT_TERMINAL_FONT_SIZE = 16;
export const MIN_TERMINAL_FONT_SIZE = 8;
export const MAX_TERMINAL_FONT_SIZE = 72;
export const TERMINAL_FONT_SIZE_STEP = 1;

export function clampTerminalFontSize(fontSize: number): number {
  return Math.max(MIN_TERMINAL_FONT_SIZE, Math.min(MAX_TERMINAL_FONT_SIZE, Math.round(fontSize)));
}

export function increaseTerminalFontSize(fontSize: number): number {
  return clampTerminalFontSize(fontSize + TERMINAL_FONT_SIZE_STEP);
}

export function decreaseTerminalFontSize(fontSize: number): number {
  return clampTerminalFontSize(fontSize - TERMINAL_FONT_SIZE_STEP);
}

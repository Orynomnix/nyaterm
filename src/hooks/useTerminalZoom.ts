import { useCallback, useEffect, useRef } from "react";
import {
  DEFAULT_TERMINAL_FONT_SIZE,
  decreaseTerminalFontSize,
  increaseTerminalFontSize,
} from "@/lib/terminalFontSize";
import type { AppSettings } from "@/types/global";

type UpdateAppSettings = (
  updates: Partial<AppSettings> | ((prev: AppSettings) => Partial<AppSettings>),
) => void;

const CTRL_WHEEL_ZOOM_THROTTLE_MS = 50;

export function useTerminalZoom(updateAppSettings: UpdateAppSettings) {
  const lastCtrlWheelZoomAtRef = useRef(0);

  const handleZoomIn = useCallback(() => {
    updateAppSettings((prev) => ({
      appearance: {
        ...prev.appearance,
        font_size: increaseTerminalFontSize(prev.appearance.font_size),
      },
    }));
  }, [updateAppSettings]);

  const handleZoomOut = useCallback(() => {
    updateAppSettings((prev) => ({
      appearance: {
        ...prev.appearance,
        font_size: decreaseTerminalFontSize(prev.appearance.font_size),
      },
    }));
  }, [updateAppSettings]);

  const handleResetZoom = useCallback(() => {
    updateAppSettings((prev) => ({
      appearance: { ...prev.appearance, font_size: DEFAULT_TERMINAL_FONT_SIZE },
    }));
  }, [updateAppSettings]);

  useEffect(() => {
    const handleCtrlWheelZoom = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.deltaY === 0) return;

      event.preventDefault();
      const now = Date.now();
      if (now - lastCtrlWheelZoomAtRef.current < CTRL_WHEEL_ZOOM_THROTTLE_MS) return;
      lastCtrlWheelZoomAtRef.current = now;

      if (event.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    };

    window.addEventListener("wheel", handleCtrlWheelZoom, { passive: false, capture: true });
    return () => {
      window.removeEventListener("wheel", handleCtrlWheelZoom, true);
    };
  }, [handleZoomIn, handleZoomOut]);

  return {
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
  };
}

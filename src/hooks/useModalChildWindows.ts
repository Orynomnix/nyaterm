import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import {
  bounceTopModalWindow,
  isModalChildLabel,
  syncMainWindowModalState,
} from "@/lib/windowManager";

export function useModalChildWindows() {
  const [modalChildWindowCount, setModalChildWindowCount] = useState(0);

  useEffect(() => {
    const unsubs = [
      listen<{ label: string }>("child-window-opened", ({ payload }) => {
        if (!isModalChildLabel(payload.label)) return;
        setModalChildWindowCount((count) => count + 1);
        void syncMainWindowModalState();
      }),
      listen<{ label: string }>("child-window-closed", ({ payload }) => {
        if (!isModalChildLabel(payload.label)) return;
        setModalChildWindowCount((count) => Math.max(0, count - 1));
        void syncMainWindowModalState();
      }),
    ];

    return () => {
      unsubs.forEach((promise) => {
        promise.then((unsub) => unsub());
      });
    };
  }, []);

  useEffect(() => {
    let unlistenFocusChanged: (() => void) | undefined;

    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      getCurrentWindow()
        .onFocusChanged(({ payload: focused }) => {
          if (!focused || modalChildWindowCount === 0) return;
          void syncMainWindowModalState();
          void bounceTopModalWindow();
        })
        .then((unlisten) => {
          unlistenFocusChanged = unlisten;
        })
        .catch(() => {});
    });

    return () => {
      unlistenFocusChanged?.();
    };
  }, [modalChildWindowCount]);

  return modalChildWindowCount;
}

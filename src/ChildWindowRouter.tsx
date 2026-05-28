import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { lazy, type ReactNode, Suspense, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "./context/AppContext";
import { loadChildWindowPage } from "./lib/childWindowPreload";
import { isModalChildLabel, prepareForModalChildClose } from "./lib/windowManager";

const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NewSessionPage = lazy(() => import("./pages/NewSessionPage"));
const QuickCommandPage = lazy(() => import("./pages/QuickCommandPage"));
const AutoUploadPage = lazy(() => import("./pages/FileUploadPage"));

const PAGES: Record<string, React.ComponentType> = {
  settings: SettingsPage,
  "new-session": NewSessionPage,
  "quick-command": QuickCommandPage,
  "auto-upload": AutoUploadPage,
};

function ReadyChildWindow({ children }: { children: ReactNode }) {
  const revealedRef = useRef(false);

  useEffect(() => {
    const currentWindow = getCurrentWindow();
    const params = new URLSearchParams(window.location.search);
    const isPrewarm = params.get("prewarm") === "1";
    const frameId = window.requestAnimationFrame(() => {
      if (revealedRef.current) return;
      revealedRef.current = true;

      if (isPrewarm) {
        void emit("child-window-ready", { label: currentWindow.label });
        return;
      }

      void currentWindow
        .show()
        .then(() => currentWindow.setFocus())
        .then(() => {
          void emit("child-window-ready", { label: currentWindow.label });
        })
        .then(() => {
          void emit("child-window-opened", { label: currentWindow.label });
        })
        .catch(() => {});
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return children;
}

export default function ChildWindowRouter({ windowType }: { windowType: string }) {
  const { t } = useTranslation();
  const { settingsLoaded } = useApp();
  const Page = PAGES[windowType];

  useEffect(() => {
    void loadChildWindowPage(windowType);
  }, [windowType]);

  useEffect(() => {
    const currentWindow = getCurrentWindow();
    let unlistenCloseRequested: (() => void) | undefined;
    let programmaticClose = false;

    currentWindow
      .onCloseRequested(async (event) => {
        if (programmaticClose || !isModalChildLabel(currentWindow.label)) return;

        programmaticClose = true;
        event.preventDefault();
        await prepareForModalChildClose(currentWindow.label).catch(() => {});
        await currentWindow.close().catch(() => {
          programmaticClose = false;
        });
      })
      .then((unlisten) => {
        unlistenCloseRequested = unlisten;
      })
      .catch(() => {});

    return () => {
      unlistenCloseRequested?.();
    };
  }, []);

  if (!Page) {
    return (
      <ReadyChildWindow>
        <div className="h-screen flex items-center justify-center text-muted-foreground">
          {t("common.unknownWindowType")}: {windowType}
        </div>
      </ReadyChildWindow>
    );
  }

  if (!settingsLoaded) return null;

  return (
    <Suspense fallback={null}>
      <ReadyChildWindow>
        <Page />
      </ReadyChildWindow>
    </Suspense>
  );
}

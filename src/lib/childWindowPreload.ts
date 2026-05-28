const PAGE_LOADERS: Record<string, () => Promise<unknown>> = {
  settings: () => import("@/pages/SettingsPage"),
  "new-session": () => import("@/pages/NewSessionPage"),
  "quick-command": () => import("@/pages/QuickCommandPage"),
  "auto-upload": () => import("@/pages/FileUploadPage"),
};

export function loadChildWindowPage(windowType: string) {
  return PAGE_LOADERS[windowType]?.();
}

export function preloadModalChildWindowPages() {
  void PAGE_LOADERS.settings();
  void PAGE_LOADERS["new-session"]();
  void PAGE_LOADERS["quick-command"]();
}

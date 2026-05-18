import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import {
  type ShortcutCategory,
  type ShortcutDefinition,
  SHORTCUT_REGISTRY,
  formatKeysForDisplay,
  resolveKeys,
} from "@/lib/shortcutRegistry";

export interface ResolvedShortcut {
  id: string;
  category: ShortcutCategory;
  labelKey: string;
  keys: string;
  displayKeys: string;
  isCustom: boolean;
  defaultKeys: string;
  contextual?: boolean;
}

export function useShortcutMap() {
  const { appSettings } = useApp();
  const overrides = appSettings.keybindings;

  const resolved = useMemo(() => {
    const map = new Map<string, ResolvedShortcut>();
    const list: ResolvedShortcut[] = [];

    for (const def of SHORTCUT_REGISTRY) {
      const keys = resolveKeys(def.id, overrides);
      const entry: ResolvedShortcut = {
        id: def.id,
        category: def.category,
        labelKey: def.labelKey,
        keys,
        displayKeys: formatKeysForDisplay(keys),
        isCustom: def.id in overrides,
        defaultKeys: def.defaultKeys,
        contextual: def.contextual,
      };
      map.set(def.id, entry);
      list.push(entry);
    }

    return { map, list };
  }, [overrides]);

  return useMemo(
    () => ({
      getKeys: (id: string) => resolved.map.get(id)?.keys ?? "",
      getDisplayKeys: (id: string) => resolved.map.get(id)?.displayKeys ?? "",
      getDefinition: (id: string) => resolved.map.get(id),
      allShortcuts: resolved.list,
    }),
    [resolved],
  );
}

/**
 * Standalone (non-hook) function to resolve shortcuts from a keybindings map.
 * Used in contexts where React hooks are not available (e.g. xterm key handlers).
 */
export function resolveShortcutKeys(
  id: string,
  overrides: Record<string, string>,
): string {
  return resolveKeys(id, overrides);
}

/**
 * Standalone function to resolve display keys for menus and labels.
 */
export function resolveDisplayKeys(
  id: string,
  overrides: Record<string, string>,
): string {
  return formatKeysForDisplay(resolveKeys(id, overrides));
}

/**
 * Get all shortcut definitions with resolved keys, without requiring React hooks.
 */
export function resolveAllShortcuts(
  overrides: Record<string, string>,
): ResolvedShortcut[] {
  return SHORTCUT_REGISTRY.map((def: ShortcutDefinition) => {
    const keys = resolveKeys(def.id, overrides);
    return {
      id: def.id,
      category: def.category,
      labelKey: def.labelKey,
      keys,
      displayKeys: formatKeysForDisplay(keys),
      isCustom: def.id in overrides,
      defaultKeys: def.defaultKeys,
      contextual: def.contextual,
    };
  });
}

import { useTranslation } from "react-i18next";
import { SelectItem } from "@/components/ui/select";
import { useApp } from "@/context/AppContext";
import { AVAILABLE_LANGUAGES } from "@/i18n";
import { SettingInput, SettingRow, SettingSelect, SettingSwitch } from "./SettingFormItems";

export function GeneralTab() {
  const { t, i18n } = useTranslation();
  const { appSettings, updateAppSettings, updateUi } = useApp();

  return (
    <div className="space-y-4">
      <SettingSelect
        label={t("settings.language")}
        desc={t("settings.languageDesc")}
        value={appSettings.ui.language || "en"}
        onValueChange={(lng) => {
          i18n.changeLanguage(lng);
          updateUi({ language: lng });
        }}
      >
        {AVAILABLE_LANGUAGES.map((lng) => (
          <SelectItem key={lng.id} value={lng.id}>
            {lng.name}
          </SelectItem>
        ))}
      </SettingSelect>

      <SettingRow
        label={t("settings.startupRestore")}
        desc={t("settings.startupRestoreDesc")}
      >
        <SettingSwitch
          checked={appSettings.general.startup_restore}
          onChange={(v) =>
            updateAppSettings({ general: { ...appSettings.general, startup_restore: v } })
          }
        />
      </SettingRow>

      <SettingInput
        label={t("settings.defaultLocalShell")}
        desc={t("settings.defaultLocalShellDesc")}
        value={appSettings.general.default_local_shell}
        onChange={(e) =>
          updateAppSettings({
            general: { ...appSettings.general, default_local_shell: e.target.value },
          })
        }
      />

      <SettingRow
        label={t("settings.minimizeToTray")}
        desc={t("settings.minimizeToTrayDesc")}
      >
        <SettingSwitch
          checked={appSettings.general.minimize_to_tray}
          onChange={(v) =>
            updateAppSettings({ general: { ...appSettings.general, minimize_to_tray: v } })
          }
        />
      </SettingRow>
    </div>
  );
}

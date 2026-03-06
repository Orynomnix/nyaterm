import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { SettingNumberInput, SettingRow, SettingSwitch } from "./SettingFormItems";

export function TerminalTab() {
  const { t } = useTranslation();
  const { appSettings, updateAppSettings, updateUi } = useApp();

  return (
    <div className="space-y-4">
      <SettingNumberInput
        label={t("settings.scrollbackLines")}
        desc={t("settings.scrollbackLinesDesc")}
        min={100}
        max={100000}
        step={100}
        value={appSettings.terminal.scrollback_lines}
        onChange={(v) =>
          updateAppSettings({ terminal: { ...appSettings.terminal, scrollback_lines: v || 5000 } })
        }
      />

      <SettingNumberInput
        label={t("settings.keepAliveInterval")}
        desc={t("settings.keepAliveIntervalDesc")}
        min={0}
        max={600}
        step={5}
        value={appSettings.terminal.keep_alive_interval}
        onChange={(v) =>
          updateAppSettings({ terminal: { ...appSettings.terminal, keep_alive_interval: v || 0 } })
        }
      />

      <SettingRow
        label={t("settings.hardwareAcceleration")}
        desc={t("settings.hardwareAccelerationDesc")}
      >
        <SettingSwitch
          checked={appSettings.terminal.hardware_acceleration}
          onChange={(v) =>
            updateAppSettings({ terminal: { ...appSettings.terminal, hardware_acceleration: v } })
          }
        />
      </SettingRow>

      <SettingRow
        label={t("settings.showRemoteStats")}
        desc={t("settings.showRemoteStatsDesc")}
      >
        <SettingSwitch
          checked={appSettings.ui.show_remote_stats ?? false}
          onChange={(v) => updateUi({ show_remote_stats: v })}
        />
      </SettingRow>
    </div>
  );
}

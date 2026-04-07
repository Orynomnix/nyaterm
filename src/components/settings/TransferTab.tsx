import { useTranslation } from "react-i18next";
import { SelectItem } from "@/components/ui/select";
import { useApp } from "@/context/AppContext";
import {
  SettingInput,
  SettingNumberInput,
  SettingRow,
  SettingSelect,
  SettingSwitch,
} from "./SettingFormItems";

export function TransferTab() {
  const { t } = useTranslation();
  const { appSettings, updateAppSettings } = useApp();
  const transfer = appSettings.transfer;

  const update = (patch: Partial<typeof transfer>) =>
    updateAppSettings({ transfer: { ...transfer, ...patch } });

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SettingNumberInput
          label={t("settings.downloadThreads")}
          desc={t("settings.downloadThreadsDesc")}
          min={1}
          max={10}
          value={transfer.download_threads}
          onChange={(v) => update({ download_threads: v })}
        />

        <SettingNumberInput
          label={t("settings.uploadThreads")}
          desc={t("settings.uploadThreadsDesc")}
          min={1}
          max={10}
          value={transfer.upload_threads}
          onChange={(v) => update({ upload_threads: v })}
        />
      </div>

      <SettingSelect
        label={t("settings.duplicateStrategy")}
        desc={t("settings.duplicateStrategyDesc")}
        value={transfer.duplicate_strategy}
        onValueChange={(v) => update({ duplicate_strategy: v })}
      >
        <SelectItem value="overwrite">{t("settings.strategyOverwrite")}</SelectItem>
        <SelectItem value="skip">{t("settings.strategySkip")}</SelectItem>
        <SelectItem value="rename">{t("settings.strategyRename")}</SelectItem>
        <SelectItem value="ask">{t("settings.strategyAsk")}</SelectItem>
      </SettingSelect>

      <SettingRow
        label={t("settings.preserveTimestamps")}
        desc={t("settings.preserveTimestampsDesc")}
      >
        <SettingSwitch
          checked={transfer.preserve_timestamps}
          onChange={(v) => update({ preserve_timestamps: v })}
        />
      </SettingRow>

      <SettingRow
        label={t("settings.resumeBrokenTransfer")}
        desc={t("settings.resumeBrokenTransferDesc")}
      >
        <SettingSwitch
          checked={transfer.resume_broken_transfer}
          onChange={(v) => update({ resume_broken_transfer: v })}
        />
      </SettingRow>

      <SettingInput
        label={t("settings.defaultFilePermissions")}
        desc={t("settings.defaultFilePermissionsDesc")}
        placeholder="644"
        value={transfer.default_file_permissions}
        onChange={(e) => update({ default_file_permissions: e.target.value })}
      />

      <SettingNumberInput
        label={t("settings.maxTransferRetries")}
        desc={t("settings.maxTransferRetriesDesc")}
        min={0}
        max={10}
        value={transfer.max_transfer_retries}
        onChange={(v) => update({ max_transfer_retries: v })}
      />

      <SettingNumberInput
        label={t("settings.transferBufferSize")}
        desc={t("settings.transferBufferSizeDesc")}
        min={8}
        max={256}
        step={8}
        value={transfer.transfer_buffer_size}
        onChange={(v) => update({ transfer_buffer_size: v })}
      />
    </div>
  );
}

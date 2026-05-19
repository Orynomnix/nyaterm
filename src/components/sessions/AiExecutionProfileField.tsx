import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AIExecutionProfile } from "@/types/global";

interface AiExecutionProfileFieldProps {
  value: AIExecutionProfile;
  onChange: (value: AIExecutionProfile) => void;
}

export function AiExecutionProfileField({ value, onChange }: AiExecutionProfileFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="min-w-[12rem] flex-1">
      <Label className="text-xs font-medium text-foreground/80">
        {t("dialog.aiExecutionProfile", "AI Execution Profile")}
      </Label>
      <Select value={value} onValueChange={(next) => onChange(next as AIExecutionProfile)}>
        <SelectTrigger className="mt-1 h-8 text-xs font-normal">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">{t("dialog.aiExecutionProfileAuto", "Auto")}</SelectItem>
          <SelectItem value="posix">{t("dialog.aiExecutionProfilePosix", "POSIX")}</SelectItem>
          <SelectItem value="powershell">
            {t("dialog.aiExecutionProfilePowerShell", "PowerShell")}
          </SelectItem>
          <SelectItem value="cmd">{t("dialog.aiExecutionProfileCmd", "CMD")}</SelectItem>
          <SelectItem value="send_only">
            {t("dialog.aiExecutionProfileSendOnly", "Send only")}
          </SelectItem>
          <SelectItem value="disabled">
            {t("dialog.aiExecutionProfileDisabled", "Disabled")}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

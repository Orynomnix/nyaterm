import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AIExecutionProfile } from "@/types/global";
import { AiExecutionProfileField } from "./AiExecutionProfileField";

interface LocalTerminalProps {
  shellPath: string;
  setShellPath: (v: string) => void;
  workingDir: string;
  setWorkingDir: (v: string) => void;
  aiExecutionProfile: AIExecutionProfile;
  setAiExecutionProfile: (v: AIExecutionProfile) => void;
}

export function LocalTerminal({
  shellPath,
  setShellPath,
  workingDir,
  setWorkingDir,
  aiExecutionProfile,
  setAiExecutionProfile,
}: LocalTerminalProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 w-full">
      <div className="space-y-4">
        <div className="min-w-0">
          <Label className="text-[0.6875rem] text-muted-foreground">
            {t("dialog.shellPath", "Shell Path")}
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={
                shellPath === "powershell.exe" ||
                shellPath === "cmd.exe" ||
                shellPath === "bash" ||
                shellPath === "wsl.exe"
                  ? shellPath
                  : "custom"
              }
              onValueChange={(val) => setShellPath(val === "custom" ? "" : val)}
            >
              <SelectTrigger className="mt-1 h-8 w-full text-xs font-normal sm:w-36 sm:shrink-0">
                <SelectValue placeholder={t("dialog.selectShell", "Select Shell")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="powershell.exe">
                  {t("dialog.shellPowerShell", "PowerShell")}
                </SelectItem>
                <SelectItem value="cmd.exe">{t("dialog.shellCmd", "Command Prompt")}</SelectItem>
                <SelectItem value="bash">{t("dialog.shellBash", "Bash")}</SelectItem>
                <SelectItem value="wsl.exe">{t("dialog.shellWsl", "WSL")}</SelectItem>
                <SelectItem value="custom">{t("dialog.shellCustom", "Custom...")}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="mt-1 h-8 flex-1 text-xs"
              placeholder={t("dialog.shellPathPlaceholder", "e.g. /bin/zsh or pwsh.exe")}
              value={shellPath}
              onChange={(e) => setShellPath(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <AiExecutionProfileField
          value={aiExecutionProfile}
          onChange={setAiExecutionProfile}
        />
      </div>
      <div>
        <Label className="text-[0.6875rem] text-muted-foreground">
          {t("dialog.workingDir", "Working Directory")}
        </Label>
        <Input
          className="mt-1 text-xs h-8"
          placeholder={t("dialog.workingDirPlaceholder", "e.g. C:\\Projects or ~/workspace")}
          value={workingDir}
          onChange={(e) => setWorkingDir(e.target.value)}
        />
      </div>
    </div>
  );
}

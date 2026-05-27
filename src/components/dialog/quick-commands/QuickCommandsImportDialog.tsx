import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MdDataObject, MdTerminal } from "react-icons/md";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { invoke } from "@/lib/invoke";
import { logger } from "@/lib/logger";
import type { QuickCommandImportResult, QuickCommandImportSource } from "@/types/global";

interface QuickCommandsImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (result: QuickCommandImportResult) => void;
}

interface ImportSource {
  id: QuickCommandImportSource;
  nameKey: string;
  hintKey: string;
  extensions: string[];
  icon: "windterm" | "json";
}

const IMPORT_SOURCES: ImportSource[] = [
  {
    id: "windterm_quickbar",
    nameKey: "quickCommands.importWindTerm",
    hintKey: "quickCommands.importWindTermHint",
    extensions: ["config", "json"],
    icon: "windterm",
  },
  {
    id: "nyaterm_json",
    nameKey: "quickCommands.importNyaTermJson",
    hintKey: "quickCommands.importNyaTermJsonHint",
    extensions: ["json"],
    icon: "json",
  },
];

export default function QuickCommandsImportDialog({
  open,
  onClose,
  onImported,
}: QuickCommandsImportDialogProps) {
  const { t } = useTranslation();
  const [importingSource, setImportingSource] = useState<QuickCommandImportSource | null>(null);

  const handleSelect = async (source: ImportSource) => {
    if (importingSource) return;

    setImportingSource(source.id);
    try {
      const selected = await openFileDialog({
        multiple: false,
        filters: [{ name: t(source.nameKey), extensions: source.extensions }],
      });
      if (!selected || Array.isArray(selected)) return;

      onClose();
      const result = await invoke<QuickCommandImportResult>("import_quick_commands", {
        filePath: selected,
        source: source.id,
      });
      toast.success(
        t("quickCommands.importSuccess", {
          imported: result.imported_commands,
          updated: result.updated_commands,
          total: result.total_commands,
        }),
      );
      onImported(result);
    } catch (error) {
      logger.error({
        domain: "settings.persistence",
        event: "import_failed",
        message: "Import quick commands failed",
        data: { source: source.id },
        error,
      });
      toast.error(t("quickCommands.importFailed", { error: String(error) }));
    } finally {
      setImportingSource(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !importingSource && onClose()}>
      <DialogContent className="w-[min(380px,calc(100vw-2rem))] sm:max-w-[380px] p-6">
        <DialogHeader>
          <DialogTitle className="text-sm">{t("quickCommands.importTitle")}</DialogTitle>
          <DialogDescription className="text-xs">
            {t("quickCommands.importSelectSource")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {IMPORT_SOURCES.map((source) => {
            const isImporting = importingSource === source.id;
            return (
              <button
                key={source.id}
                type="button"
                disabled={!!importingSource}
                className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border p-3 text-center transition-colors hover:border-[var(--df-primary)] hover:bg-[color-mix(in_srgb,var(--df-primary)_8%,transparent)] disabled:cursor-default disabled:opacity-60"
                style={{ borderColor: "var(--df-border)" }}
                onClick={() => handleSelect(source)}
              >
                {source.icon === "windterm" ? (
                  <img src="/WindTerm.svg" alt="" className="h-10 w-10" draggable={false} />
                ) : (
                  <MdDataObject className="h-10 w-10 text-[var(--df-primary)]" />
                )}
                <span className="text-xs font-medium" style={{ color: "var(--df-text)" }}>
                  {t(source.nameKey)}
                </span>
                <span
                  className="text-[0.65rem] leading-tight"
                  style={{ color: "var(--df-text-dimmed)" }}
                >
                  {isImporting ? t("quickCommands.importing") : t(source.hintKey)}
                </span>
              </button>
            );
          })}
        </div>
        <div
          className="flex items-center gap-1.5 pt-1 text-[0.6875rem]"
          style={{ color: "var(--df-text-dimmed)" }}
        >
          <MdTerminal className="text-[0.85rem]" />
          <span>{t("quickCommands.importMergeHint")}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

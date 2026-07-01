import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { TiFlashOutline } from "react-icons/ti";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { parseTemporarySshLink, type TemporarySshLinkConfig } from "@/lib/temporarySshLink";

interface TemporarySshLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (config: TemporarySshLinkConfig) => void | Promise<void>;
}

export default function TemporarySshLinkDialog({
  open,
  onOpenChange,
  onConnect,
}: TemporarySshLinkDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const parsed = useMemo(() => parseTemporarySshLink(value), [value]);
  const canConnect = value.trim().length > 0 && parsed.ok;

  useEffect(() => {
    if (!open) {
      setValue("");
      setErrorKey(null);
      return;
    }

    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const handleConnect = async () => {
    const result = parseTemporarySshLink(value);
    if (!result.ok) {
      setErrorKey(result.errorKey);
      return;
    }

    setErrorKey(null);
    onOpenChange(false);
    await onConnect(result.config);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[30rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <TiFlashOutline className="text-[1rem] text-[var(--df-primary)]" />
            {t("temporarySsh.title")}
          </DialogTitle>
          <DialogDescription>{t("temporarySsh.description")}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleConnect();
          }}
        >
          <Input
            ref={inputRef}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setErrorKey(null);
            }}
            placeholder={t("temporarySsh.placeholder")}
            aria-invalid={Boolean(errorKey)}
            className="font-mono text-sm"
          />
          {errorKey ? (
            <p className="text-xs text-destructive" role="alert">
              {t(errorKey)}
            </p>
          ) : null}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" disabled={!canConnect} onClick={() => void handleConnect()}>
            {t("temporarySsh.connect")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

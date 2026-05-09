import { Eye, EyeOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdAdd, MdDelete, MdEdit } from "react-icons/md";
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
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { invoke } from "@/lib/invoke";
import type { SavedPassword } from "@/types/global";
import { CopyButton } from "./CopyButton";
import { SecretUnlockFooter } from "./SecretUnlockFooter";

interface PasswordManagementTabProps {
  onCountChange?: (count: number) => void;
  secretsUnlocked?: boolean;
  onLockSecrets?: () => void;
  onUnlockSecrets?: () => void;
  showSecretUnlockFooter?: boolean;
}

interface PasswordEditorProps {
  editHasPassword: boolean;
  editName: string;
  editPassword: string;
  isEditing: boolean;
  passwordLoading: boolean;
  onCancel: () => void;
  onNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSave: () => void;
  saveDisabled: boolean;
  t: ReturnType<typeof useTranslation>["t"];
}

function PasswordEditor({
  editHasPassword,
  editName,
  editPassword,
  isEditing,
  passwordLoading,
  onCancel,
  onNameChange,
  onPasswordChange,
  onSave,
  saveDisabled,
  t,
}: PasswordEditorProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-2.5 border-b bg-accent/30 p-3">
      <Input
        placeholder={t("passwordManager.namePlaceholder")}
        className="h-8 text-xs"
        value={editName}
        onChange={(event) => onNameChange(event.target.value)}
        autoFocus
      />
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder={
            passwordLoading
              ? t("common.loading")
              : isEditing && editHasPassword
                ? t("passwordManager.passwordUnchanged")
                : t("passwordManager.passwordPlaceholder")
          }
          className="h-8 pr-8 text-xs"
          value={editPassword}
          onChange={(event) => onPasswordChange(event.target.value)}
          disabled={passwordLoading}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => setShowPassword((v) => !v)}
          disabled={passwordLoading}
          aria-label={
            showPassword ? t("passwordManager.hidePassword") : t("passwordManager.showPassword")
          }
        >
          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <div className="flex justify-end gap-1.5 pt-0.5">
        <Button variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button size="sm" className="h-7 px-3 text-xs" onClick={onSave} disabled={saveDisabled}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

export function PasswordManagementTab({
  onCountChange,
  secretsUnlocked = false,
  onLockSecrets,
  onUnlockSecrets,
  showSecretUnlockFooter = false,
}: PasswordManagementTabProps) {
  const { t } = useTranslation();
  const [passwords, setPasswords] = useState<SavedPassword[]>([]);
  const [passwordCache, setPasswordCache] = useState<Record<string, string>>({});
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [revealLoadingIds, setRevealLoadingIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editHasPassword, setEditHasPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<SavedPassword | null>(null);
  const editRequestRef = useRef(0);

  const loadPasswords = useCallback(async () => {
    try {
      const result = await invoke<SavedPassword[]>("get_saved_passwords");
      setPasswords(result);
      onCountChange?.(result.length);
    } catch {
      /* ignore */
    }
  }, [onCountChange]);

  useEffect(() => {
    loadPasswords();
  }, [loadPasswords]);

  useEffect(() => {
    if (!secretsUnlocked) {
      setPasswordCache({});
      setRevealedIds(new Set());
      setRevealLoadingIds(new Set());
    }
  }, [secretsUnlocked]);

  const handleToggleReveal = useCallback(
    async (id: string) => {
      if (revealedIds.has(id)) {
        setRevealedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      if (id in passwordCache) {
        setRevealedIds((prev) => new Set(prev).add(id));
        return;
      }

      setRevealLoadingIds((prev) => new Set(prev).add(id));
      try {
        const value = await invoke<string | null>("get_saved_password_value", { id });
        setPasswordCache((prev) => ({ ...prev, [id]: value ?? "" }));
        setRevealedIds((prev) => new Set(prev).add(id));
      } catch {
        setPasswordCache((prev) => ({ ...prev, [id]: "" }));
        setRevealedIds((prev) => new Set(prev).add(id));
      } finally {
        setRevealLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [revealedIds, passwordCache],
  );

  const resetEdit = () => {
    editRequestRef.current += 1;
    setEditingId(null);
    setEditName("");
    setEditPassword("");
    setEditHasPassword(false);
    setPasswordLoading(false);
    setIsNew(false);
  };

  const handleAdd = () => {
    resetEdit();
    setEditingId("__new__");
    setIsNew(true);
  };

  const handleEdit = async (entry: SavedPassword) => {
    const requestId = ++editRequestRef.current;
    setEditingId(entry.id);
    setEditName(entry.name);
    setEditPassword("");
    setEditHasPassword(entry.has_password || false);
    setPasswordLoading(true);
    setIsNew(false);

    try {
      const password = await invoke<string | null>("get_saved_password_value", { id: entry.id });
      if (editRequestRef.current !== requestId) return;
      setEditPassword(password ?? "");
    } catch {
      if (editRequestRef.current !== requestId) return;
      setEditPassword("");
    } finally {
      if (editRequestRef.current === requestId) {
        setPasswordLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    if (isNew && !editPassword) return;
    try {
      await invoke("save_password", {
        entry: {
          id: isNew ? "" : editingId,
          name: editName.trim(),
          password: editPassword || undefined,
        },
      });
      resetEdit();
      await loadPasswords();
    } catch {
      /* ignore */
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEntry) return;
    try {
      await invoke("delete_password", { id: deletingEntry.id });
      await loadPasswords();
    } catch {
      /* ignore */
    }
    setDeletingEntry(null);
  };

  const lockedHint = !secretsUnlocked ? t("secretUnlock.lockedActionHint") : undefined;

  const rootClassName = showSecretUnlockFooter ? "flex min-h-0 flex-1 flex-col" : "space-y-6";
  const contentClassName = showSecretUnlockFooter
    ? "min-h-0 flex-1 overflow-y-auto px-3 pb-3 terminal-scroll"
    : "";

  return (
    <div className={rootClassName}>
      <div className={contentClassName}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-medium text-sm">{t("passwordManager.title")}</Label>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary h-7 px-2 text-xs"
              onClick={handleAdd}
              disabled={editingId !== null}
            >
              <MdAdd className="text-base mr-1" /> {t("passwordManager.add")}
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            {isNew && editingId === "__new__" && (
              <PasswordEditor
                editHasPassword={editHasPassword}
                editName={editName}
                editPassword={editPassword}
                isEditing={false}
                passwordLoading={passwordLoading}
                onCancel={resetEdit}
                onNameChange={setEditName}
                onPasswordChange={setEditPassword}
                onSave={handleSave}
                saveDisabled={passwordLoading || !editName.trim() || !editPassword}
                t={t}
              />
            )}

            {passwords.map((entry) => (
              <div key={entry.id}>
                {editingId === entry.id && !isNew ? (
                  <PasswordEditor
                    editHasPassword={editHasPassword}
                    editName={editName}
                    editPassword={editPassword}
                    isEditing={true}
                    passwordLoading={passwordLoading}
                    onCancel={resetEdit}
                    onNameChange={setEditName}
                    onPasswordChange={setEditPassword}
                    onSave={handleSave}
                    saveDisabled={passwordLoading || !editName.trim()}
                    t={t}
                  />
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-2.5 border-b last:border-0 hover:bg-accent transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs">{entry.name}</div>
                      {revealedIds.has(entry.id) ? (
                        <div className="mt-1 flex items-start gap-0.5">
                          <span className="min-w-0 select-text break-all font-mono text-[0.6875rem] text-muted-foreground">
                            {passwordCache[entry.id] || t("secretUnlock.emptySecret")}
                          </span>
                          {passwordCache[entry.id] ? (
                            <CopyButton value={passwordCache[entry.id]} />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => void handleToggleReveal(entry.id)}
                              disabled={
                                !secretsUnlocked ||
                                editingId !== null ||
                                revealLoadingIds.has(entry.id)
                              }
                              aria-label={
                                revealedIds.has(entry.id)
                                  ? t("passwordManager.hidePassword")
                                  : t("passwordManager.showPassword")
                              }
                            >
                              {revealedIds.has(entry.id) ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {lockedHint ??
                            (revealedIds.has(entry.id)
                              ? t("passwordManager.hidePassword")
                              : t("passwordManager.showPassword"))}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                void handleEdit(entry);
                              }}
                              disabled={!secretsUnlocked || editingId !== null}
                              aria-label={t("common.edit")}
                            >
                              <MdEdit className="text-base" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {lockedHint ?? t("common.edit")}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingEntry(entry)}
                              disabled={!secretsUnlocked || editingId !== null}
                              aria-label={t("common.delete")}
                            >
                              <MdDelete className="text-base" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {lockedHint ?? t("common.delete")}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {passwords.length === 0 && !isNew && (
              <div className="text-center py-6 text-xs text-muted-foreground">
                {t("passwordManager.noPasswords")}
              </div>
            )}
          </div>
        </div>
      </div>

      {showSecretUnlockFooter ? (
        <SecretUnlockFooter
          unlocked={secretsUnlocked}
          onLock={onLockSecrets ?? (() => {})}
          onUnlocked={onUnlockSecrets ?? (() => {})}
        />
      ) : null}

      <Dialog open={deletingEntry !== null} onOpenChange={(v) => !v && setDeletingEntry(null)}>
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("passwordManager.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("passwordManager.deleteConfirm", { name: deletingEntry?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingEntry(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

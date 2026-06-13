import { MdContentCopy, MdDelete, MdDriveFileRenameOutline, MdEdit, MdLink } from "react-icons/md";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { SavedConnection } from "@/types/global";
import { resolveConnectionIcon } from "../../icons";
import { useSavedConnectionsContext } from "./context";

interface ConnectionItemProps {
  conn: SavedConnection;
  indented: boolean;
  depth?: number;
}

export default function ConnectionItem({ conn, indented, depth = 0 }: ConnectionItemProps) {
  const {
    isDragEnabled,
    dragTarget,
    selectedConnectionIds,
    handleConnect,
    handleConnectOnly,
    handleConnectSelected,
    handleCopyConnection,
    handleConnectionSelectionStart,
    handleConnectionContextMenu,
    onEditConnection,
    setDeleteTarget,
    setRenamingConn,
    setRenameValue,
    handleDragStart,
    handleDragEnd,
    handleDragEnterItem,
    handleDragOverItem,
    handleDragLeaveItem,
    handleDropItem,
    t,
  } = useSavedConnectionsContext();

  const isTarget = dragTarget?.id === conn.id && dragTarget.type === "connection";
  const showBefore = isTarget && dragTarget.position === "before";
  const showAfter = isTarget && dragTarget.position === "after";
  const iconDef = resolveConnectionIcon(conn.icon);
  const ConnIcon = iconDef.icon;
  const isSelected = selectedConnectionIds.has(conn.id);
  const connectLabel =
    isSelected && selectedConnectionIds.size > 1
      ? t("savedConnections.connectSelected")
      : t("savedConnections.connect");
  const directConnectLabel = t("savedConnections.connect");
  const iconStyle = { color: isSelected ? "var(--df-primary)" : iconDef.color };
  const indentLeft = indented ? `${8 + depth * 16 + 16}px` : "0.5rem";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="relative min-w-full w-max"
          draggable={isDragEnabled}
          onDragStart={isDragEnabled ? (e) => handleDragStart(e, "connection", conn.id) : undefined}
          onDragEnter={
            isDragEnabled ? (e) => handleDragEnterItem(e, conn.id, "connection") : undefined
          }
          onDragOver={
            isDragEnabled ? (e) => handleDragOverItem(e, conn.id, "connection") : undefined
          }
          onDragLeave={
            isDragEnabled ? (e) => handleDragLeaveItem(e, conn.id, "connection") : undefined
          }
          onDrop={isDragEnabled ? (e) => handleDropItem(e, conn.id, "connection") : undefined}
          onDragEnd={isDragEnabled ? handleDragEnd : undefined}
        >
          {showBefore && (
            <div
              className="absolute top-0 right-2 h-0.5 rounded-full z-10"
              style={{ backgroundColor: "var(--df-primary)", left: indentLeft }}
            />
          )}
          <div
            className={`group/item relative flex min-w-full w-max items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors df-hover ${isTarget && dragTarget.position === "inside" ? "ring-1 ring-primary/60" : ""}`}
            style={{
              ...(indented ? { paddingLeft: `${8 + depth * 16 + 16}px` } : undefined),
              backgroundColor: isSelected
                ? "color-mix(in srgb, var(--df-primary) 10%, transparent)"
                : undefined,
            }}
            onMouseDown={(e) => handleConnectionSelectionStart(conn, e)}
            onContextMenu={(e) => handleConnectionContextMenu(conn, e)}
            onDoubleClick={() => handleConnectOnly(conn)}
          >
            <ConnIcon className="text-sm shrink-0" style={iconStyle} />
            <span
              className="shrink-0 whitespace-nowrap pr-16 text-xs font-medium"
              style={{ color: isSelected ? "var(--df-primary)" : "var(--df-text)" }}
            >
              {conn.name}
            </span>
            <div
              className="pointer-events-none sticky right-2 z-10 ml-auto flex shrink-0 items-center gap-0.5 rounded px-1 opacity-0 backdrop-blur-sm transition-opacity group-hover/item:pointer-events-auto group-hover/item:opacity-100"
              style={{ backgroundColor: "var(--df-bg-hover)" }}
            >
              <button
                className="p-0.5 cursor-pointer transition-colors hover:opacity-80"
                style={{ color: "var(--df-text-dimmed)" }}
                title={directConnectLabel}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleConnectOnly(conn);
                }}
              >
                <MdLink className="text-sm cursor-pointer" />
              </button>
              <button
                className="p-0.5 cursor-pointer transition-colors hover:opacity-80"
                style={{ color: "var(--df-text-dimmed)" }}
                title={t("savedConnections.edit")}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditConnection(conn);
                }}
              >
                <MdEdit className="text-sm cursor-pointer" />
              </button>
              <button
                className="p-0.5 cursor-pointer hover:text-red-400 transition-colors"
                style={{ color: "var(--df-text-dimmed)" }}
                title={t("savedConnections.delete")}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(conn);
                }}
              >
                <MdDelete className="text-sm cursor-pointer" />
              </button>
            </div>
          </div>
          {showAfter && (
            <div
              className="absolute bottom-0 right-2 h-0.5 rounded-full z-10"
              style={{ backgroundColor: "var(--df-primary)", left: indentLeft }}
            />
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[160px]">
        <ContextMenuItem
          onClick={() => {
            if (isSelected && selectedConnectionIds.size > 1) {
              handleConnectSelected();
              return;
            }
            handleConnect(conn);
          }}
        >
          <MdLink className="text-[0.875rem] text-muted-foreground mr-2" />
          {connectLabel}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onEditConnection(conn)}>
          <MdEdit className="text-[0.875rem] text-muted-foreground mr-2" />
          {t("savedConnections.edit")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => {
            setRenameValue(conn.name);
            setRenamingConn(conn);
          }}
        >
          <MdDriveFileRenameOutline className="text-[0.875rem] text-muted-foreground mr-2" />
          {t("savedConnections.rename")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleCopyConnection(conn)}>
          <MdContentCopy className="text-[0.875rem] text-muted-foreground mr-2" />
          {t("savedConnections.copy")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-red-400" onClick={() => setDeleteTarget(conn)}>
          <MdDelete className="text-[0.875rem] mr-2" />
          {t("savedConnections.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

import { invoke } from "@tauri-apps/api/core";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { MdAdd, MdClose, MdDns, MdTerminal } from "react-icons/md";
import type { Tab } from "@/types/global";
import { useApp } from "../../context/AppContext";
import { CONNECTION_ICONS } from "../icons";

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onAddTab: () => void;
}

/** Tab strip for terminal sessions. Closes backend session on tab close. */
function TabBar({ tabs, activeTabId, onTabChange, onTabClose, onAddTab }: TabBarProps) {
  const { t } = useTranslation();
  const { savedConnections } = useApp();

  const handleClose = (e: React.MouseEvent, tab: Tab) => {
    e.stopPropagation();
    if (!tab.connecting) {
      invoke("close_session", { sessionId: tab.sessionId }).catch(() => {});
    }
    onTabClose(tab.id);
  };

  const renderTabIcon = (tab: Tab) => {
    if (tab.connecting) {
      return (
        <svg
          aria-hidden="true"
          className="animate-spin shrink-0"
          style={{ width: "0.875rem", height: "0.875rem", color: "var(--df-primary)" }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      );
    }
    if (tab.type === "SSH" && tab.connectionId) {
      const conn = savedConnections.find((c) => c.id === tab.connectionId);
      const iconDef = conn?.icon ? CONNECTION_ICONS[conn.icon] : null;
      if (iconDef) {
        const IconComp = iconDef.icon;
        return <IconComp className="text-sm shrink-0" style={{ color: iconDef.color }} />;
      }
    }
    return tab.type === "SSH" ? (
      <MdDns className="text-sm shrink-0" />
    ) : (
      <MdTerminal className="text-sm shrink-0" />
    );
  };

  return (
    <div
      className="flex h-9 overflow-x-auto terminal-scroll shrink-0 border-b"
      style={{ backgroundColor: "var(--df-bg-panel)", borderColor: "var(--df-border)" }}
    >
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        return (
          <div
            key={tab.id}
            className={`group relative flex items-center pl-3 pr-2 gap-2 border-r text-xs cursor-pointer transition-[color,background-color] duration-200 ${
              isActive ? "font-semibold" : "font-medium df-hover"
            }`}
            style={{
              borderColor: "var(--df-border)",
              backgroundColor: isActive ? "var(--df-bg)" : "transparent",
              color: isActive ? "var(--df-text)" : "var(--df-text-muted)",
            }}
            onClick={() => onTabChange(tab.id)}
            title={tab.name}
          >
            {/* Top accent line */}
            {isActive && (
              <div
                className="absolute top-0 left-0 w-full h-[2px]"
                style={{
                  backgroundColor: "var(--df-primary)",
                  boxShadow: "0 1px 4px var(--df-primary)",
                }}
              />
            )}

            {/* Mask the bottom border to blend with terminal body */}
            {isActive && (
              <div
                className="absolute bottom-[-1px] left-0 w-full h-[1px] z-10"
                style={{ backgroundColor: "var(--df-bg)" }}
              />
            )}

            {renderTabIcon(tab)}

            <span className="whitespace-nowrap max-w-[160px] truncate">{tab.name}</span>

            <div className="relative flex items-center justify-center w-[18px] h-[18px] ml-0.5 shrink-0">
              <div
                className={`absolute inset-0 flex items-center justify-center rounded transition-all duration-200 ${
                  isActive
                    ? "text-[var(--df-text-muted)]"
                    : "text-[var(--df-text-dimmed)] opacity-0 group-hover:opacity-100"
                } hover:!text-red-500 hover:!bg-red-500/10 active:!bg-red-500/20 active:scale-90`}
                onClick={(e) => handleClose(e, tab)}
              >
                <MdClose className="text-[12px]" />
              </div>
            </div>
          </div>
        );
      })}
      <button
        className="px-3 transition-colors df-hover"
        style={{ color: "var(--df-text-muted)" }}
        onClick={onAddTab}
        title={t("terminal.newConnection")}
      >
        <MdAdd className="text-base mx-auto" />
      </button>
    </div>
  );
}

export default memo(TabBar);
